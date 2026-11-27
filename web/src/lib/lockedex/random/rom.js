// Lectura de una ROM de la 3.ª generación: qué juego es y dónde están las tablas que cambia el
// randomizer. Las tablas no se buscan en direcciones fijas (cambian con cada idioma y revisión) sino por
// su forma: un patrón conocido (los datos de Bulbasaur, la tabla de iniciales) o un recorrido que
// reconoce la estructura (cabeceras de encuentros, entrenadores). Así vale para cualquier versión.
import {
  JUEGOS,
  IDIOMAS,
  NUM_ESPECIES,
  TAM_BASE,
  TAM_ENTRENADOR,
  TAM_MIEMBRO,
  TAM_EVOLUCIONES,
  HUECOS,
  INICIALES,
  MAX_MOVIMIENTO,
  MT_ORIGINALES,
  NUM_MT,
  NUM_MO,
  TUTORES_ORIGINALES,
  NUM_TUTORES,
  NUM_OBJETOS,
  OBJ,
  esObjetoClave,
  esMO,
  especieValida
} from './constantes.js'

export const BASE_ROM = 0x08000000
export const u16 = (b, o) => b[o] | (b[o + 1] << 8)
export const u32 = (b, o) => (b[o] | (b[o + 1] << 8) | (b[o + 2] << 16) | (b[o + 3] << 24)) >>> 0
export const pon16 = (b, o, v) => {
  b[o] = v & 0xff
  b[o + 1] = (v >> 8) & 0xff
}
export const pon32 = (b, o, v) => {
  pon16(b, o, v & 0xffff)
  pon16(b, o + 2, (v >>> 16) & 0xffff)
}
const esPuntero = (b, p) => p >= BASE_ROM && p < BASE_ROM + b.length
const aOffset = (p) => p - BASE_ROM

// Todas las apariciones de un patrón de bytes (con el primer byte por indexOf: rápido en 16 MB)
export const buscarTodas = (b, patron, alineado = 1, max = 50) => {
  const out = []
  let i = b.indexOf(patron[0])
  while (i !== -1 && i <= b.length - patron.length) {
    let ok = i % alineado === 0
    for (let k = 1; ok && k < patron.length; k++) if (b[i + k] !== patron[k]) ok = false
    if (ok) {
      out.push(i)
      if (out.length >= max) break
    }
    i = b.indexOf(patron[0], i + 1)
  }
  return out
}
const bytes32 = (v) => [v & 0xff, (v >>> 8) & 0xff, (v >>> 16) & 0xff, (v >>> 24) & 0xff]

export const detectarJuego = (b) => {
  if (!b || b.length < 0x100000) return null
  const texto = (a, z) => String.fromCharCode(...b.slice(a, z)).replace(/\0+$/, '').trim()
  const codigo = texto(0xac, 0xb0)
  const j = JUEGOS[codigo.slice(0, 3)]
  return {
    codigo,
    titulo: texto(0xa0, 0xac),
    compatible: !!j,
    ...(j || {}),
    idioma: IDIOMAS[codigo[3]] || codigo[3] || '?',
    revision: b[0xbc]
  }
}

// Estadísticas base: Bulbasaur (45/49/49/45/65/65, Planta/Veneno) es la especie 1; delante va la 0, vacía
const buscarBase = (b) => {
  for (const o of buscarTodas(b, [45, 49, 49, 45, 65, 65, 12, 3])) {
    const t = o - TAM_BASE
    if (t >= 0 && b[o + TAM_BASE] === 60 && b[o + TAM_BASE + 1] === 62 && b[o + TAM_BASE + 2] === 63) return t
  }
  return null
}

// Evoluciones: Bulbasaur → Ivysaur a nivel 16 (método 4) y, 40 bytes después, Ivysaur → Venusaur a nivel 32
const buscarEvoluciones = (b) => {
  for (const o of buscarTodas(b, [4, 0, 16, 0, 2, 0, 0, 0], 4)) {
    const sig = o + TAM_EVOLUCIONES
    if (b[sig] === 4 && b[sig + 2] === 32 && b[sig + 4] === 3) return o - TAM_EVOLUCIONES
  }
  return null
}

// Movimientos por nivel: el de Bulbasaur empieza por Placaje 1, Gruñido 4, Drenadoras 7 y Látigo Cepa 10;
// la tabla de punteros apunta a él desde la casilla 1
const buscarAprendizaje = (b) => {
  for (const o of buscarTodas(b, [0x21, 0x02, 0x2d, 0x08, 0x49, 0x0e, 0x16, 0x14], 2)) {
    for (const q of buscarTodas(b, bytes32(BASE_ROM + o), 4)) {
      const t = q - 4
      if (t >= 0 && esPuntero(b, u32(b, t)) && esPuntero(b, u32(b, t + 8))) return t
    }
  }
  return null
}

// Encuentros salvajes: cabeceras de 20 bytes { grupo, mapa, relleno, tierra*, agua*, roca*, pesca* }
// terminadas en el mapa 0xFF/0xFF. Cada puntero lleva a { tasa, relleno, especies* } y la lista de huecos
// { nivel mín., nivel máx., especie }
const leerInfo = (b, p, huecos) => {
  if (p === 0) return null
  if (!esPuntero(b, p)) return false
  const o = aOffset(p)
  if (o + 8 > b.length) return false
  const tasa = b[o]
  if (tasa === 0 || b[o + 1] || b[o + 2] || b[o + 3]) return false
  const pm = u32(b, o + 4)
  if (!esPuntero(b, pm)) return false
  const om = aOffset(pm)
  if (om + huecos * 4 > b.length) return false
  for (let k = 0; k < huecos; k++) {
    const min = b[om + k * 4], max = b[om + k * 4 + 1], esp = u16(b, om + k * 4 + 2)
    if (min < 1 || max < min || max > 100 || !especieValida(esp)) return false
  }
  return { info: o, tasa, mons: om, huecos }
}
const TIPOS_ENCUENTRO = ['tierra', 'agua', 'roca', 'pesca']
const leerCabecera = (b, h) => {
  if (h + 20 > b.length || b[h + 2] || b[h + 3]) return null
  const g = b[h], m = b[h + 1]
  if (g === 0xff && m === 0xff) return 'fin'
  if (g > 0x40) return null
  const ptrs = [u32(b, h + 4), u32(b, h + 8), u32(b, h + 12), u32(b, h + 16)]
  if (ptrs.every((p) => p === 0)) return null
  const c = { o: h, g, m }
  for (let k = 0; k < 4; k++) {
    const tipo = TIPOS_ENCUENTRO[k]
    const r = leerInfo(b, ptrs[k], HUECOS[tipo])
    if (r === false) return null
    c[tipo] = r
  }
  return c
}
const buscarSalvajes = (b) => {
  let mejor = null
  for (let h = 0; h + 20 <= b.length; h += 4) {
    // filtro rápido: relleno a cero y el primer puntero nulo o en la ROM
    if (b[h + 2] || b[h + 3] || (b[h + 7] !== 0x08 && b[h + 7] !== 0x09 && (b[h + 4] | b[h + 5] | b[h + 6] | b[h + 7]))) continue
    const primera = leerCabecera(b, h)
    if (!primera || primera === 'fin') continue
    const cabeceras = [primera]
    let p = h + 20
    let fin = false
    for (;;) {
      const c = leerCabecera(b, p)
      if (c === 'fin') {
        fin = true
        break
      }
      if (!c) break
      cabeceras.push(c)
      p += 20
    }
    if (fin) {
      if (!mejor || cabeceras.length > mejor.cabeceras.length) mejor = { tabla: h, cabeceras }
      h = p + 16
    }
  }
  return mejor && mejor.cabeceras.length >= 20 ? mejor : null
}

// Entrenadores: registros de 40 bytes (TRAINER_NONE, el 0, va vacío)
export const leerEntrenador = (b, o) => {
  const flags = b[o]
  const tam = b[o + 0x20]
  if (flags > 3 || b[o + 0x18] > 1 || b[o + 0x19] || b[o + 0x1a] || b[o + 0x1b] || b[o + 0x21] || b[o + 0x22] || b[o + 0x23]) return null
  if (u32(b, o + 0x1c) >= 0x40000000) return null
  let nombreOk = false
  for (let k = 4; k < 16; k++) if (b[o + k] === 0xff) nombreOk = true
  if (!nombreOk) return null
  const p = u32(b, o + 0x24)
  if (tam === 0) return p === 0 || esPuntero(b, p) ? { o, flags, clase: b[o + 1], tam, miembros: [] } : null
  if (tam > 6 || !esPuntero(b, p)) return null
  const om = aOffset(p)
  const paso = TAM_MIEMBRO[flags]
  if (om + tam * paso > b.length) return null
  const miembros = []
  for (let k = 0; k < tam; k++) {
    const mo = om + k * paso
    const nivel = b[mo + 2]
    const esp = u16(b, mo + 4)
    if (nivel < 1 || nivel > 100 || !especieValida(esp)) return null
    const conObjeto = flags & 2
    const conMovs = flags & 1
    miembros.push({
      o: mo,
      nivel,
      esp,
      objeto: conObjeto ? u16(b, mo + 6) : 0,
      movs: conMovs ? [0, 1, 2, 3].map((i) => u16(b, mo + (conObjeto ? 8 : 6) + i * 2)) : null,
      oMovs: conMovs ? mo + (conObjeto ? 8 : 6) : null
    })
  }
  return { o, flags, clase: b[o + 1], tam, miembros, nombre: b.slice(o + 4, o + 16) }
}
const buscarEntrenadores = (b) => {
  let mejor = null
  for (let o = 0; o + TAM_ENTRENADOR <= b.length; o += 4) {
    if (b[o] > 3 || b[o + 0x20] > 6 || b[o + 0x21] || b[o + 0x19]) continue
    if (!leerEntrenador(b, o)) continue
    let p = o
    let n = 0
    let conEquipo = 0
    for (;;) {
      const e = leerEntrenador(b, p)
      if (!e) break
      if (e.tam) conEquipo++
      n++
      p += TAM_ENTRENADOR
    }
    if (conEquipo >= 100) {
      if (!mejor || n > mejor.n) mejor = { tabla: o, n }
      o = p - 4
    }
  }
  // El primero (TRAINER_NONE) va vacío: si el recorrido empezó en el 1, se incluye
  while (mejor && mejor.tabla >= TAM_ENTRENADOR && leerEntrenador(b, mejor.tabla - TAM_ENTRENADOR)?.tam === 0) {
    mejor.tabla -= TAM_ENTRENADOR
    mejor.n++
    break
  }
  return mejor
}

// Iniciales. Rubí, Zafiro y Esmeralda: tabla de 3 especies (Treecko, Torchic, Mudkip). RojoFuego y
// VerdeHoja: en el guion del laboratorio de Oak, «setvar» de tu inicial y del del rival para cada Poké Ball
const buscarIniciales = (b, familia) => {
  if (familia === 'frlg') {
    // setvar VAR_TEMP_2 (0x4002) = tuyo, setvar VAR_TEMP_3 (0x4003) = el del rival
    const casos = []
    const pares = [
      [0, 1], // Bulbasaur → el rival elige Charmander
      [2, 0], // Squirtle → Bulbasaur
      [1, 2] // Charmander → Squirtle
    ]
    const ini = INICIALES.frlg
    for (const [tuyo, rival] of pares) {
      const patron = [0x16, 0x02, 0x40, ini[tuyo], 0x00, 0x16, 0x03, 0x40, ini[rival], 0x00]
      for (const o of buscarTodas(b, patron)) casos.push({ o, tuyo, rival })
    }
    return casos.length >= 3 ? { tipo: 'guion', casos } : null
  }
  const ini = INICIALES[familia]
  const offs = buscarTodas(b, ini.flatMap((e) => [e & 0xff, e >> 8]), 2)
  return offs.length && offs.length <= 3 ? { tipo: 'tabla', offsets: offs } : null
}

const patron16 = (lista) => lista.flatMap((v) => [v & 0xff, v >> 8])
const patron32 = (lista) => lista.flatMap(bytes32)

// MT y MO: la lista de los 58 movimientos (RojoFuego y VerdeHoja la tienen dos veces: se cambian todas)
const buscarMT = (b) => {
  const offsets = buscarTodas(b, patron16(MT_ORIGINALES), 2, 8)
  return offsets.length ? { offsets } : null
}

// Compatibilidad con MT/MO: 8 bytes (64 bits) por especie; la 0 vacía y Bulbasaur e Ivysaur iguales
const COMPAT_BULBASAUR = [0x84350720, 0x00e41e08]
const buscarCompatMT = (b) => {
  for (const o of buscarTodas(b, patron32([0, 0, ...COMPAT_BULBASAUR, ...COMPAT_BULBASAUR]), 4)) {
    if (o + NUM_ESPECIES * 8 > b.length) continue
    let ok = true
    for (let i = 0; ok && i < NUM_ESPECIES; i++) if (u32(b, o + i * 8 + 4) >>> (NUM_MT + NUM_MO - 32)) ok = false
    if (ok) return o
  }
  return null
}

// Tutores: la lista de movimientos (una o más copias) y su compatibilidad (u32 en Esmeralda, u16 en RF/VH)
const TUTOR_COMPAT = {
  e: { tam: 4, inicio: [0, 0x25b4409a, 0x25b4409a, 0x25b4409a, 0x37b4e0ff] },
  frlg: { tam: 2, inicio: [0, 0x409a, 0x409a, 0x409a, 0x60ff] }
}
const buscarTutores = (b, familia) => {
  const n = NUM_TUTORES[familia]
  const c = TUTOR_COMPAT[familia]
  if (!n || !c) return null
  const movimientos = buscarTodas(b, patron16(TUTORES_ORIGINALES.slice(0, n)), 2, 8)
  if (!movimientos.length) return null
  let compat = null
  for (const o of buscarTodas(b, c.tam === 4 ? patron32(c.inicio) : patron16(c.inicio), c.tam)) {
    if (o + NUM_ESPECIES * c.tam > b.length) continue
    let ok = true
    for (let i = 0; ok && i < NUM_ESPECIES; i++) {
      const v = c.tam === 4 ? u32(b, o + i * 4) : u16(b, o + i * 2)
      if (v >>> n) ok = false
    }
    if (ok) {
      compat = o
      break
    }
  }
  return compat === null ? null : { n, movimientos, compat, tam: c.tam }
}

// Tabla de objetos: registros de 44 bytes { nombre[14], número, precio, …, descripción* (0x14) }; la
// Ultra Ball (2) cuesta 1200 en todas las ediciones
export const TAM_OBJETO = 44
const buscarObjetos = (b) => {
  for (const p of buscarTodas(b, [2, 0, 0xb0, 0x04], 2)) {
    const t = p - 14 - 2 * TAM_OBJETO
    if (t < 0 || t % 4) continue
    let n = 0
    while (n < NUM_OBJETOS && t + (n + 1) * TAM_OBJETO <= b.length && u16(b, t + n * TAM_OBJETO + 14) === n) n++
    if (n >= 340 && esPuntero(b, u32(b, t + OBJ.MT01 * TAM_OBJETO + 0x14))) return { tabla: t, n }
  }
  return null
}

// Descripciones de los movimientos (las del resumen del Pokémon): 354 punteros a textos que van uno
// detrás de otro. Sirven para que la descripción de cada MT diga lo que hace su movimiento nuevo
const largoTexto = (b, o, max = 260) => {
  for (let k = 0; k < max && o + k < b.length; k++) if (b[o + k] === 0xff) return k
  return -1
}
const buscarDescripcionesMov = (b) => {
  const n = MAX_MOVIMIENTO
  const seguido = (o, k) => {
    const a = aOffset(u32(b, o + k * 4))
    const c = aOffset(u32(b, o + (k + 1) * 4))
    const l = largoTexto(b, a)
    return l >= 4 && c - (a + l + 1) >= 0 && c - (a + l + 1) <= 3
  }
  for (let o = 0; o + n * 4 <= b.length; o += 4) {
    if (b[o + 3] !== 0x08 || b[o + 7] !== 0x08 || b[o + 11] !== 0x08) continue
    if (!esPuntero(b, u32(b, o)) || !esPuntero(b, u32(b, o + 4)) || !esPuntero(b, u32(b, o + 8))) continue
    if (!seguido(o, 0) || !seguido(o, 1)) continue
    let ok = true
    for (let k = 0; ok && k < n - 1; k++) if (!esPuntero(b, u32(b, o + (k + 1) * 4)) || !seguido(o, k)) ok = false
    if (ok && largoTexto(b, aOffset(u32(b, o + (n - 1) * 4))) >= 4) return o
  }
  return null
}

// Objetos del suelo (las Poké Balls con objeto): su guion es «finditem»:
// setorcopyvar 0x8000, objeto · setorcopyvar 0x8001, cantidad · callstd 1
const buscarObjetosSuelo = (b) => {
  const out = []
  let i = b.indexOf(0x1a)
  while (i !== -1 && i + 12 <= b.length) {
    if (b[i + 1] === 0x00 && b[i + 2] === 0x80 && b[i + 5] === 0x1a && b[i + 6] === 0x01 && b[i + 7] === 0x80 && b[i + 9] === 0 && b[i + 10] === 0x09 && b[i + 11] === 0x01) {
      const objeto = u16(b, i + 3)
      if (objeto >= 1 && objeto < NUM_OBJETOS && b[i + 8] >= 1) out.push({ o: i + 3, objeto })
    }
    i = b.indexOf(0x1a, i + 1)
  }
  return out.length >= 20 ? out : null
}

// Tiendas: «pokemart lista» (0x86 + puntero) y la lista de objetos que termina en 0. En las cinco
// ediciones, detrás va siempre «msgbox» (loadword 0, texto · callstd): así no se confunde con otros datos
const buscarTiendas = (b) => {
  const vistas = new Map()
  let i = b.indexOf(0x86)
  while (i !== -1 && i + 12 <= b.length) {
    const p = u32(b, i + 1)
    const msgbox = b[i + 5] === 0x0f && b[i + 6] === 0x00 && esPuntero(b, u32(b, i + 7)) && b[i + 11] === 0x09
    if (msgbox && esPuntero(b, p) && p % 2 === 0) {
      const o = aOffset(p)
      if (!vistas.has(o)) {
        const objetos = []
        let ok = false
        for (let k = 0; k < 40 && o + k * 2 + 2 <= b.length; k++) {
          const v = u16(b, o + k * 2)
          if (v === 0) {
            ok = objetos.length >= 2
            break
          }
          if (v >= NUM_OBJETOS || esObjetoClave(v) || esMO(v) || objetos.includes(v)) break
          objetos.push(v)
        }
        if (ok) vistas.set(o, { o, objetos })
      }
    }
    i = b.indexOf(0x86, i + 1)
  }
  const out = [...vistas.values()]
  return out.length >= 5 ? out : null
}

// Espacio libre: el tramo más largo de 0xFF (lo que sobra al final de la ROM). Hace falta para dar
// Pokémon extra a los entrenadores, porque sus equipos no caben en su sitio
const buscarEspacioLibre = (b) => {
  let mejor = null
  let inicio = -1
  for (let o = 0; o <= b.length; o += 4) {
    const libre = o < b.length && b[o] === 0xff && b[o + 1] === 0xff && b[o + 2] === 0xff && b[o + 3] === 0xff
    if (libre && inicio < 0) inicio = o
    if (!libre && inicio >= 0) {
      if (!mejor || o - inicio > mejor.fin - mejor.inicio) mejor = { inicio, fin: o }
      inicio = -1
    }
  }
  if (!mejor || mejor.fin - mejor.inicio < 0x4000) return null
  // un margen por si lo anterior termina con bytes 0xFF que sí se usan
  return { inicio: (mejor.inicio + 0x100 + 15) & ~15, fin: mejor.fin }
}

export const analizarRom = (b) => {
  const juego = detectarJuego(b)
  if (!juego) return { juego: null, problemas: ['No parece una ROM de Game Boy Advance.'] }
  if (!juego.compatible) return { juego, problemas: [`«${juego.titulo}» (${juego.codigo}) no es Rubí, Zafiro, Esmeralda, RojoFuego ni VerdeHoja.`] }
  const r = {
    juego,
    base: buscarBase(b),
    evoluciones: buscarEvoluciones(b),
    aprendizaje: buscarAprendizaje(b),
    salvajes: buscarSalvajes(b),
    entrenadores: buscarEntrenadores(b),
    iniciales: buscarIniciales(b, juego.familia),
    mt: buscarMT(b),
    compatMT: buscarCompatMT(b),
    tutores: buscarTutores(b, juego.familia),
    objetos: buscarObjetos(b),
    descripcionesMov: buscarDescripcionesMov(b),
    objetosSuelo: buscarObjetosSuelo(b),
    tiendas: buscarTiendas(b),
    libre: buscarEspacioLibre(b),
    problemas: []
  }
  if (r.base === null) r.problemas.push('No encuentro las estadísticas de las especies.')
  if (r.evoluciones === null) r.problemas.push('No encuentro las evoluciones.')
  if (r.aprendizaje === null) r.problemas.push('No encuentro los movimientos por nivel.')
  if (!r.salvajes) r.problemas.push('No encuentro los Pokémon salvajes.')
  if (!r.entrenadores) r.problemas.push('No encuentro los entrenadores.')
  if (!r.iniciales) r.problemas.push('No encuentro los iniciales.')
  return r
}

// --- Lectura de las tablas (para el motor y para el registro) ---

export const leerBase = (b, base) =>
  Array.from({ length: NUM_ESPECIES }, (_, i) => {
    const o = base + i * TAM_BASE
    return {
      o,
      stats: [b[o], b[o + 1], b[o + 2], b[o + 3], b[o + 4], b[o + 5]], // PS, Atq, Def, Vel, AtE, DfE
      tipos: [b[o + 6], b[o + 7]],
      habilidades: [b[o + 22], b[o + 23]]
    }
  })

export const leerEvoluciones = (b, tabla) =>
  Array.from({ length: NUM_ESPECIES }, (_, i) => {
    const out = []
    for (let k = 0; k < 5; k++) {
      const o = tabla + i * TAM_EVOLUCIONES + k * 8
      const metodo = u16(b, o)
      if (metodo) out.push({ metodo, param: u16(b, o + 2), destino: u16(b, o + 4) })
    }
    return out
  })

export const leerAprendizaje = (b, tabla) =>
  Array.from({ length: NUM_ESPECIES }, (_, i) => {
    const p = u32(b, tabla + i * 4)
    if (!esPuntero(b, p)) return { o: null, lista: [] }
    const o = aOffset(p)
    const lista = []
    for (let k = 0; k < 64; k++) {
      const v = u16(b, o + k * 2)
      if (v === 0xffff) break
      lista.push([v >> 9, v & 0x1ff])
    }
    return { o, lista }
  })

export const leerEntrenadores = (b, tabla, n) => Array.from({ length: n }, (_, i) => ({ i, ...leerEntrenador(b, tabla + i * TAM_ENTRENADOR) }))
