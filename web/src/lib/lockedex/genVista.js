// La generación de lo que se está viendo: la del juego elegido en el Analista o, en el resto, la de la run
// activa. Sirve para enseñar bien la clase de los movimientos: hasta la 3.ª gen físico o especial lo decide
// el tipo (Puño Hielo es especial en Esmeralda), no el movimiento
import { partidaActiva } from './partida.js'
import { claseSegunGen } from './jefes.js'

let genAnalista = null
export const ponerGenAnalista = (g) => (genAnalista = g || null)

export const genVista = () => {
  if (typeof window === 'undefined') return null
  if (genAnalista && location.pathname.startsWith('/analista')) return genAnalista
  return partidaActiva()?.info?.gen || null
}

export const claseVista = (clase, tipo, gen = genVista()) => claseSegunGen(clase, tipo, gen)
