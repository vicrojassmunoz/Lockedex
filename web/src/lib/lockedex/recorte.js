// Acción de Svelte para enseñar los sprites de Pokémon grandes: recorta el margen del lienzo de 96×96
// con object-view-box (sin tocar la imagen) según web/static/lx/sprites-recorte.json, que genera
// herramientas/recortes_sprites.py. Uso: <img use:recorte src={createImgUrl(p)} />
// Con use:recorte={'suelo'} el dibujo queda apoyado abajo (para que «pise» una línea) en vez de centrado.
let tabla = null
let cargando = null
const cargar = () =>
  (cargando ||= fetch('/lx/sprites-recorte.json')
    .then((r) => r.json())
    .then((t) => (tabla = t))
    .catch(() => (tabla = {})))

const idDe = (src) => {
  const m = String(src || '').match(/\/(?:base|shiny)-([^./?]+)\.(?:png|webp)/)
  return m ? decodeURIComponent(m[1]) : null
}

const aplicar = (img, modo) => {
  const r = tabla?.[idDe(img.getAttribute('src'))]
  // solo para los sprites de 96×96 (el plan B, UNOWN, u otras imágenes se dejan como están)
  if (!r || (img.naturalWidth && img.naturalWidth !== 96)) return img.style.removeProperty('object-view-box')
  const [x, yc, lado, ys] = r
  const y = modo === 'suelo' && ys != null ? ys : yc
  img.style.setProperty('object-view-box', `inset(${y}px ${96 - x - lado}px ${96 - y - lado}px ${x}px)`)
}

export const recorte = (img, modoInicial) => {
  let modo = modoInicial
  const hacer = () => (tabla ? aplicar(img, modo) : cargar().then(() => aplicar(img, modo)))
  hacer()
  const vigia = new MutationObserver(hacer)
  vigia.observe(img, { attributes: true, attributeFilter: ['src'] })
  img.addEventListener('load', hacer)
  return {
    update: (m) => {
      modo = m
      hacer()
    },
    destroy: () => {
      vigia.disconnect()
      img.removeEventListener('load', hacer)
    }
  }
}
