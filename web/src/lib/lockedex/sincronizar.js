// Qué cambia en la run con los datos de la partida del emulador (.sav). Lo usan la página de Importar
// (lista con casillas) y la sincronización automática al guardar en el emulador (Sincronizacion.svelte).
//   actualizar: evoluciones (la especie del .sav es otra de la misma línea), mote y naturaleza
//   caido:      un Pokémon del equipo con 0 PS en el .sav (en un Nuzlocke, debilitado = caído)
//   nuevo:      capturas del .sav que no están en la run, por su lugar de captura (el inicial, a su zona)
//   eclosion:   Pokémon nacidos de un huevo (nivel al conocerlo 0) que no están en la run: no son capturas
//               de la zona donde nacieron; en Egglocke son lo que salió de algún huevo (se apuntan en la Caja)
import { norm } from './datos.js'
import { emparejar } from './equipo.js'
import { leerReglas } from './reglas.js'

const VIVOS = [1, 2, 3, 6]
// El mismo Pokémon del .sav (las listas guardan copias, así que no vale comparar referencias)
const mismo = (a, b) =>
  !!a && !!b && a.mote === b.mote && a.especie === b.especie && a.nivel === b.nivel && a.lugarCaptura === b.lugarCaptura

export const calcularCambiosSav = ({ partida, resumen, sav, pkdx }) => {
  if (!partida || !sav || !resumen) return []
  const info = (especie) => pkdx?.aliasMap?.[norm(especie)] || pkdx?.nameMap?.[norm(especie)]
  const linea = (especie) => info(especie)?.evoline || null
  const egglocke = !!leerReglas(partida.id)?.egglocke
  const sinMote = (s) => !s.mote || norm(s.mote) === norm(s.especie) || norm(s.mote) === norm(info(s.especie)?.name)
  const usados = new Set()
  const lista = []
  const todos = [...(sav.equipo || []).map((p) => ({ ...p, enEquipo: true })), ...(sav.cajas || [])]

  for (const e of resumen.encuentros) {
    const s = emparejar(e, todos, usados, linea)
    if (!s) continue
    usados.add(s)
    const parche = {}
    if (!e.nickname && s.mote && norm(s.mote) !== norm(s.especie)) parche.nickname = s.mote
    // la naturaleza no cambia en el juego: manda la del .sav (en Egglocke, la del que salió del huevo,
    // no la del que capturaste)
    if (s.naturaleza && e.nature !== s.naturaleza) parche.nature = s.naturaleza
    if (norm(e.pokemon) !== norm(s.especie) && info(s.especie)) parche.pokemon = info(s.especie).alias
    // Egglocke: si en la partida nació de un huevo (nivel al conocerlo 0), en la run también salió de uno
    if (egglocke && +s.nivelCaptura === 0 && !e.cambio && [1, 6].includes(+e.status) && e.lugar !== 'Starter')
      parche.cambio = { de: null, tipo: 'huevo', fecha: Date.now() }
    if (Object.keys(parche).length) lista.push({ tipo: 'actualizar', lugar: e.lugar, antes: e, s, parche })
    if (s.enEquipo && s.debilitado && VIVOS.includes(+e.status))
      lista.push({ tipo: 'caido', lugar: e.lugar, antes: e, s, parche: { status: 5 } })
  }

  // El inicial: en muchos juegos su lugar de captura es una ruta o un pueblo (en Esmeralda, la Ruta 101;
  // en RojoFuego, Pueblo Paleta), no la zona «Starter» de la lista. Se reconoce por ser de la línea de
  // uno de los iniciales del juego y haberlo conocido a nivel 5
  const zonaInicial = (resumen.lugares || []).find((l) => l.name === 'Starter')
  const lineasIniciales = new Set((zonaInicial?.encounters || []).map((x) => linea(x)).filter(Boolean))
  const esInicial = (s) => !!zonaInicial && lineasIniciales.has(linea(s.especie)) && +s.nivelCaptura === 5
  let inicialVisto = !!(partida.datos || {}).Starter?.pokemon

  // Capturas que no están en la run, por lugar de captura
  const libres = new Set()
  for (const s of todos) {
    if (usados.has(s) || !s.lugarCaptura) continue
    if (+s.nivelCaptura === 0 && s.lugarCaptura) {
      if (info(s.especie)) lista.push({ tipo: 'eclosion', lugar: null, s })
      continue
    }
    let lugar = s.lugarCaptura
    if (esInicial(s)) {
      if (inicialVisto) continue
      inicialVisto = true
      lugar = 'Starter'
    }
    if (resumen.encuentros.find((e) => norm(e.lugar) === norm(lugar))) continue
    if ((partida.datos || {})[lugar]?.pokemon) continue
    if (libres.has(lugar)) continue
    libres.add(lugar)
    if (info(s.especie))
      lista.push({
        tipo: 'nuevo',
        lugar,
        s,
        // sin mote si es el nombre de la especie (así salen en el juego los que no tienen mote)
        parche: { pokemon: info(s.especie).alias, status: 1, nickname: sinMote(s) ? '' : s.mote, nature: s.naturaleza, location: lugar }
      })
  }
  return lista
}

// Junta los cambios elegidos en un parche para la run (varios cambios del mismo lugar se suman) y deja
// el equipo como el del emulador, sin los caídos
export const parcheCambiosSav = ({ partida, resumen, sav, cambios, linea }) => {
  const datos = {}
  for (const c of cambios) {
    const actual = datos[c.lugar] || (partida.datos || {})[c.lugar] || {}
    datos[c.lugar] = { ...actual, ...c.parche }
  }
  const caidos = new Set(cambios.filter((c) => c.tipo === 'caido').map((c) => c.lugar))
  const equipoLugares = (sav.equipo || [])
    .map((s) => {
      const c = cambios.find((x) => mismo(x.s, s))
      if (c) return c.lugar
      return resumen.encuentros.find((e) => emparejar(e, [s], new Set(), linea))?.lugar
    })
    .filter((l) => l && !caidos.has(l))
  if (equipoLugares.length || caidos.size) datos.__team = [...new Set(equipoLugares)]
  return datos
}
