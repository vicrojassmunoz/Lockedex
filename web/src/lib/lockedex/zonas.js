// Zona actual según el .sav importado: el mapa donde guardaste (grupo y número) pasado a la zona de la
// app con web/static/lx/zonas-sav.json (lo genera herramientas/zonas_sav.py desde los decomps de pret).
// RojoFuego/VerdeHoja, Rubí/Zafiro y Esmeralda (en los hacks los mapas no coinciden).
import { leerSavGuardado } from './equipo.js'

const JUEGOS = { rfvh: ['fr', 'lg'], rz: ['ruby', 'saph'], esmeralda: ['em'] }
let tabla = null
const cargar = () =>
  (tabla ||= fetch('/lx/zonas-sav.json')
    .then((r) => (r.ok ? r.json() : {}))
    .catch(() => ({})))

/** { zona, clave } de la run (o null si no hay .sav, el juego no tiene tabla o el mapa no es una zona) */
export const zonaDelSav = async (partida) => {
  const sav = partida?.id ? leerSavGuardado(partida.id) : null
  const u = sav?.ubicacion
  if (!u || !JUEGOS[sav.juego]?.includes(partida.juego)) return null
  const clave = `${u.grupo}.${u.mapa}`
  const zona = (await cargar())?.[sav.juego]?.[clave] || null
  return { zona, clave: `${clave}|${sav.importado || ''}` }
}
