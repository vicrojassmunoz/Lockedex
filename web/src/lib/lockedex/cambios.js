// Egglocke y Wonderlocke: cada captura se cambia por otro Pokémon (lo que sale del huevo o lo que llega
// por Intercambio Prodigioso). En la run se guarda el Pokémon nuevo y, en «cambio», el que capturaste:
// datos[lugar] = { ...encuentro, pokemon: 'larvitar', cambio: { de: 'pidgey', tipo: 'huevo', fecha } }
import { getGameStore, patch } from '$lib/store'
import { leerReglas } from './reglas.js'
import { leerPartida } from './partida.js'
import { marcarHuevoUsado } from './egglocke.js'

// Solo las capturas (normales y shinies); los regalos e intercambios del juego no se cambian
const SE_CAMBIAN = [1, 6]

export const tipoCambio = (reglas) => (reglas?.egglocke ? 'huevo' : reglas?.wonderlocke ? 'prodigioso' : null)

export const pendienteDeCambio = (encuentro, reglas) =>
  !!tipoCambio(reglas) && !!encuentro?.pokemon && SE_CAMBIAN.includes(+encuentro.status) && !encuentro.cambio

export const pendientesDeCambio = (datos = {}, reglas) =>
  Object.entries(datos)
    .filter(([k, e]) => !k.startsWith('__') && e && typeof e === 'object' && pendienteDeCambio(e, reglas))
    .map(([lugar, e]) => ({ lugar, ...e }))

/** Apunta lo que ha salido del huevo (o ha llegado por el intercambio) en el encuentro de «lugar» */
export const aplicarCambio = (idRun, lugar, especie) => {
  const reglas = leerReglas(idRun)
  const tipo = tipoCambio(reglas)
  const e = leerPartida(idRun)?.datos?.[lugar]
  if (!tipo || !e || !especie) return false
  getGameStore(idRun).update(patch({ [lugar]: { ...e, pokemon: especie, cambio: { de: e.pokemon, tipo, fecha: Date.now() } } }))
  // si era uno de los huevos del generador, ya está abierto
  if (tipo === 'huevo') marcarHuevoUsado(idRun, especie)
  return true
}

/** Deshace el cambio: vuelve el Pokémon capturado */
export const deshacerCambio = (idRun, lugar) => {
  const e = leerPartida(idRun)?.datos?.[lugar]
  if (!e?.cambio) return false
  const { cambio, ...resto } = e
  getGameStore(idRun).update(patch({ [lugar]: { ...resto, pokemon: cambio.de } }))
  return true
}
