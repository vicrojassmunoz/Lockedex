// Tu equipo con todos los datos disponibles (run + partida .sav importada)
import { fetchData } from '$utils/fetchers'
import { norm } from './datos.js'
import { partidaActiva, cargarRutas, resumirPartida } from './partida.js'

export const claveSav = (idPartida) => `lockedex.sav.${idPartida}`
export const claveRutaSav = (idPartida) => `lockedex.savruta.${idPartida}`

export const leerSavGuardado = (idPartida) => {
  try {
    return JSON.parse(localStorage.getItem(claveSav(idPartida)) || 'null')
  } catch {
    return null
  }
}

// Empareja un Pokémon de la run con uno de la partida del emulador
export const emparejar = (encuentro, candidatos = [], usados = new Set(), linea = null) => {
  // Los muertos y fallidos no se emparejan con Pokémon vivos del emulador
  if ([4, 5, 7].includes(+encuentro.status)) return null
  const libres = candidatos.filter((c) => !usados.has(c))
  const mote = norm(encuentro.nickname)
  const especie = norm(encuentro.pokemon)
  const lugar = norm(encuentro.lugar)
  // Misma línea evolutiva (si se pasa linea(especie)): para reconocerlo después de evolucionar
  const familia = linea ? linea(encuentro.pokemon) : null
  const mismaLinea = (c) => !!familia && linea(c.especie) === familia
  return (
    (mote && libres.find((c) => norm(c.mote) === mote && norm(c.especie) === especie)) ||
    libres.find((c) => norm(c.lugarCaptura) === lugar && norm(c.especie) === especie) ||
    libres.find((c) => norm(c.lugarCaptura) === lugar && mismaLinea(c)) ||
    (mote && libres.find((c) => norm(c.mote) === mote)) ||
    libres.find((c) => norm(c.especie) === especie) ||
    libres.find((c) => mismaLinea(c)) ||
    null
  )
}

const ficha = (pkdx, encuentro, sav) => ({
  nombre: encuentro?.nickname || sav?.mote || pkdx?.name || encuentro?.pokemon,
  alias: pkdx?.alias || encuentro?.pokemon,
  especie: sav?.especie || encuentro?.pokemon,
  types: pkdx?.types || [],
  imgId: pkdx?.imgId,
  sprite: pkdx?.sprite,
  lugar: encuentro?.lugar,
  nivel: sav?.nivel,
  movimientos: sav?.movimientos,
  naturaleza: sav?.naturaleza,
  habilidad: sav?.habilidad,
  ivs: sav?.ivs,
  evs: sav?.evs,
  ps: sav?.ps,
  psMax: sav?.psMax
})

// equipo de la run (o caja si no hay equipo) enriquecido con la partida del emulador
export const equipoCompleto = async (partida, resumen) => {
  const datos = await fetchData()
  const busca = (alias) => datos?.aliasMap?.[norm(alias)] || datos?.nameMap?.[norm(alias)]
  const sav = leerSavGuardado(partida.id)
  const candidatos = sav ? [...sav.equipo, ...(sav.cajas || [])] : []
  const usados = new Set()

  let base = resumen.equipo.length ? resumen.equipo : resumen.vivos
  const fuente = resumen.equipo.length ? 'equipo' : 'caja'

  // Sin nada en la run pero con partida importada: usa el equipo del emulador
  if (!base.length && sav?.equipo?.length) {
    return {
      fuente: 'sav',
      miembros: sav.equipo.map((s) => ficha(busca(s.especie), null, s))
    }
  }

  // Si hay partida importada, prioriza a los que llevas encima en el emulador
  if (sav?.equipo?.length && fuente === 'caja') {
    const enEquipo = base.filter((e) => emparejar(e, sav.equipo))
    if (enEquipo.length) base = enEquipo
  }

  const miembros = base.slice(0, fuente === 'caja' ? 12 : 6).map((e) => {
    const s = emparejar(e, candidatos, usados)
    if (s) usados.add(s)
    return ficha(busca(e.pokemon), e, s)
  })
  return { fuente, miembros, sav }
}

// Partida activa + resumen + equipo, calculado una sola vez por cada cambio
// guardado (todas las tarjetas de jefe comparten el mismo resultado)
let memo = { clave: null, promesa: null }
export const equipoActual = () => {
  const clave = `${localStorage.getItem('nuzlocke')}|${localStorage.getItem('__escritorio.rev')}`
  if (memo.clave === clave && memo.promesa) return memo.promesa
  memo.clave = clave
  memo.promesa = (async () => {
    const partida = partidaActiva()
    if (!partida?.info) return null
    const rutas = await cargarRutas(partida.info.lid)
    const resumen = resumirPartida(partida, rutas)
    const eq = await equipoCompleto(partida, resumen)
    return { partida, rutas, resumen, eq }
  })()
  return memo.promesa
}
