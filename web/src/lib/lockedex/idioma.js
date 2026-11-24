// Traducción de la interfaz al español.
// Traduce los textos según aparecen en pantalla (texto exacto → español), así
// funciona en toda la app sin tocar cada componente.
import interfaz from './interfaz-es.js'
import { cargar } from './datos.js'

const CLAVE = 'lockedex.idioma'
const ATRIBUTOS = ['placeholder', 'title', 'aria-label', 'alt']
const SALTAR = new Set(['SCRIPT', 'STYLE', 'TEXTAREA', 'INPUT', 'CODE', 'PRE', 'KBD'])

const PATRONES = [
  [/^Route (\d+)$/, 'Ruta $1'],
  [/^Route (\d+) \((.+)\)$/, 'Ruta $1 ($2)'],
  [/^Lvl (\d+)$/, 'Nv. $1'],
  [/^Level (\d+)$/, 'Nivel $1']
]

let diccionario = null
let observador = null

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

const traducir = (texto) => {
  const t = texto.replace(/\s+/g, ' ').trim()
  if (!t || t.length > 400) return null
  let es = diccionario.get(t)
  if (!es) {
    for (const [re, rep] of PATRONES) {
      if (re.test(t)) {
        es = t.replace(re, rep)
        break
      }
    }
  }
  if (!es || es === t) return null
  return texto.match(/^\s*/)[0] + es + texto.match(/\s*$/)[0]
}

const traducirAtributos = (el) => {
  for (const a of ATRIBUTOS) {
    const v = el.getAttribute(a)
    if (v) {
      const nuevo = traducir(v)
      if (nuevo) el.setAttribute(a, nuevo)
    }
  }
}

const dentroDeZonaSinTraducir = (el) =>
  !el || SALTAR.has(el.tagName) || el.closest('[data-lx-original],[contenteditable="true"]')

const traducirNodo = (nodo) => {
  if (nodo.nodeType === 3) {
    if (dentroDeZonaSinTraducir(nodo.parentElement)) return
    const nuevo = traducir(nodo.data)
    if (nuevo) nodo.data = nuevo
    return
  }
  if (nodo.nodeType !== 1) return
  if (dentroDeZonaSinTraducir(nodo)) {
    // En campos de texto solo se traducen los atributos (placeholder, title…)
    if (SALTAR.has(nodo.tagName) && !nodo.closest('[data-lx-original]')) traducirAtributos(nodo)
    return
  }
  for (const a of ATRIBUTOS) {
    const v = nodo.getAttribute(a)
    if (v) {
      const nuevo = traducir(v)
      if (nuevo) nodo.setAttribute(a, nuevo)
    }
  }
  const recorrido = document.createTreeWalker(nodo, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT)
  let n = recorrido.nextNode()
  while (n) {
    if (n.nodeType === 3) {
      if (!dentroDeZonaSinTraducir(n.parentElement)) {
        const nuevo = traducir(n.data)
        if (nuevo) n.data = nuevo
      }
    } else if (!n.closest('[data-lx-original]')) {
      traducirAtributos(n)
    }
    n = recorrido.nextNode()
  }
}

let inicio = null
export const iniciarTraduccion = () => {
  if (typeof window === 'undefined') return Promise.resolve()
  inicio ||= arrancar()
  return inicio
}

const arrancar = async () => {
  if (idioma() !== 'es' || observador) return
  const nombres = await cargar('nombres-es.json')
  diccionario = new Map(Object.entries({ ...nombres, ...interfaz }))

  traducirNodo(document.body)
  observador = new MutationObserver((cambios) => {
    for (const c of cambios) {
      if (c.type === 'characterData') traducirNodo(c.target)
      else if (c.type === 'attributes') traducirNodo(c.target)
      else c.addedNodes.forEach(traducirNodo)
    }
  })
  observador.observe(document.body, {
    subtree: true,
    childList: true,
    characterData: true,
    attributes: true,
    attributeFilter: ATRIBUTOS
  })
}

// Para textos propios de Lockedex
export const t = (es, en) => (idioma() === 'es' ? es : en ?? es)

// Traduce un nombre suelto (lugares, etc.) con el diccionario cargado
export const traducirNombre = (texto = '') => {
  if (!diccionario || idioma() !== 'es') return texto
  return traducir(texto) || texto
}
