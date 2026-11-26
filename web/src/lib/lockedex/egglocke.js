// Generador de Egglocke: reparte huevos con Pokémon al azar del juego de la run y, en la 3.ª gen, los
// prepara para meterlos en el PC del .sav (ver sav/huevosGen3.js).
// «lockedex.huevos.<id>» = { fecha, lista: [{ alias, nombre, imgId, usado }], sav: { nombre, cajas } }
import { fetchData } from '$utils/fetchers'
import { especies, movimientos, aprendizaje, clavePokemon, norm } from './datos.js'
import { probablesANivel } from './riesgo.js'

// Pokédex nacional de cada generación
const TOPE = { 1: 151, 2: 251, 3: 386, 4: 493, 5: 649, 6: 721, 7: 809, 8: 905, 9: 1025 }
// Juegos de la 3.ª gen (sin hacks) en los que se puede escribir el .sav
export const JUEGOS_GEN3 = ['r', 's', 'em', 'fr', 'lg']

const clave = (id) => `lockedex.huevos.${id}`
export const leerHuevosRun = (id) => {
  try {
    return JSON.parse(localStorage.getItem(clave(id)) || 'null')
  } catch {
    return null
  }
}
export const guardarHuevosRun = (id, datos) => localStorage.setItem(clave(id), JSON.stringify(datos))

/** Marca como usado el primer huevo generado de esa especie (al apuntar qué salió) */
export const marcarHuevoUsado = (id, alias) => {
  const d = leerHuevosRun(id)
  const h = d?.lista?.find((x) => !x.usado && norm(x.alias) === norm(alias))
  if (!h) return false
  h.usado = true
  guardarHuevosRun(id, d)
  return true
}

const azar = (n) => {
  const a = new Uint32Array(1)
  crypto.getRandomValues(a)
  return a[0] % n
}

/**
 * Huevos al azar entre las especies del juego (hasta su generación).
 * opciones: { cantidad, basicas, sinLegendarios, sinRepetir, tipo }
 */
export const generarHuevos = async (gen, { cantidad = 30, basicas = true, sinLegendarios = true, sinRepetir = true, tipo = '' } = {}) => {
  const [pk, esp] = await Promise.all([fetchData(), especies()])
  const tope = TOPE[gen] || 1025
  const vistos = new Set()
  // imgId es el número de la Pokédex nacional (las formas regionales y demás van de 10000 en adelante)
  let pool = Object.values(pk?.aliasMap || {})
    .filter((p) => typeof p.imgId === 'number' && p.imgId >= 1 && p.imgId <= tope)
    .filter((p) => (vistos.has(p.imgId) ? false : vistos.add(p.imgId)))
  if (basicas) pool = pool.filter((p) => !p.evoline || norm(p.evoline) === norm(p.alias))
  // Ditto y Unown no salen de huevos (no crían); el resto de «sin huevos descubiertos» son legendarios o crías
  pool = pool.filter((p) => !['ditto', 'unown'].includes(norm(p.alias)))
  if (sinLegendarios) pool = pool.filter((p) => !esp[clavePokemon(p.alias, esp)]?.l)
  if (tipo) pool = pool.filter((p) => (p.types || []).map((t) => t.toLowerCase()).includes(tipo))
  const lista = []
  const lineas = new Set()
  const bolsa = [...pool]
  while (lista.length < cantidad && bolsa.length) {
    const p = bolsa.splice(azar(bolsa.length), 1)[0]
    const linea = norm(p.evoline || p.alias)
    if (sinRepetir && lineas.has(linea)) continue
    lineas.add(linea)
    lista.push({ alias: p.alias, nombre: p.name, imgId: p.imgId, types: (p.types || []).map((t) => t.toLowerCase()), usado: false })
  }
  return { lista, disponibles: pool.length }
}

/**
 * Datos para crear cada huevo en un .sav de 3.ª gen: especie interna, experiencia de nivel 5, movimientos
 * de nivel 5, ciclos de eclosión (0 = eclosión rápida, en los siguientes 255 pasos) y si tiene dos habilidades.
 */
export const paraSavGen3 = async (lista, grupo, { rapida = false } = {}) => {
  const [tablas, ciclosJson, movs, apr] = await Promise.all([
    fetch('/lx/gen3.json').then((r) => r.json()),
    fetch('/lx/huevos-gen3.json').then((r) => r.json()),
    movimientos(),
    aprendizaje(grupo)
  ])
  const porNivel = apr?.nivel || {}
  const interna = {}
  tablas.especies.forEach((e, i) => e && !(e.p in interna) && (interna[e.p] = i))
  return lista.map((h) => {
    const i = interna[h.alias] ?? interna[clavePokemon(h.alias, interna)]
    if (!i) throw new Error(`${h.nombre} no existe en los juegos de GBA.`)
    const e = tablas.especies[i]
    const claves = probablesANivel(porNivel[clavePokemon(h.alias, porNivel)], 5)
    const movimientosH = claves.map((k) => movs[k]).filter((m) => m && m.id <= 354).map((m) => ({ id: m.id, pp: m.pp || 10 }))
    return {
      interna: i,
      experiencia: tablas.experiencia[e.c]?.[5] ?? 0,
      movimientos: movimientosH.length ? movimientosH : [{ id: 33, pp: 35 }],
      ciclos: rapida ? 0 : ciclosJson.ciclos[i] ?? 20,
      dosHabilidades: !!(e.h?.[1] && e.h[1] !== e.h[0])
    }
  })
}
