// Tu equipo con todos los datos disponibles (run + partida .sav importada)
import { fetchData } from '$utils/fetchers'
import { norm } from './datos.js'

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
export const emparejar = (encuentro, candidatos = [], usados = new Set()) => {
  // Los muertos y fallidos no se emparejan con Pokémon vivos del emulador
  if ([4, 5, 7].includes(+encuentro.status)) return null
  const libres = candidatos.filter((c) => !usados.has(c))
  const mote = norm(encuentro.nickname)
  const especie = norm(encuentro.pokemon)
  const lugar = norm(encuentro.lugar)
  return (
    (mote && libres.find((c) => norm(c.mote) === mote && norm(c.especie) === especie)) ||
    libres.find((c) => norm(c.lugarCaptura) === lugar && norm(c.especie) === especie) ||
    (mote && libres.find((c) => norm(c.mote) === mote)) ||
    libres.find((c) => norm(c.especie) === especie) ||
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
