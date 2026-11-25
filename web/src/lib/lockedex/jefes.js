// Equipos de jefes apuntados a mano (Randomlocke)
import { movimientos } from './datos.js'

const clave = (id) => `lockedex.jefes.${id}`

export const leerEquiposJefes = (partidaId) => {
  if (typeof window === 'undefined' || !partidaId) return {}
  try {
    return JSON.parse(localStorage.getItem(clave(partidaId)) || '{}') || {}
  } catch {
    return {}
  }
}

export const guardarEquipoJefe = (partidaId, jefeId, equipo) => {
  const todos = leerEquiposJefes(partidaId)
  if (equipo?.length) todos[jefeId] = equipo
  else delete todos[jefeId]
  localStorage.setItem(clave(partidaId), JSON.stringify(todos))
}

// Lo convierte al formato de la liga para el cálculo de riesgo
// Hasta la 3.ª gen la clase del movimiento (físico/especial) la decide su tipo; la división por
// movimiento llega con Diamante y Perla (4.ª gen)
const TIPOS_FISICOS = ['normal', 'fighting', 'flying', 'poison', 'ground', 'rock', 'bug', 'ghost', 'steel']
export const claseSegunGen = (clase, tipo, gen) =>
  gen && gen <= 3 && clase && clase !== 'status' && tipo
    ? TIPOS_FISICOS.includes(String(tipo).toLowerCase()) ? 'physical' : 'special'
    : clase

export const comoJefe = async (nombre, equipo, datosCalc) => {
  const movs = await movimientos()
  const norm = (s = '') => ('' + s).toLowerCase().replace(/[^a-z0-9]/g, '')
  return {
    name: nombre,
    pokemon: equipo.map((p) => {
      const sp = datosCalc?.porId?.[norm(p.especie)]
      return {
        name: p.especie,
        level: p.nivel,
        types: sp?.tipos || [],
        moves: (p.movimientos || [])
          .map((m) => movs[norm(m)])
          .filter(Boolean)
          .map((m) => ({ name: m.en, type: m.tipo, damage_class: claseSegunGen(m.clase, m.tipo, datosCalc?.g?.num), power: m.potencia }))
      }
    })
  }
}
