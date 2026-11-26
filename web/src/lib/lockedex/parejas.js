// Parejas del Wedlocke: cada Pokémon se empareja con otro y en cada combate solo puede salir uno de los
// dos. Se guardan aparte de los datos de la run, como las derrotas: «lockedex.parejas.<id>» = [[lugarA, lugarB], …]
import { writable } from 'svelte/store'

const clave = (id) => `lockedex.parejas.${id}`
const tiendas = {}

export const leerParejas = (id) => {
  if (!id || typeof localStorage === 'undefined') return []
  try {
    const p = JSON.parse(localStorage.getItem(clave(id)) || '[]')
    return Array.isArray(p) ? p.filter((x) => Array.isArray(x) && x.length === 2) : []
  } catch {
    return []
  }
}

// Tienda por run (se pone al día también si otra ventana cambia las parejas)
export const tiendaParejas = (id) => {
  if (!tiendas[id]) {
    tiendas[id] = writable(leerParejas(id))
    if (typeof window !== 'undefined')
      window.addEventListener('storage', (e) => {
        if (e.key === clave(id)) tiendas[id].set(leerParejas(id))
      })
  }
  return tiendas[id]
}

export const parejaDe = (parejas = [], lugar) => {
  const p = parejas.find((x) => x.includes(lugar))
  return p ? p.find((l) => l !== lugar) : null
}

// Empareja a con b (cada uno deja su pareja anterior); sin b, a se queda sin pareja
export const emparejar = (id, a, b = null) => {
  let parejas = leerParejas(id).filter((x) => !x.includes(a) && (!b || !x.includes(b)))
  if (b && b !== a) parejas = [...parejas, [a, b]]
  localStorage.setItem(clave(id), JSON.stringify(parejas))
  tiendaParejas(id).set(parejas)
  return parejas
}
