// Nivel de riesgo de un combate contra un jefe y consejos para afrontarlo.
// Con niveles y movimientos (partida .sav) usa la calculadora de daño de Smogon;
// sin ellos, hace una estimación por tipos.
import { moveResistance } from '$utils/advice/advisor-types'
import { movimientos, habilidades, tipos as tiposEs, norm } from './datos.js'
import { idioma } from './idioma.js'

const es = () => idioma() === 'es'
const pct = (x) => Math.round(x * 100)
const nombreBonito = (n = '') => n.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())

const tiposAtaque = (b) => {
  const t = new Set(b.types || [])
  for (const m of b.moves || []) if (m?.type && m.damage_class !== 'status' && m.power !== 0) t.add(m.type)
  return [...t]
}

const multAtaque = (tiposAtq, tiposDef) =>
  tiposAtq.length ? Math.max(...tiposAtq.map((t) => moveResistance(t, tiposDef || []))) : 1

const nivelJefe = (b, cap) => {
  const n = parseInt(b.level, 10)
  return isNaN(n) || ('' + b.level).startsWith('+') ? cap : n
}

// --- Estimación por tipos -----------------------------------------------------------
const riesgoPorTipos = (jefe, equipo, tt) => {
  const consejos = []
  const puntos = jefe.pokemon.map((b) => {
    const atq = tiposAtaque(b)
    const filas = equipo.map((y) => ({
      y,
      def: multAtaque(atq, y.types),
      off: multAtaque(y.types || [], b.types || [])
    }))
    const respuestas = filas.filter((f) => f.off >= 2 && f.def <= 1)
    const neutras = filas.filter((f) => f.off >= 1 && f.def < 2)
    const debiles = filas.filter((f) => f.def >= 2)

    let p = respuestas.length >= 2 ? 0 : respuestas.length === 1 ? 1 : neutras.length >= 2 ? 2 : 3
    if (debiles.length >= Math.ceil(equipo.length / 2)) p += 0.6

    const nb = nombreBonito(b.name)
    if (respuestas.length)
      consejos.push({
        tipo: 'bien',
        texto: es()
          ? `${respuestas.map((f) => f.y.nombre).join(', ')} ${respuestas.length > 1 ? 'pegan' : 'pega'} supereficaz a ${nb} sin ser ${respuestas.length > 1 ? 'débiles' : 'débil'} a sus ataques.`
          : `${respuestas.map((f) => f.y.nombre).join(', ')} hit ${nb} super effectively without being weak to it.`
      })
    else
      consejos.push({
        tipo: 'mal',
        texto: es()
          ? `Nadie de tu equipo tiene ventaja clara contra ${nb}.`
          : `Nobody in your team has a clear edge against ${nb}.`
      })
    if (debiles.length >= 2)
      consejos.push({
        tipo: 'aviso',
        texto: es()
          ? `${nb} amenaza a ${debiles.length} de tus Pokémon (${atq.map((t) => tt[t] || t).join(', ')}).`
          : `${nb} threatens ${debiles.length} of your Pokémon (${atq.join(', ')}).`
      })
    return p
  })
  return { puntos, consejos, modo: 'tipos' }
}

// --- Cálculo de daño real -----------------------------------------------------------------
const riesgoConCalculadora = async (jefe, equipo, gen, cap) => {
  const calc = await import('@smogon/calc')
  const g = calc.Generations.get(gen)
  const [movs, habs] = await Promise.all([movimientos(), habilidades()])
  const movPorId = {}
  for (const m of Object.values(movs)) movPorId[m.id] = m.en

  const crear = (nombre, opciones) => {
    try {
      return new calc.Pokemon(g, nombreBonito(nombre), opciones)
    } catch {
      return null
    }
  }

  const nuestros = equipo
    .map((y) => {
      const moves = (y.movimientos || []).map((id) => movPorId[id]).filter(Boolean)
      const p = crear(y.especie || y.alias, {
        level: y.nivel,
        nature: nombreBonito(y.naturaleza || 'hardy'),
        ivs: y.ivs,
        evs: y.evs,
        ability: habs[y.habilidad]?.en || y.habilidadNombre,
        item: y.objeto || undefined,
        moves
      })
      return p ? { y, p, moves } : null
    })
    .filter(Boolean)

  // Clima que pone el jefe al salir (Sequía, Llovizna, Chorro Arena, Nevada): cambia el daño de los dos lados
  const CLIMA = { drought: 'Sun', drizzle: 'Rain', 'sand stream': 'Sand', 'snow warning': gen >= 9 ? 'Snow' : 'Hail' }
  let campo = undefined
  const prioridad = (mov) => {
    try {
      return new calc.Move(g, mov).priority || 0
    } catch {
      return 0
    }
  }
  const daño = (atq, def, mov) => {
    try {
      const r = calc.calculate(g, atq, def, new calc.Move(g, mov), campo)
      const [min, max] = r.range()
      const ps = def.maxHP()
      return { min: min / ps, max: max / ps }
    } catch {
      return { min: 0, max: 0 }
    }
  }

  const consejos = []
  const puntos = []
  const matriz = []
  for (const b of jefe.pokemon) {
    // Cede el paso entre Pokémon para no congelar la ventana
    await new Promise((r) => setTimeout(r, 0))
    puntos.push(evaluar(b))
  }
  return { puntos, consejos, matriz, modo: 'calculadora' }

  function evaluar(b) {
    const movsJefe = (b.moves || []).map((m) => m?.name).filter(Boolean)
    // IVs: los reales del juego cuando se conocen (3.ª gen y Platino, de pret: «iv» de 0 a 31); si no, 31
    // (el peor caso). Naturaleza: la real en la 3.ª gen y en Platino («nat», calculada como en el juego); si no, neutra.
    // EVs: 0, que es lo que llevan los entrenadores de los juegos hasta la 5.ª gen.
    const iv = Number.isFinite(+b.iv) && b.iv !== null && b.iv !== '' ? +b.iv : 31
    const pb = crear(b.name, {
      level: nivelJefe(b, cap),
      ability: b.ability?.name,
      item: b.held?.name,
      ivs: { hp: iv, atk: iv, def: iv, spa: iv, spd: iv, spe: iv },
      evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
      ...(b.nat ? { nature: nombreBonito(b.nat) } : {}),
      moves: movsJefe
    })
    const nb = nombreBonito(b.name)
    const clima = CLIMA[String(b.ability?.name || '').toLowerCase().replace(/-/g, ' ')]
    campo = clima ? new calc.Field({ weather: clima }) : undefined
    if (!pb) {
      matriz.push({ jefe: b, filas: [] })
      return 2
    }

    const filas = nuestros.map(({ y, p, moves }) => {
      let recibe = 0
      let recibeMin = 0
      let peligro = null
      for (const m of movsJefe) {
        const d = daño(pb, p, m)
        if (d.max > recibe) {
          recibe = d.max
          recibeMin = d.min
          peligro = m
        }
      }
      let hace = 0
      let haceMax = 0
      let mejor = null
      for (const m of moves) {
        const d = daño(p, pb, m)
        if (d.min > hace || (d.min === hace && d.max > haceMax)) {
          hace = d.min
          haceMax = d.max
          mejor = m
        }
      }
      // Prioridad: si un movimiento con prioridad remata de un golpe, ese lado pega primero aunque sea más lento
      let rapido = p.stats.spe > pb.stats.spe
      const suPrio = movsJefe.filter((m) => prioridad(m) > 0).some((m) => daño(pb, p, m).max >= 1)
      const miPrio = moves.filter((m) => prioridad(m) > 0).some((m) => daño(p, pb, m).min >= 1)
      if (miPrio && !suPrio) rapido = true
      else if (suPrio && !miPrio) rapido = false
      // Duelo 1 contra 1: golpes que necesitas (con tu daño mínimo) frente a
      // golpes que aguantas (con su daño máximo). Si eres más lento, pega antes.
      const tu = miPrio ? 1 : hace > 0 ? Math.ceil(1 / hace) : 99
      const el = recibe > 0 ? Math.ceil(1 / recibe) : 99
      const ganas = rapido ? tu <= el : tu < el
      const margen = (rapido ? el : el - 1) - tu
      return { y, recibe, recibeMin, peligro, hace, haceMax, mejor, rapido, empate: p.stats.spe === pb.stats.spe, tu, el, ganas, margen }
    })
    matriz.push({ jefe: b, velocidad: pb.stats.spe, filas })

    const comodos = filas.filter((f) => f.ganas && f.margen >= 1)
    const ganadores = filas.filter((f) => f.ganas)
    const ajustados = filas.filter((f) => !f.ganas && f.tu <= f.el + 1 && f.tu < 99)
    const ohko = filas.filter((f) => f.recibe >= 1)

    let p = comodos.length ? 0 : ganadores.length ? 1 : ajustados.length ? 2 : 3
    if (ohko.length >= Math.ceil(filas.length / 2)) p += 0.5

    const mejor = [...filas].sort((a, b) => (b.ganas - a.ganas) || (b.margen - a.margen) || (b.hace - a.hace))[0]
    if (mejor && mejor.hace > 0) {
      const nm = movs[norm(mejor.mejor)]
      const golpes = (n) => (n >= 99 ? '∞' : n)
      consejos.push({
        tipo: mejor.ganas ? 'bien' : 'aviso',
        texto: es()
          ? `Contra ${nb}: ${mejor.y.nombre} con ${nm?.es || mejor.mejor} lo debilita en ${golpes(mejor.tu)} ${mejor.tu === 1 ? 'golpe' : 'golpes'} y aguanta ${golpes(mejor.el)}${mejor.rapido ? ' (y es más rápido)' : ''}${mejor.ganas ? '.' : ': no le gana el 1 contra 1.'}`
          : `Vs ${nb}: ${mejor.y.nombre} with ${mejor.mejor} KOs in ${golpes(mejor.tu)} and survives ${golpes(mejor.el)}${mejor.rapido ? ' (outspeeds)' : ''}${mejor.ganas ? '.' : ': loses the 1v1.'}`
      })
    }
    if (ohko.length)
      consejos.push({
        tipo: 'mal',
        texto: es()
          ? `${nb} puede debilitar de un golpe a ${ohko.map((f) => f.y.nombre).join(', ')}.`
          : `${nb} can OHKO ${ohko.map((f) => f.y.nombre).join(', ')}.`
      })
    return p
  }
}

// --- Punto de entrada -------------------------------------------------------------------------
// equipo: [{ nombre, alias, especie, types, nivel?, movimientos?, naturaleza?, ivs?, evs?, habilidad? }]
const cacheRiesgo = new Map()
export const calcularRiesgo = (args) => {
  const { jefe, equipo = [], gen, cap } = args
  if (!jefe?.pokemon?.length || !equipo.length) return Promise.resolve(null)
  const firma = JSON.stringify([
    jefe.name,
    jefe.pokemon.map((p) => [p.name, p.level, (p.moves || []).map((m) => m?.name)]),
    equipo.map((y) => [y.alias, y.especie, y.nivel, y.movimientos, y.naturaleza, y.habilidad, y.habilidadNombre, y.objeto, y.ivs, y.evs]),
    gen,
    cap,
    idioma()
  ])
  if (!cacheRiesgo.has(firma)) cacheRiesgo.set(firma, calcularRiesgoSinCache(args))
  return cacheRiesgo.get(firma)
}

const calcularRiesgoSinCache = async ({ jefe, equipo = [], gen = 3, cap = null }) => {
  const tt = await tiposEs()
  const conDatos =
    equipo.every((y) => y.nivel && y.movimientos?.length) &&
    jefe.pokemon.every((p) => (p.moves || []).filter(Boolean).length)

  let r
  try {
    r = conDatos ? await riesgoConCalculadora(jefe, equipo, gen, cap) : riesgoPorTipos(jefe, equipo, tt)
  } catch (e) {
    console.error('[riesgo]', e)
    r = riesgoPorTipos(jefe, equipo, tt)
  }

  const media = r.puntos.reduce((a, b) => a + b, 0) / r.puntos.length
  let nivel = media + (Math.max(...r.puntos) >= 3 ? 0.6 : 0)

  // Diferencia de nivel con el nivel máximo del combate
  const niveles = equipo.map((y) => y.nivel).filter(Boolean)
  if (cap && niveles.length) {
    const medio = niveles.reduce((a, b) => a + b, 0) / niveles.length
    const diferencia = cap - medio
    if (diferencia >= 3) {
      nivel += Math.min(1.5, diferencia / 5)
      r.consejos.unshift({
        tipo: 'aviso',
        texto: es()
          ? `Tu equipo está de media ${Math.round(diferencia)} niveles por debajo del nivel máximo (${cap}).`
          : `Your team averages ${Math.round(diferencia)} levels below the cap (${cap}).`
      })
    }
  }

  const vistos = new Set()
  r.consejos = r.consejos.filter((c) => !vistos.has(c.texto) && vistos.add(c.texto))

  return {
    nivel: Math.max(0, Math.min(4, Math.round(nivel))),
    modo: r.modo,
    consejos: r.consejos.slice(0, 8),
    todosLosConsejos: r.consejos,
    matriz: r.matriz || null,
    puntos: r.puntos
  }
}
