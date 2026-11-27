// Motor del randomizer de la 3.ª generación. Trabaja sobre una copia de la ROM y cambia los datos en su
// sitio; lo único que se escribe fuera es el equipo de los entrenadores con Pokémon extra, que va al
// espacio libre del final de la ROM (si lo hay).
//
// ajustes = {
//   semilla,
//   salvajes:     { modo: 'mantener' | 'unoAuno' | 'zona' | 'fuerza', mismaEtapa, sinLegendarios, subirNivel (%) },
//   iniciales:    { modo: 'mantener' | 'azar' | 'tresEtapas', triangulo: 'no' | 'clasico' | 'cualquiera', sinLegendarios },
//   entrenadores: { modo: 'mantener' | 'azar' | 'fuerza', mismaEtapa, rivalInicial, sinLegendarios, subirNivel (%),
//                   tema: 'no' | 'clase' | 'azar' (un tipo por entrenador), jefes: 'original' | 'azar' | 'no' (tipo de
//                   líderes, Alto Mando y campeón), evolucionados (nivel desde el que van totalmente evolucionados; 0 = no),
//                   objetos: 'mantener' | 'jefes' | 'importantes' | 'todos', objetosClase: 'bayas' | 'sensatos',
//                   extraJefes, extraResto (Pokémon de más), nombres (mezclar los nombres) },
//   tipos:        { modo: 'mantener' | 'linea' | 'azar' },
//   habilidades:  { modo: 'mantener' | 'linea' | 'azar', sinSuperguarda },
//   movimientos:  { modo: 'mantener' | 'azar', mismoTipo (%) },
//   mt:           { modo: 'mantener' | 'azar', danino (%), campo (mantener Excavar y Daño Secreto) },
//   tutores:      { modo: 'mantener' | 'azar' },
//   compat:       { modo: 'mantener' | 'tipo' | 'azar' | 'total', mo: 'original' | 'igual' | 'todos' },
//   objetosSuelo: { modo: 'mantener' | 'mezclar' | 'azar' },
//   tiendas:      { modo: 'mantener' | 'azar', basicos }
// }
// datos = { especies (gen3.json: índice interno → { p: alias }), legendarios: Set de alias,
//           movimientos: { id → { tipo, potencia } }, caracteres (tabla de texto de gen3.json) }
import { crearAzar } from './azar.js'
import {
  TIPOS,
  TIPOS_VALIDOS,
  HABILIDADES,
  SUPERGUARDA,
  NUM_ESPECIES,
  INICIALES,
  CLASES,
  MAX_MOVIMIENTO,
  TAM_MIEMBRO,
  TAM_ENTRENADOR,
  MT_ORIGINALES,
  NUM_MT,
  NUM_MO,
  MT_DE_CAMPO,
  MOVIMIENTOS_INUTILES,
  FORCEJEO,
  OBJ,
  esMT,
  esMO,
  esObjetoClave,
  GRUPOS_OBJETOS,
  PESOS_SUELO,
  PESOS_TIENDA,
  BASICOS_TIENDA,
  OBJETO_DE_TIPO,
  OBJETOS_BAYAS,
  OBJETOS_COMBATE,
  CINTA_ELECCION,
  especieValida
} from './constantes.js'
import { leerBase, leerEvoluciones, leerAprendizaje, leerEntrenadores, leerEntrenador, pon16, pon32, u16, u32, BASE_ROM, TAM_OBJETO } from './rom.js'

// Tabla de tipos de la 3.ª gen: a quién pega fuerte cada tipo (para el triángulo de iniciales)
const FUERTE = {
  normal: [],
  fighting: ['normal', 'rock', 'steel', 'ice', 'dark'],
  flying: ['fighting', 'bug', 'grass'],
  poison: ['grass'],
  ground: ['poison', 'rock', 'steel', 'fire', 'electric'],
  rock: ['flying', 'bug', 'fire', 'ice'],
  bug: ['grass', 'psychic', 'dark'],
  ghost: ['ghost', 'psychic'],
  steel: ['rock', 'ice'],
  fire: ['bug', 'steel', 'grass', 'ice'],
  water: ['ground', 'rock', 'fire'],
  grass: ['ground', 'rock', 'water'],
  electric: ['flying', 'water'],
  psychic: ['fighting', 'poison'],
  ice: ['flying', 'ground', 'grass', 'dragon'],
  dragon: ['dragon'],
  dark: ['ghost', 'psychic']
}
const pegaFuerte = (a, b) => (FUERTE[a] || []).includes(b)

const TOTAL = (e) => e.stats.reduce((s, x) => s + x, 0)

export const AJUSTES_POR_DEFECTO = {
  salvajes: { modo: 'unoAuno', mismaEtapa: true, sinLegendarios: true, subirNivel: 0 },
  iniciales: { modo: 'tresEtapas', triangulo: 'clasico', sinLegendarios: true },
  entrenadores: {
    modo: 'azar',
    mismaEtapa: true,
    tema: 'no',
    jefes: 'original',
    rivalInicial: true,
    sinLegendarios: true,
    subirNivel: 0,
    evolucionados: 0,
    objetos: 'mantener',
    objetosClase: 'sensatos',
    extraJefes: 0,
    extraResto: 0,
    nombres: false
  },
  tipos: { modo: 'mantener' },
  habilidades: { modo: 'mantener', sinSuperguarda: true },
  movimientos: { modo: 'mantener', mismoTipo: 40 },
  mt: { modo: 'mantener', danino: 60, campo: true },
  tutores: { modo: 'mantener' },
  compat: { modo: 'mantener', mo: 'original' },
  objetosSuelo: { modo: 'mantener' },
  tiendas: { modo: 'mantener', basicos: true }
}

// Ajustes completos: los que faltan (de versiones anteriores del registro), con su valor por defecto
export const completarAjustes = (entrada = {}) => {
  const out = { ...AJUSTES_POR_DEFECTO, ...entrada }
  for (const k of Object.keys(AJUSTES_POR_DEFECTO)) out[k] = { ...AJUSTES_POR_DEFECTO[k], ...(entrada?.[k] || {}) }
  // antes era una casilla: «Líderes y Alto Mando con su tipo»
  if (entrada?.entrenadores && !('jefes' in entrada.entrenadores) && entrada.entrenadores.lideresTipo === false) out.entrenadores.jefes = 'no'
  delete out.entrenadores.lideresTipo
  return out
}

export const aleatorizar = (rom, analisis, ajustesEntrada, datos) => {
  const ajustes = completarAjustes(ajustesEntrada)
  for (const [k, n] of [['base', 'las estadísticas'], ['evoluciones', 'las evoluciones'], ['aprendizaje', 'los movimientos por nivel']])
    if (analisis[k] === null || analisis[k] === undefined) throw new Error(`No se puede aleatorizar: no encuentro ${n} en la ROM.`)
  const b = new Uint8Array(rom) // copia: la original no se toca
  const azar = crearAzar(ajustes.semilla)
  const familia = analisis.juego.familia
  const alias = (i) => datos.especies?.[i]?.p || `#${i}`
  const legendario = (i) => datos.legendarios?.has(alias(i))
  const avisos = []

  // --- Datos de la ROM ---
  const base = leerBase(b, analisis.base)
  const tiposOriginales = base.map((e) => [...e.tipos])
  const evos = leerEvoluciones(b, analisis.evoluciones)
  const apr = leerAprendizaje(b, analisis.aprendizaje)
  const todas = Array.from({ length: NUM_ESPECIES }, (_, i) => i).filter(especieValida)

  // Familias: padre de cada especie, etapa (1 = básica) y hijos
  const padre = []
  const hijos = Array.from({ length: NUM_ESPECIES }, () => [])
  evos.forEach((lista, i) =>
    lista.forEach((e) => {
      if (especieValida(e.destino) && padre[e.destino] === undefined) {
        padre[e.destino] = i
        if (!hijos[i].includes(e.destino)) hijos[i].push(e.destino)
      }
    })
  )
  const raiz = (i) => {
    let r = i
    for (let n = 0; n < 5 && padre[r] !== undefined; n++) r = padre[r]
    return r
  }
  const etapa = (i) => {
    let n = 1
    for (let r = i; padre[r] !== undefined && n < 5; r = padre[r]) n++
    return n
  }
  const profundidad = (i) => (hijos[i].length ? 1 + Math.max(...hijos[i].map(profundidad)) : 1)
  // n pasos de evolución desde x (si se ramifica, una rama al azar) y la última etapa de su línea
  const avanzar = (x, n) => {
    for (let k = 0; k < n && hijos[x].length; k++) x = azar.elegir(hijos[x])
    return x
  }
  const final = (x) => avanzar(x, 5)
  const nombreTipo = (t) => TIPOS[t] || 'normal'
  // Etapa «relativa» para cambiar básicos por básicos y finales por finales
  const categoria = (i) => (padre[i] === undefined ? (hijos[i].length ? 'basica' : 'unica') : hijos[i].length ? 'media' : 'final')
  const deSuEtapa = (orig, lista) => {
    const c = categoria(orig)
    const misma = lista.filter((x) => categoria(x) === c)
    if (misma.length) return misma
    const parecida = lista.filter((x) => (c === 'unica' ? categoria(x) === 'final' : c === 'final' ? categoria(x) === 'unica' : false))
    return parecida.length ? parecida : lista
  }

  // --- 1. Tipos ---
  if (ajustes.tipos.modo !== 'mantener') {
    const nuevos = []
    const unTipo = (evitar) => {
      let t
      do t = azar.elegir(TIPOS_VALIDOS)
      while (t === evitar)
      return t
    }
    for (const i of todas) {
      const e = base[i]
      const doble = e.tipos[0] !== e.tipos[1]
      if (ajustes.tipos.modo === 'azar' || padre[i] === undefined) {
        const t1 = unTipo(-1)
        nuevos[i] = [t1, doble ? unTipo(t1) : t1]
      }
    }
    // En línea: cada evolución hereda los de su preevolución; si en el original gana un segundo tipo, otro al azar
    if (ajustes.tipos.modo === 'linea') {
      const orden = [...todas].sort((a, c) => etapa(a) - etapa(c))
      for (const i of orden) {
        if (padre[i] === undefined) continue
        const p = nuevos[padre[i]] || base[padre[i]].tipos
        const gana = base[i].tipos[0] !== base[i].tipos[1] && base[padre[i]].tipos[0] === base[padre[i]].tipos[1]
        nuevos[i] = gana ? [p[0], unTipo(p[0])] : [...p]
      }
    }
    for (const i of todas) {
      if (!nuevos[i]) continue
      base[i].tipos = nuevos[i]
      b[base[i].o + 6] = nuevos[i][0]
      b[base[i].o + 7] = nuevos[i][1]
    }
  }

  // --- 2. Habilidades ---
  if (ajustes.habilidades.modo !== 'mantener') {
    const permitidas = HABILIDADES.map((h, i) => (h ? i : 0)).filter((i) => i && !(ajustes.habilidades.sinSuperguarda && i === SUPERGUARDA))
    const elegir = (n) => {
      const a = azar.elegir(permitidas)
      if (n < 2) return [a, 0]
      let c
      do c = azar.elegir(permitidas)
      while (c === a)
      return [a, c]
    }
    const nuevas = []
    const orden = [...todas].sort((a, c) => etapa(a) - etapa(c))
    for (const i of orden) {
      const n = base[i].habilidades[1] && base[i].habilidades[1] !== base[i].habilidades[0] ? 2 : 1
      if (ajustes.habilidades.modo === 'linea' && padre[i] !== undefined && nuevas[padre[i]]) {
        const p = nuevas[padre[i]]
        nuevas[i] = n === 2 ? [p[0], p[1] || elegir(2)[1]] : [p[0], 0]
      } else nuevas[i] = elegir(n)
    }
    for (const i of todas) {
      base[i].habilidades = nuevas[i]
      b[base[i].o + 22] = nuevas[i][0]
      b[base[i].o + 23] = nuevas[i][1]
    }
  }

  // --- 3. Movimientos por nivel ---
  const movs = Object.entries(datos.movimientos || {})
    .map(([id, m]) => ({ id: +id, tipo: m.tipo === 'fairy' ? 'normal' : m.tipo, potencia: +m.potencia || 0 }))
    .filter((m) => m.id >= 1 && m.id <= MAX_MOVIMIENTO && m.id !== 165) // sin Forcejeo
  const danino = movs.filter((m) => m.potencia > 1)
  if (ajustes.movimientos.modo === 'azar') {
    const pct = Math.max(0, Math.min(100, +ajustes.movimientos.mismoTipo || 0)) / 100
    for (const i of todas) {
      const a = apr[i]
      if (!a.o || !a.lista.length) continue
      const tipos = base[i].tipos.map(nombreTipo)
      const usados = new Set()
      const nueva = a.lista.map(([nivel]) => {
        let m
        for (let k = 0; k < 20; k++) {
          const lista = azar.prob(pct) ? movs.filter((x) => tipos.includes(x.tipo)) : movs
          m = azar.elegir(lista.length ? lista : movs)
          if (!usados.has(m.id)) break
        }
        usados.add(m.id)
        return [nivel, m.id]
      })
      // Al menos un ataque que haga daño desde el primer nivel
      const primero = Math.min(...nueva.map(([n]) => n))
      if (!nueva.some(([n, id]) => n === primero && danino.some((d) => d.id === id))) {
        const delTipo = danino.filter((d) => tipos.includes(d.tipo) && d.potencia <= 60)
        const k = nueva.findIndex(([n]) => n === primero)
        nueva[k] = [primero, azar.elegir(delTipo.length ? delTipo : danino.filter((d) => d.potencia <= 60)).id]
      }
      nueva.forEach(([nivel, id], k) => pon16(b, a.o + k * 2, (nivel << 9) | id))
      a.lista = nueva
    }
  }
  // Los 4 últimos movimientos que sabe a ese nivel (para los entrenadores con movimientos propios)
  const movimientosA = (esp, nivel) => {
    const lista = (apr[esp]?.lista || []).filter(([n]) => n <= nivel).map(([, id]) => id)
    const out = []
    for (let k = lista.length - 1; k >= 0 && out.length < 4; k--) if (!out.includes(lista[k])) out.unshift(lista[k])
    while (out.length < 4) out.push(0)
    return out
  }

  // Especies que pueden salir según «sin legendarios»
  const pool = (sinLeg) => todas.filter((i) => !(sinLeg && legendario(i)))
  const parecidas = (i, lista, usadas) => {
    const t = TOTAL(base[i])
    for (const margen of [0.1, 0.2, 0.35, 1]) {
      const c = lista.filter((x) => Math.abs(TOTAL(base[x]) - t) <= t * margen)
      const libres = usadas ? c.filter((x) => !usadas.has(x)) : c
      if (libres.length) return libres
      if (c.length && margen === 1) return c
    }
    return lista
  }

  // --- 4. Iniciales ---
  const inicialesOriginales = INICIALES[familia]
  let iniciales = [...inicialesOriginales]
  if (ajustes.iniciales.modo !== 'mantener') {
    const sinLeg = ajustes.iniciales.sinLegendarios
    let candidatas = pool(sinLeg)
    if (ajustes.iniciales.modo === 'tresEtapas') candidatas = candidatas.filter((i) => padre[i] === undefined && profundidad(i) === 3)
    const tiposDe = (i) => [...new Set(base[i].tipos.map(nombreTipo))]
    const tiene = (i, t) => tiposDe(i).includes(t)
    let elegidas = null
    if (ajustes.iniciales.triangulo === 'clasico') {
      // Planta, Fuego y Agua en el sitio de las de siempre
      const orden = familia === 'frlg' ? ['grass', 'fire', 'water'] : ['grass', 'fire', 'water']
      const porTipo = orden.map((t) => candidatas.filter((i) => tiene(i, t)))
      if (porTipo.every((l) => l.length)) elegidas = porTipo.map((l) => azar.elegir(l))
      else avisos.push('No hay iniciales de Planta, Fuego y Agua con esas opciones: van al azar.')
    } else if (ajustes.iniciales.triangulo === 'cualquiera') {
      // A le gana a B, B a C y C a A (por alguno de sus tipos)
      const gana = (x, y) => tiposDe(x).some((a) => tiposDe(y).some((c) => pegaFuerte(a, c)))
      for (let intento = 0; intento < 4000 && !elegidas; intento++) {
        const [x, y, z] = [azar.elegir(candidatas), azar.elegir(candidatas), azar.elegir(candidatas)]
        if (new Set([x, y, z]).size === 3 && gana(x, y) && gana(y, z) && gana(z, x) && !gana(y, x) && !gana(z, y) && !gana(x, z)) elegidas = [x, y, z]
      }
      if (!elegidas) avisos.push('No encontré un triángulo de tipos con esas opciones: van al azar.')
    }
    if (!elegidas) elegidas = azar.barajar(candidatas).slice(0, 3)
    iniciales = elegidas
    const ini = analisis.iniciales
    if (ini?.tipo === 'tabla') for (const o of ini.offsets) iniciales.forEach((e, k) => pon16(b, o + k * 2, e))
    else if (ini?.tipo === 'guion')
      for (const c of ini.casos) {
        pon16(b, c.o + 3, iniciales[c.tuyo])
        pon16(b, c.o + 8, iniciales[c.rival])
      }
  }

  // --- 5. Salvajes ---
  const sal = analisis.salvajes
  const registroSalvajes = []
  if (sal) {
    const { modo, sinLegendarios, subirNivel, mismaEtapa } = ajustes.salvajes
    const destino = pool(sinLegendarios)
    let global = null
    if (modo === 'unoAuno' || modo === 'fuerza') {
      global = new Map()
      const usadas = new Set()
      // 1 a 1: cada especie, la siguiente de una lista barajada (de su etapa, si se respeta)
      const barajadas = {}
      const siguiente = {}
      const turno = (o) => {
        const c = mismaEtapa ? categoria(o) : 'todas'
        barajadas[c] ||= azar.barajar(mismaEtapa ? deSuEtapa(o, destino) : destino)
        siguiente[c] = (siguiente[c] || 0) + 1
        return barajadas[c][(siguiente[c] - 1) % barajadas[c].length]
      }
      const originales = new Set()
      for (const c of sal.cabeceras)
        for (const tipo of ['tierra', 'agua', 'roca', 'pesca']) {
          const t = c[tipo]
          if (!t) continue
          for (let h = 0; h < t.huecos; h++) originales.add(b[t.mons + h * 4 + 2] | (b[t.mons + h * 4 + 3] << 8))
        }
      for (const o of originales) {
        let n
        if (modo === 'fuerza') n = azar.elegir(parecidas(o, mismaEtapa ? deSuEtapa(o, destino) : destino, usadas))
        else n = turno(o)
        usadas.add(n)
        global.set(o, n)
      }
    }
    const mult = 1 + (Math.max(0, +subirNivel || 0) / 100)
    for (const c of sal.cabeceras) {
      const local = new Map()
      const reg = { mapa: `${c.g}.${c.m}` }
      for (const tipo of ['tierra', 'agua', 'roca', 'pesca']) {
        const t = c[tipo]
        if (!t) continue
        reg[tipo] = []
        for (let h = 0; h < t.huecos; h++) {
          const o = t.mons + h * 4
          const orig = b[o + 2] | (b[o + 3] << 8)
          let n = orig
          if (modo === 'zona') {
            if (!local.has(orig)) local.set(orig, azar.elegir(mismaEtapa ? deSuEtapa(orig, destino) : destino))
            n = local.get(orig)
          } else if (global) n = global.get(orig) ?? orig
          pon16(b, o + 2, n)
          if (mult > 1) {
            b[o] = Math.min(100, Math.round(b[o] * mult))
            b[o + 1] = Math.min(100, Math.max(b[o], Math.round(b[o + 1] * mult)))
          }
          reg[tipo].push([b[o], b[o + 1], alias(n)])
        }
      }
      registroSalvajes.push(reg)
    }
  }

  // --- 6. Entrenadores ---
  const registroEntrenadores = []
  const nombresObjetos = {}
  if (analisis.entrenadores) {
    const cfg = ajustes.entrenadores
    const { tabla, n: nEnt } = analisis.entrenadores
    const clases = CLASES[familia]
    const claseJefe = new Set([...clases.lider, ...clases.altoMando, ...clases.campeon])
    const claseImportante = new Set(clases.importante || [])
    const esJefe = (e) => claseJefe.has(e.clase)
    const esImportante = (e) => esJefe(e) || claseImportante.has(e.clase)
    const conObjetos = (e) => cfg.objetos === 'todos' || (cfg.objetos === 'importantes' && esImportante(e)) || (cfg.objetos === 'jefes' && esJefe(e))
    const extraDe = (e) => Math.max(0, Math.min(6 - e.tam, esImportante(e) ? +cfg.extraJefes || 0 : +cfg.extraResto || 0))
    const originales = leerEntrenadores(b, tabla, nEnt) // antes de tocar nada (para los tipos de cada uno)
    const tamOriginal = originales.map((e) => e.tam || 0)

    // 6a. Pokémon extra y hueco para el objeto. Un equipo con objeto ocupa lo mismo que sin él (el objeto
    // va en el relleno), así que eso se cambia en su sitio; con Pokémon de más, el equipo se copia al
    // espacio libre y el entrenador apunta allí
    let libre = analisis.libre ? { ...analisis.libre } : null
    const reservar = (n) => {
      if (!libre || libre.inicio + n > libre.fin) return null
      const o = libre.inicio
      libre.inicio = (libre.inicio + n + 3) & ~3
      return o
    }
    const compartido = new Map() // equipo → entrenadores que lo usan
    for (const e of originales)
      if (e.tam) {
        const p = u32(b, e.o + 0x24)
        compartido.set(p, [...(compartido.get(p) || []), e.o])
      }
    const escribirMiembro = (o, flags, d) => {
      pon16(b, o, d.iv)
      b[o + 2] = d.nivel
      b[o + 3] = 0
      pon16(b, o + 4, d.esp)
      pon16(b, o + 6, flags & 2 ? d.objeto || 0 : 0)
      if (flags & 1) {
        const k = flags & 2 ? 8 : 6
        ;[0, 1, 2, 3].forEach((j) => pon16(b, o + k + j * 2, d.movs?.[j] || 0))
        if (!(flags & 2)) pon16(b, o + 14, 0)
      }
    }
    let sinEspacio = 0
    for (let i = 0; i < nEnt; i++) {
      const e = leerEntrenador(b, tabla + i * TAM_ENTRENADOR) // otra vez: otro que lo comparte puede haberlo cambiado
      if (!e?.tam) continue
      e.clase = b[e.o + 1]
      let extra = extraDe(e)
      const objeto = conObjetos(e) && !(e.flags & 2)
      if (!extra && !objeto) continue
      const flags = objeto ? e.flags | 2 : e.flags
      const datosEq = e.miembros.map((m) => ({ iv: u16(b, m.o), nivel: m.nivel, esp: m.esp, objeto: m.objeto, movs: m.movs }))
      let destino = null
      if (extra) {
        destino = reservar((e.tam + extra) * TAM_MIEMBRO[flags])
        if (destino === null) {
          sinEspacio++
          extra = 0
          if (!objeto) continue
        }
      }
      const p = u32(b, e.o + 0x24)
      if (extra) {
        const fuerte = datosEq.reduce((a, c) => (c.nivel > a.nivel ? c : a))
        for (let k = 0; k < extra; k++) datosEq.push({ ...fuerte, objeto: 0, movs: fuerte.movs ? [...fuerte.movs] : null })
        pon32(b, e.o + 0x24, BASE_ROM + destino)
        b[e.o + 0x20] = e.tam + extra
        b[e.o] = flags
      } else {
        // en su sitio: cambia el formato para todos los que comparten ese equipo
        destino = p - BASE_ROM
        for (const otro of compartido.get(p) || [e.o]) if (u32(b, otro + 0x24) === p) b[otro] = flags
      }
      datosEq.forEach((d, k) => escribirMiembro(destino + k * TAM_MIEMBRO[flags], flags, d))
    }
    if (sinEspacio) avisos.push(`No hay espacio libre en la ROM para los Pokémon extra de ${sinEspacio} entrenadores: llevan los de siempre.`)

    // 6b. El tipo de cada entrenador (con los tipos originales de las especies, no los aleatorizados)
    // el tipo que más se repite (a igualdad, el que más va de primer tipo), si lo lleva más de la mitad
    const dominante = (miembros, minimo = Math.floor(miembros.length / 2) + 1) => {
      const cuenta = {}
      const primero = {}
      for (const m of miembros) {
        for (const t of new Set(tiposOriginales[m.esp])) cuenta[t] = (cuenta[t] || 0) + 1
        primero[tiposOriginales[m.esp][0]] = (primero[tiposOriginales[m.esp][0]] || 0) + 1
      }
      const [t, n] = Object.entries(cuenta).sort((x, y) => y[1] - x[1] || (primero[y[0]] || 0) - (primero[x[0]] || 0))[0] || []
      return n >= minimo ? +t : null
    }
    const identidad = (e) => `${e.clase}|${Array.from(e.nombre || []).join(',')}`
    const temaClase = {}
    if (cfg.tema === 'clase') {
      const porClase = {}
      for (const e of originales) if (e.miembros?.length) (porClase[e.clase] ||= []).push(...e.miembros)
      for (const [c, miembros] of Object.entries(porClase)) {
        const t = dominante(miembros, Math.max(3, Math.ceil(miembros.length / 2)))
        if (t !== null) temaClase[c] = t
      }
    }
    const tipoPorIdentidad = new Map()
    const tiposJefe = azar.barajar(TIPOS_VALIDOS)
    const temaDe = (e) => {
      const orig = originales[e.i]
      if (esJefe(e)) {
        if (cfg.jefes === 'original') return dominante(orig.miembros)
        if (cfg.jefes === 'azar') {
          // cada líder (con sus revanchas) un tipo distinto mientras queden
          const k = identidad(e)
          if (!tipoPorIdentidad.has(k)) tipoPorIdentidad.set(k, tiposJefe.length ? tiposJefe.shift() : azar.elegir(TIPOS_VALIDOS))
          return tipoPorIdentidad.get(k)
        }
        return null
      }
      if (claseImportante.has(e.clase)) return null
      if (cfg.tema === 'clase') return temaClase[e.clase] ?? (orig.miembros.length >= 2 ? dominante(orig.miembros) : null)
      if (cfg.tema === 'azar') {
        const k = 'r' + identidad(e)
        if (!tipoPorIdentidad.has(k)) tipoPorIdentidad.set(k, azar.elegir(TIPOS_VALIDOS))
        return tipoPorIdentidad.get(k)
      }
      return null
    }

    // 6c. Cada Pokémon del equipo
    const ent = leerEntrenadores(b, tabla, nEnt)
    const { modo, rivalInicial, sinLegendarios, subirNivel, mismaEtapa } = cfg
    const destino = pool(sinLegendarios)
    // el rival lleva la línea de su inicial: familia original de cada inicial → el inicial nuevo
    const raicesIni = inicialesOriginales.map(raiz)
    const mult = 1 + Math.max(0, +subirNivel || 0) / 100
    const evolucionados = +cfg.evolucionados || 0
    const elegirObjeto = (esp, usados) => {
      let lista = OBJETOS_BAYAS
      if (cfg.objetosClase !== 'bayas') {
        const delTipo = OBJETO_DE_TIPO[nombreTipo(azar.elegir(base[esp].tipos))]
        if (delTipo && !usados.has(delTipo) && azar.prob(0.35)) return delTipo
        lista = OBJETOS_COMBATE.filter((o) => o !== CINTA_ELECCION || base[esp].stats[1] >= base[esp].stats[4])
      }
      const libres = lista.filter((o) => !usados.has(o))
      return azar.elegir(libres.length ? libres : lista)
    }
    for (const e of ent) {
      if (!e.miembros?.length) {
        registroEntrenadores.push(null)
        continue
      }
      const tema = temaDe(e)
      const enEquipo = new Set()
      const usadosObj = new Set()
      e.miembros.forEach((m, k) => {
        const nuevo = k >= tamOriginal[e.i]
        let n = m.esp
        const kIni = rivalInicial && !nuevo && esImportante(e) ? raicesIni.indexOf(raiz(m.esp)) : -1
        if (kIni >= 0 && ajustes.iniciales.modo !== 'mantener') {
          // la misma etapa que en el original, contando desde el inicial nuevo
          n = avanzar(iniciales[kIni], etapa(m.esp) - etapa(inicialesOriginales[kIni]))
        } else if ((modo !== 'mantener' || nuevo) && kIni < 0) {
          let lista = destino
          if (tema !== null) {
            const delTipo = destino.filter((x) => base[x].tipos.includes(tema))
            if (delTipo.length) lista = delTipo
          }
          if (mismaEtapa) lista = deSuEtapa(m.esp, lista)
          if (modo === 'fuerza' || (modo === 'mantener' && nuevo)) lista = parecidas(m.esp, lista)
          // sin repetir especie en el mismo equipo, si se puede
          const sinRepetir = lista.filter((x) => !enEquipo.has(x))
          n = azar.elegir(sinRepetir.length ? sinRepetir : lista)
        }
        if (mult > 1) b[m.o + 2] = Math.min(100, Math.round(m.nivel * mult))
        m.nivel = b[m.o + 2]
        if (evolucionados && m.nivel >= evolucionados) {
          let f = final(n)
          // si al evolucionar pierde el tipo del entrenador: otra rama que lo conserve o un final de ese tipo
          if (tema !== null && kIni < 0 && !base[f].tipos.includes(tema)) {
            const hojas = (function recoger(x) {
              return hijos[x].length ? hijos[x].flatMap(recoger) : [x]
            })(n).filter((x) => base[x].tipos.includes(tema))
            const finales = destino.filter((x) => !hijos[x].length && base[x].tipos.includes(tema))
            if (hojas.length) f = azar.elegir(hojas)
            else if (finales.length) f = azar.elegir(parecidas(f, finales))
          }
          n = f
        }
        const cambia = n !== m.esp
        if (cambia) pon16(b, m.o + 4, n)
        m.esp = n
        enEquipo.add(n)
        if (conObjetos(e) && e.flags & 2) {
          m.objeto = elegirObjeto(n, usadosObj)
          pon16(b, m.o + 6, m.objeto)
        }
        if (m.objeto) usadosObj.add(m.objeto)
        // Con movimientos propios: los que sabría a su nivel la especie nueva (con lo aleatorizado)
        if (m.oMovs !== null && (cambia || nuevo || ajustes.movimientos.modo !== 'mantener' || mult > 1)) {
          m.movs = movimientosA(n, m.nivel)
          m.movs.forEach((id, j) => pon16(b, m.oMovs + j * 2, id))
        }
      })
      registroEntrenadores.push({
        i: e.i,
        nombre: texto(e.nombre, datos.caracteres),
        clase: e.clase,
        jefe: esJefe(e),
        ...(tema !== null ? { tipo: nombreTipo(tema) } : {}),
        equipo: e.miembros.map((m) => ({
          especie: alias(m.esp),
          nivel: m.nivel,
          ...(m.movs ? { movimientos: m.movs.filter(Boolean) } : {}),
          ...(m.objeto ? { objeto: m.objeto } : {})
        }))
      })
    }

    // 6d. Nombres mezclados entre los entrenadores normales del mismo género (los jefes y los de la
    // historia se nombran en los diálogos: esos no). Las revanchas de uno siguen llamándose igual
    if (cfg.nombres) {
      for (const mujer of [0, 0x80]) {
        const grupo = ent.filter((e) => e.miembros?.length && !esImportante(e) && !b[e.o + 0x18] && e.nombre?.[0] !== 0xff && (b[e.o + 2] & 0x80) === mujer)
        const ids = [...new Set(grupo.map(identidad))]
        const nombreDe = new Map(grupo.map((e) => [identidad(e), Array.from(e.nombre)]))
        const barajados = azar.barajar(ids)
        const nuevoNombre = new Map(ids.map((k, j) => [k, nombreDe.get(barajados[j])]))
        for (const e of grupo) {
          const nom = nuevoNombre.get(identidad(e))
          b.set(nom, e.o + 4)
          const r = registroEntrenadores[e.i]
          if (r) r.nombre = texto(nom, datos.caracteres)
        }
      }
    }
  }

  // --- 7. MT, tutores y compatibilidad ---
  const movPorId = new Map(movs.map((m) => [m.id, m]))
  const leer16s = (o, n) => Array.from({ length: n }, (_, k) => u16(b, o + k * 2))
  const mtMovs = analisis.mt ? leer16s(analisis.mt.offsets[0], NUM_MT + NUM_MO) : [...MT_ORIGINALES]
  const moMovs = mtMovs.slice(NUM_MT)
  const pctDanino = Math.max(0, Math.min(100, +ajustes.mt.danino || 0)) / 100
  // n movimientos distintos que no estén en «prohibidos»; un porcentaje de ataques de potencia 50 o más
  const elegirMovimientos = (n, prohibidos) => {
    const otros = movs.filter((m) => !prohibidos.has(m.id) && !MOVIMIENTOS_INUTILES.includes(m.id))
    const buenos = otros.filter((m) => m.potencia >= 50)
    const out = []
    const usados = new Set()
    for (let k = 0; k < n; k++) {
      let m
      for (let t = 0; t < 60; t++) {
        const lista = azar.prob(pctDanino) && buenos.length ? buenos : otros
        m = azar.elegir(lista)
        if (!usados.has(m.id)) break
      }
      usados.add(m.id)
      out.push(m.id)
    }
    return out
  }
  let mtCambiadas = false
  if (analisis.mt && ajustes.mt.modo === 'azar') {
    const fijos = ajustes.mt.campo ? MT_DE_CAMPO : []
    const nuevos = elegirMovimientos(NUM_MT, new Set([...moMovs, ...fijos.map((k) => mtMovs[k]), FORCEJEO]))
    for (let k = 0, j = 0; k < NUM_MT; k++) if (!fijos.includes(k)) mtMovs[k] = nuevos[j++]
    for (const o of analisis.mt.offsets) mtMovs.forEach((id, k) => pon16(b, o + k * 2, id))
    mtCambiadas = true
    // La descripción de cada MT en la mochila: la del movimiento nuevo
    if (analisis.objetos && analisis.descripcionesMov !== null && analisis.descripcionesMov !== undefined) {
      for (let k = 0; k < NUM_MT; k++)
        pon32(b, analisis.objetos.tabla + (OBJ.MT01 + k) * TAM_OBJETO + 0x14, u32(b, analisis.descripcionesMov + (mtMovs[k] - 1) * 4))
    } else avisos.push('Las MT enseñan sus movimientos nuevos, pero su descripción en la mochila es la de antes.')
  }
  const tut = analisis.tutores
  const tutMovs = tut ? leer16s(tut.movimientos[0], tut.n) : []
  let tutCambiados = false
  if (tut && ajustes.tutores.modo === 'azar') {
    const nuevos = elegirMovimientos(tut.n, new Set([...mtMovs, FORCEJEO]))
    nuevos.forEach((id, k) => (tutMovs[k] = id))
    for (const o of tut.movimientos) tutMovs.forEach((id, k) => pon16(b, o + k * 2, id))
    tutCambiados = true
    avisos.push('Los tutores enseñan sus movimientos nuevos, aunque al hablarles nombren el de antes.')
  }
  // Compatibilidad: una lista de casillas (MT01…MO08, tutores) por especie
  const compat = ajustes.compat
  const conCompatMT = analisis.compatMT !== null && analisis.compatMT !== undefined
  const leerBits = (lo, hi, n) => Array.from({ length: n }, (_, k) => (k < 32 ? (lo >>> k) & 1 : (hi >>> (k - 32)) & 1) === 1)
  const bitsMT = conCompatMT ? Array.from({ length: NUM_ESPECIES }, (_, i) => leerBits(u32(b, analisis.compatMT + i * 8), u32(b, analisis.compatMT + i * 8 + 4), NUM_MT + NUM_MO)) : null
  const leerTutor = (i) => (tut.tam === 4 ? u32(b, tut.compat + i * 4) : u16(b, tut.compat + i * 2))
  const bitsTut = tut ? Array.from({ length: NUM_ESPECIES }, (_, i) => leerBits(leerTutor(i), 0, tut.n)) : null
  let compatCambiada = false
  // Lo que casi todos aprenden en el juego original (Tóxico, Protección, Descanso…)
  const UNIVERSALES = new Set([92, 237, 182, 218, 216, 104, 263, 290, 156, 213, 164, 102, 203, 214, 173, 207])
  const tira = (i, id) => {
    if (compat.modo === 'total') return true
    if (compat.modo === 'azar') return azar.prob(0.45)
    const t = movPorId.get(id)?.tipo
    if (UNIVERSALES.has(id)) return azar.prob(0.9)
    if (base[i].tipos.map(nombreTipo).includes(t)) return azar.prob(0.8)
    return azar.prob(t === 'normal' ? 0.5 : 0.22)
  }
  if (conCompatMT && (compat.modo !== 'mantener' || compat.mo === 'todos')) {
    const orden = [...todas].sort((a, c) => etapa(a) - etapa(c))
    for (const i of orden) {
      const p = padre[i]
      // una evolución puede todo lo que podía su preevolución
      const deMT = (k) => (compat.modo !== 'mantener' && (k < NUM_MT || compat.mo === 'igual') ? tira(i, mtMovs[k]) || (p !== undefined && bitsMT[p][k]) : bitsMT[i][k])
      bitsMT[i] = bitsMT[i].map((_, k) => (k >= NUM_MT && compat.mo === 'todos' ? true : deMT(k)))
      if (bitsTut && compat.modo !== 'mantener') bitsTut[i] = bitsTut[i].map((_, k) => tira(i, tutMovs[k]) || (p !== undefined && bitsTut[p][k]))
    }
    const aU32 = (bits, desde) => bits.slice(desde, desde + 32).reduce((v, x, k) => (x ? v | (1 << k) : v), 0) >>> 0
    for (const i of todas) {
      pon32(b, analisis.compatMT + i * 8, aU32(bitsMT[i], 0))
      pon32(b, analisis.compatMT + i * 8 + 4, aU32(bitsMT[i], 32))
      if (bitsTut && compat.modo !== 'mantener') {
        const v = aU32(bitsTut[i], 0)
        if (tut.tam === 4) pon32(b, tut.compat + i * 4, v)
        else pon16(b, tut.compat + i * 2, v)
      }
    }
    compatCambiada = true
  }

  // --- 8. Objetos del suelo ---
  const objetoAlAzar = (pesos) => {
    const grupos = Object.entries(pesos)
    let r = azar.real() * grupos.reduce((s, [, p]) => s + p, 0)
    for (const [g, p] of grupos) if ((r -= p) < 0) return azar.elegir(GRUPOS_OBJETOS[g])
    return azar.elegir(GRUPOS_OBJETOS[grupos[0][0]])
  }
  const registroSuelo = []
  if (analisis.objetosSuelo && ajustes.objetosSuelo.modo !== 'mantener') {
    // los objetos clave y las MO no se mueven (hacen falta para avanzar)
    const elegibles = analisis.objetosSuelo.filter((x) => !esObjetoClave(x.objeto) && !esMO(x.objeto))
    let nuevos
    if (ajustes.objetosSuelo.modo === 'mezclar') nuevos = azar.barajar(elegibles.map((x) => x.objeto))
    else {
      // al azar, pero una MT sigue siendo una MT (otra, sin repetir mientras queden)
      const mts = azar.barajar(GRUPOS_OBJETOS.mt)
      const { mt, ...sinMT } = PESOS_SUELO
      nuevos = elegibles.map((x) => (esMT(x.objeto) ? mts.pop() ?? azar.elegir(GRUPOS_OBJETOS.mt) : objetoAlAzar(sinMT)))
    }
    elegibles.forEach((x, k) => {
      pon16(b, x.o, nuevos[k])
      registroSuelo.push([x.objeto, nuevos[k]])
    })
  }

  // --- 9. Tiendas ---
  const registroTiendas = []
  if (analisis.tiendas && ajustes.tiendas.modo === 'azar') {
    for (const t of analisis.tiendas) {
      const nuevos = ajustes.tiendas.basicos ? t.objetos.filter((o) => BASICOS_TIENDA.includes(o)) : []
      for (let intento = 0; nuevos.length < t.objetos.length && intento < 200; intento++) {
        const o = objetoAlAzar(PESOS_TIENDA)
        if (!nuevos.includes(o)) nuevos.push(o)
      }
      while (nuevos.length < t.objetos.length) nuevos.push(t.objetos[nuevos.length])
      nuevos.sort((x, y) => x - y)
      nuevos.forEach((o, k) => pon16(b, t.o + k * 2, o))
      registroTiendas.push({ antes: t.objetos, ahora: nuevos })
    }
  }

  // Nombres de los objetos que salen en el registro, sacados de la propia ROM (en su idioma)
  if (analisis.objetos) {
    const usados = new Set([
      ...registroEntrenadores.flatMap((e) => (e ? e.equipo.map((m) => m.objeto).filter(Boolean) : [])),
      ...registroSuelo.flat(),
      ...registroTiendas.flatMap((t) => [...t.antes, ...t.ahora])
    ])
    for (const i of usados) if (i < analisis.objetos.n) nombresObjetos[i] = texto(b.slice(analisis.objetos.tabla + i * TAM_OBJETO, analisis.objetos.tabla + i * TAM_OBJETO + 14), datos.caracteres)
  }

  // --- Registro ---
  const registro = {
    version: 2,
    fecha: Date.now(),
    juego: { codigo: analisis.juego.codigo, clave: analisis.juego.clave, nombre: analisis.juego.nombre, idioma: analisis.juego.idioma },
    semilla: ajustes.semilla,
    ajustes,
    avisos,
    iniciales: iniciales.map(alias),
    salvajes: registroSalvajes,
    entrenadores: registroEntrenadores
  }
  if (ajustes.tipos.modo !== 'mantener' || ajustes.habilidades.modo !== 'mantener') {
    registro.especies = {}
    for (const i of todas)
      registro.especies[alias(i)] = {
        tipos: [...new Set(base[i].tipos.map(nombreTipo))],
        habilidades: base[i].habilidades.filter(Boolean).map((h) => HABILIDADES[h])
      }
  }
  if (ajustes.movimientos.modo !== 'mantener') {
    registro.aprendizaje = {}
    for (const i of todas) if (apr[i].lista.length) registro.aprendizaje[alias(i)] = apr[i].lista
  }
  if (mtCambiadas) registro.mt = mtMovs.slice(0, NUM_MT)
  if (tutCambiados) registro.tutores = tutMovs
  if (compatCambiada) {
    registro.compat = {}
    for (const i of todas)
      registro.compat[alias(i)] = {
        mt: bitsMT[i].map((x, k) => (x ? k : -1)).filter((k) => k >= 0),
        ...(bitsTut ? { tutor: bitsTut[i].map((x, k) => (x ? k : -1)).filter((k) => k >= 0) } : {})
      }
  }
  if (compatCambiada || mtCambiadas) registro.mtTodas = mtMovs
  if (registroSuelo.length) registro.objetosSuelo = registroSuelo
  if (registroTiendas.length) registro.tiendas = registroTiendas
  if (Object.keys(nombresObjetos).length) registro.nombresObjetos = nombresObjetos
  return { rom: b, registro }
}

const texto = (bytes, tabla) => {
  if (!bytes || !tabla) return ''
  let s = ''
  for (const c of bytes) {
    if (c === 0xff) break
    s += tabla[c] ?? ''
  }
  return s.trim()
}

// Registro en texto, para guardarlo junto a la ROM
export const registroEnTexto = (r, nombre = (a) => a, nombreMapa = (m) => m, nombreMov = (id) => `#${id}`) => {
  const obj = (i) => r.nombresObjetos?.[i] || `#${i}`
  const mt = (k) => (k < NUM_MT ? `MT${String(k + 1).padStart(2, '0')}` : `MO${String(k - NUM_MT + 1).padStart(2, '0')}`)
  const L = []
  L.push(`Lockedex · Randomizer`, `${r.juego.nombre} (${r.juego.codigo}, ${r.juego.idioma}) · semilla ${r.semilla}`, `Generado el ${new Date(r.fecha).toLocaleString('es-ES')}`, '')
  for (const a of r.avisos || []) L.push(`Aviso: ${a}`)
  L.push('== INICIALES ==', r.iniciales.map(nombre).join(' · '), '')
  if (r.salvajes?.length) {
    L.push('== SALVAJES ==')
    for (const s of r.salvajes) {
      const partes = ['tierra', 'agua', 'roca', 'pesca'].filter((t) => s[t]).map((t) => `${t}: ${[...new Set(s[t].map((x) => nombre(x[2])))].join(', ')}`)
      L.push(`${nombreMapa(s.mapa)}  ${partes.join(' | ')}`)
    }
    L.push('')
  }
  if (r.entrenadores?.length) {
    L.push('== ENTRENADORES ==')
    r.entrenadores.forEach(
      (e) =>
        e &&
        L.push(
          `${String(e.i).padStart(3)} ${e.nombre || '?'}${e.jefe ? ' ★' : ''}${e.tipo ? ` [${e.tipo}]` : ''}: ${e.equipo
            .map((m) => `${nombre(m.especie)} Nv.${m.nivel}${m.objeto ? ` @${obj(m.objeto)}` : ''}`)
            .join(', ')}`
        )
    )
    L.push('')
  }
  if (r.especies) {
    L.push('== TIPOS Y HABILIDADES ==')
    for (const [a, e] of Object.entries(r.especies)) L.push(`${nombre(a)}: ${e.tipos.join('/')} · ${e.habilidades.join(' / ')}`)
    L.push('')
  }
  if (r.mt) {
    L.push('== MT ==')
    r.mt.forEach((id, k) => L.push(`${mt(k)} ${nombreMov(id)}`))
    L.push('')
  }
  if (r.tutores) {
    L.push('== TUTORES ==')
    r.tutores.forEach((id, k) => L.push(`${String(k + 1).padStart(2)} ${nombreMov(id)}`))
    L.push('')
  }
  if (r.compat) {
    L.push('== QUÉ MT, MO Y TUTORES PUEDE APRENDER CADA UNO ==')
    for (const [a, c] of Object.entries(r.compat)) {
      const tut = c.tutor?.length && r.tutores ? ` · tutores: ${c.tutor.map((k) => nombreMov(r.tutores[k])).join(', ')}` : c.tutor?.length ? ` · tutores: ${c.tutor.map((k) => k + 1).join(', ')}` : ''
      L.push(`${nombre(a)}: ${c.mt.map(mt).join(' ') || '—'}${tut}`)
    }
    L.push('')
  }
  if (r.objetosSuelo?.length) {
    L.push('== OBJETOS DEL SUELO ==')
    r.objetosSuelo.forEach(([antes, ahora]) => L.push(`${obj(antes)} → ${obj(ahora)}`))
    L.push('')
  }
  if (r.tiendas?.length) {
    L.push('== TIENDAS ==')
    r.tiendas.forEach((t, k) => L.push(`Tienda ${k + 1} (antes: ${t.antes.map(obj).join(', ')})`, `   ahora: ${t.ahora.map(obj).join(', ')}`))
    L.push('')
  }
  return L.join('\n')
}
