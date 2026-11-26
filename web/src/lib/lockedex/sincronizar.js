// Qué cambia en la run con los datos de la partida del emulador (.sav). Lo usan la página de Importar
// (lista con casillas) y la sincronización automática al guardar en el emulador (Sincronizacion.svelte).
//   actualizar: evoluciones (la especie del .sav es otra de la misma línea), mote y naturaleza
//   caido:      un Pokémon del equipo con 0 PS en el .sav (en un Nuzlocke, debilitado = caído)
//   nuevo:      capturas del .sav que no están en la run, por su lugar de captura
import { norm } from './datos.js'
import { emparejar } from './equipo.js'

const VIVOS = [1, 2, 3, 6]
// El mismo Pokémon del .sav (las listas guardan copias, así que no vale comparar referencias)
const mismo = (a, b) =>
  !!a && !!b && a.mote === b.mote && a.especie === b.especie && a.nivel === b.nivel && a.lugarCaptura === b.lugarCaptura

export const calcularCambiosSav = ({ partida, resumen, sav, pkdx }) => {
  if (!partida || !sav || !resumen) return []
  const info = (especie) => pkdx?.aliasMap?.[norm(especie)] || pkdx?.nameMap?.[norm(especie)]
  const linea = (especie) => info(especie)?.evoline || null
  const usados = new Set()
  const lista = []
  const todos = [...(sav.equipo || []).map((p) => ({ ...p, enEquipo: true })), ...(sav.cajas || [])]

  for (const e of resumen.encuentros) {
    const s = emparejar(e, todos, usados, linea)
    if (!s) continue
    usados.add(s)
    const parche = {}
    if (!e.nickname && s.mote && norm(s.mote) !== norm(s.especie)) parche.nickname = s.mote
    if (!e.nature && s.naturaleza) parche.nature = s.naturaleza
    if (norm(e.pokemon) !== norm(s.especie) && info(s.especie)) parche.pokemon = info(s.especie).alias
    if (Object.keys(parche).length) lista.push({ tipo: 'actualizar', lugar: e.lugar, antes: e, s, parche })
    if (s.enEquipo && s.debilitado && VIVOS.includes(+e.status))
      lista.push({ tipo: 'caido', lugar: e.lugar, antes: e, s, parche: { status: 5 } })
  }

  // Capturas que no están en la run, por lugar de captura
  const libres = new Set()
  for (const s of todos) {
    if (usados.has(s) || !s.lugarCaptura) continue
    if (resumen.encuentros.find((e) => norm(e.lugar) === norm(s.lugarCaptura))) continue
    if ((partida.datos || {})[s.lugarCaptura]?.pokemon) continue
    if (libres.has(s.lugarCaptura)) continue
    libres.add(s.lugarCaptura)
    if (info(s.especie))
      lista.push({ tipo: 'nuevo', lugar: s.lugarCaptura, s, parche: { pokemon: info(s.especie).alias, status: 1, nickname: s.mote, nature: s.naturaleza } })
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
