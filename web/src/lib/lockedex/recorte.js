// Acción de Svelte para enseñar los sprites de Pokémon grandes: recorta el margen del lienzo de 96×96
// con object-view-box (sin tocar la imagen) según web/static/lx/sprites-recorte.json, que genera
// herramientas/recortes_sprites.py. Uso: <img use:recorte src={createImgUrl(p)} />
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

const aplicar = (img) => {
  const r = tabla?.[idDe(img.getAttribute('src'))]
  // solo para los sprites de 96×96 (el plan B, UNOWN, u otras imágenes se dejan como están)
  if (!r || (img.naturalWidth && img.naturalWidth !== 96)) return img.style.removeProperty('object-view-box')
  const [x, y, lado] = r
  img.style.setProperty('object-view-box', `inset(${y}px ${96 - x - lado}px ${96 - y - lado}px ${x}px)`)
}

export const recorte = (img) => {
  const hacer = () => (tabla ? aplicar(img) : cargar().then(() => aplicar(img)))
  hacer()
  const vigia = new MutationObserver(hacer)
  vigia.observe(img, { attributes: true, attributeFilter: ['src'] })
  img.addEventListener('load', hacer)
  return {
    destroy: () => {
      vigia.disconnect()
      img.removeEventListener('load', hacer)
    }
  }
}
