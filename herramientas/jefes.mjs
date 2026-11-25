// Equipos de los jefes: formato compacto (datos/jefes/<juego>.json) ⇄ formato detallado que usa la app
// (web/static/api/league/<juego>.<inicial>.json).
//
// El compacto guarda nombres cortos («tackle», «rock-head», «sitrus-berry») y solo lo que no se puede
// calcular. Lo demás (potencia, tipo, clase, nombres, sprite, tipos y estadísticas) sale de los datos
// base de Lockedex más el parche del juego. Si algo no coincide con el cálculo, se guarda tal cual,
// así que compacto → detallado reproduce exactamente el original.
import fs from 'node:fs'
import path from 'node:path'

export const INICIALES = ['fire', 'grass', 'water']
const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[^a-z0-9]/g, '')
const kebab = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
const igual = (a, b) => JSON.stringify(a) === JSON.stringify(b)
const CALCULADOS = ['sprite', 'types', 'stats']

// Hasta la 3.ª generación la clase de un ataque dependía de su tipo
const FISICOS = ['normal', 'fighting', 'flying', 'poison', 'ground', 'rock', 'bug', 'ghost', 'steel']
const ROMANOS = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7, VIII: 8, IX: 9 }
export const numeroGen = (gen) => (typeof gen === 'number' ? gen : ROMANOS[String(gen || '').toUpperCase()] || +gen || 9)

export const cargarBase = (raiz) => {
  const leer = (...p) => JSON.parse(fs.readFileSync(path.join(raiz, ...p), 'utf8'))
  const movs = leer('web', 'static', 'lx', 'movimientos.json')
  const habs = leer('web', 'static', 'lx', 'habilidades.json')
  const objs = leer('web', 'static', 'lx', 'objetos.json')
  const pokedex = {}
  for (const p of leer('web', 'src', 'routes', 'api', 'pokemon.json', '_pokemon.json')) {
    if (p.alias && !pokedex[norm(p.alias)]) pokedex[norm(p.alias)] = p
  }
  const porNombre = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [norm(v.en), k]))
  return { movs, habs, objs, pokedex, movPorNombre: porNombre(movs), habPorNombre: porNombre(habs), objPorNombre: porNombre(objs) }
}

// --- Cálculo de cada pieza a partir de su nombre corto --------------------------------------------
const movimiento = (slug, base, parche = {}, gen = 9) => {
  const p = parche.move?.[slug] || {}
  const hp = /^hidden-power-([a-z]+)$/.exec(slug)
  let m
  if (hp) m = { power: '60', type: hp[1], damage_class: 'special', name: 'Hidden Power' }
  else {
    const b = base.movs[norm(slug)]
    if (!b && !p.name) return null
    m = { power: b?.potencia ?? null, type: b?.tipo, damage_class: b?.clase, name: b?.en }
    if (b?.prioridad) m.priority = b.prioridad
    if (gen <= 3 && m.damage_class !== 'status' && m.type) m.damage_class = FISICOS.includes(m.type) ? 'physical' : 'special'
  }
  for (const k of ['power', 'type', 'damage_class', 'name', 'priority']) if (p[k] !== undefined) m[k] = p[k]
  const salida = {}
  if (m.power !== null && m.power !== undefined) salida.power = m.power
  salida.type = m.type
  salida.damage_class = m.damage_class
  salida.name = m.name
  salida.effect = ''
  if (m.priority) salida.priority = m.priority
  return salida
}

const habilidad = (slug, base, parche = {}) => {
  const nombre = parche.ability?.[slug]?.name ?? base.habs[norm(slug)]?.en
  return nombre ? { name: nombre, effect: '' } : null
}

const objeto = (slug, base, parche = {}) => {
  const p = parche.item?.[slug] || {}
  const nombre = p.name ?? base.objs[norm(slug)]?.en
  return nombre ? { sprite: p.sprite ?? slug, name: nombre, effect: '' } : null
}

const calculados = (nombre, base, parche = {}) => {
  const fake = parche.fakemon?.[nombre]
  if (fake) return { sprite: fake.sprite, types: fake.types, stats: fake.baseStats }
  const b = base.pokedex[norm(nombre)]
  if (!b) return null
  const p = parche.pokemon?.[nombre] || {}
  return {
    sprite: p.sprite ?? String(b.imgId ?? b.sprite),
    types: p.types ?? b.types,
    stats: { ...b.baseStats, ...(p.stats || {}) }
  }
}

// --- Compacto → detallado ---------------------------------------------------------------------------
export const expandirPokemon = (c, base, parche, gen) => {
  const salida = {}
  for (const [k, v] of Object.entries(c)) {
    if (k === 'calc') continue
    if (k === 'moves') salida.moves = v.map((m) => (typeof m === 'string' ? movimiento(m, base, parche, gen) : m))
    else if (k === 'ability' && typeof v === 'string') salida.ability = habilidad(v, base, parche)
    else if (k === 'held' && typeof v === 'string') salida.held = objeto(v, base, parche)
    else salida[k] = v
  }
  if (c.calc !== false) {
    const extra = calculados(c.name, base, parche) || {}
    for (const k of CALCULADOS) if (!(k in salida) && extra[k] !== undefined) salida[k] = extra[k]
  }
  return salida
}

export const expandirJuego = (compacto, base, parche, gen) => {
  const porInicial = {}
  for (const inicial of INICIALES) {
    const liga = {}
    for (const [id, jefe] of Object.entries(compacto)) {
      const copia = {}
      for (const [k, v] of Object.entries(jefe)) {
        copia[k] =
          k === 'pokemon'
            ? v.filter((p) => !p.starter || p.starter === inicial).map((p) => expandirPokemon(p, base, parche, gen))
            : v
      }
      liga[id] = copia
    }
    porInicial[inicial] = liga
  }
  return porInicial
}

// --- Detallado → compacto (para la migración y para revisar) -------------------------------------------
const slugMovimiento = (m, base, parche = {}) => {
  if (m?.name === 'Hidden Power' && m.type) return `hidden-power-${m.type}`
  const delParche = Object.entries(parche.move || {}).find(([, v]) => v.name && norm(v.name) === norm(m?.name))
  if (delParche) return delParche[0]
  const clave = base.movPorNombre[norm(m?.name)]
  return clave ? kebab(base.movs[clave].en) : kebab(m?.name)
}
const slugHabilidad = (a, base, parche = {}) => {
  const delParche = Object.entries(parche.ability || {}).find(([, v]) => v.name && v.name === a?.name)
  if (delParche) return delParche[0]
  const clave = base.habPorNombre[norm(a?.name)]
  return clave ? kebab(base.habs[clave].en) : kebab(a?.name)
}
const slugObjeto = (o, base, parche = {}) => {
  const delParche = Object.entries(parche.item || {}).find(([, v]) => v.name === o?.name)
  if (delParche) return delParche[0]
  return o?.sprite || kebab(o?.name)
}

export const compactarPokemon = (p, base, parche, gen) => {
  const c = {}
  for (const [k, v] of Object.entries(p)) {
    if (k === 'moves') {
      c.moves = v.map((m) => {
        if (typeof m !== 'object' || !m) return m
        const s = slugMovimiento(m, base, parche)
        return igual(movimiento(s, base, parche, gen), m) ? s : m
      })
    } else if (k === 'ability' && v && typeof v === 'object') {
      const s = slugHabilidad(v, base, parche)
      c.ability = igual(habilidad(s, base, parche), v) ? s : v
    } else if (k === 'held' && v && typeof v === 'object') {
      const s = slugObjeto(v, base, parche)
      c.held = igual(objeto(s, base, parche), v) ? s : v
    } else c[k] = v
  }
  // Quitar sprite/tipos/estadísticas si se calculan igual (y en el mismo sitio)
  const sinCalc = Object.fromEntries(Object.entries(c).filter(([k]) => !CALCULADOS.includes(k)))
  if (igual(expandirPokemon(sinCalc, base, parche, gen), p)) return sinCalc
  if (igual(expandirPokemon(c, base, parche, gen), p)) return c
  return { ...c, calc: false }
}

// Junta los tres ficheros (uno por inicial) en uno. Cada Pokémon está en los tres o solo en el de su
// inicial (con «starter»); se intercalan respetando el orden de cada fichero.
export const compactarJuego = (porInicial, base, parche, gen) => {
  const [primera] = INICIALES
  const compacto = {}
  for (const id of Object.keys(porInicial[primera])) {
    const jefe = porInicial[primera][id]
    const copia = {}
    for (const [k, v] of Object.entries(jefe)) {
      if (k !== 'pokemon') {
        copia[k] = v
        continue
      }
      const listas = INICIALES.map((i) => porInicial[i]?.[id]?.pokemon || [])
      const juntos = []
      const pos = INICIALES.map(() => 0)
      while (pos.some((p, i) => p < listas[i].length)) {
        // ¿El siguiente de cada lista es común a todas?
        const siguientes = listas.map((l, i) => l[pos[i]])
        const comun = siguientes.every((s) => s && igual(s, siguientes[0]) && !s.starter)
        if (comun) {
          juntos.push(siguientes[0])
          pos.forEach((_, i) => pos[i]++)
          continue
        }
        // Si no, saca primero los propios de cada inicial
        let avanzado = false
        listas.forEach((l, i) => {
          const s = l[pos[i]]
          if (s && s.starter) {
            juntos.push(s)
            pos[i]++
            avanzado = true
          }
        })
        if (!avanzado) {
          // Caso raro: listas que no cuadran; se guarda cada uno con su inicial
          listas.forEach((l, i) => {
            const s = l[pos[i]]
            if (s) {
              juntos.push({ ...s, starter: s.starter || INICIALES[i] })
              pos[i]++
            }
          })
        }
      }
      copia.pokemon = juntos.map((p) => compactarPokemon(p, base, parche, gen))
    }
    compacto[id] = copia
  }
  return compacto
}

// Liga compacta para web/src/lib/data/league.json (la usa la hoja de estilos de objetos)
export const ligaResumida = (compacto) =>
  Object.fromEntries(
    Object.entries(compacto).map(([id, j]) => [
      id,
      {
        ...Object.fromEntries(Object.entries(j).filter(([k]) => k !== 'pokemon')),
        pokemon: j.pokemon.map((p) => ({
          name: p.name,
          level: p.level,
          moves: p.moves.map((m) => (typeof m === 'string' ? m : kebab(m?.name))),
          ...(p.ability ? { ability: typeof p.ability === 'string' ? p.ability : kebab(p.ability.name) } : {}),
          ...(p.held ? { held: typeof p.held === 'string' ? p.held : p.held.sprite || kebab(p.held.name) } : {}),
          ...(p.starter ? { starter: p.starter } : {})
        }))
      }
    ])
  )
