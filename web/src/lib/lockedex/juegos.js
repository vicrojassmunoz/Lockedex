// Nombres en español de los juegos y búsqueda por nombre
import { idioma } from './idioma.js'

// Títulos oficiales en España (los ROM hacks conservan su nombre)
export const NOMBRES_ES = {
  red: 'Rojo',
  blue: 'Azul',
  yel: 'Amarillo',
  gold: 'Oro',
  silv: 'Plata',
  crys: 'Cristal',
  ruby: 'Rubí',
  saph: 'Zafiro',
  em: 'Esmeralda',
  fr: 'Rojo Fuego',
  lg: 'Verde Hoja',
  d: 'Diamante',
  p: 'Perla',
  pt: 'Platino',
  hg: 'Oro HeartGold',
  ss: 'Plata SoulSilver',
  bl: 'Negro',
  wh: 'Blanco',
  bl2: 'Negro 2',
  wh2: 'Blanco 2',
  x: 'X',
  y: 'Y',
  or: 'Rubí Omega',
  as: 'Zafiro Alfa',
  sun: 'Sol',
  moon: 'Luna',
  usun: 'Ultrasol',
  umoon: 'Ultraluna',
  sw: 'Espada',
  sh: 'Escudo',
  bd: 'Diamante Brillante',
  sp: 'Perla Reluciente',
  sc: 'Escarlata',
  vi: 'Púrpura'
}

// Abreviaturas habituales en la comunidad
const ALIAS = {
  radred: 'rr radical',
  emkaizo: 'kaizo',
  incem: 'inclement',
  emrunbun: 'run and bun runbun',
  renplat: 'renegade',
  blazevolt2: 'redux bb2 vw2',
  stormsilv: 'storm',
  sacredgold: 'sacred',
  fr: 'frlg firered',
  lg: 'frlg leafgreen',
  hg: 'hgss',
  ss: 'hgss',
  or: 'oras',
  as: 'oras',
  usun: 'usum',
  umoon: 'usum',
  bd: 'bdsp',
  sp: 'bdsp',
  sc: 'sv',
  vi: 'sv',
  sw: 'swsh',
  sh: 'swsh'
}

const ROMANOS = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7, VIII: 8, IX: 9 }

const plano = (s = '') =>
  ('' + s)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()

export const nombreJuego = (clave, juego) =>
  idioma() === 'es' && NOMBRES_ES[clave] ? NOMBRES_ES[clave] : juego?.title || clave

// ¿Coincide el juego con lo que se ha escrito?
export const coincideJuego = (clave, juego, consulta) => {
  const q = plano(consulta)
  if (!q) return true
  const texto = plano(
    [juego?.title, NOMBRES_ES[clave], ALIAS[clave], clave, juego?.region, juego?.gen === 'romhack' ? 'rom hack romhack' : `gen ${juego?.gen} gen ${ROMANOS[juego?.gen] || ''}`].join(' ')
  )
  const compacto = texto.replace(/ /g, '')
  return q.split(' ').every((palabra) => texto.includes(palabra) || compacto.includes(palabra))
}
