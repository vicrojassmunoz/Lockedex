// Reglas del Nuzlocke de cada run (se guardan aparte de los ajustes originales)
import { especies, clavePokemon, norm } from './datos.js'
import { idioma } from './idioma.js'
import { claveSav } from './equipo.js'
import { nivelMaximo } from './partida.js'

const es = () => idioma() === 'es'
const clave = (id) => `lockedex.reglas.${id}`

// Catálogo de reglas. tipo: 'si' (activable) o 'tipo' (elige un tipo)
export const REGLAS = [
  { id: 'regalos', grupo: 'clausulas', es: 'Cláusula de regalos', en: 'Gift clause', desc: ['Los Pokémon de regalo no gastan el encuentro de la zona: puedes añadir un encuentro extra desde el menú ⋮ de esa zona.', 'Gift Pokémon do not use up the area encounter: add an extra encounter from that area’s ⋮ menu.'] },
  { id: 'variocolor', grupo: 'clausulas', es: 'Cláusula variocolor', en: 'Shiny clause', desc: ['Un shiny siempre se puede capturar, aunque ya tuvieras encuentro en esa zona (menú ⋮ → variocolor extra).', 'A shiny can always be caught, even if you already had an encounter there (⋮ menu → extra shiny).'] },
  { id: 'estaticos', grupo: 'clausulas', es: 'Estáticos aparte', en: 'Static clause', desc: ['Los encuentros estáticos y legendarios no gastan el encuentro de la zona.', 'Static and legendary encounters do not use up the area encounter.'] },
  { id: 'nivelMax', grupo: 'dificultad', es: 'Nivel máximo obligatorio', en: 'Hard level caps', desc: ['Avisa si tu equipo supera el nivel máximo del próximo jefe (necesita tu .sav importado).', 'Warns if your team is above the next boss’s level cap (needs your imported .sav).'] },
  { id: 'sinObjetos', grupo: 'dificultad', es: 'Sin objetos en combate', en: 'No items in battle', desc: ['Recordatorio en el asistente de combate.', 'Reminder in the battle assistant.'] },
  { id: 'set', grupo: 'dificultad', es: 'Modo Set', en: 'Set mode', desc: ['Sin cambio gratis cuando debilitas a un Pokémon del rival. Recordatorio en el asistente.', 'No free switch after knocking out a foe. Reminder in the assistant.'] },
  { id: 'gameover', grupo: 'dificultad', es: 'Game over si cae todo el equipo', en: 'Game over on wipe', desc: ['Si no te queda ningún Pokémon vivo, la run termina (puedes empezar un nuevo intento).', 'If no Pokémon are left alive, the run ends (you can start a new attempt).'] },
  { id: 'sinLegendarios', grupo: 'variantes', es: 'Sin legendarios', en: 'No legendaries', desc: ['Avisa si capturas un legendario o singular.', 'Warns if you catch a legendary or mythical.'] },
  { id: 'monotipo', grupo: 'variantes', tipo: 'tipo', es: 'Monotipo', en: 'Monotype', desc: ['Solo Pokémon del tipo elegido. Avisa si capturas uno que no lo es.', 'Only Pokémon of the chosen type. Warns otherwise.'] },
  { id: 'randomlocke', grupo: 'variantes', es: 'Randomlocke (juego aleatorizado)', en: 'Randomlocke (randomized game)', desc: ['Puedes registrar cualquier Pokémon en cada ruta y no se muestran sugerencias de encuentros.', 'Any Pokémon can be logged on each route and encounter suggestions are off.'] },
  { id: 'entrenadoresAleatorios', grupo: 'variantes', depende: 'randomlocke', es: 'Entrenadores también aleatorizados', en: 'Trainers randomized too', desc: ['Oculta los equipos de los jefes; puedes apuntar el equipo real cuando lo veas.', 'Hides boss teams; you can log the real team when you see it.'] }
]

export const GRUPOS_REGLAS = {
  clausulas: ['Cláusulas', 'Clauses'],
  dificultad: ['Dificultad', 'Difficulty'],
  variantes: ['Variantes', 'Variants']
}

export const PLANTILLAS = {
  clasico: {
    es: 'Nuzlocke clásico',
    en: 'Classic Nuzlocke',
    reglas: { regalos: true, variocolor: true, estaticos: true, gameover: true },
    // Ajustes de la app: índice → valor (1 sugerencias, 2 repetidos, 3 niveles máx., 0 muerte permanente)
    ajustes: { 2: '1' }
  },
  hardcore: {
    es: 'Hardcore',
    en: 'Hardcore',
    reglas: { regalos: false, variocolor: true, nivelMax: true, sinObjetos: true, set: true, gameover: true },
    ajustes: { 0: '1', 2: '2', 3: '3', 6: '1' }
  },
  randomlocke: {
    es: 'Randomlocke',
    en: 'Randomlocke',
    reglas: { regalos: true, variocolor: true, gameover: true, randomlocke: true, entrenadoresAleatorios: true },
    ajustes: { 1: '0', 3: '3' }
  },
  libre: {
    es: 'A mi manera',
    en: 'My own rules',
    reglas: {},
    ajustes: {}
  }
}

export const leerReglas = (id) => {
  if (typeof window === 'undefined' || !id) return {}
  try {
    return JSON.parse(localStorage.getItem(clave(id)) || '{}') || {}
  } catch {
    return {}
  }
}

export const guardarReglas = (id, reglas) => localStorage.setItem(clave(id), JSON.stringify(reglas))

export const aplicarAjustes = (ajustes = '', plantilla) => {
  const lista = (ajustes || '').split('')
  for (const [i, v] of Object.entries(PLANTILLAS[plantilla]?.ajustes || {})) lista[+i] = v
  return lista.map((x) => (x === undefined ? '0' : x)).join('')
}

// Recordatorios cortos para el asistente de combate
export const recordatorios = (reglas) =>
  [
    reglas.sinObjetos && (es() ? 'Sin objetos en combate' : 'No items in battle'),
    reglas.set && (es() ? 'Modo Set' : 'Set mode'),
    reglas.nivelMax && (es() ? 'Nivel máximo obligatorio' : 'Hard level caps')
  ].filter(Boolean)

// Comprueba la run contra sus reglas y devuelve avisos
export const comprobarReglas = async ({ partida, resumen, liga, pokedex }) => {
  const reglas = leerReglas(partida?.id)
  const avisos = []
  if (!partida || !resumen) return avisos

  if (reglas.gameover && resumen.muertos.length && !resumen.vivos.length) {
    avisos.push({
      nivel: 'error',
      texto: es()
        ? 'Game over: no te queda ningún Pokémon vivo. Puedes empezar un nuevo intento desde el menú de la partida.'
        : 'Game over: no Pokémon left alive. Start a new attempt from the run menu.'
    })
  }

  if (reglas.nivelMax && resumen.siguienteJefe && liga) {
    const cap = nivelMaximo(liga[resumen.siguienteJefe.value])
    let sav = null
    try {
      sav = JSON.parse(localStorage.getItem(claveSav(partida.id)) || 'null')
    } catch {}
    if (cap && sav?.equipo?.length) {
      const pasados = sav.equipo.filter((p) => p.nivel > cap)
      if (pasados.length)
        avisos.push({
          nivel: 'error',
          texto: es()
            ? `Nivel máximo ${cap} (${resumen.siguienteJefe.boss}): ${pasados.map((p) => `${p.mote} (Nv. ${p.nivel})`).join(', ')} lo ${pasados.length > 1 ? 'superan' : 'supera'}.`
            : `Level cap ${cap} (${resumen.siguienteJefe.boss}): ${pasados.map((p) => `${p.mote} (Lv. ${p.nivel})`).join(', ')} over the cap.`
        })
    } else if (cap && !sav) {
      avisos.push({
        nivel: 'info',
        texto: es()
          ? `Nivel máximo ${cap} para ${resumen.siguienteJefe.boss}. Importa tu .sav para que Lockedex vigile los niveles.`
          : `Level cap ${cap} for ${resumen.siguienteJefe.boss}. Import your .sav so Lockedex can watch levels.`
      })
    }
  }

  const capturados = resumen.encuentros.filter((e) => [1, 2, 3, 5, 6].includes(+e.status))

  if (reglas.sinLegendarios) {
    const esp = await especies()
    for (const e of capturados) {
      if (esp[clavePokemon(e.pokemon, esp)]?.l)
        avisos.push({
          nivel: 'aviso',
          texto: es() ? `${e.lugar}: ${e.nickname || e.pokemon} es legendario o singular.` : `${e.lugar}: ${e.nickname || e.pokemon} is legendary or mythical.`
        })
    }
  }

  if (reglas.monotipo && pokedex) {
    for (const e of capturados) {
      const tipos = pokedex[norm(e.pokemon)]?.types || []
      if (tipos.length && !tipos.includes(reglas.monotipo))
        avisos.push({
          nivel: 'aviso',
          texto: es()
            ? `${e.lugar}: ${e.nickname || e.pokemon} no es de tipo ${reglas.monotipo} (monotipo).`
            : `${e.lugar}: ${e.nickname || e.pokemon} is not ${reglas.monotipo} type (monotype).`
        })
    }
  }

  return avisos
}
