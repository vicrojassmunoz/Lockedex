// Equipos de jefes apuntados a mano (Randomlocke)
import { movimientos } from './datos.js'
import { leerRandom, equiposDelRandom } from './random/registro.js'

const clave = (id) => `lockedex.jefes.${id}`

// Los apuntados a mano mandan; si la run tiene una ROM aleatoria de Lockedex, el resto sale de su registro
// (según el inicial de la run, porque el rival cambia con él)
export const leerEquiposJefes = (partidaId) => {
  if (typeof window === 'undefined' || !partidaId) return {}
  let aMano = {}
  try {
    aMano = JSON.parse(localStorage.getItem(clave(partidaId)) || '{}') || {}
  } catch {}
  const r = leerRandom(partidaId)
  if (!r?.jefes) return aMano
  let inicial = 'fire'
  try {
    inicial = JSON.parse(localStorage.getItem(`nuzlocke.${partidaId}`) || '{}')?.__starter || 'fire'
  } catch {}
  return { ...equiposDelRandom(r, inicial, nombreMovimiento), ...aMano }
}
// Movimientos del registro (números de la 3.ª gen) por su nombre en inglés, como los apuntados a mano
let porId = null
const nombreMovimiento = (id) => {
  if (!porId && typeof window !== 'undefined') {
    porId = {}
    movimientos()
      .then((m) => Object.values(m || {}).forEach((x) => (porId[x.id] = x.en)))
      .catch(() => {})
  }
  return porId?.[id] || null
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
