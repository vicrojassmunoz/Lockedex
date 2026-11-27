// Lo que el randomizer deja en la run (lockedex.random.<id>): ajustes, semilla y registro de lo que cambió.
// Con él la app vuelve a saber qué sale en cada zona, cuáles son los iniciales y qué llevan los jefes.
import { norm } from '../datos.js'

const clave = (id) => `lockedex.random.${id}`
export const leerRandom = (id) => {
  if (typeof localStorage === 'undefined' || !id) return null
  try {
    return JSON.parse(localStorage.getItem(clave(id)) || 'null')
  } catch {
    return null
  }
}
// Si no cabe, se quita lo que la app no usa (está entero en el registro de texto junto a la ROM)
const PRESCINDIBLE = ['compat', 'tiendas', 'objetosSuelo', 'mtTodas']
export const guardarRandom = (id, r) => {
  const copia = { ...r }
  for (let k = 0; ; k++) {
    try {
      return localStorage.setItem(clave(id), JSON.stringify(copia))
    } catch (e) {
      if (k >= PRESCINDIBLE.length) throw e
      delete copia[PRESCINDIBLE[k]]
    }
  }
}
export const borrarRandom = (id) => localStorage.removeItem(clave(id))
export const idActivo = () => (typeof localStorage === 'undefined' ? null : localStorage.getItem('nuzlocke'))
export const randomActivo = () => leerRandom(idActivo())

// Juegos de la run → tabla de mapas del .sav (web/static/lx/zonas-sav.json)
const ZONAS_DE = { ruby: 'rz', saph: 'rz', em: 'esmeralda', fr: 'rfvh', lg: 'rfvh' }
// Probabilidad de cada hueco (como en los juegos de la 3.ª gen)
const PROB = {
  tierra: [20, 20, 10, 10, 10, 10, 5, 5, 4, 4, 1, 1],
  agua: [60, 30, 5, 4, 1],
  roca: [60, 30, 5, 4, 1],
  pesca: [70, 30, 60, 20, 20, 40, 40, 15, 4, 1]
}
const metodo = (tipo, h) =>
  tipo === 'tierra' ? 'walk' : tipo === 'agua' ? 'surf' : tipo === 'roca' ? 'rock-smash' : h < 2 ? 'old-rod' : h < 5 ? 'good-rod' : 'super-rod'

let tablaMapas = null
const mapas = () =>
  (tablaMapas ||= fetch('/lx/zonas-sav.json')
    .then((r) => (r.ok ? r.json() : {}))
    .catch(() => ({})))

// Encuentros de cada zona con el formato de encuentros.js: { zona: { alias normalizado: [[método, mín, máx, prob, []]] } }
// y la lista de especies de cada zona (alias tal cual, para las sugerencias de la fila)
const cache = new Map()
export const encuentrosDeRegistro = async (r) => {
  if (!r) return { zonas: {}, especies: {} }
  const k = `${r.semilla}|${r.fecha}`
  if (cache.has(k)) return cache.get(k)
  const tabla = (await mapas())[ZONAS_DE[r.juego?.clave]] || {}
  const sumas = {} // zona → alias → método → { min, max, prob }
  const cabeceras = {} // zona → método → nº de mapas con ese método (para promediar las probabilidades)
  const especies = {}
  for (const s of r.salvajes || []) {
    const zona = tabla[s.mapa]
    if (!zona) continue
    sumas[zona] ||= {}
    cabeceras[zona] ||= {}
    especies[zona] ||= []
    for (const tipo of ['tierra', 'agua', 'roca', 'pesca']) {
      const vistos = new Set()
      ;(s[tipo] || []).forEach(([min, max, alias], h) => {
        const m = metodo(tipo, h)
        vistos.add(m)
        const a = norm(alias)
        if (!especies[zona].includes(alias)) especies[zona].push(alias)
        sumas[zona][a] ||= {}
        const f = (sumas[zona][a][m] ||= { min, max, prob: 0 })
        f.min = Math.min(f.min, min)
        f.max = Math.max(f.max, max)
        f.prob += PROB[tipo][h] || 0
      })
      for (const m of vistos) cabeceras[zona][m] = (cabeceras[zona][m] || 0) + 1
    }
  }
  const zonas = {}
  for (const [zona, porAlias] of Object.entries(sumas)) {
    zonas[zona] = {}
    for (const [a, porMetodo] of Object.entries(porAlias))
      zonas[zona][a] = Object.entries(porMetodo).map(([m, f]) => [m, f.min, f.max, Math.round(f.prob / (cabeceras[zona][m] || 1)), []])
  }
  if (r.iniciales?.length) {
    especies.Starter = [...r.iniciales]
    zonas.Starter = Object.fromEntries(r.iniciales.map((a) => [norm(a), [['gift', 5, 5, 33, []]]]))
  }
  const out = { zonas, especies }
  cache.set(k, out)
  return out
}
export const encuentrosRandom = async () => encuentrosDeRegistro(randomActivo())

// Tipo de la casilla del inicial elegido (planta, fuego o agua: el rival depende de ella)
export const tipoInicialRandom = (especie, r = randomActivo()) => {
  if (!r?.iniciales?.length || !especie) return null
  const k = r.iniciales.findIndex((a) => norm(a) === norm(especie))
  return k >= 0 ? ['grass', 'fire', 'water'][k] : null
}

// Equipos de los jefes según el registro, con el formato de jefes.js ({ especie, nivel, movimientos })
// para el inicial que tenga la run (el rival cambia con él)
export const equiposDelRandom = (r, inicial = 'fire', nombreMov = (id) => id) => {
  const jefes = r?.jefes?.[inicial] || r?.jefes?.fire || null
  if (!jefes) return {}
  const out = {}
  for (const [valor, i] of Object.entries(jefes)) {
    const e = r.entrenadores?.[i]
    if (!e?.equipo?.length) continue
    out[valor] = e.equipo.map((m) => ({
      especie: m.especie,
      nivel: m.nivel,
      ...(m.movimientos?.length ? { movimientos: m.movimientos.map(nombreMov).filter(Boolean) } : {}),
      ...(m.objeto && r.nombresObjetos?.[m.objeto] ? { objeto: r.nombresObjetos[m.objeto] } : {})
    }))
  }
  return out
}

// Tipo de cada jefe en la ROM aleatoria (si el randomizer le dio uno)
export const tiposDelRandom = (r, inicial = 'fire') => {
  const jefes = r?.jefes?.[inicial] || r?.jefes?.fire || null
  if (!jefes) return {}
  const out = {}
  for (const [valor, i] of Object.entries(jefes)) if (r.entrenadores?.[i]?.tipo) out[valor] = r.entrenadores[i].tipo
  return out
}

// Qué entrenador de la ROM es cada jefe de Lockedex: el de equipo original más parecido (especies y
// niveles). No depende del idioma de la ROM. liga = { valor: { pokemon: [{ name, level }] } }
export const emparejarJefes = (liga, entrenadoresOriginales, nombresRom = []) => {
  const out = {}
  const usados = new Set()
  for (const [valor, jefe] of Object.entries(liga || {})) {
    const suyo = (jefe?.pokemon || []).map((p) => [norm(p.name), parseInt(p.level, 10) || 0])
    if (!suyo.length) continue
    let mejor = null
    entrenadoresOriginales.forEach((e, i) => {
      if (!e?.equipo?.length) return
      const libres = e.equipo.map((m) => [norm(m.especie), m.nivel])
      let iguales = 0
      for (const [a, n] of suyo) {
        const k = libres.findIndex(([b, m]) => b === a && Math.abs(m - n) <= 1)
        if (k >= 0) {
          iguales++
          libres.splice(k, 1)
        }
      }
      // a igualdad, el del mismo nombre (en las ROM en inglés) y el que no está ya cogido
      const mismoNombre = nombresRom[i] && norm(nombresRom[i]) && norm(jefe.name || '').startsWith(norm(nombresRom[i])) ? 0.01 : 0
      const nota = iguales / Math.max(suyo.length, e.equipo.length) - (usados.has(i) ? 0.05 : 0) + mismoNombre
      if (!mejor || nota > mejor.nota) mejor = { i, nota }
    })
    if (mejor && mejor.nota >= 0.6) {
      out[valor] = mejor.i
      usados.add(mejor.i)
    }
  }
  return out
}
