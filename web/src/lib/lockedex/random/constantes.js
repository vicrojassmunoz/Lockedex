// Constantes de las ROM de la 3.ª generación (Rubí, Zafiro, Esmeralda, RojoFuego y VerdeHoja), sacadas
// de los decomps de pret (pokeruby, pokeemerald, pokefirered).

// Tipos con su número en la ROM (el 9 es el tipo «???», que no lleva nadie)
export const TIPOS = ['normal', 'fighting', 'flying', 'poison', 'ground', 'rock', 'bug', 'ghost', 'steel', null, 'fire', 'water', 'grass', 'electric', 'psychic', 'ice', 'dragon', 'dark']
export const TIPOS_VALIDOS = TIPOS.map((t, i) => (t ? i : null)).filter((i) => i !== null)

// Habilidades de la 3.ª gen por número (0 = ninguna)
export const HABILIDADES = [
  null, 'stench', 'drizzle', 'speed-boost', 'battle-armor', 'sturdy', 'damp', 'limber', 'sand-veil', 'static', 'volt-absorb',
  'water-absorb', 'oblivious', 'cloud-nine', 'compound-eyes', 'insomnia', 'color-change', 'immunity', 'flash-fire', 'shield-dust',
  'own-tempo', 'suction-cups', 'intimidate', 'shadow-tag', 'rough-skin', 'wonder-guard', 'levitate', 'effect-spore', 'synchronize',
  'clear-body', 'natural-cure', 'lightning-rod', 'serene-grace', 'swift-swim', 'chlorophyll', 'illuminate', 'trace', 'huge-power',
  'poison-point', 'inner-focus', 'magma-armor', 'water-veil', 'magnet-pull', 'soundproof', 'rain-dish', 'sand-stream', 'pressure',
  'thick-fat', 'early-bird', 'flame-body', 'run-away', 'keen-eye', 'hyper-cutter', 'pickup', 'truant', 'hustle', 'cute-charm',
  'plus', 'minus', 'forecast', 'sticky-hold', 'shed-skin', 'guts', 'marvel-scale', 'liquid-ooze', 'overgrow', 'blaze', 'torrent',
  'swarm', 'rock-head', 'drought', 'arena-trap', 'vital-spirit', 'white-smoke', 'pure-power', 'shell-armor', 'cacophony', 'air-lock'
]
export const SUPERGUARDA = 25 // Wonder Guard

// Juegos por el código de la cabecera (0xAC, 4 letras; la última es el idioma)
export const JUEGOS = {
  AXV: { clave: 'ruby', nombre: 'Rubí', familia: 'rs' },
  AXP: { clave: 'saph', nombre: 'Zafiro', familia: 'rs' },
  BPE: { clave: 'em', nombre: 'Esmeralda', familia: 'e' },
  BPR: { clave: 'fr', nombre: 'RojoFuego', familia: 'frlg' },
  BPG: { clave: 'lg', nombre: 'VerdeHoja', familia: 'frlg' }
}
export const IDIOMAS = { E: 'inglés', S: 'español', F: 'francés', D: 'alemán', I: 'italiano', J: 'japonés' }

// Clases de entrenador de los jefes (para dar a cada líder especies de su tipo)
export const CLASES = {
  rs: { lider: [25], altoMando: [24], campeon: [32] },
  e: { lider: [0x20], altoMando: [0x1f], campeon: [0x26] },
  frlg: { lider: [84], altoMando: [87], campeon: [90] }
}

// Especies internas: 1–251 como en la Pokédex nacional, 252–276 vacías y 277–411 las de Hoenn
export const NUM_ESPECIES = 412
export const especieValida = (i) => (i >= 1 && i <= 251) || (i >= 277 && i <= 411)

// Iniciales originales (internas): Treecko, Torchic, Mudkip / Bulbasaur, Charmander, Squirtle
export const INICIALES = { rs: [277, 280, 283], e: [277, 280, 283], frlg: [1, 4, 7] }

// Huecos de cada tipo de encuentro
export const HUECOS = { tierra: 12, agua: 5, roca: 5, pesca: 10 }

// Tamaño de cada Pokémon del equipo de un entrenador según partyFlags (bit 0: movimientos propios; bit 1: objeto)
export const TAM_MIEMBRO = [8, 16, 8, 16]
export const TAM_ENTRENADOR = 40
export const TAM_BASE = 28
export const TAM_EVOLUCIONES = 40 // 5 evoluciones de 8 bytes por especie

// Movimientos que existen en la 3.ª gen (1–354)
export const MAX_MOVIMIENTO = 354
