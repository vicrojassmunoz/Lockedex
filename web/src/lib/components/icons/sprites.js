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
