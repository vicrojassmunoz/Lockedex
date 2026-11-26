// Salón de la Fama: al vencer al Campeón, la run queda registrada con su equipo y sus números.
// «lockedex.salon» = [{ clave: '<id>#<intento>', id, nombre, juego, fecha, intento, equipo, medallas, caidos,
// capturas, tiempo, plantilla }] (de todas las runs, para el perfil)
import { fetchData } from '$utils/fetchers'
import { norm } from './datos.js'
import { emparejar } from './equipo.js'

const CLAVE = 'lockedex.salon'
const claveVisto = (clave) => `lockedex.salonVisto.${clave}`

export const leerSalon = () => {
  if (typeof localStorage === 'undefined') return []
  try {
    const l = JSON.parse(localStorage.getItem(CLAVE) || '[]')
    return Array.isArray(l) ? l : []
  } catch {
    return []
  }
}

export const registrarSalon = (entrada) => {
  const lista = leerSalon().filter((e) => e.clave !== entrada.clave)
  lista.push(entrada)
  localStorage.setItem(CLAVE, JSON.stringify(lista))
  return entrada
}

export const salonVisto = (clave) => typeof localStorage !== 'undefined' && localStorage.getItem(claveVisto(clave)) === '1'
export const marcarSalonVisto = (clave) => localStorage.setItem(claveVisto(clave), '1')

// El Campeón de cada juego: el jefe del grupo del Alto Mando cuyo valor empieza por «c» (c, c1…); si no
// hay, el último del Alto Mando
export const valorCampeon = (jefes = []) => {
  const alto = jefes.filter((j) => j.group === 'elite-four')
  const c = alto.find((j) => /^c\d*$/.test(String(j.value)))
  return c ? String(c.value) : alto.length ? String(alto[alto.length - 1].value) : null
}

// Miembros de un equipo (lista de { lugar, sprite }) con su sprite y, si hay .sav importado, su nivel
export const miembrosConSprite = async (lugares = [], datos = {}, sav = null) => {
  const pk = await fetchData()
  const busca = (a) => pk?.aliasMap?.[norm(a)] || pk?.nameMap?.[norm(a)]
  const usados = new Set()
  return lugares.map(({ lugar, sprite }) => {
    const e = datos?.[lugar] || {}
    const alias = e.pokemon || sprite
    const pkdx = busca(alias)
    const s = sav?.equipo?.length ? emparejar({ ...e, lugar }, sav.equipo, usados) : null
    if (s) usados.add(s)
    return { alias, imgId: pkdx?.imgId || pkdx?.sprite || alias, nombre: pkdx?.name || alias, mote: e.nickname || '', nivel: s?.nivel || null, lugar }
  })
}
