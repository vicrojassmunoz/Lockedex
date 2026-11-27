// Meter huevos en el PC de una partida de 3.ª generación (Egglocke).
//
// Cada huevo se crea como lo hace el juego (CreateEgg en pret/pokeemerald): Pokémon de nivel 5 con su
// experiencia y sus movimientos de nivel, del entrenador de la partida, en Poké Ball, IVs al azar,
// marcado como huevo, con el mote japonés «タマゴ» e idioma japonés (al eclosionar el juego le pone el
// nombre de la especie) y el contador de eclosión en el byte de amistad (los ciclos de huevo de la especie).
// Luego se cifra (clave = personalidad XOR ID del entrenador, subestructuras en el orden de personalidad
// % 24), se pone su suma de verificación y se recalculan las de las secciones del PC que cambian. Se
// escribe en la ranura de guardado más reciente, que es la que carga el juego.
import { TAM_SECCION, TAM_PC, ORDENES, leerSecciones } from './gen3.js'

const TAM_CAJA = 30
const CAJAS = 14
const TAM_BOX_MON = 80
const MOTE_HUEVO = [0x60, 0x6f, 0x8b] // タマゴ
const IDIOMA_JAPONES = 1
const POKE_BALL = 4
// Versión del juego en «origins» (pokeemerald, include/constants/global.h)
export const VERSION_JUEGO = { saph: 1, ruby: 2, em: 3, fr: 4, lg: 5 }

const aleatorio32 = () => {
  const a = new Uint32Array(1)
  crypto.getRandomValues(a)
  return a[0]
}

// Las secciones 5–13 (el PC) seguidas en un solo bloque, y cómo devolverlas
const juntarPC = (bytes, secciones) => {
  const pc = new Uint8Array(TAM_PC.reduce((a, b) => a + b, 0))
  let pos = 0
  for (let i = 0; i < 9; i++) {
    pc.set(bytes.subarray(secciones[5 + i], secciones[5 + i] + TAM_PC[i]), pos)
    pos += TAM_PC[i]
  }
  return pc
}
const repartirPC = (bytes, secciones, pc) => {
  const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  let pos = 0
  for (let i = 0; i < 9; i++) {
    const o = secciones[5 + i]
    bytes.set(pc.subarray(pos, pos + TAM_PC[i]), o)
    pos += TAM_PC[i]
    // Suma de verificación de la sección: palabras de 32 bits sumadas, mitades plegadas a 16 bits
    let suma = 0
    for (let k = 0; k < TAM_PC[i]; k += 4) suma = (suma + v.getUint32(o + k, true)) >>> 0
    v.setUint16(o + TAM_SECCION - 0x0a, ((suma >>> 16) + (suma & 0xffff)) & 0xffff, true)
  }
}

const hueco = (c, i) => 4 + (c * TAM_CAJA + i) * TAM_BOX_MON
const vacio = (pc, o) => pc.subarray(o, o + TAM_BOX_MON).every((b) => b === 0)

/** Juego de la partida: 'rfvh' (RojoFuego/VerdeHoja), 'rz' (Rubí/Zafiro), 'esmeralda' o null */
export const juegoDelSav = (buffer) => {
  const secciones = leerSecciones(buffer)
  if (!secciones) return null
  const codigo = new DataView(buffer).getUint32(secciones[0] + 0xac, true)
  return codigo === 1 ? 'rfvh' : codigo === 0 ? 'rz' : 'esmeralda'
}

/** Huecos libres del PC de la partida: [{ caja (0–13), hueco (0–29) }] */
export const huecosLibres = (buffer) => {
  const bytes = new Uint8Array(buffer)
  const secciones = leerSecciones(buffer)
  if (!secciones) return null
  const pc = juntarPC(bytes, secciones)
  const libres = []
  for (let c = 0; c < CAJAS; c++) for (let i = 0; i < TAM_CAJA; i++) if (vacio(pc, hueco(c, i))) libres.push({ caja: c, hueco: i })
  return libres
}

/**
 * Personalidad de un Pokémon variocolor para ese entrenador: en la 3.ª gen lo es si
 * ID ^ ID secreto ^ mitad alta ^ mitad baja de la personalidad < 8 (y el huevo lleva el ID del jugador)
 */
export const personalidadVariocolor = (id32) => {
  const id = id32 & 0xffff
  const secreto = (id32 >>> 16) & 0xffff
  const bajo = aleatorio32() & 0xffff
  const alto = (id ^ secreto ^ bajo ^ (aleatorio32() & 7)) & 0xffff
  return ((alto << 16) | bajo) >>> 0
}
export const esVariocolor = (personalidad, id32) =>
  ((id32 & 0xffff) ^ ((id32 >>> 16) & 0xffff) ^ (personalidad >>> 16) ^ (personalidad & 0xffff)) < 8

/**
 * Crea los 80 bytes de un huevo.
 * huevo: { interna, experiencia, movimientos: [{ id, pp }], ciclos, dosHabilidades, variocolor }
 * entrenador: { id32, nombre (7 bytes), chica }
 */
export const crearHuevo = (huevo, entrenador, version) => {
  const idEntrenador = entrenador.id32 >>> 0
  const personalidad = huevo.variocolor ? personalidadVariocolor(idEntrenador) : aleatorio32()
  const out = new Uint8Array(TAM_BOX_MON)
  const v = new DataView(out.buffer)
  v.setUint32(0, personalidad, true)
  v.setUint32(4, idEntrenador, true)
  out.fill(0xff, 8, 18)
  MOTE_HUEVO.forEach((b, i) => (out[8 + i] = b))
  out[0x12] = IDIOMA_JAPONES
  out[0x13] = 0b110 // tiene especie + es huevo
  out.set(entrenador.nombre.subarray(0, 7), 0x14)

  // Subestructuras sin cifrar: crecimiento (G), ataques (A), esfuerzo (E) y varios (M)
  const G = new DataView(new ArrayBuffer(12))
  G.setUint16(0, huevo.interna, true)
  G.setUint32(4, huevo.experiencia >>> 0, true)
  G.setUint8(9, Math.max(0, Math.min(255, huevo.ciclos)))
  const A = new DataView(new ArrayBuffer(12))
  ;(huevo.movimientos || []).slice(0, 4).forEach((m, i) => {
    A.setUint16(i * 2, m.id, true)
    A.setUint8(8 + i, m.pp)
  })
  const E = new DataView(new ArrayBuffer(12))
  const M = new DataView(new ArrayBuffer(12))
  // origins: nivel de captura 0, juego, Poké Ball y género del entrenador
  M.setUint16(2, ((version & 0xf) << 7) | (POKE_BALL << 11) | ((entrenador.chica ? 1 : 0) << 15), true)
  let genes = 0
  for (let k = 0; k < 6; k++) genes |= (aleatorio32() % 32) << (k * 5)
  genes = (genes | (1 << 30) | (huevo.dosHabilidades && aleatorio32() % 2 ? 1 << 31 : 0)) >>> 0
  M.setUint32(4, genes, true)

  const partes = { G, A, E, M }
  const orden = ORDENES[personalidad % 24]
  const datos = new DataView(new ArrayBuffer(48))
  orden.split('').forEach((letra, i) => {
    for (let k = 0; k < 12; k++) datos.setUint8(i * 12 + k, partes[letra].getUint8(k))
  })
  let suma = 0
  for (let k = 0; k < 48; k += 2) suma = (suma + datos.getUint16(k, true)) & 0xffff
  v.setUint16(0x1c, suma, true)
  const clave = (personalidad ^ idEntrenador) >>> 0
  for (let k = 0; k < 48; k += 4) v.setUint32(0x20 + k, (datos.getUint32(k, true) ^ clave) >>> 0, true)
  return { bytes: out, personalidad }
}

/** Lee un huevo escrito (para comprobar): especie interna y si la suma cuadra */
export const leerHuevo = (bytes) => {
  const v = new DataView(bytes.buffer, bytes.byteOffset, TAM_BOX_MON)
  const personalidad = v.getUint32(0, true)
  const clave = (personalidad ^ v.getUint32(4, true)) >>> 0
  const datos = new DataView(new ArrayBuffer(48))
  for (let k = 0; k < 48; k += 4) datos.setUint32(k, (v.getUint32(0x20 + k, true) ^ clave) >>> 0, true)
  let suma = 0
  for (let k = 0; k < 48; k += 2) suma = (suma + datos.getUint16(k, true)) & 0xffff
  const orden = ORDENES[personalidad % 24]
  const g = orden.indexOf('G') * 12
  const m = orden.indexOf('M') * 12
  const a = orden.indexOf('A') * 12
  return {
    interna: datos.getUint16(g, true),
    sumaOk: suma === v.getUint16(0x1c, true),
    huevo: !!((datos.getUint32(m + 4, true) >>> 30) & 1),
    movimientos: [0, 1, 2, 3].map((i) => datos.getUint16(a + i * 2, true)).filter(Boolean)
  }
}

/**
 * Mete los huevos en los primeros huecos libres desde la caja «desdeCaja» (0–13).
 * Devuelve { buffer (copia nueva), colocados: [{ caja, hueco, indice }] } o lanza un error.
 */
export const meterHuevos = (buffer, huevos, { version = 4, desdeCaja = 0 } = {}) => {
  const bytes = new Uint8Array(buffer.slice(0))
  const secciones = leerSecciones(bytes.buffer)
  if (!secciones) throw new Error('No parece una partida de Rubí, Zafiro, Esmeralda, RojoFuego o VerdeHoja.')
  const v = new DataView(bytes.buffer)
  const s0 = secciones[0]
  const entrenador = { id32: v.getUint32(s0 + 0x0a, true), nombre: bytes.slice(s0, s0 + 7), chica: !!bytes[s0 + 8] }
  const pc = juntarPC(bytes, secciones)
  const libres = []
  for (let c = desdeCaja; c < CAJAS; c++) for (let i = 0; i < TAM_CAJA; i++) if (vacio(pc, hueco(c, i))) libres.push({ caja: c, hueco: i })
  if (libres.length < huevos.length) throw new Error(`Solo hay ${libres.length} huecos libres desde esa caja y son ${huevos.length} huevos.`)
  const colocados = huevos.map((h, indice) => {
    const sitio = libres[indice]
    const { bytes: b } = crearHuevo(h, entrenador, version)
    pc.set(b, hueco(sitio.caja, sitio.hueco))
    return { ...sitio, indice }
  })
  repartirPC(bytes, secciones, pc)
  // Comprobación: se vuelven a leer y deben ser huevos de la especie pedida con la suma bien
  const pc2 = juntarPC(bytes, leerSecciones(bytes.buffer))
  for (const c of colocados) {
    const h = leerHuevo(pc2.subarray(hueco(c.caja, c.hueco), hueco(c.caja, c.hueco) + TAM_BOX_MON))
    if (!h.sumaOk || !h.huevo || h.interna !== huevos[c.indice].interna) throw new Error('La comprobación del huevo escrito ha fallado: no se guarda nada.')
  }
  return { buffer: bytes.buffer, colocados }
}
