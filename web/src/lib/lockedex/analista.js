// Modo Analista: datos y utilidades para montar equipos sin partida
import { movimientos, naturalezas, especies, aprendizaje, clavePokemon, norm, infoJuego } from './datos.js'
import { idioma } from './idioma.js'

const es = () => idioma() === 'es'

// --- Calculadora de Smogon (Pokédex, habilidades, objetos y movimientos por generación)
const calcs = {}
export const cargarCalc = async (gen) => {
  const calc = await import('@smogon/calc')
  if (!calcs[gen]) {
    const g = calc.Generations.get(gen)
    const especiesGen = [...g.species]
      .filter((s) => !s.isNonstandard || s.isNonstandard === 'Past')
      .filter((s) => !/-(Gmax|Mega|Totem|Primal)/.test(s.name))
      .map((s) => ({ nombre: s.name, id: s.id, tipos: s.types.map((t) => t.toLowerCase()), habilidades: Object.values(s.abilities || {}), base: s.baseStats }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre))
    calcs[gen] = {
      calc,
      g,
      especies: especiesGen,
      porId: Object.fromEntries(especiesGen.map((s) => [s.id, s])),
      objetos: [...g.items].map((i) => i.name).sort(),
      movimientos: [...g.moves].filter((m) => m.name !== '(No Move)').map((m) => m.name).sort()
    }
  }
  return calcs[gen]
}

export const buscarEspecie = (datos, nombre) => datos?.porId?.[norm(nombre)] || null

// --- Pokédex de la app (sprites) por juego
const pokedexCache = {}
export const cargarPokedex = (clave) => {
  pokedexCache[clave] ||= fetch(`/api/pokemon/${clave}.json`)
    .then((r) => (r.ok ? r.json() : []))
    .then((lista) => Object.fromEntries((lista || []).map((p) => [norm(p.alias), p])))
    .catch(() => ({}))
  return pokedexCache[clave]
}

export const urlSprite = (pokedex, nombre) => {
  const p = pokedex?.[norm(nombre)] || pokedex?.[norm(('' + nombre).replace(/-.*/, ''))]
  return p?.imgId ? `/assets/img/pokemon/base-${p.imgId}.png` : null
}

// --- Movimientos sugeridos: los que aprende por nivel hasta ese nivel y por MT
export const movimientosSugeridos = async (clave, especie, nivel = 100) => {
  const info = infoJuego(clave)
  const [tabla, movs] = await Promise.all([aprendizaje(info?.grupo), movimientos()])
  const k = clavePokemon(especie, tabla?.nivel || {})
  const porNivel = (tabla?.nivel?.[k] || []).filter(([nv]) => nv <= nivel).map(([nv, m]) => ({ nv, m: movs[m] })).filter((x) => x.m)
  const mt = (tabla?.mt?.[k] || []).map((m) => movs[m]).filter(Boolean)
  return { porNivel, mt }
}

// Los 4 últimos que aprende por nivel, priorizando los de daño
export const movimientosPorDefecto = async (clave, especie, nivel) => {
  const { porNivel } = await movimientosSugeridos(clave, especie, nivel)
  const vistos = new Set()
  const lista = []
  for (const x of [...porNivel].reverse()) {
    if (vistos.has(x.m.en)) continue
    vistos.add(x.m.en)
    lista.push(x.m)
  }
  const ataque = lista.filter((m) => m.clase !== 'status')
  const estado = lista.filter((m) => m.clase === 'status')
  return [...ataque.slice(0, 3), ...estado, ...ataque.slice(3)].slice(0, 4).map((m) => m.en)
}

// --- Presets de IVs y EVs
export const PRESETS_IV = {
  medio: { es: 'Medios (15)', en: 'Average (15)', v: 15 },
  perfecto: { es: 'Perfectos (31)', en: 'Perfect (31)', v: 31 },
  cero: { es: 'Mínimos (0)', en: 'Minimum (0)', v: 0 }
}
export const PRESETS_EV = {
  cero: { es: 'Sin entrenar (0)', en: 'None (0)' },
  ruta: { es: 'Run normal (~20 por stat)', en: 'Normal run (~20 each)' },
  ataque: { es: 'Ofensivo (252 Atq/AtEsp + Vel)', en: 'Offensive (252 Atk/SpA + Spe)' },
  defensa: { es: 'Defensivo (252 PS + Def/DefEsp)', en: 'Defensive (252 HP + Def/SpD)' }
}

export const ivsDe = (preset) => {
  const v = PRESETS_IV[preset]?.v ?? 15
  return { hp: v, atk: v, def: v, spa: v, spd: v, spe: v }
}

export const evsDe = (preset, especie) => {
  const cero = { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 }
  if (preset === 'ruta') return { hp: 20, atk: 20, def: 20, spa: 20, spd: 20, spe: 20 }
  const fisico = (especie?.base?.atk || 0) >= (especie?.base?.spa || 0)
  if (preset === 'ataque') return { ...cero, [fisico ? 'atk' : 'spa']: 252, spe: 252, hp: 4 }
  if (preset === 'defensa') return { ...cero, hp: 252, [fisico ? 'def' : 'spd']: 252, [fisico ? 'spd' : 'def']: 4 }
  return cero
}

// --- Miembro vacío
export const miembroVacio = (nivel = 50) => ({
  especie: '',
  mote: '',
  nivel,
  naturaleza: 'hardy',
  habilidad: '',
  objeto: '',
  iv: 'medio',
  ev: 'cero',
  movimientos: ['', '', '', '']
})

// --- Preparar el equipo para el cálculo de riesgo
export const paraCalculo = async (equipo, datosCalc, delta = 0) => {
  const movs = await movimientos()
  return equipo
    .filter((m) => m.especie)
    .map((m) => {
      const sp = buscarEspecie(datosCalc, m.especie)
      return {
        nombre: m.mote || sp?.nombre || m.especie,
        alias: norm(m.especie),
        especie: sp?.nombre || m.especie,
        types: sp?.tipos || [],
        nivel: Math.max(1, Math.min(100, (+m.nivel || 50) + delta)),
        movimientos: m.movimientos.map((x) => movs[norm(x)]?.id).filter(Boolean),
        naturaleza: m.naturaleza,
        habilidadNombre: m.habilidad || sp?.habilidades?.[0],
        objeto: m.objeto,
        ivs: m.iv === 'exacto' && m.ivExacto ? m.ivExacto : ivsDe(m.iv),
        evs: m.ev === 'exacto' && m.evExacto ? m.evExacto : evsDe(m.ev, sp)
      }
    })
}

// --- Equipo aleatorio con características
export const equipoAleatorio = async ({ datosCalc, clave, nivel, tipo = '', sinLegendarios = true, soloCapturables = null, cantidad = 6 }) => {
  const esp = await especies()
  let candidatos = datosCalc.especies.filter((s) => !/-/.test(s.nombre) || /-(Alola|Galar|Hisui|Paldea)$/.test(s.nombre))
  if (tipo) candidatos = candidatos.filter((s) => s.tipos.includes(tipo))
  if (sinLegendarios) candidatos = candidatos.filter((s) => !esp[clavePokemon(s.nombre, esp)]?.l)
  if (soloCapturables?.size) candidatos = candidatos.filter((s) => soloCapturables.has(norm(s.nombre)))
  const elegidos = []
  const pool = [...candidatos]
  while (elegidos.length < cantidad && pool.length) {
    const i = Math.floor(Math.random() * pool.length)
    elegidos.push(pool.splice(i, 1)[0])
  }
  return Promise.all(
    elegidos.map(async (s) => ({
      ...miembroVacio(nivel),
      especie: s.nombre,
      habilidad: s.habilidades[0] || '',
      naturaleza: (await naturalezasLista())[Math.floor(Math.random() * 25)].id,
      movimientos: [...(await movimientosPorDefecto(clave, s.nombre, nivel)), '', '', '', ''].slice(0, 4)
    }))
  )
}

export const naturalezasLista = async () => {
  const n = await naturalezas()
  return Object.values(n)
    .filter((x, i, a) => a.findIndex((y) => y.id === x.id) === i)
    .map((x) => ({ id: x.en.toLowerCase(), nombre: es() ? x.es : x.en, sube: x.sube, baja: x.baja }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre))
}

// --- Formato Showdown (estándar de la comunidad) -------------------------------
const STAT_SD = { hp: 'HP', atk: 'Atk', def: 'Def', spa: 'SpA', spd: 'SpD', spe: 'Spe' }

export const aShowdown = (equipo, datosCalc) =>
  equipo
    .filter((m) => m.especie)
    .map((m) => {
      const sp = buscarEspecie(datosCalc, m.especie)
      const nombre = sp?.nombre || m.especie
      const lineas = [`${m.mote && m.mote !== nombre ? `${m.mote} (${nombre})` : nombre}${m.objeto ? ` @ ${m.objeto}` : ''}`]
      if (m.habilidad) lineas.push(`Ability: ${m.habilidad}`)
      lineas.push(`Level: ${m.nivel}`)
      const evs = m.ev === 'exacto' && m.evExacto ? m.evExacto : evsDe(m.ev, sp)
      const evTxt = Object.entries(evs).filter(([, v]) => v).map(([k, v]) => `${v} ${STAT_SD[k]}`).join(' / ')
      if (evTxt) lineas.push(`EVs: ${evTxt}`)
      lineas.push(`${m.naturaleza.charAt(0).toUpperCase() + m.naturaleza.slice(1)} Nature`)
      const ivs = m.iv === 'exacto' && m.ivExacto ? m.ivExacto : ivsDe(m.iv)
      const ivTxt = Object.entries(ivs).filter(([, v]) => v !== 31).map(([k, v]) => `${v} ${STAT_SD[k]}`).join(' / ')
      if (ivTxt) lineas.push(`IVs: ${ivTxt}`)
      for (const mv of m.movimientos.filter(Boolean)) lineas.push(`- ${mv}`)
      return lineas.join('\n')
    })
    .join('\n\n')

export const deShowdown = (texto, nivelPorDefecto = 50) => {
  const bloques = texto.replace(/\r/g, '').split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean)
  return bloques.slice(0, 6).map((b) => {
    const lineas = b.split('\n').map((l) => l.trim())
    const m = miembroVacio(nivelPorDefecto)
    const [cab, objeto] = lineas[0].split(' @ ')
    const conMote = cab.match(/^(.*)\((.+)\)\s*(\([MF]\))?$/)
    const sinGenero = cab.replace(/\s*\([MF]\)\s*$/, '')
    if (conMote && !/^[MF]$/.test(conMote[2])) {
      m.mote = conMote[1].trim()
      m.especie = conMote[2].trim()
    } else m.especie = sinGenero.trim()
    m.objeto = (objeto || '').trim()
    const movs = []
    let ivs = null
    let evs = null
    for (const l of lineas.slice(1)) {
      if (l.startsWith('Ability:')) m.habilidad = l.slice(8).trim()
      else if (l.startsWith('Level:')) m.nivel = +l.slice(6).trim() || nivelPorDefecto
      else if (/Nature$/.test(l)) m.naturaleza = l.replace(/Nature$/, '').trim().toLowerCase()
      else if (l.startsWith('IVs:')) ivs = l
      else if (l.startsWith('EVs:')) evs = l
      else if (l.startsWith('-')) movs.push(l.slice(1).trim().replace(/^Hidden Power \[(.+)\]$/, 'Hidden Power'))
    }
    if (ivs) {
      const vals = [...ivs.matchAll(/(\d+)/g)].map((x) => +x[1])
      const media = vals.reduce((a, b) => a + b, 0) / vals.length
      m.iv = media >= 28 ? 'perfecto' : media <= 3 ? 'cero' : 'medio'
    } else m.iv = 'perfecto'
    if (evs) {
      const total = [...evs.matchAll(/(\d+)/g)].reduce((a, x) => a + +x[1], 0)
      m.ev = total >= 400 ? (/252 (Atk|SpA)/.test(evs) ? 'ataque' : 'defensa') : total > 0 ? 'ruta' : 'cero'
    }
    m.movimientos = [...movs, '', '', '', ''].slice(0, 4)
    return m
  })
}

// --- Equipos guardados
const CLAVE_EQUIPOS = 'lockedex.analista.equipos'
const CLAVE_ACTUAL = 'lockedex.analista.actual'

export const leerEquipos = () => {
  try {
    return JSON.parse(localStorage.getItem(CLAVE_EQUIPOS) || '[]')
  } catch {
    return []
  }
}
export const guardarEquipos = (lista) => localStorage.setItem(CLAVE_EQUIPOS, JSON.stringify(lista))

export const leerActual = () => {
  try {
    return JSON.parse(localStorage.getItem(CLAVE_ACTUAL) || 'null')
  } catch {
    return null
  }
}
export const guardarActual = (estado) => localStorage.setItem(CLAVE_ACTUAL, JSON.stringify(estado))
