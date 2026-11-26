// Efectividad de tipos contando la habilidad del que recibe el golpe: Gengar con Levitación (hasta la
// 6.ª gen) no es débil a Tierra, es inmune; Vaporeon con Absorbe Agua no recibe daño del Agua…
//
// Las habilidades de cada especie por generación salen de web/static/lx/habilidades-especie.json
// (herramientas/habilidades_especies.py, de PokeAPI). Sin .sav no se sabe cuál tiene tu Pokémon: con
// varias posibles cuenta lo peor para ti (solo vale lo que dan todas). La oculta no se cuenta salvo que
// se diga (en los juegos casi nunca sale).
import { moveResistance } from '$utils/advice/advisor-types'

const n = (h = '') => String(h).toLowerCase().replace(/[^a-z]/g, '')

// Lo que cambia cada habilidad en el daño recibido por tipo: [multiplicadores, desde qué generación]
const DEFENSA = {
  levitate: [{ ground: 0 }, 3],
  flashfire: [{ fire: 0 }, 3],
  waterabsorb: [{ water: 0 }, 3],
  voltabsorb: [{ electric: 0 }, 3],
  thickfat: [{ fire: 0.5, ice: 0.5 }, 3],
  dryskin: [{ water: 0, fire: 1.25 }, 4],
  motordrive: [{ electric: 0 }, 4],
  heatproof: [{ fire: 0.5 }, 4],
  stormdrain: [{ water: 0 }, 5],
  lightningrod: [{ electric: 0 }, 5],
  sapsipper: [{ grass: 0 }, 5],
  waterbubble: [{ fire: 0.5 }, 7],
  purifyingsalt: [{ ghost: 0.5 }, 9],
  eartheater: [{ ground: 0 }, 9],
  wellbakedbody: [{ fire: 0 }, 9]
}

const conHabilidad = (base, atq, h, gen) => {
  if (h === 'wonderguard') return base >= 2 ? base : 0
  const d = DEFENSA[h]
  if (!d || gen < d[1] || !(atq in d[0])) return base
  return base * d[0][atq]
}

/** Multiplicador del tipo «atq» contra «tipos», con la habilidad (o las posibles) del que recibe */
export const efectividad = (atq, tipos = [], habilidades = [], gen = 9) => {
  let base
  try {
    base = moveResistance(atq, tipos)
  } catch {
    base = 1
  }
  const lista = (Array.isArray(habilidades) ? habilidades : [habilidades]).filter(Boolean).map(n)
  if (!lista.length || gen < 3) return base
  return Math.max(...lista.map((h) => conHabilidad(base, atq, h, gen)))
}

/** Si la habilidad cambia la efectividad de «atq»: la habilidad (para explicarlo: «Inmune a Tierra (Levitación)») */
export const habilidadQueCuenta = (atq, tipos = [], habilidades = [], gen = 9) => {
  const lista = (Array.isArray(habilidades) ? habilidades : [habilidades]).filter(Boolean)
  if (!lista.length || gen < 3) return null
  let base
  try {
    base = moveResistance(atq, tipos)
  } catch {
    base = 1
  }
  const con = efectividad(atq, tipos, lista, gen)
  return con !== base ? lista[0] : null
}

// --- Habilidades posibles de una especie en una generación ------------------------------------------
let tabla = null
export const cargarHabilidadesEspecie = () => {
  if (typeof fetch === 'undefined') return Promise.resolve({})
  return (tabla ||= fetch('/lx/habilidades-especie.json')
    .then((r) => (r.ok ? r.json() : {}))
    .catch(() => ({})))
}

const claveEspecie = (alias = '', t = {}) => {
  const a = String(alias).toLowerCase().trim().replace(/[\s.'’:]+/g, '-').replace(/♀/g, '-f').replace(/♂/g, '-m')
  if (t[a]) return a
  const regiones = { alolan: 'alola', galarian: 'galar', hisuian: 'hisui', paldean: 'paldea' }
  const m = a.match(/^(alolan|galarian|hisuian|paldean)-(.+)$/)
  if (m && t[`${m[2]}-${regiones[m[1]]}`]) return `${m[2]}-${regiones[m[1]]}`
  if (t[a.split('-')[0]]) return a.split('-')[0]
  return Object.keys(t).find((k) => k.startsWith(a + '-')) || a
}

/** { normales: ['levitate'], oculta: null } de una especie en una generación (síncrono, con la tabla ya cargada) */
export const habilidadesDe = (t, alias, gen = 9) => {
  if (gen < 3) return { normales: [], oculta: null }
  const cambios = t?.[claveEspecie(alias, t)] || []
  let r = null
  for (const c of cambios) if (c[0] <= gen) r = c
  return r ? { normales: r[1], oculta: r[2] } : { normales: [], oculta: null }
}

/** Lista de habilidades a tener en cuenta para un Pokémon: la del .sav si se sabe; si no, las normales de su especie */
export const habilidadesPara = (t, alias, gen, conocida = null) => (conocida ? [conocida] : habilidadesDe(t, alias, gen).normales)

// --- Para la ventana antigua de «Preparar el equipo contra…» (utils/advice) ----------------------------
const TIPOS_TODOS = ['normal', 'fire', 'water', 'grass', 'electric', 'ice', 'fighting', 'poison', 'ground', 'flying', 'psychic', 'bug', 'rock', 'ghost', 'dragon', 'dark', 'steel', 'fairy']

/** Lo que recibe un Pokémon ({ types, habilidades?, gen? }) de un ataque de tipo «atq» */
export const resistenciaDe = (atq, mon) =>
  mon?.habilidades?.length ? efectividad(atq, mon.types || [], mon.habilidades, mon.gen || 9) : efectividad(atq, mon?.types || [])

/** Mapa { tipo: multiplicador } solo con lo que no es neutro (como «weaknesses» de utils/advice/types) */
export const debilidadesDe = (mon) => {
  const r = {}
  for (const t of TIPOS_TODOS) {
    let m = resistenciaDe(t, mon)
    // la ventana antigua solo sabe pintar ×0, ×¼, ×½, ×2 y ×4 (Piel Seca da ×1,25 al Fuego)
    if (m > 1 && m < 2) m = 1
    else if (m > 2) m = m >= 4 ? 4 : 2
    else if (m > 0.5 && m < 1) m = 0.5
    if (m !== 1) r[t] = m
  }
  return r
}
