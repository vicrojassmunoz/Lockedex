// Acciones rápidas que llegan desde el modo compacto y se aplican aquí, en la ventana principal,
// con el mismo almacén que usa el resto de la app (así nada se pisa).
import { get } from 'svelte/store'
import { activeGame, getGameStore, patch } from '$lib/store'
import { capturasAlEquipo } from './ajustes.js'

export const aplicarAccion = (accion = {}) => {
  const id = get(activeGame)
  if (!id || (accion.partida && accion.partida !== id)) return false
  const almacen = getGameStore(id)

  if (accion.tipo === 'encuentro' && accion.ubicacion && accion.pokemon) {
    almacen.update((texto) => {
      const datos = JSON.parse(texto || '{}')
      const estado = accion.estado || 1
      datos[accion.ubicacion] = {
        id: accion.idRuta ?? 0,
        pokemon: accion.pokemon,
        status: estado,
        location: accion.ubicacion,
        ...(accion.mote ? { nickname: accion.mote } : {})
      }
      // Captura (o regalo, intercambio, shiny) con hueco en el equipo: entra sola
      const equipo = (datos.__team || []).filter(Boolean)
      if ([1, 2, 3, 6].includes(+estado) && equipo.length < 6 && !equipo.includes(accion.ubicacion) && capturasAlEquipo(id))
        datos.__team = [...equipo, accion.ubicacion]
      return JSON.stringify(datos)
    })
    return true
  }

  // Jefe vencido: se guarda como lo hace la ventana de progreso, con el equipo actual
  if (accion.tipo === 'jefe' && accion.jefe?.id !== undefined) {
    almacen.update((texto) => {
      const datos = JSON.parse(texto || '{}')
      const j = accion.jefe
      const equipo = (datos.__team || [])
        .filter((l) => datos[l]?.pokemon)
        .map((l) => ({ sprite: datos[l].pokemon, id: l }))
      const entrada = Object.fromEntries(
        Object.entries({ id: j.id, name: j.name, group: j.group, type: j.type, team: equipo }).filter(([, v]) => v !== undefined && v !== null)
      )
      const lista = Array.isArray(datos.__teams) ? datos.__teams : []
      datos.__teams = accion.deshacer
        ? lista.filter((t) => String(t.id) !== String(j.id))
        : lista.filter((t) => String(t.id) !== String(j.id)).concat(entrada)
      return JSON.stringify(datos)
    })
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
