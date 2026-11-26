// Ajusta la escala de un icono de Pokémon (PIcon) para que su dibujo no pase de «max» píxeles.
// Los iconos vienen recortados a su dibujo y los de Pokémon grandes (Venusaur, Onix…) miden casi el doble
// que los pequeños: con la misma escala para todos se salían del hueco de la barra de equipo.
// Uso: <span use:encajarIcono={{ nombre, max: 46, escala: 1.5 }}> … <PIcon class="lx-encajar …" /> </span>
export const encajarIcono = (nodo, opciones = {}) => {
  let { max = 46, escala = 1.5 } = opciones
  const aplicar = () => {
    const envoltorio = nodo.querySelector('.lx-encajar')
    const dibujo = envoltorio?.querySelector('i')
    if (!dibujo) return
    const lado = Math.max(dibujo.offsetWidth, dibujo.offsetHeight)
    const s = lado ? Math.min(escala, max / lado) : escala
    envoltorio.style.setProperty('--tw-scale-x', s)
    envoltorio.style.setProperty('--tw-scale-y', s)
    // para los que escalan con su propio CSS: transform: scale(var(--lx-esc, 2))
    envoltorio.style.setProperty('--lx-esc', s)
  }
  // el CSS de los iconos puede llegar después: se mide al montar y otra vez en el siguiente fotograma
  aplicar()
  requestAnimationFrame(aplicar)
  return {
    update: (o = {}) => {
      ;({ max = 46, escala = 1.5 } = o)
      requestAnimationFrame(aplicar)
    }
  }
}
