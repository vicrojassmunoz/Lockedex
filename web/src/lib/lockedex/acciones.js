// Acciones rápidas que llegan desde el modo compacto y se aplican aquí, en la ventana principal,
// con el mismo almacén que usa el resto de la app (así nada se pisa).
import { get } from 'svelte/store'
import { activeGame, getGameStore, patch } from '$lib/store'

export const aplicarAccion = (accion = {}) => {
  const id = get(activeGame)
  if (!id || (accion.partida && accion.partida !== id)) return false
  const almacen = getGameStore(id)

  if (accion.tipo === 'encuentro' && accion.ubicacion && accion.pokemon) {
    almacen.update(
      patch({
        [accion.ubicacion]: {
          id: accion.idRuta ?? 0,
          pokemon: accion.pokemon,
          status: accion.estado || 1,
          location: accion.ubicacion,
          ...(accion.mote ? { nickname: accion.mote } : {})
        }
      })
    )
    return true
  }

  if (accion.tipo === 'caido' && accion.ubicacion) {
    almacen.update((texto) => {
      const datos = JSON.parse(texto || '{}')
      const e = datos[accion.ubicacion]
      if (!e) return texto
      datos[accion.ubicacion] = { ...e, status: 5 }
      datos.__team = (datos.__team || []).filter((l) => l !== accion.ubicacion)
      return JSON.stringify(datos)
    })
    return true
  }
  return false
}

export const escucharAcciones = () => window.lockedex?.alAccionPartida?.(aplicarAccion) || (() => {})
