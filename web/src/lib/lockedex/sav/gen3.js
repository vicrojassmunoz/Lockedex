// Lector de partidas de 3.ª generación (Rubí, Zafiro, Esmeralda, RojoFuego, VerdeHoja)
// Formato documentado por la comunidad (Bulbapedia, pret/pokeemerald).

const TAM_SECCION = 0x1000
const FIRMA = 0x08012025
const TAM_RANURA = TAM_SECCION * 14
// Tamaño útil de cada sección del PC (secciones 5 a 13)
const TAM_PC = [3968, 3968, 3968, 3968, 3968, 3968, 3968, 3968, 2000]

// Orden de las subestructuras según personalidad % 24 (G=0, A=1, E=2, M=3)
const ORDENES = [
  'GAEM', 'GAME', 'GEAM', 'GEMA', 'GMAE', 'GMEA', 'AGEM', 'AGME', 'AEGM', 'AEMG', 'AMGE', 'AMEG',
  'EGAM', 'EGMA', 'EAGM', 'EAMG', 'EMGA', 'EMAG', 'MGAE', 'MGEA', 'MAGE', 'MAEG', 'MEGA', 'MEAG'
]

const u16 = (v, o) => v.getUint16(o, true)
const u32 = (v, o) => v.getUint32(o, true)

const texto = (bytes, tabla) => {
  let s = ''
  for (const b of bytes) {
    if (b === 0xff) break
    s += tabla[b] ?? ''
  }
  return s.trim()
}

const nivelPorExperiencia = (exp, tablaCrecimiento) => {
  if (!tablaCrecimiento) return null
  let nivel = 1
  for (let n = 1; n <= 100; n++) {
    if (exp >= tablaCrecimiento[n]) nivel = n
    else break
  }
  return nivel
}

// Busca la ranura de guardado más reciente y devuelve sus secciones por ID
const leerSecciones = (buffer) => {
  const v = new DataView(buffer)
  const ranuras = []
  for (let r = 0; r < 2; r++) {
    const base = r * TAM_RANURA
    if (base + TAM_RANURA > buffer.byteLength) continue
    const secciones = {}
    let indice = -1
    let validas = 0
    for (let i = 0; i < 14; i++) {
      const o = base + i * TAM_SECCION
      if (u32(v, o + 0xff8) !== FIRMA) continue
      const id = u16(v, o + 0xff4)
      if (id > 13) continue
      secciones[id] = o
      indice = Math.max(indice, u32(v, o + 0xffc))
      validas++
    }
    if (validas >= 14) ranuras.push({ secciones, indice })
  }
  if (!ranuras.length) return null
  ranuras.sort((a, b) => b.indice - a.indice)
  return ranuras[0].secciones
}

const leerPokemon = (v, o, completo, tablas, juego) => {
  const personalidad = u32(v, o)
  const idEntrenador = u32(v, o + 4)
  if (!personalidad && !idEntrenador) return null

  // Descifrar las 4 subestructuras (48 bytes)
  const clave = (personalidad ^ idEntrenador) >>> 0
  const datos = new DataView(new ArrayBuffer(48))
  for (let i = 0; i < 48; i += 4) datos.setUint32(i, (u32(v, o + 0x20 + i) ^ clave) >>> 0, true)

  const orden = ORDENES[personalidad % 24]
  const sub = (letra) => orden.indexOf(letra) * 12

  const g = sub('G'), a = sub('A'), e = sub('E'), m = sub('M')
  const especieInterna = u16(datos, g)
  const esp = tablas.especies[especieInterna]
  if (!esp) return null

  const genes = u32(datos, m + 4) // IVs, huevo y habilidad: bytes 4–7 de la subestructura M (los 8–11 son las cintas)
  if ((genes >>> 30) & 1) return null // huevo

  const movimientos = [0, 2, 4, 6].map((d) => u16(datos, a + d)).filter((x) => x > 0 && x < 400)
  const pp = [8, 9, 10, 11].map((d) => datos.getUint8(a + d))
  const experiencia = u32(datos, g + 4)
  const origen = u16(datos, m + 2)

  const ivs = {
    hp: genes & 31,
    atk: (genes >>> 5) & 31,
    def: (genes >>> 10) & 31,
    spe: (genes >>> 15) & 31,
    spa: (genes >>> 20) & 31,
    spd: (genes >>> 25) & 31
  }
  const evs = {
    hp: datos.getUint8(e),
    atk: datos.getUint8(e + 1),
    def: datos.getUint8(e + 2),
    spe: datos.getUint8(e + 3),
    spa: datos.getUint8(e + 4),
    spd: datos.getUint8(e + 5)
  }

  const tid = idEntrenador & 0xffff
  const sid = idEntrenador >>> 16
  const variocolor = (tid ^ sid ^ (personalidad >>> 16) ^ (personalidad & 0xffff)) < 8
  const lugares = juego === 'rfvh' ? tablas.lugaresRFVH : tablas.lugaresRSE
  const lugarCaptura = datos.getUint8(m + 1)

  const p = {
    especie: esp.p,
    numero: esp.n,
    mote: texto(new Uint8Array(v.buffer, o + 8, 10), tablas.caracteres),
    nivel: completo ? v.getUint8(o + 0x54) : nivelPorExperiencia(experiencia, tablas.experiencia[esp.c]),
    experiencia,
    naturaleza: tablas.naturalezas[personalidad % 25],
    habilidad: esp.h[(genes >>> 31) & 1] || esp.h[0],
    objeto: u16(datos, g + 2) || null,
    movimientos,
    pp: pp.slice(0, movimientos.length),
    ivs,
    evs,
    amistad: datos.getUint8(g + 9),
    variocolor,
    nivelCaptura: origen & 0x7f,
    lugarCaptura: lugares[lugarCaptura] || null,
    idLugarCaptura: lugarCaptura
  }

  if (completo) {
    p.ps = u16(v, o + 0x56)
    p.psMax = u16(v, o + 0x58)
    p.estadisticas = {
      hp: p.psMax,
      atk: u16(v, o + 0x5a),
      def: u16(v, o + 0x5c),
      spe: u16(v, o + 0x5e),
      spa: u16(v, o + 0x60),
      spd: u16(v, o + 0x62)
    }
    p.debilitado = p.ps === 0
  }
  return p
}

export const leerPartidaGen3 = (buffer, tablas) => {
  // Algunos emuladores añaden 16 bytes de reloj al final; no afectan
  if (buffer.byteLength < TAM_RANURA) throw new Error('El archivo es demasiado pequeño para ser una partida de GBA.')
  const secciones = leerSecciones(buffer)
  if (!secciones) throw new Error('No parece una partida de Rubí, Zafiro, Esmeralda, RojoFuego o VerdeHoja.')

  const v = new DataView(buffer)
  const s0 = secciones[0]
  const s1 = secciones[1]

  // Tipo de juego: el valor en 0xAC de la sección 0 es 1 en RojoFuego/VerdeHoja,
  // 0 en Rubí/Zafiro y una clave aleatoria en Esmeralda
  const codigo = u32(v, s0 + 0xac)
  const juego = codigo === 1 ? 'rfvh' : codigo === 0 ? 'rz' : 'esmeralda'
  const desplazEquipo = juego === 'rfvh' ? 0x34 : 0x234

  const entrenador = {
    nombre: texto(new Uint8Array(buffer, s0, 7), tablas.caracteres),
    genero: v.getUint8(s0 + 8) ? 'chica' : 'chico',
    id: u16(v, s0 + 0xa),
    horas: u16(v, s0 + 0xe),
    minutos: v.getUint8(s0 + 0x10)
  }

  // Dónde estás: SaveBlock1 empieza con la posición (4 bytes) y el mapa actual (grupo y número);
  // la sección 1 es el principio de SaveBlock1 en los cinco juegos
  const ubicacion = { grupo: v.getUint8(s1 + 4), mapa: v.getUint8(s1 + 5) }

  const tamEquipo = Math.min(6, u32(v, s1 + desplazEquipo))
  const equipo = []
  for (let i = 0; i < tamEquipo; i++) {
    const p = leerPokemon(v, s1 + desplazEquipo + 4 + i * 100, true, tablas, juego)
    if (p) equipo.push(p)
  }

  // PC: secciones 5–13 seguidas
  const pc = new Uint8Array(TAM_PC.reduce((a, b) => a + b, 0))
  let pos = 0
  for (let i = 0; i < 9; i++) {
    const o = secciones[5 + i]
    pc.set(new Uint8Array(buffer, o, TAM_PC[i]), pos)
    pos += TAM_PC[i]
  }
  const vpc = new DataView(pc.buffer)
  const cajas = []
  for (let c = 0; c < 14; c++) {
    for (let i = 0; i < 30; i++) {
      const p = leerPokemon(vpc, 4 + (c * 30 + i) * 80, false, tablas, juego)
      if (p) cajas.push({ ...p, caja: c + 1 })
    }
  }

  return { juego, entrenador, ubicacion, equipo, cajas }
}
