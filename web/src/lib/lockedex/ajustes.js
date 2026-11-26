// Ajustes de cada run (la cadena «settings» de la partida, una cifra por ajuste en su posición).
// Lo que no está guardado vale lo de settingsDefault.
import { get } from 'svelte/store'
import { savedGames, parse } from '$lib/store'
import { settingsDefault, getSetting } from '$lib/components/Settings/_data'

export const ajusteRun = (id, clave) => {
  const i = getSetting(clave)
  let valor
  parse((partidas) => (valor = (partidas[id]?.settings || '')[i]))(get(savedGames))
  return valor === undefined || valor === '' ? settingsDefault[i] : valor
}

// «Capturas al equipo»: lo capturado entra solo en el equipo si hay hueco (encendido salvo que se apague)
export const capturasAlEquipo = (id) => ajusteRun(id, 'auto-team') !== '0'
