// Motor del randomizer de la 3.ª generación. Trabaja sobre una copia de la ROM y solo cambia datos en su
// sitio (sin mover nada de lugar), así que la ROM resultante tiene el mismo tamaño y estructura.
//
// ajustes = {
//   semilla,
//   salvajes:     { modo: 'mantener' | 'unoAuno' | 'zona' | 'fuerza', mismaEtapa, sinLegendarios, subirNivel (%) },
//   iniciales:    { modo: 'mantener' | 'azar' | 'tresEtapas', triangulo: 'no' | 'clasico' | 'cualquiera', sinLegendarios },
//   entrenadores: { modo: 'mantener' | 'azar' | 'fuerza', mismaEtapa, lideresTipo, rivalInicial, sinLegendarios, subirNivel (%) },
//   tipos:        { modo: 'mantener' | 'linea' | 'azar' },
//   habilidades:  { modo: 'mantener' | 'linea' | 'azar', sinSuperguarda },
//   movimientos:  { modo: 'mantener' | 'azar', mismoTipo (%) }
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
  especieValida
} from './constantes.js'
import { leerBase, leerEvoluciones, leerAprendizaje, leerEntrenadores, pon16 } from './rom.js'

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
  entrenadores: { modo: 'azar', mismaEtapa: true, lideresTipo: true, rivalInicial: true, sinLegendarios: true, subirNivel: 0 },
  tipos: { modo: 'mantener' },
  habilidades: { modo: 'mantener', sinSuperguarda: true },
  movimientos: { modo: 'mantener', mismoTipo: 40 }
}

export const aleatorizar = (rom, analisis, ajustesEntrada, datos) => {
  const ajustes = { ...AJUSTES_POR_DEFECTO, ...ajustesEntrada }
  for (const k of Object.keys(AJUSTES_POR_DEFECTO)) ajustes[k] = { ...AJUSTES_POR_DEFECTO[k], ...(ajustesEntrada?.[k] || {}) }
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
  // La especie de esa familia en esa etapa (si se ramifica, una rama al azar; si no llega, la última)
  const enEtapa = (r, n) => {
    let x = r
    for (let k = 1; k < n && hijos[x].length; k++) x = azar.elegir(hijos[x])
    return x
  }
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
  const ent = analisis.entrenadores ? leerEntrenadores(b, analisis.entrenadores.tabla, analisis.entrenadores.n) : []
  const registroEntrenadores = []
  if (ent.length) {
    const { modo, lideresTipo, rivalInicial, sinLegendarios, subirNivel, mismaEtapa } = ajustes.entrenadores
    const destino = pool(sinLegendarios)
    const clases = CLASES[familia]
    const esJefe = (e) => [...clases.lider, ...clases.altoMando, ...clases.campeon].includes(e.clase)
    // familia original de cada inicial → la nueva (el rival lleva la línea de su inicial)
    const raicesIni = inicialesOriginales.map(raiz)
    const raicesNuevas = iniciales.map(raiz)
    const mult = 1 + (Math.max(0, +subirNivel || 0) / 100)
    for (const e of ent) {
      if (!e.miembros?.length) {
        registroEntrenadores.push(null)
        continue
      }
      // Tipo del líder: el que más se repite en su equipo original
      let tipoJefe = null
      if (lideresTipo && esJefe(e)) {
        const cuenta = {}
        for (const m of e.miembros) for (const t of new Set(base[m.esp].tipos)) cuenta[t] = (cuenta[t] || 0) + 1
        tipoJefe = +Object.entries(cuenta).sort((x, y) => y[1] - x[1])[0][0]
      }
      for (const m of e.miembros) {
        let n = m.esp
        const kIni = rivalInicial ? raicesIni.indexOf(raiz(m.esp)) : -1
        if (kIni >= 0 && (ajustes.iniciales.modo !== 'mantener')) {
          n = enEtapa(raicesNuevas[kIni], etapa(m.esp))
        } else if (modo !== 'mantener' && kIni < 0) {
          let lista = destino
          if (tipoJefe !== null) {
            const delTipo = destino.filter((x) => base[x].tipos.includes(tipoJefe))
            if (delTipo.length) lista = delTipo
          }
          if (mismaEtapa) lista = deSuEtapa(m.esp, lista)
          n = azar.elegir(modo === 'fuerza' ? parecidas(m.esp, lista) : lista)
        }
        const cambia = n !== m.esp
        if (cambia) pon16(b, m.o + 4, n)
        if (mult > 1) b[m.o + 2] = Math.min(100, Math.round(m.nivel * mult))
        m.esp = n
        m.nivel = b[m.o + 2]
        // Con movimientos propios: los que sabría a su nivel la especie nueva (con lo aleatorizado)
        if (m.oMovs !== null && (cambia || ajustes.movimientos.modo !== 'mantener' || mult > 1)) {
          m.movs = movimientosA(n, m.nivel)
          m.movs.forEach((id, k) => pon16(b, m.oMovs + k * 2, id))
        }
      }
      registroEntrenadores.push({
        i: e.i,
        nombre: texto(e.nombre, datos.caracteres),
        clase: e.clase,
        jefe: esJefe(e),
        equipo: e.miembros.map((m) => ({ especie: alias(m.esp), nivel: m.nivel, ...(m.movs ? { movimientos: m.movs.filter(Boolean) } : {}), ...(m.objeto ? { objeto: m.objeto } : {}) }))
      })
    }
  }

  // --- Registro ---
  const registro = {
    version: 1,
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
export const registroEnTexto = (r, nombre = (a) => a, nombreMapa = (m) => m) => {
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
    r.entrenadores.forEach((e) => e && L.push(`${String(e.i).padStart(3)} ${e.nombre || '?'}${e.jefe ? ' ★' : ''}: ${e.equipo.map((m) => `${nombre(m.especie)} Nv.${m.nivel}`).join(', ')}`))
    L.push('')
  }
  if (r.especies) {
    L.push('== TIPOS Y HABILIDADES ==')
    for (const [a, e] of Object.entries(r.especies)) L.push(`${nombre(a)}: ${e.tipos.join('/')} · ${e.habilidades.join(' / ')}`)
    L.push('')
  }
  return L.join('\n')
}
