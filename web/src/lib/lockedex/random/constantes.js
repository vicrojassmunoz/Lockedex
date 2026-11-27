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

// Clases de entrenador de los jefes (para dar a cada líder especies de su tipo) y de los importantes
// (rivales, líderes y jefes de los equipos malvados), que no son jefes pero salen en la historia
export const CLASES = {
  rs: { lider: [25], altoMando: [24], campeon: [32], importante: [2, 4, 46, 49, 51] },
  e: { lider: [0x20], altoMando: [0x1f], campeon: [0x26], importante: [0x0b, 0x0d, 0x31, 0x32, 0x35] },
  frlg: { lider: [84], altoMando: [87], campeon: [90], importante: [81, 83, 89] }
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
export const FORCEJEO = 165

// MT01–MT50 y MO01–MO08 de las cinco ediciones (la misma lista en todas)
export const MT_ORIGINALES = [
  264, 337, 352, 347, 46, 92, 258, 339, 331, 237, 241, 269, 58, 59, 63, 113, 182, 240, 202, 219, 218, 76, 231, 85, 87, 89, 216, 91, 94,
  247, 280, 104, 115, 351, 53, 188, 201, 126, 317, 332, 259, 263, 290, 156, 213, 168, 211, 285, 289, 315,
  15, 19, 57, 70, 148, 249, 127, 291
]
export const NUM_MT = 50
export const NUM_MO = 8
// Excavar (MT28) y Daño Secreto (MT43) también se usan fuera de combate
export const MT_DE_CAMPO = [27, 42]
// Tutores: Esmeralda tiene 30 y RojoFuego/VerdeHoja los 15 primeros (Rubí y Zafiro no tienen)
export const TUTORES_ORIGINALES = [5, 14, 25, 34, 38, 68, 69, 102, 118, 135, 138, 86, 153, 157, 164, 223, 205, 244, 173, 196, 203, 189, 8, 207, 214, 129, 111, 9, 7, 210]
export const NUM_TUTORES = { e: 30, frlg: 15 }
// Movimientos que no tiene gracia enseñar (Salpicadura, Transformación, Esquema, Forcejeo)
export const MOVIMIENTOS_INUTILES = [150, 144, 166, 165]

// Objetos: los mismos números en las cinco ediciones (pokeemerald/include/constants/items.h)
export const NUM_OBJETOS = 377
const rango = (a, z) => Array.from({ length: z - a + 1 }, (_, k) => a + k)
export const OBJ = { MASTER_BALL: 1, ULTRA_BALL: 2, SUPER_BALL: 3, POKE_BALL: 4, POCION: 13, MT01: 289, MO01: 339 }
export const esMT = (i) => i >= 289 && i <= 338
export const esMO = (i) => i >= 339 && i <= 346
// Objetos clave (bicis, cañas, tickets, fósiles de la historia…) y huecos sin objeto: nunca se mueven
export const esObjetoClave = (i) => (i >= 259 && i <= 288) || i >= 347 || i === 0
// Grupos para elegir objetos al azar con sentido (y no 50 pañuelos y cartas)
export const GRUPOS_OBJETOS = {
  balls: [2, 3, 6, 7, 8, 9, 10, 11, 12, 4],
  curacion: [13, 22, 21, 20, 19, 24, 25, 26, 27, 28, 29, 34, 35, 36, 37, 44, 45],
  estados: [14, 15, 16, 17, 18, 23, 30, 31, 32, 33, 38],
  combate: [73, 74, 75, 76, 77, 78, 79, 83, 84, 85, 86],
  vitaminas: [63, 64, 65, 66, 67, 68, 69, 70, 71],
  piedras: [93, 94, 95, 96, 97, 98, 195, 201, 218, 192, 193, 199, 187],
  valiosos: [103, 104, 106, 107, 108, 109, 110],
  bayas: [133, 134, 135, 136, 137, 138, 139, 140, 141, 142, 168, 169, 170, 171, 172],
  equipables: [179, 180, 181, 182, 183, 184, 185, 186, 188, 189, 190, 194, 196, 197, 198, 200, 203, 204, 205, 206, 207, 208, 209, 210, 211, 212, 213, 214, 215, 216, 217, 219],
  mt: rango(289, 338)
}
// Peso de cada grupo en el suelo y en las tiendas
export const PESOS_SUELO = { balls: 14, curacion: 20, estados: 8, combate: 6, vitaminas: 10, piedras: 7, valiosos: 8, bayas: 8, equipables: 12, mt: 7 }
export const PESOS_TIENDA = { balls: 22, curacion: 28, estados: 14, combate: 12, vitaminas: 6, piedras: 5, equipables: 6, mt: 7 }
// Lo básico que no se quita de una tienda que ya lo vendía (Poké, Super y Ultra Balls y Poción)
export const BASICOS_TIENDA = [4, 3, 2, 13]

// Objetos para los entrenadores
export const OBJETO_DE_TIPO = {
  normal: 217, fighting: 207, flying: 210, poison: 211, ground: 203, rock: 204, bug: 188, ghost: 213, steel: 199,
  fire: 215, water: 209, grass: 205, electric: 208, psychic: 214, ice: 212, dragon: 216, dark: 206
}
export const OBJETOS_BAYAS = [139, 142, 141, 133, 134, 135, 136, 137, 140, 143, 144, 145, 146, 147, 168, 169, 170, 171, 172]
export const OBJETOS_COMBATE = [200, 142, 141, 219, 183, 187, 198, 179, 196, 180, 185, 186]
export const CINTA_ELECCION = 186
