// Lo que aparece al pasar el ratón (el detalle del riesgo y similares) se lleva al final del <body>, con
// posición fija junto a su ancla y por encima de todo. Dentro de una tarjeta lo tapaban la tarjeta de
// abajo, el menú de equipo o la barra, porque cada una crea su propio apilamiento.
// Uso: <div use:alFrente={{ ancla: elemento, lado: 'derecha' }}> … </div>
export const Z_FRENTE = 2147483000

export const alFrente = (nodo, opciones = {}) => {
  let { ancla, lado = 'derecha', margen = 8 } = opciones
  document.body.appendChild(nodo)
  nodo.style.position = 'fixed'
  nodo.style.zIndex = String(Z_FRENTE)
  nodo.style.right = 'auto'
  nodo.style.bottom = 'auto'
  const colocar = () => {
    const el = typeof ancla === 'function' ? ancla() : ancla
    if (!el || !el.isConnected) return
    const a = el.getBoundingClientRect()
    const w = nodo.offsetWidth
    const h = nodo.offsetHeight
    let left = lado === 'derecha' ? a.right - w : a.left
    let top = a.bottom + margen
    // si no cabe debajo, encima
    if (top + h > window.innerHeight - 8) top = Math.max(8, a.top - margen - h)
    left = Math.min(Math.max(8, left), window.innerWidth - w - 8)
    nodo.style.left = `${Math.round(left)}px`
    nodo.style.top = `${Math.round(top)}px`
  }
  colocar()
  const fotograma = requestAnimationFrame(colocar)
  window.addEventListener('scroll', colocar, true)
  window.addEventListener('resize', colocar)
  return {
    update: (o = {}) => {
      ;({ ancla, lado = 'derecha', margen = 8 } = o)
      colocar()
    },
    destroy: () => {
      cancelAnimationFrame(fotograma)
      window.removeEventListener('scroll', colocar, true)
      window.removeEventListener('resize', colocar)
      nodo.remove()
    }
  }
}
