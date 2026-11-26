// Equipo equilibrado: de la Caja y el equipo (los vivos), los 6 que mejor se complementan.
//
// «General»: cobertura ofensiva con sus movimientos (los del .sav o los que aprenden por nivel), pocas
// debilidades compartidas, pocos tipos repetidos, mezcla de físicos y especiales, alguien rápido y
// Pokémon fuertes (estadísticas base y nivel).
// «Próximo jefe»: lo mismo con menos peso, más quién gana a cada Pokémon del jefe con la calculadora de
// daño (la misma del riesgo).
//
// Con 30–100 candidatos no se pueden probar todas las combinaciones de 6: se elige por pasos (el que más
// suma cada vez) y luego se prueban cambios de uno en uno hasta que ninguno mejora.
import { moveResistance } from '$utils/advice/advisor-types'
import { fetchData } from '$utils/fetchers'
import { movimientos, aprendizaje, clavePokemon, norm } from './datos.js'
import { leerSavGuardado, emparejar } from './equipo.js'
import { leerReglas, capDelCombate, ajustarEquipoJefe } from './reglas.js'
import { leerParejas, parejaDe } from './parejas.js'
import { cargarLiga } from './partida.js'
import { calcularRiesgo, probablesANivel } from './riesgo.js'

const TODOS = ['normal', 'fire', 'water', 'grass', 'electric', 'ice', 'fighting', 'poison', 'ground', 'flying', 'psychic', 'bug', 'rock', 'ghost', 'dragon', 'dark', 'steel', 'fairy']
export const tiposDeGen = (gen = 3) => TODOS.filter((t) => !(gen < 2 && ['dark', 'steel'].includes(t)) && !(gen < 6 && t === 'fairy'))

// Hasta la 3.ª gen la categoría (físico/especial) va por el tipo del movimiento
const ESPECIALES_GEN3 = ['fire', 'water', 'grass', 'electric', 'ice', 'psychic', 'dragon', 'dark']
const categoria = (m, gen) => (gen <= 3 ? (ESPECIALES_GEN3.includes(m.tipo) ? 'special' : 'physical') : m.clase)

// Físico o especial: la categoría de su mejor ataque (potencia, STAB y la estadística que usa)
const rol = (m) => {
  let mejor = null
  let v = -1
  for (const a of m.ataques) {
    const x = a.potencia * (m.types.includes(a.tipo) ? 1.5 : 1) * (a.clase === 'special' ? m.base.spa : m.base.atk)
    if (x > v) {
      v = x
      mejor = a
    }
  }
  return mejor ? mejor.clase : m.base.atk >= m.base.spa ? 'physical' : 'special'
}

const ef = (atq, def) => {
  try {
    return moveResistance(atq, def)
  } catch {
    return 1
  }
}

/**
 * Candidatos de la run: los vivos (equipo y caja) con tipos, estadísticas base, nivel y movimientos.
 * Devuelve { candidatos, cap, jefe, reglas, notas, gen } (jefe = el próximo, con su equipo, si se sabe).
 */
export const prepararCandidatos = async (partida, resumen) => {
  const info = partida.info || {}
  const gen = info.gen || 3
  const reglas = leerReglas(partida.id)
  const [pk, movs, tabla] = await Promise.all([fetchData(), movimientos(), aprendizaje(info.grupo)])
  const porNivel = tabla?.nivel || {}
  const movPorId = {}
  for (const [k, m] of Object.entries(movs || {})) movPorId[m.id] = { ...m, clave: k }
  const busca = (a) => pk?.aliasMap?.[norm(a)] || pk?.nameMap?.[norm(a)]
  const sav = leerSavGuardado(partida.id)
  const enSav = sav ? [...(sav.equipo || []), ...(sav.cajas || [])] : []
  const usados = new Set()

  // Próximo jefe y nivel máximo
  const sig = resumen.siguienteJefe
  let cap = null
  let jefe = null
  if (sig) {
    try {
      cap = await capDelCombate(partida, resumen, sig.value)
      const liga = await cargarLiga(partida.juego, partida.datos?.__starter || 'fire')
      const d = liga?.[sig.value]
      if (d?.pokemon?.length) jefe = { ...d, valor: sig.value, pokemon: ajustarEquipoJefe(d.pokemon, reglas) }
    } catch (e) {
      console.error('[equilibrar] jefe', e)
    }
  }

  const enEquipo = new Set(resumen.equipo.map((e) => e.lugar))
  const notas = []
  let candidatos = resumen.vivos.map((e) => {
    const p = busca(e.pokemon) || {}
    const s = enSav.length ? emparejar(e, enSav, usados) : null
    if (s) usados.add(s)
    const nivel = s?.nivel || null
    const nivelCalc = nivel || cap || 50
    let ids = s?.movimientos?.length ? s.movimientos : null
    const estimado = !ids
    if (!ids) ids = probablesANivel(porNivel[clavePokemon(p.alias || e.pokemon, porNivel)], nivelCalc).map((k) => movs[k]?.id).filter(Boolean)
    const ataques = ids
      .map((id) => movPorId[id])
      .filter((m) => m && m.clase !== 'status' && (m.potencia || 0) > 0)
      .map((m) => ({ tipo: m.tipo, potencia: m.potencia, clase: categoria(m, gen), clave: m.clave, es: m.es, en: m.en }))
    return {
      lugar: e.lugar,
      nombre: e.nickname || p.name || e.pokemon,
      alias: p.alias || e.pokemon,
      especie: s?.especie || e.pokemon,
      imgId: p.imgId,
      types: (p.types || []).map((t) => t.toLowerCase()),
      base: p.baseStats || { hp: 50, atk: 50, def: 50, spa: 50, spd: 50, spe: 50 },
      total: p.total || 300,
      nivel,
      nivelCalc,
      movimientos: ids,
      ataques,
      estimado,
      naturaleza: s?.naturaleza,
      habilidad: s?.habilidad,
      ivs: s?.ivs,
      evs: s?.evs,
      enEquipo: enEquipo.has(e.lugar),
      estado: +e.status
    }
  })

  // Reglas: monotipo y nivel máximo dejan fuera a quien no puede combatir
  if (reglas.monotipo) {
    const antes = candidatos.length
    candidatos = candidatos.filter((c) => c.types.includes(reglas.monotipo))
    if (candidatos.length < antes) notas.push({ clave: 'monotipo', tipo: reglas.monotipo, fuera: antes - candidatos.length })
  }
  if (reglas.nivelMax && cap) {
    const pasados = candidatos.filter((c) => c.nivel && c.nivel > cap)
    if (pasados.length) {
      candidatos = candidatos.filter((c) => !pasados.includes(c))
      notas.push({ clave: 'nivel', cap, nombres: pasados.map((c) => c.nombre) })
    }
  }
  const parejas = reglas.wedlocke ? leerParejas(partida.id) : []
  if (reglas.wedlocke) notas.push({ clave: 'wedlocke' })
  return { candidatos, cap, jefe, reglas, notas, gen, parejas, conSav: !!sav }
}

// --- Puntuación «general» -----------------------------------------------------------------------
export const analizarEquipo = (equipo, gen = 3) => {
  const tipos = tiposDeGen(gen)
  // Ofensiva: contra cada tipo, el mejor golpe del equipo (con STAB vale un poco más)
  const cobertura = {}
  for (const x of tipos) {
    let mejor = 0
    for (const m of equipo) for (const a of m.ataques) mejor = Math.max(mejor, ef(a.tipo, [x]) * (m.types.includes(a.tipo) ? 1.15 : 1))
    cobertura[x] = mejor
  }
  // Defensiva: cuántos son débiles y cuántos resisten cada tipo de ataque
  const defensa = {}
  for (const x of tipos) {
    let debiles = 0
    let resisten = 0
    for (const m of equipo) {
      const v = ef(x, m.types)
      if (v >= 2) debiles++
      else if (v <= 0.5) resisten++
    }
    defensa[x] = { debiles, resisten }
  }
  const cuenta = {}
  for (const m of equipo) for (const t of m.types) cuenta[t] = (cuenta[t] || 0) + 1
  const fisicos = equipo.filter((m) => rol(m) === 'physical').length
  const especiales = equipo.length - fisicos
  const rapidos = equipo.filter((m) => m.base.spe >= 85).length
  return { cobertura, defensa, cuenta, fisicos, especiales, rapidos, tipos }
}

const puntuarGeneral = (equipo, gen) => {
  if (!equipo.length) return 0
  const a = analizarEquipo(equipo, gen)
  let p = 0
  for (const x of a.tipos) {
    const c = a.cobertura[x]
    p += c >= 2 ? 1 : c >= 1 ? 0.35 : 0
    const { debiles, resisten } = a.defensa[x]
    p += resisten ? 0.45 + (resisten >= 2 ? 0.15 : 0) : 0
    if (debiles >= 2) p -= 0.6 * (debiles - 1)
    if (debiles >= 3) p -= 0.8
  }
  for (const n of Object.values(a.cuenta)) if (n > 1) p -= 0.6 * (n - 1)
  if (equipo.length >= 4 && (!a.fisicos || !a.especiales)) p -= 0.8
  if (Math.abs(a.fisicos - a.especiales) >= 4) p -= 0.5
  if (!a.rapidos) p -= 0.6
  // Fuerza: estadísticas base y nivel (un Pokémon muy por debajo del resto rinde menos)
  const maxNivel = Math.max(1, ...equipo.map((m) => m.nivelCalc || 1))
  for (const m of equipo) {
    p += (m.total / 100) * 0.9
    p += ((m.nivelCalc || maxNivel) / maxNivel) * 0.8
    if (!m.ataques.length) p -= 1.5
  }
  return p
}

// --- Puntuación contra el próximo jefe ---------------------------------------------------------
// valor de un duelo: 3 gana con margen, 2 gana, 1 ajustado, 0 pierde; −0,5 si le hacen KO de un golpe
const valorDuelo = (f) => (f.ganas ? (f.margen >= 1 ? 3 : 2) : f.tu <= f.el + 1 && f.tu < 99 ? 1 : 0) - (f.recibe >= 1 ? 0.5 : 0)

export const duelosContraJefe = async (jefe, candidatos, { gen, cap, grupo }) => {
  const r = await calcularRiesgo({
    jefe,
    equipo: candidatos.map((c) => ({
      nombre: c.nombre,
      alias: c.alias,
      especie: c.especie,
      types: c.types,
      nivel: c.nivelCalc,
      movimientos: c.movimientos,
      naturaleza: c.naturaleza,
      habilidad: c.habilidad,
      ivs: c.ivs,
      evs: c.evs,
      lugar: c.lugar
    })),
    gen,
    cap,
    grupo
  })
  // tabla[índice del Pokémon del jefe][lugar] = duelo
  return (r?.matriz || []).map((m) => {
    const t = {}
    for (const f of m.filas || []) t[f.y.lugar] = { ...f, valor: valorDuelo(f) }
    return { jefe: m.jefe, duelos: t }
  })
}

const puntuarJefe = (equipo, duelos) => {
  let p = 0
  for (const { duelos: d } of duelos) {
    const vals = equipo.map((m) => d[m.lugar]?.valor ?? 0).sort((a, b) => b - a)
    p += (vals[0] || 0) * 2 + (vals[1] || 0) * 0.4
  }
  // Los que caen de un golpe contra media plantilla del jefe estorban
  for (const m of equipo) {
    const ko = duelos.filter(({ duelos: d }) => (d[m.lugar]?.recibe || 0) >= 1).length
    if (duelos.length && ko >= Math.ceil(duelos.length / 2)) p -= 1
  }
  return p
}

export const puntuar = (equipo, ctx) =>
  ctx.modo === 'jefe' && ctx.duelos?.length ? puntuarJefe(equipo, ctx.duelos) + puntuarGeneral(equipo, ctx.gen) * 0.4 : puntuarGeneral(equipo, ctx.gen)

// --- Búsqueda -------------------------------------------------------------------------------------
// Wedlocke: nunca los dos de una pareja en el equipo
const permitido = (equipo, c, ctx) => {
  if (!ctx.parejas?.length) return true
  const otra = parejaDe(ctx.parejas, c.lugar)
  return !otra || !equipo.some((m) => m.lugar === otra)
}

export const buscarEquipo = (candidatos, ctx, fijos = new Set()) => {
  const tam = Math.min(6, candidatos.length)
  let equipo = candidatos.filter((c) => fijos.has(c.lugar)).slice(0, 6)
  // 1. Por pasos: el que más suma cada vez
  while (equipo.length < tam) {
    let mejor = null
    let pMejor = -Infinity
    for (const c of candidatos) {
      if (equipo.includes(c) || !permitido(equipo, c, ctx)) continue
      const p = puntuar([...equipo, c], ctx)
      if (p > pMejor) {
        pMejor = p
        mejor = c
      }
    }
    if (!mejor) break
    equipo.push(mejor)
  }
  // 2. Cambios de uno en uno hasta que ninguno mejora
  let actual = puntuar(equipo, ctx)
  for (let vuelta = 0; vuelta < 12; vuelta++) {
    let cambio = null
    for (let i = 0; i < equipo.length; i++) {
      if (fijos.has(equipo[i].lugar)) continue
      const resto = equipo.filter((_, j) => j !== i)
      for (const c of candidatos) {
        if (equipo.includes(c) || !permitido(resto, c, ctx)) continue
        const prueba = [...resto.slice(0, i), c, ...resto.slice(i)]
        const p = puntuar(prueba, ctx)
        if (p > actual + 1e-6 && (!cambio || p > cambio.p)) cambio = { p, equipo: prueba }
      }
    }
    if (!cambio) break
    equipo = cambio.equipo
    actual = cambio.p
  }
  return { equipo, puntos: actual }
}

// --- Explicaciones -------------------------------------------------------------------------------
// Chips de cada miembro: lo que aporta que nadie más del equipo aporta
export const motivos = (equipo, ctx) => {
  const a = analizarEquipo(equipo, ctx.gen)
  const masRapido = [...equipo].sort((x, y) => y.base.spe - x.base.spe)[0]
  const masFuerte = [...equipo].sort((x, y) => y.total - x.total)[0]
  return equipo.map((m) => {
    const chips = []
    // Cubre: tipos a los que solo él pega supereficaz
    const cubre = a.tipos.filter((x) => {
      const suyo = Math.max(0, ...m.ataques.map((at) => ef(at.tipo, [x])))
      if (suyo < 2) return false
      return !equipo.some((o) => o !== m && o.ataques.some((at) => ef(at.tipo, [x]) >= 2))
    })
    if (cubre.length) chips.push({ clave: 'cubre', tipos: cubre.slice(0, 3) })
    // Resiste: tipos que pegan supereficaz a alguien del equipo y solo él resiste
    const resiste = a.tipos.filter((x) => a.defensa[x].debiles >= 1 && ef(x, m.types) <= 0.5 && a.defensa[x].resisten === 1)
    if (resiste.length) chips.push({ clave: 'resiste', tipos: resiste.slice(0, 3) })
    if (m === masRapido) chips.push({ clave: 'rapido' })
    if (m === masFuerte) chips.push({ clave: 'fuerte' })
    if (ctx.modo === 'jefe' && ctx.duelos?.length) {
      const gana = ctx.duelos.filter(({ duelos: d }) => (d[m.lugar]?.valor || 0) >= 2 && equipo.every((o) => (d[o.lugar]?.valor || 0) <= d[m.lugar].valor)).map(({ jefe }) => jefe.name)
      if (gana.length) chips.push({ clave: 'gana', nombres: gana.slice(0, 3) })
    }
    if (!m.ataques.length) chips.push({ clave: 'sinAtaques' })
    return chips
  })
}

// Resumen de un equipo para comparar el actual con la propuesta
export const resumenEquipo = (equipo, gen) => {
  const a = analizarEquipo(equipo, gen)
  return {
    cubiertos: a.tipos.filter((x) => a.cobertura[x] >= 2).length,
    total: a.tipos.length,
    sinRespuesta: a.tipos.filter((x) => a.cobertura[x] < 1),
    compartidas: a.tipos.filter((x) => a.defensa[x].debiles >= 2).map((x) => ({ tipo: x, n: a.defensa[x].debiles })),
    fisicos: a.fisicos,
    especiales: a.especiales,
    rapidos: a.rapidos
  }
}
