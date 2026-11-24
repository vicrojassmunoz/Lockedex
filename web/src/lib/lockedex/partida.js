// Lectura de la partida activa y cálculo de su progreso
import Games from '$lib/data/games.json'
import { infoJuego } from './datos.js'

const ESTADOS_VIVOS = [1, 2, 3, 6] // capturado, recibido, intercambiado, variocolor
const MUERTO = 5

const leerJSON = (clave) => {
  try {
    return JSON.parse(localStorage.getItem(clave) || 'null')
  } catch {
    return null
  }
}

export const leerPartidas = () =>
  (localStorage.getItem('nuzlocke.saves') || '')
    .split(',')
    .filter((i) => i.length)
    .map((i) => i.split('|'))
    .map(([id, tiempo = '', nombre = '', juego = '', ajustes = '', intentos = 1]) => {
      const [creada, actualizada] = tiempo.split('>')
      return {
        id,
        creada: +creada,
        actualizada: +(actualizada || creada),
        nombre: decodeURIComponent(nombre),
        juego,
        ajustes,
        intentos: +intentos || 1
      }
    })

export const leerPartida = (id) => {
  const p = leerPartidas().find((x) => x.id === id)
  if (!p) return null
  return { ...p, datos: leerJSON(`nuzlocke.${id}`) || {}, info: infoJuego(p.juego) }
}

export const partidaActiva = () => {
  const id = localStorage.getItem('nuzlocke')
  return id ? leerPartida(id) : null
}

const cacheRutas = {}
export const cargarRutas = (lid) => {
  if (!lid) return Promise.resolve([])
  cacheRutas[lid] ||= fetch(`/api/route/${lid}.json`)
    .then((r) => (r.ok ? r.json() : []))
    .catch(() => [])
  return cacheRutas[lid]
}

const cacheLiga = {}
export const cargarLiga = (juego, inicial = 'fire') => {
  const g = Games[juego] || {}
  const pid = g.pid || juego
  const k = `${pid}.${inicial}`
  cacheLiga[k] ||= fetch(`/api/league/${k}.json`)
    .then((r) => (r.ok ? r.json() : {}))
    .catch(() => ({}))
  return cacheLiga[k]
}

export const nivelMaximo = (jefe) => {
  const niveles = (jefe?.pokemon || []).map((p) => parseInt(p.level, 10)).filter((n) => !isNaN(n))
  return niveles.length ? Math.max(...niveles) : null
}

export const resumirPartida = (partida, rutas = []) => {
  const datos = partida?.datos || {}
  const derrotados = Object.keys(datos.__teams || {})

  let ultimo = -1
  const lugares = []
  const jefes = []
  rutas.forEach((r, i) => {
    if (r.type === 'gym') {
      const derrotado = derrotados.includes('' + r.value)
      jefes.push({ ...r, indice: i, derrotado })
      if (derrotado) ultimo = Math.max(ultimo, i)
    } else if (r.type === 'route') {
      const e = datos[r.name]
      lugares.push({ ...r, indice: i, encuentro: e })
      if (e && (e.pokemon || e.status)) ultimo = Math.max(ultimo, i)
    }
  })

  const encuentros = Object.entries(datos)
    .filter(([k, v]) => !k.startsWith('__') && v && typeof v === 'object' && v.pokemon)
    .map(([lugar, v]) => ({ lugar, ...v }))

  const vivos = encuentros.filter((e) => ESTADOS_VIVOS.includes(+e.status))
  const muertos = encuentros.filter((e) => +e.status === MUERTO)
  const fallidos = encuentros.filter((e) => +e.status === 4)

  const equipo = (datos.__team || [])
    .map((lugar) => (datos[lugar] ? { lugar, ...datos[lugar] } : null))
    .filter((e) => e && ESTADOS_VIVOS.includes(+e.status))

  const jefesPasados = jefes.map((j) => ({ ...j, pasado: j.derrotado || j.indice < ultimo }))
  const medallas = jefesPasados.filter((j) => j.group === 'gym-leader' && j.pasado).length
  const totalMedallas = jefes.filter((j) => j.group === 'gym-leader').length
  const siguienteJefe = jefesPasados.find((j) => !j.pasado) || null

  return {
    total: rutas.length,
    ultimo,
    progreso: rutas.length ? Math.max(0, (ultimo + 1) / rutas.length) : 0,
    encuentros,
    vivos,
    muertos,
    fallidos,
    equipo,
    jefes: jefesPasados,
    medallas,
    totalMedallas,
    siguienteJefe,
    campeon: jefes.length > 0 && jefesPasados.every((j) => j.pasado)
  }
}

// Avisa cuando cambian los datos guardados (desde esta ventana o desde otra)
export const alCambiarDatos = (cb) => {
  const f = () => cb()
  window.addEventListener('lx:cambio', f)
  window.addEventListener('storage', f)
  return () => {
    window.removeEventListener('lx:cambio', f)
    window.removeEventListener('storage', f)
  }
}
