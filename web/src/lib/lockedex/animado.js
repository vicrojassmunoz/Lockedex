// Sprites animados de Negro/Blanco (5.ª gen, hasta el n.º 649) desde PokeAPI/sprites, con el sprite fijo
// de siempre si no hay internet o no existe. Se usa en la ficha de los jefes y en el detalle del PC.
const BASE = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated'

export const urlAnimada = (p, shiny = false) => {
  const id = String(p?.imgId || p?.sprite || '')
  const n = parseInt(id, 10)
  return /^\d+$/.test(id) && n > 0 && n <= 649 ? `${BASE}${shiny ? '/shiny' : ''}/${n}.gif` : null
}

// on:error: primero el sprite fijo y, si tampoco, el plan B
export const alFallarSprite = (fijo, planB) => (e) => {
  const img = e.currentTarget
  if (img.dataset.fase !== 'fijo') {
    img.dataset.fase = 'fijo'
    img.src = fijo
  } else if (planB) img.src = planB
}

// on:load: los GIF miden distinto según el Pokémon; se amplían ×2 exacto sin pasar de «max» píxeles
export const ajustarGif = (max = 132) => (e) => {
  const img = e.currentTarget
  if (img.dataset.fase === 'fijo') {
    img.style.removeProperty('width')
    img.style.removeProperty('height')
    return
  }
  const k = Math.max(1, Math.min(2, Math.floor(max / Math.max(img.naturalWidth, img.naturalHeight))))
  img.style.width = img.naturalWidth * k + 'px'
  img.style.height = img.naturalHeight * k + 'px'
}
