// Cola de escenas que llegan de la partida del emulador (evoluciones y caídos). Va en localStorage porque
// la sincronización corre en cada ventana, también en la compacta, que no enseña escenas: la ventana que
// aplica el cambio no siempre es la que tiene la escena. La principal las enseña al volver a ella
// (EscenasSav.svelte).
const CLAVE = 'lockedex.escenas'
const CADUCA = 3 * 24 * 3600 * 1000

const leer = () => {
  try {
    const a = JSON.parse(localStorage.getItem(CLAVE) || '[]')
    return Array.isArray(a) ? a : []
  } catch {
    return []
  }
}
const escribir = (a) => {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(a))
  } catch {}
}
const igual = (a, b) => a.run === b.run && a.tipo === b.tipo && a.lugar === b.lugar && a.base === b.base && a.evo === b.evo

// { tipo: 'evolucion', base, evo, mote } o { tipo: 'muerte', lugar, pokemon, mote }
export const encolarEscenas = (lista = []) => {
  if (!lista.length) return
  const run = localStorage.getItem('nuzlocke')
  const ahora = Date.now()
  const cola = leer().filter((x) => ahora - (x.t || 0) < CADUCA)
  // las dos ventanas pueden aplicar el mismo .sav a la vez: sin repetidas
  for (const x of lista) {
    const e = { ...x, run, t: ahora }
    if (!cola.some((y) => igual(y, e) && ahora - y.t < 60000)) cola.push(e)
  }
  escribir(cola)
  window.dispatchEvent(new Event('lx:escenas'))
}

export const siguienteEscena = () => {
  const run = localStorage.getItem('nuzlocke')
  const ahora = Date.now()
  const cola = leer().filter((x) => ahora - (x.t || 0) < CADUCA)
  const i = cola.findIndex((x) => x.run === run)
  const e = i >= 0 ? cola.splice(i, 1)[0] : null
  escribir(cola)
  return e
}

export const hayEscenas = () => leer().some((x) => x.run === localStorage.getItem('nuzlocke'))
export const CLAVE_ESCENAS = CLAVE
