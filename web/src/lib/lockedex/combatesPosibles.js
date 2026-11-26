// ¿Pudo un Pokémon estar en el combate contra un jefe? Si lo capturaste después de un líder de gimnasio que
// va detrás de ese jefe, no: Hypno (Drowzee de la Ruta 11) no pudo ganar a Brock, porque entre Brock y la
// Ruta 11 están Misty y Surge. Pasa al marcar jefes antiguos con el equipo de ahora (por ejemplo, al
// empezar a usar la app con una partida ya empezada). Lo que no está en la lista de rutas (regalos con
// zona propia, zonas añadidas a mano) se da por bueno.
export const filtroCombates = (rutas = []) => {
  const zona = new Map()
  const jefe = new Map()
  const lideres = []
  rutas.forEach((r, i) => {
    if (r.type === 'route' && !zona.has(r.name)) zona.set(r.name, i)
    if (r.type === 'gym') {
      jefe.set(String(r.value), i)
      if (r.group === 'gym-leader') lideres.push(i)
    }
  })
  return (idJefe, lugar) => {
    const j = jefe.get(String(idJefe))
    const z = zona.get(lugar)
    if (j === undefined || z === undefined) return true
    return !lideres.some((g) => g > j && g < z)
  }
}
