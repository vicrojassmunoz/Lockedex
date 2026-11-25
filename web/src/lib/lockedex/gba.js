// Piezas de pixel art para que los menús se parezcan a los de los juegos de GBA.
//
// marco() dibuja un recuadro de esquinas escalonadas (contorno de 1 px, línea de luz arriba e
// izquierda y de sombra abajo y derecha) como SVG para usarlo en border-image. Se dibuja a escala
// 1 y el navegador lo amplía sin suavizar, así que los bordes salen «a píxeles» como en la consola.

const ESCALA = 2

// Cuántos píxeles se mete cada fila de la esquina, de arriba abajo, según el radio
const ESQUINAS = { 0: [], 1: [1], 2: [2, 1], 3: [3, 1, 1], 4: [4, 2, 1, 1] }

const cache = new Map()

/**
 * @param {object} o
 * @param {string} o.tinta   contorno
 * @param {string} o.fondo   relleno
 * @param {string} [o.luz]   línea interior de arriba e izquierda
 * @param {string} [o.sombra] línea interior de abajo y derecha
 * @param {number} [o.r]     radio de la esquina en píxeles de la consola
 * @param {boolean} [o.relleno] false para dejar ver el fondo CSS del elemento por dentro
 * @returns {string} declaración CSS lista para style=""
 */
export function marco({ tinta, fondo, luz = fondo, sombra = fondo, r = 2, relleno = true }) {
  const clave = [tinta, fondo, luz, sombra, r, relleno].join('|')
  if (cache.has(clave)) return cache.get(clave)

  const n = Math.max(r, 1) + 2 // lo que ocupa la esquina: la curva, el contorno y la línea de luz
  const t = 2 * n + 1 // lienzo: dos esquinas y una fila/columna central que se estira
  const sangria = ESQUINAS[r] || ESQUINAS[2]
  const dentro = (x, y) => {
    if (x < 0 || y < 0 || x >= t || y >= t) return false
    const fila = Math.min(y, t - 1 - y)
    const s = fila < sangria.length ? sangria[fila] : 0
    return x >= s && x <= t - 1 - s
  }
  const borde = (x, y) =>
    dentro(x, y) && (!dentro(x - 1, y) || !dentro(x + 1, y) || !dentro(x, y - 1) || !dentro(x, y + 1))

  let rects = ''
  for (let y = 0; y < t; y++) {
    for (let x = 0; x < t; x++) {
      if (!dentro(x, y)) continue
      let c = fondo
      if (borde(x, y)) c = tinta
      else if (borde(x + 1, y) || borde(x, y + 1)) c = sombra
      else if (borde(x - 1, y) || borde(x, y - 1)) c = luz
      rects += `<rect x="${x}" y="${y}" width="1" height="1" fill="${c}"/>`
    }
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${t}" height="${t}" shape-rendering="crispEdges">${rects}</svg>`
  const url = `url("data:image/svg+xml,${encodeURIComponent(svg)}")`
  const ancho = n * ESCALA
  const css =
    `border:${ancho}px solid transparent;border-image:${url} ${n}${relleno ? ' fill' : ''} / ${ancho}px stretch;` +
    (relleno ? '' : 'background-clip:padding-box;')
  cache.set(clave, css)
  return css
}

// Colores de tipo de los iconos de la 3.ª generación
export const TIPO_GBA = {
  normal: '#a8a878',
  fire: '#f08030',
  water: '#6890f0',
  electric: '#e8c020',
  grass: '#78c850',
  ice: '#88d0d0',
  fighting: '#c03028',
  poison: '#a040a0',
  ground: '#d8b058',
  flying: '#a890f0',
  psychic: '#f85888',
  bug: '#a8b820',
  rock: '#b8a038',
  ghost: '#705898',
  dragon: '#7038f8',
  dark: '#705848',
  steel: '#a8a8c8',
  fairy: '#e898b8'
}

// Poké Ball de 12×12 del menú de equipo (la del primer hueco)
const BOLA = [
  '....XXXX....',
  '..XXRRRRXX..',
  '.XRRRRRRRRX.',
  '.XRRRRRRRRX.',
  'XRRRRRRRRRRX',
  'XXXXXWWXXXXX',
  'XWWWXWWXWWWX',
  'XWWWWXXWWWWX',
  '.XWWWWWWWWX.',
  '.XWWWWWWWWX.',
  '..XXWWWWXX..',
  '....XXXX....'
]

export function bola({ tinta = '#404050', rojo = '#f86830', blanco = '#f8f8f8' } = {}) {
  const color = { X: tinta, R: rojo, W: blanco }
  let rects = ''
  BOLA.forEach((fila, y) =>
    [...fila].forEach((p, x) => {
      if (color[p]) rects += `<rect x="${x}" y="${y}" width="1" height="1" fill="${color[p]}"/>`
    })
  )
  return `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" shape-rendering="crispEdges">${rects}</svg>`
  )}`
}
