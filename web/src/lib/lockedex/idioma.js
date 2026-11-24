// Idioma de Lockedex. La traducción en sí la hace /lx/traductor.js, que se
// carga en <head> antes que la página (ver app.html).
const CLAVE = 'lockedex.idioma'

export const idioma = () => {
  try {
    return localStorage.getItem(CLAVE) || 'es'
  } catch {
    return 'es'
  }
}

export const cambiarIdioma = (nuevo) => {
  localStorage.setItem(CLAVE, nuevo)
  location.reload()
}

// Se mantiene por compatibilidad: el traductor ya arranca solo
export const iniciarTraduccion = () => Promise.resolve()

// Traduce un nombre suelto (lugares, etc.)
export const traducirNombre = (texto = '') => {
  if (typeof window === 'undefined' || !window.__lxTraductor) return texto
  return window.__lxTraductor.traducir(texto)
}

// Para textos propios de Lockedex
export const t = (es, en) => (idioma() === 'es' ? es : en ?? es)
