// Datos de Lockedex (generados desde PokeAPI en static/lx)
import Games from '$lib/data/games.json'

const cache = {}

export const norm = (s = '') => ('' + s).toLowerCase().replace(/[^a-z0-9]/g, '')

export const cargar = (nombre) => {
  if (!cache[nombre]) {
    cache[nombre] = fetch(`/lx/${nombre}`)
      .then((r) => (r.ok ? r.json() : {}))
      .catch(() => ({}))
  }
  return cache[nombre]
}

export const movimientos = () => cargar('movimientos.json')
export const habilidades = () => cargar('habilidades.json')
export const objetos = () => cargar('objetos.json')
export const naturalezas = () => cargar('naturalezas.json')
export const especies = () => cargar('especies.json')
export const tipos = () => cargar('tipos.json')

// Grupo de versiones de PokeAPI para cada juego (por "lid" de games.json)
const GRUPO_POR_LID = {
  rb: 'red-blue',
  yel: 'yellow',
  gsc: 'crystal',
  rs: 'ruby-sapphire',
  em: 'emerald',
  frlg: 'firered-leafgreen',
  dp: 'diamond-pearl',
  plat: 'platinum',
  hgss: 'heartgold-soulsilver',
  bw: 'black-white',
  b2w2: 'black-2-white-2',
  xy: 'x-y',
  oras: 'omega-ruby-alpha-sapphire',
  sm: 'sun-moon',
  usum: 'ultra-sun-ultra-moon',
  swsh: 'sword-shield',
  bdsp: 'brilliant-diamond-shining-pearl',
  sv: 'scarlet-violet',
  // ROM hacks: se usa el juego base (puede no coincidir al 100 %)
  newgen: 'firered-leafgreen',
  radred: 'firered-leafgreen',
  unbound: 'firered-leafgreen',
  blazingem: 'emerald',
  emrunbun: 'emerald',
  glazed: 'emerald',
  emkaizo: 'emerald',
  incem: 'emerald',
  rrss: 'omega-ruby-alpha-sapphire',
  blazevolt: 'black-white',
  blazevolt2: 'black-2-white-2',
  renplat: 'platinum',
  sssg: 'heartgold-soulsilver'
}

const GEN_POR_GRUPO = {
  'red-blue': 1,
  yellow: 1,
  crystal: 2,
  'ruby-sapphire': 3,
  emerald: 3,
  'firered-leafgreen': 3,
  'diamond-pearl': 4,
  platinum: 4,
  'heartgold-soulsilver': 4,
  'black-white': 5,
  'black-2-white-2': 5,
  'x-y': 6,
  'omega-ruby-alpha-sapphire': 6,
  'sun-moon': 7,
  'ultra-sun-ultra-moon': 7,
  'sword-shield': 8,
  'brilliant-diamond-shining-pearl': 8,
  'scarlet-violet': 9
}

export const infoJuego = (clave = '') => {
  const base = Games[clave] || Games[('' + clave).replace(/[a-z]+$/i, '')] ||
    Object.values(Games).find((g) => clave.startsWith(g.pid))
  if (!base) return null
  const grupo = GRUPO_POR_LID[base.lid] || null
  return {
    clave,
    titulo: base.title,
    lid: base.lid,
    grupo,
    gen: GEN_POR_GRUPO[grupo] || 9,
    romhack: base.gen === 'romhack'
  }
}

export const aprendizaje = (grupo) =>
  grupo ? cargar(`aprendizaje/${grupo}.json`) : Promise.resolve({})

// Busca la clave de aprendizaje de un Pokémon (p. ej. "alolan-vulpix" → "vulpix-alola")
export const clavePokemon = (nombre = '', datos = {}) => {
  const n = ('' + nombre).toLowerCase().trim().replace(/[\s.'’:]+/g, '-').replace(/♀/g, '-f').replace(/♂/g, '-m')
  if (datos[n]) return n
  const regiones = { alolan: 'alola', galarian: 'galar', hisuian: 'hisui', paldean: 'paldea' }
  const m = n.match(/^(alolan|galarian|hisuian|paldean)-(.+)$/)
  if (m && datos[`${m[2]}-${regiones[m[1]]}`]) return `${m[2]}-${regiones[m[1]]}`
  const base = n.split('-')[0]
  if (datos[base]) return base
  const prefijo = Object.keys(datos).find((k) => k.startsWith(n + '-'))
  return prefijo || n
}
