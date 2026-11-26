// Diario de la run: lo que pasa en cada run, con fecha y hora.
//
// No hace falta tocar cada botón de la app: se guarda una foto de la run (encuentros, jefes vencidos,
// derrotas e intento) y cada vez que cambian los datos se compara con la anterior. Así también se
// apunta lo que se hace desde el modo compacto (otra ventana). Empieza a contar desde la 1.18.0: la
// primera vez solo se hace la foto, sin inventar entradas del pasado.
//
// «lockedex.diario.<id>» = [{ t, intento, tipo, ... }]   «lockedex.diarioFoto.<id>» = la última foto
import { leerPartida } from './partida.js'
import { leerEstado } from './derrotas.js'

const claveDiario = (id) => `lockedex.diario.${id}`
const claveFoto = (id) => `lockedex.diarioFoto.${id}`
const MAXIMO = 3000

const leerJSON = (k, def) => {
  try {
    return JSON.parse(localStorage.getItem(k) || 'null') ?? def
  } catch {
    return def
  }
}

export const leerDiario = (id) => (id && typeof localStorage !== 'undefined' ? leerJSON(claveDiario(id), []) : [])

const guardarDiario = (id, lista) => localStorage.setItem(claveDiario(id), JSON.stringify(lista.slice(-MAXIMO)))

export const anotar = (id, entrada) => {
  const lista = leerDiario(id)
  lista.push({ t: Date.now(), ...entrada })
  guardarDiario(id, lista)
}

// Nota a mano desde la ventana del diario
export const anotarNota = (id, texto, intento) => {
  const limpio = String(texto || '').trim().slice(0, 280)
  if (limpio) anotar(id, { tipo: 'nota', intento, texto: limpio })
}

export const borrarEntrada = (id, t) => guardarDiario(id, leerDiario(id).filter((e) => e.t !== t))

// Quién debilitó a un Pokémon. La ventana de «¿quién fue?» guarda { type: 'boss' | 'trainer' | 'encounter',
// trainer: { name }, opponent: { name } }; las versiones antiguas guardaban { tab, result }
export const causaMuerte = (d) => {
  if (!d) return null
  const tipo = d.type || d.tab
  const nombre = (o) => (typeof o === 'string' ? o : o?.name || o?.boss || null)
  if (tipo === 'sacrificio') return 'sacrificio'
  if (tipo === 'boss') return nombre(d.trainer) || nombre(d.result) || null
  if (tipo === 'trainer') return nombre(d.trainer) || nombre(d.result) || 'trainer'
  if (tipo === 'encounter') return 'wild'
  return null
}

const ESTADO_TIPO = { 1: 'captura', 2: 'regalo', 3: 'intercambio', 4: 'fallo', 5: 'muerte', 6: 'variocolor', 7: 'descarte' }
const VIVOS = [1, 2, 3, 6]

const foto = (p) => {
  const datos = p?.datos || {}
  const encuentros = {}
  for (const [k, v] of Object.entries(datos)) {
    if (k.startsWith('__') || !v || typeof v !== 'object' || !(v.pokemon || v.status)) continue
    encuentros[k] = { p: v.pokemon || '', s: +v.status || 0, m: v.nickname || '', c: causaMuerte(v.death), h: v.cambio?.tipo || null }
  }
  const jefes = (Array.isArray(datos.__teams) ? datos.__teams : []).filter((e) => e && e.id != null).map((e) => String(e.id))
  const estado = leerEstado(p.id)
  return {
    intento: +p.intentos || 1,
    encuentros,
    jefes,
    derrotas: estado.derrotas.length,
    fin: !!estado.fin,
    revividos: (estado.revividos || []).length
  }
}

/**
 * Compara la run activa (o la que se pase) con su última foto y apunta lo nuevo en el diario.
 * Devuelve las entradas añadidas.
 */
export const registrarCambios = (id = typeof localStorage !== 'undefined' ? localStorage.getItem('nuzlocke') : null) => {
  if (!id || typeof localStorage === 'undefined') return []
  const p = leerPartida(id)
  if (!p) return []
  const ahora = foto(p)
  const antes = leerJSON(claveFoto(id), null)
  const guardarFoto = () => localStorage.setItem(claveFoto(id), JSON.stringify(ahora))
  // Primera vez: solo la foto
  if (!antes) {
    guardarFoto()
    return []
  }
  const nuevas = []
  const t = Date.now()
  const intento = ahora.intento
  const anade = (e) => nuevas.push({ t, intento, ...e })

  // Nuevo intento: la run se vacía, así que no se comparan los encuentros
  if (ahora.intento !== antes.intento) {
    anade({ tipo: 'intento', desde: antes.intento })
  } else {
    for (const [lugar, e] of Object.entries(ahora.encuentros)) {
      const a = antes.encuentros?.[lugar]
      const base = { lugar, pokemon: e.p, mote: e.m }
      if (!a || (!a.s && e.s)) {
        if (ESTADO_TIPO[e.s]) anade({ tipo: ESTADO_TIPO[e.s], ...base, ...(e.s === 5 && e.c ? { causa: e.c } : {}) })
        continue
      }
      if (a.s !== e.s) {
        if (e.s === 5) anade({ tipo: 'muerte', ...base, ...(e.c ? { causa: e.c } : {}) })
        else if (a.s === 5 && VIVOS.includes(e.s)) anade({ tipo: 'revivido', ...base })
        else if (!VIVOS.includes(a.s) && VIVOS.includes(e.s)) anade({ tipo: ESTADO_TIPO[e.s], ...base })
        else if (ESTADO_TIPO[e.s] && !(VIVOS.includes(a.s) && VIVOS.includes(e.s))) anade({ tipo: ESTADO_TIPO[e.s], ...base })
      } else if (VIVOS.includes(e.s) && a.p && e.p && a.p !== e.p) {
        // Egglocke / Wonderlocke: no es una evolución, es lo que salió del huevo o llegó por el intercambio
        if (e.h && !a.h) anade({ tipo: e.h === 'huevo' ? 'huevo' : 'prodigioso', ...base, de: a.p })
        else if (!e.h && a.h) anade({ tipo: 'cambioDeshecho', ...base, de: a.p })
        else anade({ tipo: 'evolucion', ...base, de: a.p })
      }
      // La causa de la muerte llega justo después (ventana de «¿quién fue?»): se completa la entrada
      if (e.s === 5 && e.c && !a.c && a.s === 5) completarCausa(id, lugar, e.c, intento)
    }
    const yaVencidos = new Set(antes.jefes || [])
    const equipos = Array.isArray(p.datos?.__teams) ? p.datos.__teams : []
    for (const j of ahora.jefes)
      if (!yaVencidos.has(j)) {
        const e = equipos.find((x) => String(x?.id) === j) || {}
        anade({ tipo: 'jefe', jefe: j, nombre: e.name || j, grupo: e.group || '', equipo: (e.team || []).map((m) => m.sprite).filter(Boolean) })
      }
    if (ahora.derrotas > antes.derrotas) {
      const est = leerEstado(id)
      // la derrota que acaba la run ya sale como «game over»
      for (const x of est.derrotas.slice(antes.derrotas))
        if (x?.fecha !== est.fin?.fecha) anade({ tipo: 'derrota', nombre: x?.jefe?.nombre || '' })
    }
    if (ahora.fin && !antes.fin) {
      const fin = leerEstado(id).fin || {}
      anade({ tipo: 'gameover', motivo: fin.motivo || '', nombre: fin.jefe?.nombre || '' })
    }
    if (!ahora.fin && antes.fin) anade({ tipo: 'deshecho' })
  }

  if (nuevas.length) guardarDiario(id, [...leerDiario(id), ...nuevas])
  if (JSON.stringify(ahora) !== JSON.stringify(antes)) guardarFoto()
  return nuevas
}

const completarCausa = (id, lugar, causa, intento) => {
  const lista = leerDiario(id)
  for (let i = lista.length - 1; i >= 0; i--) {
    const e = lista[i]
    if (e.tipo === 'muerte' && e.lugar === lugar && e.intento === intento) {
      if (!e.causa) {
        e.causa = causa
        guardarDiario(id, lista)
      }
      return
    }
  }
}
