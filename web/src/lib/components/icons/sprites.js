// Iconos que son sprites de objetos de los juegos (32x32), servidos desde /lx/objetos.
const objeto = (nombre) => ({
  body: `<image href="/lx/objetos/${nombre}.png" width="32" height="32" style="image-rendering:pixelated"/>`,
  width: 32,
  height: 32
})

export const Ball = objeto('poke-ball') // Capturado, equipo
export const Shiny = objeto('shiny-charm') // Variocolor
export const Missed = objeto('escape-rope') // Huyó (Cuerda Huida)
export const Map = objeto('town-map') // Mapa

// Selector de inicial: las piedras evolutivas de cada tipo
export const PiedraFuego = objeto('fire-stone')
export const PiedraAgua = objeto('water-stone')
export const PiedraHoja = objeto('leaf-stone')
