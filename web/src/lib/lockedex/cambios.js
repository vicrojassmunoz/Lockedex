// Egglocke y Wonderlocke: cada captura se cambia por otro Pokémon (lo que sale del huevo o lo que llega
// por Intercambio Prodigioso). En la run se guarda el Pokémon nuevo y, en «cambio», el que capturaste:
// datos[lugar] = { ...encuentro, pokemon: 'larvitar', cambio: { de: 'pidgey', tipo: 'huevo', fecha } }
import { getGameStore, patch } from '$lib/store'
import { leerReglas } from './reglas.js'
import { leerPartida } from './partida.js'
import { marcarHuevoUsado } from './egglocke.js'
import { norm } from './datos.js'

// Solo las capturas (normales y shinies); los regalos e intercambios del juego no se cambian
const SE_CAMBIAN = [1, 6]

export const tipoCambio = (reglas) => (reglas?.egglocke ? 'huevo' : reglas?.wonderlocke ? 'prodigioso' : null)

// El inicial no es una captura: no cuenta como pendiente (si también va por huevo, se puede apuntar igual)
export const esInicial = (encuentro, lugar) => lugar === 'Starter' || encuentro?.location === 'Starter'
export const sePuedeCambiar = (encuentro, reglas) =>
  !!tipoCambio(reglas) && !!encuentro?.pokemon && SE_CAMBIAN.includes(+encuentro.status) && !encuentro.cambio

export const pendienteDeCambio = (encuentro, reglas, lugar) => sePuedeCambiar(encuentro, reglas) && !esInicial(encuentro, lugar)

export const pendientesDeCambio = (datos = {}, reglas) =>
  Object.entries(datos)
    .filter(([k, e]) => !k.startsWith('__') && e && typeof e === 'object' && pendienteDeCambio(e, reglas, k))
    .map(([lugar, e]) => ({ lugar, ...e }))

/** Nacidos de un huevo en la partida del emulador (nivel al conocerlo 0) que aún no están en la run:
 *  en Egglocke son lo que ha salido de algún huevo. linea(especie) junta las evoluciones */
export const eclosionadosDelSav = (idRun, datos = {}, linea = null) => {
  let sav = null
  try {
    sav = JSON.parse(localStorage.getItem(`lockedex.sav.${idRun}`) || 'null')
  } catch {}
  const clave = (x) => (linea && linea(x)) || norm(x)
  const ya = new Set(
    Object.entries(datos)
      .filter(([k, e]) => !k.startsWith('__') && e?.pokemon && ![4, 7].includes(+e.status))
      .map(([, e]) => clave(e.pokemon))
  )
  const vistos = new Set()
  return [...(sav?.equipo || []), ...(sav?.cajas || [])].filter((s) => {
    if (+s.nivelCaptura !== 0) return false
    const c = clave(s.especie)
    if (ya.has(c) || vistos.has(c + '|' + s.mote)) return false
    vistos.add(c + '|' + s.mote)
    return true
  })
}

/** Apunta lo que ha salido del huevo (o ha llegado por el intercambio) en el encuentro de «lugar» */
export const aplicarCambio = (idRun, lugar, especie, extra = {}) => {
  const reglas = leerReglas(idRun)
  const tipo = tipoCambio(reglas)
  const e = leerPartida(idRun)?.datos?.[lugar]
  if (!tipo || !e || !especie) return false
  // del .sav vienen el mote y la naturaleza del que nació: son los suyos, no los del que capturaste
  const mas = {}
  if (extra.nickname) mas.nickname = extra.nickname
  if (extra.nature) mas.nature = extra.nature
  getGameStore(idRun).update(patch({ [lugar]: { ...e, ...mas, pokemon: especie, cambio: { de: e.pokemon, tipo, fecha: Date.now() } } }))
  // si era uno de los huevos del generador, ya está abierto
  if (tipo === 'huevo') marcarHuevoUsado(idRun, especie)
  return true
}

/** El Pokémon apuntado ya es el que salió del huevo (o llegó por el intercambio): solo se marca, sin cambiar
 *  la especie. Para cuando se apuntó directamente lo que salió. cambio.de queda en null (no se sabe qué se capturó) */
export const marcarCambiado = (idRun, lugar) => {
  const tipo = tipoCambio(leerReglas(idRun))
  const e = leerPartida(idRun)?.datos?.[lugar]
  if (!tipo || !e?.pokemon || e.cambio) return false
  getGameStore(idRun).update(patch({ [lugar]: { ...e, cambio: { de: null, tipo, fecha: Date.now() } } }))
  if (tipo === 'huevo') marcarHuevoUsado(idRun, e.pokemon)
  return true
}

/** Deshace el cambio: vuelve el Pokémon capturado (si solo estaba marcado, se queda el mismo) */
export const deshacerCambio = (idRun, lugar) => {
  const e = leerPartida(idRun)?.datos?.[lugar]
  if (!e?.cambio) return false
  const { cambio, ...resto } = e
  getGameStore(idRun).update(patch({ [lugar]: { ...resto, pokemon: cambio.de || resto.pokemon } }))
  return true
}
