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
const familias = (juego) => ['dppt', ...familiasGBA(juego)] // Platino (NDS) primero, si tiene al personaje
const familiasGBA = (juego) => {
  const g = Games[juego] || {}
  const gen = String(g.gen || '')
  if (g.region === 'kanto') return gen === 'I' ? ['rby', 'frlg'] : ['frlg', 'rby', 'gsc']
  if (g.region === 'johto') return ['gsc', 'frlg']
  if (g.region === 'hoenn') return ['rse', 'frlg']
  return ['rse', 'frlg', 'gsc']
}

// Nombres que no coinciden con el del archivo
const ALIAS = {
  dppt: { wake: 'crasher_wake', crasherwake: 'crasher_wake', oak: 'prof_oak', rowan: 'prof_rowan', grunt: 'grunt_m' },
  rse: {
    may: 'rival_may_normal', brendan: 'rival_brendan_normal', tabitha: 'magma_member_m', courtney: 'magma_member_f',
    matt: 'aqua_member_m', shelly: 'aqua_member_f', grunt: 'magma_member_m', magmagrunt: 'magma_member_m', aquagrunt: 'aqua_member_m'
  },
  frlg: { gary: 'blue', rival: 'blue', grunt: 'rocket_m', rocketgrunt: 'rocket_m', ltsurge: 'lt_surge', surge: 'lt_surge' },
  gsc: {
    silver: 'rival', ltsurge: 'surge', eusine: 'super_nerd', proton: 'rocket', petrel: 'rocket', archer: 'rocket', ariana: 'rocket_girl',
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
  const [principal] = familiasGBA(juego)
  const generico = GENERICO[principal]?.[grupo]
  return generico && (idx[principal] || []).includes(generico) ? `/lx/mapa/${principal}/${generico}.png` : null
}

// Sprite del mapa del avatar del perfil (p. ej. «rs-may» → la May de Esmeralda andando).
// Prueba el nombre tal cual y con «_normal» (los protagonistas), en las colecciones de su región.
// Si un personaje está en varias, gana la de NDS más nueva (Platino) y luego las de GBA/GB
const FAMILIAS_AVATAR = {
  frlg: ['dppt', 'frlg', 'rby', 'gsc'],
  rs: ['dppt', 'rse', 'frlg'],
  gs: ['dppt', 'gsc', 'frlg'],
  dp: ['dppt', 'rse', 'frlg', 'gsc'],
  blwh: ['dppt', 'rse', 'frlg', 'gsc']
}
export const POR_DEFECTO_AVATAR = '/lx/mapa/frlg/red_normal.png'
export const spriteAvatar = async (id) => {
  const [prefijo, ...resto] = String(id || '').split('-')
  const nombre = norm(resto.join('-'))
  if (!nombre) return null
  const sinNumero = nombre.replace(/\d+$/, '') // «misty2», «blue-1»
  const primero = norm(resto[0]) // «maxie-courtney» → maxie
  const idx = await cargarIndice()
  for (const f of FAMILIAS_AVATAR[prefijo] || ['frlg', 'rse', 'gsc']) {
    const porNorma = new Map((idx[f] || []).map((k) => [norm(k), k]))
    const candidatos = [nombre, sinNumero, primero].flatMap((n) => [n, n + 'normal', ALIAS[f]?.[n]])
    for (const n of candidatos.filter(Boolean)) {
      const k = porNorma.get(norm(n)) || ((idx[f] || []).includes(n) ? n : null)
      if (k) return `/lx/mapa/${f}/${k}.png`
    }
  }
  return null
}
