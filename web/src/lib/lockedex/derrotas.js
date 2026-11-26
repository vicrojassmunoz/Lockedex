// Derrotas, game over, vidas y revividos de cada run.
//
// Se guardan aparte de los datos de la run (lockedex.derrotas.<id>) para no mezclarlos con las rutas,
// y el historial de intentos terminados (lockedex.historial.<id>) sobrevive a «Nuevo intento», que
// vacía la run. La tienda de cada run se actualiza también si otra ventana (el modo compacto) escribe.
import { writable, get } from 'svelte/store'
import { leerReglas } from './reglas.js'
import { savedGames, updateGame, getGameStore, parse } from '$lib/store'

const navegador = typeof window !== 'undefined'
const clave = (id) => `lockedex.derrotas.${id}`
const claveHistorial = (id) => `lockedex.historial.${id}`
const vacio = () => ({ derrotas: [], fin: null, revividos: [] })

export const leerEstado = (id) => {
  if (!navegador || !id) return vacio()
  try {
    return { ...vacio(), ...(JSON.parse(localStorage.getItem(clave(id)) || '{}') || {}) }
  } catch {
    return vacio()
  }
}

const tiendas = {}
export const estadoRun = (id) => {
  if (!tiendas[id]) {
    const tienda = writable(leerEstado(id))
    if (navegador)
      window.addEventListener('storage', (e) => {
        if (e.key === clave(id)) tienda.set(leerEstado(id))
      })
    tiendas[id] = tienda
  }
  return tiendas[id]
}

const guardar = (id, estado) => {
  localStorage.setItem(clave(id), JSON.stringify(estado))
  estadoRun(id).set(estado)
}

// Pokémon caídos de los datos de la run (estado 5)
export const contarCaidos = (datos = {}) =>
  Object.entries(datos).filter(([k, v]) => !k.startsWith('__') && +v?.status === 5).length

// Vidas que quedan en el modo con vidas (null si no se juega con vidas). Cada caído, cada derrota
// contra un jefe y cada Pokémon revivido gastan una.
export const vidasRestantes = (reglas, estado, caidos = 0) => {
  const total = +reglas?.vidas || 0
  if (!total) return null
  return Math.max(0, total - caidos - (estado?.derrotas || []).length - (estado?.revividos || []).length)
}

/**
 * Apunta una derrota. motivo: 'jefe' (contra un jefe), 'general' («He perdido») o 'equipo' (ha caído todo
 * el equipo y aceptas el game over que propone la app).
 * Es game over si es general, si se acaban las vidas o, sin modo de vidas, si la regla
 * «Game over si cae todo el equipo» está puesta (perder contra un jefe es que ha caído el equipo).
 */
export const registrarDerrota = ({ id, jefe = null, motivo = 'jefe', equipo = [], caidos = 0 }) => {
  const reglas = leerReglas(id)
  const estado = leerEstado(id)
  const derrota = { fecha: Date.now(), motivo, jefe, equipo }
  estado.derrotas = [...estado.derrotas, derrota]
  const vidas = vidasRestantes(reglas, estado, caidos)
  const fin = motivo === 'general' || motivo === 'equipo' || (vidas !== null ? vidas <= 0 : !!reglas.gameover)
  if (fin) estado.fin = { ...derrota, vidas }
  guardar(id, estado)
  return { fin, vidas }
}

// Deshacer el game over (y quitar la derrota que lo provocó)
export const deshacerFin = (id) => {
  const estado = leerEstado(id)
  if (estado.fin) estado.derrotas = estado.derrotas.filter((d) => d.fecha !== estado.fin.fecha)
  estado.fin = null
  guardar(id, estado)
}

// Game over porque se han acabado las vidas (lo propone la app al ver los caídos)
export const finPorVidas = (id) => {
  const estado = leerEstado(id)
  if (estado.fin) return
  estado.fin = { fecha: Date.now(), motivo: 'vidas', jefe: null, equipo: [], vidas: 0 }
  guardar(id, estado)
}

// --- Cláusula de revivir ----------------------------------------------------------------
// reglas.revivir: '' (no), 'medalla' (uno por medalla conseguida) o un número para toda la run
export const revividosDisponibles = (reglas, estado, medallas = 0) => {
  const modo = reglas?.revivir
  if (!modo) return 0
  const usados = (estado?.revividos || []).length
  if (modo === 'medalla') return Math.max(0, medallas - usados)
  return Math.max(0, (parseInt(modo, 10) || 0) - usados)
}

export const revivir = (id, ubicacion, pokemon, tiendaRun = getGameStore(id)) => {
  const estado = leerEstado(id)
  estado.revividos = [...estado.revividos, { fecha: Date.now(), ubicacion, pokemon }]
  guardar(id, estado)
  // El Pokémon vuelve a estar capturado (estado 1) y se le quita la causa de la muerte
  tiendaRun.update((datos) => {
    const d = JSON.parse(datos || '{}')
    if (d[ubicacion]) {
      d[ubicacion] = { ...d[ubicacion], status: 1 }
      delete d[ubicacion].death
    }
    return JSON.stringify(d)
  })
}

// --- Historial e intentos ---------------------------------------------------------------
export const leerHistorial = (id) => {
  if (!navegador || !id) return []
  try {
    return JSON.parse(localStorage.getItem(claveHistorial(id)) || '[]') || []
  } catch {
    return []
  }
}

/**
 * Nuevo intento: guarda en el historial cómo acabó este, suma un intento a la partida y la vacía
 * (encuentros, equipo y caja), igual que «Abandonar» de la cabecera.
 */
export const nuevoIntento = (id, resumen = {}) => {
  let partida = null
  parse((g) => (partida = g[id]))(get(savedGames))
  const estado = leerEstado(id)
  const historial = leerHistorial(id)
  historial.push({
    intento: +(partida?.attempts || 1),
    fecha: Date.now(),
    fin: estado.fin,
    derrotas: estado.derrotas.length,
    ...resumen
  })
  localStorage.setItem(claveHistorial(id), JSON.stringify(historial))
  if (partida) savedGames.update(updateGame({ ...partida, attempts: +(partida.attempts || 1) + 1 }))
  getGameStore(id).set('{}')
  guardar(id, vacio())
}

// ¿Ha caído todo el equipo? Al morir, cada Pokémon sale del equipo, así que se mira el último equipo
// que hubo (se guarda en «lockedex.ultimoEquipo.<id>» cada vez que cambia): es un «wipe» si el equipo
// actual no tiene a nadie vivo y todos los de ese último equipo están caídos.
const VIVOS = [1, 2, 3, 6]
const claveUltimo = (id) => `lockedex.ultimoEquipo.${id}`
const claveVisto = (id) => `lockedex.wipeVisto.${id}`

export const recordarEquipo = (id, datos = {}) => {
  if (!id || typeof localStorage === 'undefined') return
  const equipo = (datos.__team || []).filter((l) => l && VIVOS.includes(+datos[l]?.status))
  if (equipo.length) localStorage.setItem(claveUltimo(id), JSON.stringify(equipo))
}

export const equipoCaido = (id, datos = {}) => {
  if (!id || typeof localStorage === 'undefined') return null
  const vivosEnEquipo = (datos.__team || []).filter((l) => l && VIVOS.includes(+datos[l]?.status))
  if (vivosEnEquipo.length) return null
  let ultimo = []
  try {
    ultimo = JSON.parse(localStorage.getItem(claveUltimo(id)) || '[]') || []
  } catch {}
  if (!ultimo.length || !ultimo.every((l) => +datos[l]?.status === 5)) return null
  // ya contestado («no ha sido un wipe») para este mismo equipo
  if (localStorage.getItem(claveVisto(id)) === JSON.stringify(ultimo)) return null
  return ultimo
}

export const descartarWipe = (id, ultimo = []) => localStorage.setItem(claveVisto(id), JSON.stringify(ultimo))
