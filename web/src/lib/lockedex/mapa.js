// Sprite de mapa (el personaje pequeño que anda por el juego) de cada jefe.
// Los PNG salen de herramientas/generar_sprites_mapa.py (desensamblados de pret).
import Games from '$lib/data/games.json'

let indice = null
const cargarIndice = async () => {
  if (!indice) indice = fetch('/lx/mapa/indice.json').then((r) => r.json()).catch(() => ({}))
  return indice
}

const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[^a-z0-9]/g, '')

// Qué colección usar según la región y la generación del juego
const familias = (juego) => {
  const g = Games[juego] || {}
  const gen = String(g.gen || '')
  if (g.region === 'kanto') return gen === 'I' ? ['rby', 'frlg'] : ['frlg', 'rby', 'gsc']
  if (g.region === 'johto') return ['gsc', 'frlg']
  if (g.region === 'hoenn') return ['rse', 'frlg']
  return ['rse', 'frlg', 'gsc']
}

// Nombres que no coinciden con el del archivo
const ALIAS = {
  rse: {
    may: 'rival_may_normal', brendan: 'rival_brendan_normal', tabitha: 'magma_member_m', courtney: 'magma_member_f',
    matt: 'aqua_member_m', shelly: 'aqua_member_f', grunt: 'magma_member_m', magmagrunt: 'magma_member_m', aquagrunt: 'aqua_member_m'
  },
  frlg: { gary: 'blue', rival: 'blue', grunt: 'rocket_m', rocketgrunt: 'rocket_m', ltsurge: 'lt_surge', surge: 'lt_surge' },
  gsc: {
    silver: 'rival', ltsurge: 'surge', proton: 'rocket', petrel: 'rocket', archer: 'rocket', ariana: 'rocket_girl',
    executive: 'rocket', grunt: 'rocket', gary: 'blue'
  },
  rby: { gary: 'blue', rival: 'blue', grunt: 'rocket', ltsurge: 'oak' }
}
// Si el nombre no está, un personaje genérico según el tipo de jefe
const GENERICO = {
  rse: { rival: 'rival_brendan_normal', 'evil-team': 'magma_member_m', 'elite-four': 'expert_m' },
  frlg: { rival: 'blue', 'evil-team': 'rocket_m', 'elite-four': 'cooltrainer_m' },
  gsc: { rival: 'rival', 'evil-team': 'rocket', 'elite-four': 'cooltrainer_m' },
  rby: { rival: 'blue', 'evil-team': 'rocket', 'elite-four': 'cooltrainer_m' }
}

export const spriteMapa = async ({ juego, nombre, grupo }) => {
  const idx = await cargarIndice()
  const n = norm(nombre)
  const partes = String(nombre || '').split(/\s*(?:&|and|y|\/)\s*/i).map(norm).filter(Boolean)
  for (const f of familias(juego)) {
    const lista = idx[f] || []
    const porNorma = new Map(lista.map((k) => [norm(k), k]))
    const alias = ALIAS[f]?.[n]
    if (alias && lista.includes(alias)) return `/lx/mapa/${f}/${alias}.png`
    if (porNorma.has(n)) return `/lx/mapa/${f}/${porNorma.get(n)}.png`
    for (const p of partes) if (porNorma.has(p)) return `/lx/mapa/${f}/${porNorma.get(p)}.png`
  }
  // Genérico solo con la colección principal del juego
  const [principal] = familias(juego)
  const generico = GENERICO[principal]?.[grupo]
  return generico && (idx[principal] || []).includes(generico) ? `/lx/mapa/${principal}/${generico}.png` : null
}
