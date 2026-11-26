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
  (typeof window === 'undefined' ? '' : localStorage.getItem('nuzlocke.saves') || '')
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
  if (typeof window === 'undefined') return null
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

// Medallas de la partida del emulador (.sav importado o vinculado) si es del mismo juego que la run.
// Solo los juegos originales de la 3.ª gen: los hacks pueden mover las banderas de sitio.
const SAV_DE_JUEGO = { fr: 'rfvh', lg: 'rfvh', em: 'esmeralda', ruby: 'rz', saph: 'rz' }
const medallasDelSav = (partida) => {
  if (typeof window === 'undefined' || !partida?.id) return null
  const esperado = SAV_DE_JUEGO[partida.juego]
  const sav = esperado ? leerJSON(`lockedex.sav.${partida.id}`) : null
  if (!sav || sav.juego !== esperado || !Array.isArray(sav.medallas)) return null
  return {
    medallas: sav.medallas,
    campeon: !!sav.campeon,
    // vinculado = Lockedex lo relee cada vez que guardas; importado a mano puede estar viejo
    vinculado: !!localStorage.getItem(`lockedex.savruta.${partida.id}`)
  }
}

export const resumirPartida = (partida, rutas = []) => {
  const datos = partida?.datos || {}
  const sav = medallasDelSav(partida)
  // __teams es una lista [{ id, name, group, type, team }] con los jefes vencidos (id = value de la ruta)
  const equiposJefes = datos.__teams || []
  const derrotados = (Array.isArray(equiposJefes) ? equiposJefes.map((t) => t?.id) : Object.keys(equiposJefes))
    .filter((id) => id !== undefined && id !== null)
    .map(String)

  const visitada = (nombre) => {
    const e = nombre && datos[nombre]
    return !!(e && (e.pokemon || e.status))
  }

  let ultimo = -1
  let zona = null // última zona con encuentros antes de cada jefe: donde suele ser el combate
  const lugares = []
  const jefes = []
  const visitadas = [] // posiciones de las zonas con algo apuntado
  rutas.forEach((r, i) => {
    if (r.type === 'gym') {
      const derrotado = derrotados.includes('' + r.value)
      jefes.push({ ...r, indice: i, derrotado, zona })
      if (derrotado) ultimo = Math.max(ultimo, i)
    } else if (r.type === 'route') {
      const e = datos[r.name]
      lugares.push({ ...r, indice: i, encuentro: e })
      if (visitada(r.name)) {
        ultimo = Math.max(ultimo, i)
        visitadas.push(i)
      }
      if ((r.encounters || []).length) zona = r.name
    }
  })
  // Hasta dónde has llegado seguro: la penúltima zona con capturas. Una zona suelta más adelante no
  // basta, porque hay sitios a los que se llega antes de tiempo (en RojoFuego la Ruta 21 va después
  // de Blaine en la lista, pero se llega surfeando desde Pueblo Paleta con la medalla de Koga)
  visitadas.sort((a, b) => b - a)
  const frente = visitadas.length > 1 ? visitadas[1] : -1

  const encuentros = Object.entries(datos)
    .filter(([k, v]) => !k.startsWith('__') && v && typeof v === 'object' && v.pokemon)
    .map(([lugar, v]) => ({ lugar, ...v }))

  const vivos = encuentros.filter((e) => ESTADOS_VIVOS.includes(+e.status))
  const muertos = encuentros.filter((e) => +e.status === MUERTO)
  const fallidos = encuentros.filter((e) => +e.status === 4)

  const equipo = (datos.__team || [])
    .map((lugar) => (datos[lugar] ? { lugar, ...datos[lugar] } : null))
    .filter((e) => e && ESTADOS_VIVOS.includes(+e.status))

  // ¿Está pasado un jefe?
  // - Sí, si lo marcaste como vencido o venciste a uno posterior.
  // - Con un .sav de la 3.ª gen, si el juego dice que tienes su medalla (o que ya eres campeón).
  // - Gimnasios y Alto Mando cortan el paso: pasados si ya capturaste en al menos dos zonas más
  //   adelante. Con el .sav vinculado esto no se deduce: manda el juego.
  // - Los demás (rivales, equipos malvados…) son a veces opcionales o se hacen en otro orden
  //   (en Kanto puedes ir a la Ruta 2 antes que a la Ruta 22, donde espera el rival): solo cuentan
  //   como pasados si estuviste en su zona, si es el primer combate del juego o si ya dejaste
  //   atrás el gimnasio siguiente.
  const ultimoVencido = jefes.reduce((m, j) => (j.derrotado ? Math.max(m, j.indice) : m), -1)
  const BLOQUEAN = ['gym-leader', 'elite-four']
  const nombresRutas = new Set(lugares.map((l) => l.name))
  const zonaDe = (j) => (nombresRutas.has(j.name) ? j.name : j.zona)
  // En los juegos de la 3.ª gen el value de cada gimnasio es el número de su medalla (en RojoFuego
  // Sabrina es la 6 aunque en la lista vaya antes que Koga, la 5)
  const delSav = (j) => {
    if (!sav) return false
    if (j.group === 'gym-leader') return /^[1-8]$/.test(String(j.value)) && !!sav.medallas[+j.value - 1]
    if (j.group === 'elite-four') return sav.campeon
    return false
  }
  const porCapturas = (j) => BLOQUEAN.includes(j.group) && !sav?.vinculado && j.indice < frente
  const pasadoSeguro = (j) => j.derrotado || j.indice < ultimoVencido || delSav(j) || porCapturas(j)
  const pasado = (j, i) => {
    if (pasadoSeguro(j)) return true
    if (BLOQUEAN.includes(j.group) || j.indice >= ultimo) return false
    if (i === 0 || !zonaDe(j) || visitada(zonaDe(j))) return true
    return jefes.some((k) => k.indice > j.indice && BLOQUEAN.includes(k.group) && pasadoSeguro(k))
  }
  const jefesPasados = jefes.map((j, i) => ({ ...j, pasado: pasado(j, i) }))
  const medallas = jefesPasados.filter((j) => j.group === 'gym-leader' && j.pasado).length
  const totalMedallas = jefes.filter((j) => j.group === 'gym-leader').length
  const siguienteJefe = jefesPasados.find((j) => !j.pasado) || null

  return {
    total: rutas.length,
    ultimo,
    progreso: rutas.length ? Math.max(0, (ultimo + 1) / rutas.length) : 0,
    lugares,
    encuentros,
    vivos,
    muertos,
    fallidos,
    equipo,
    jefes: jefesPasados,
    medallas,
    totalMedallas,
    siguienteJefe,
    medallasDelSav: !!sav?.vinculado,
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
