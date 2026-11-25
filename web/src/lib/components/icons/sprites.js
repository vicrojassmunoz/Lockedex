// Iconos que son sprites de objetos de los juegos (32x32), servidos desde /lx/objetos.
const objeto = (nombre) => ({
  body: `<image href="/lx/objetos/${nombre}.png" width="32" height="32" style="image-rendering:pixelated"/>`,
  width: 32,
  height: 32
})

// Cualquier sprite (objetos del mapa de 16×16, personajes de 16×32…): se encaja en 32×32 sin deformar
const imagen = (href) => ({
  body: `<image href="${href}" width="32" height="32" style="image-rendering:pixelated"/>`,
  width: 32,
  height: 32
})

export const Ball = objeto('poke-ball') // Capturado
export const Shiny = objeto('shiny-charm') // Variocolor
export const Missed = objeto('smoke-ball') // Fallido: la Bola Humo, para huir
export const Gift = objeto('cherish-ball') // Regalo: la Gloria Ball de los Pokémon de evento
export const Traded = imagen('/lx/mapa/frlg/cable_club_receptionist.png') // Intercambiado: el Club de Cable
export const Map = objeto('mapa-pared') // Mapa (el del mapa de RojoFuego)
export const Box = objeto('pc') // Caja: el PC del Centro Pokémon
export const Deceased = objeto('lapida') // Muerto: lápida de la Torre Pokémon
export const Grave = Deceased // Cementerio
export const Trophy = objeto('champion-ribbon') // Medallas y logros: la Cinta Campeón

// Estadísticas: los objetos Recio de la 4.ª gen, uno por estadística
export const HP = objeto('power-weight')
export const Atk = objeto('power-bracer')
export const Def = objeto('power-belt')
export const Spa = objeto('power-lens')
export const Spd = objeto('power-band')
export const Spe = objeto('power-anklet')

// Equipo: el personaje del mapa del avatar del perfil (Rojo si no hay o no tiene sprite).
// El cuerpo se lee al dibujar el icono, así que vale con cambiar la ruta cuando se sepa.
let hrefEquipo = '/lx/mapa/frlg/red_normal.png'
export const Team = {
  get body() {
    return `<image href="${hrefEquipo}" width="32" height="32" style="image-rendering:pixelated"/>`
  },
  width: 32,
  height: 32
}
export const actualizarEquipo = async () => {
  if (typeof window === 'undefined') return
  try {
    const { avatar } = JSON.parse(localStorage.getItem('lockedex.perfil') || '{}') || {}
    const { spriteAvatar } = await import('$lib/lockedex/mapa.js')
    hrefEquipo = (avatar && (await spriteAvatar(avatar))) || '/lx/mapa/frlg/red_normal.png'
  } catch (e) {}
}
actualizarEquipo()

// Selector de inicial: las piedras evolutivas de cada tipo
export const PiedraFuego = objeto('fire-stone')
export const PiedraAgua = objeto('water-stone')
export const PiedraHoja = objeto('leaf-stone')
