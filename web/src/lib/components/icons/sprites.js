// Iconos que son sprites de objetos de los juegos, servidos desde /lx/objetos. El sprite se dibuja a 32×32
// y el icono enseña solo el cuadrado de su dibujo (recortes.js), para que no salga diminuto por el margen.
import RECORTES from './recortes.js'
const objeto = (nombre) => {
  const [x, y, lado] = RECORTES[nombre] || [0, 0, 32]
  return {
    body: `<image href="/lx/objetos/${nombre}.png" width="32" height="32" style="image-rendering:pixelated"/>`,
    left: x,
    top: y,
    width: lado,
    height: lado
  }
}

// Cualquier sprite (objetos del mapa de 16×16, personajes de 16×32…): se encaja en 32×32 sin deformar
const imagen = (href) => ({
  body: `<image href="${href}" width="32" height="32" style="image-rendering:pixelated"/>`,
  width: 32,
  height: 32
})

export const Ball = objeto('poke-ball') // Capturado
export const Shiny = objeto('shiny-charm') // Variocolor
export const Missed = objeto('smoke-ball') // Fallido: la Bola Humo, para huir
export const Descartado = objeto('papelera') // Descartado: papelera metálica
export const Gift = objeto('cherish-ball') // Regalo: la Gloria Ball de los Pokémon de evento
export const Traded = imagen('/lx/mapa/frlg/cable_club_receptionist.png') // Intercambiado: el Club de Cable
export const Map = objeto('mapa-pared') // Mapa (el del mapa de RojoFuego)
export const Box = objeto('pc') // Caja: el PC del Centro Pokémon
export const Deceased = objeto('lapida') // Muerto: lápida de la Torre Pokémon
export const Grave = Deceased // Cementerio
export const Trophy = objeto('champion-ribbon') // Medallas y logros: la Cinta Campeón

// Interfaz: objetos de los juegos en lugar de los iconos genéricos
export const Save = objeto('diario') // Guardar: el Diario de la 4.ª gen
export const Floppy = Save
export const Settings = objeto('pieza-maquina') // Ajustes: la Pieza Máquina (un engranaje)
export const Game = objeto('pokedex') // Partida: la Pokédex del mapa de RojoFuego
export const Tipo = objeto('tabla-llama') // Ordenar por tipo: una Tabla (4.ª gen)
export const Total = objeto('brazal-firme') // Total de estadísticas: el Brazal Firme
export const Analysis = objeto('periscopio') // Análisis del equipo y de la caja: el Periscopio
export const Shield = objeto('proteccion-especial') // Daño máximo que te pueden hacer: Protección Especial

// Estadísticas: los objetos Recio de la 4.ª gen, uno por estadística
export const HP = objeto('power-weight')
export const Atk = objeto('power-bracer')
export const Def = objeto('power-belt')
export const Spa = objeto('power-lens')
export const Spd = objeto('power-band')
export const Spe = objeto('power-anklet')

// Lugares: trozos del mapa de RojoFuego (tileset general) y objetos del mapa
export const LongGrass = objeto('hierba-alta') // Hierba alta (botón de revelar)
export const Forest = objeto('arbol')
export const City = objeto('centro-pokemon')
export const Town = objeto('cartel-pueblo')
export const Route = objeto('cartel-ruta')
export const Tunnel = objeto('cueva')
export const Mountain = objeto('monte')
export const Stadium = objeto('cartel-gimnasio')
export const Ruins = objeto('fosil')
export const Shrine = objeto('piedra-mistica')

// Clase del movimiento, a la manera de los iconos de la 4.ª generación
export const Physical = objeto('clase-fisico')
export const Special = objeto('clase-especial')
export const Status = objeto('clase-estado')

// Equipo: el personaje del mapa del avatar del perfil (Rojo si no hay o no tiene sprite).
// El cuerpo se lee al dibujar el icono, así que vale con cambiar la ruta cuando se sepa.
let hrefEquipo = '/lx/mapa/frlg/red_normal.png'
let recortar = false // el sprite de combate del avatar (72×52) se recorta al centro para que llene el icono
export const Team = {
  get body() {
    const ajuste = recortar ? ' preserveAspectRatio="xMidYMid slice"' : ''
    return `<image href="${hrefEquipo}" width="32" height="32"${ajuste} style="image-rendering:pixelated"/>`
  },
  width: 32,
  height: 32
}
export const actualizarEquipo = async () => {
  if (typeof window === 'undefined') return
  try {
    const { avatar } = JSON.parse(localStorage.getItem('lockedex.perfil') || '{}') || {}
    const { spriteAvatar } = await import('$lib/lockedex/mapa.js')
    const mapa = avatar && (await spriteAvatar(avatar))
    // Sin sprite de mapa (Sinnoh, Teselia…): el propio sprite del avatar. Sin avatar: Rojo.
    recortar = !mapa && !!avatar
    hrefEquipo = mapa || (avatar ? `/assets/img/leaders/${avatar}.png` : '/lx/mapa/frlg/red_normal.png')
  } catch (e) {}
}
actualizarEquipo()

// Selector de inicial: las piedras evolutivas de cada tipo
export const PiedraFuego = objeto('fire-stone')
export const PiedraAgua = objeto('water-stone')
export const PiedraHoja = objeto('leaf-stone')
