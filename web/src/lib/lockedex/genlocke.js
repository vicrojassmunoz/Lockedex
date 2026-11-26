// Genlocke: varias runs seguidas. Cada run nueva guarda de dónde viene y el equipo que heredó.
// «lockedex.genlocke.<id>» = { anterior, cadena: [ids de las runs anteriores], herencia: [{ alias, imgId, nombre, mote }] }
import { leerPartida } from './partida.js'
import { leerSalon } from './salon.js'

const clave = (id) => `lockedex.genlocke.${id}`

export const leerGenlocke = (id) => {
  if (!id || typeof localStorage === 'undefined') return null
  try {
    return JSON.parse(localStorage.getItem(clave(id)) || 'null')
  } catch {
    return null
  }
}

/** Enlaza la run nueva con la anterior: hereda el equipo del Salón de la Fama (o el equipo vivo si no hay) */
export const enlazarGenlocke = (idNueva, idAnterior) => {
  const previa = leerPartida(idAnterior)
  if (!idNueva || !previa) return null
  const salon = leerSalon()
    .filter((e) => e.id === idAnterior)
    .sort((a, b) => b.fecha - a.fecha)[0]
  let herencia = (salon?.equipo || []).map((m) => ({ alias: m.alias, imgId: m.imgId, nombre: m.nombre, mote: m.mote }))
  if (!herencia.length) {
    const d = previa.datos || {}
    herencia = (d.__team || [])
      .map((l) => d[l])
      .filter((e) => e && [1, 2, 3, 6].includes(+e.status))
      .map((e) => ({ alias: e.pokemon, imgId: null, nombre: e.pokemon, mote: e.nickname || '' }))
  }
  const anterior = leerGenlocke(idAnterior)
  const enlace = { anterior: idAnterior, cadena: [...(anterior?.cadena || []), idAnterior], herencia, fecha: Date.now() }
  localStorage.setItem(clave(idNueva), JSON.stringify(enlace))
  return enlace
}

/** Clave del encuentro con el que entra en la run un heredado («Genlocke · Tortu») */
export const lugarHerencia = (m) => `Genlocke · ${m.mote || m.nombre || m.alias}`
