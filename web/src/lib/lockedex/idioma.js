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

// Grupos de jefes de las guías, en plural («Líderes de gimnasio»)
const GRUPOS = {
  'Gym Leader': ['Líderes de gimnasio', 'Gym Leader fights'],
  'Elite Four': ['Alto Mando', 'Elite Four fights'],
  Rival: ['Rival', 'Rival fights'],
  'Evil Team': ['Equipo malvado', 'Evil Team fights'],
  'Mini Boss': ['Minijefes', 'Mini Boss fights'],
  Titan: ['Titanes', 'Titan fights'],
  Other: ['Otros', 'Other fights']
}
export const grupoGuia = (g) => t(...(GRUPOS[g] || [g, g + ' fights']))
