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
        ability: habs[y.habilidad]?.en,
        moves
      })
      return p ? { y, p, moves } : null
    })
    .filter(Boolean)

  const daño = (atq, def, mov) => {
    try {
      const r = calc.calculate(g, atq, def, new calc.Move(g, mov))
      const [min, max] = r.range()
      const ps = def.maxHP()
      return { min: min / ps, max: max / ps }
    } catch {
      return { min: 0, max: 0 }
    }
  }

  const consejos = []
  const puntos = jefe.pokemon.map((b) => {
    const movsJefe = (b.moves || []).map((m) => m?.name).filter(Boolean)
    const pb = crear(b.name, {
      level: nivelJefe(b, cap),
      ability: b.ability?.name,
      item: b.held?.name,
      moves: movsJefe
    })
    const nb = nombreBonito(b.name)
    if (!pb) return 2

    const filas = nuestros.map(({ y, p, moves }) => {
      let recibe = 0
      for (const m of movsJefe) recibe = Math.max(recibe, daño(pb, p, m).max)
      let hace = 0
      let mejor = null
      for (const m of moves) {
        const d = daño(p, pb, m).min
        if (d > hace) {
          hace = d
          mejor = m
        }
      }
      return { y, recibe, hace, mejor, rapido: p.stats.spe > pb.stats.spe }
    })

    const seguros = filas.filter(
      (f) => (f.hace >= 1 && (f.rapido || f.recibe < 1)) || (f.hace >= 0.5 && f.recibe < 0.5)
    )
    const buenos = filas.filter((f) => f.hace >= 0.5 && f.recibe < 1)
    const aguantan = filas.filter((f) => f.hace >= 0.34 && f.recibe < 1)
    const ohko = filas.filter((f) => f.recibe >= 1)

    let p = seguros.length ? 0 : buenos.length ? 1 : aguantan.length ? 2 : 3
    if (ohko.length >= Math.ceil(filas.length / 2)) p += 1

    const mejor = [...filas].sort((a, b) => b.hace - b.recibe * 0.5 - (a.hace - a.recibe * 0.5))[0]
    if (mejor && mejor.hace > 0) {
      const nm = movs[norm(mejor.mejor)]
      consejos.push({
        tipo: mejor.hace >= 0.5 && mejor.recibe < 1 ? 'bien' : 'aviso',
        texto: es()
          ? `Contra ${nb}: ${mejor.y.nombre} con ${nm?.es || mejor.mejor} le quita al menos un ${pct(Math.min(mejor.hace, 1))} % y recibe hasta un ${pct(Math.min(mejor.recibe, 1))} %${mejor.rapido ? ' (es más rápido)' : ''}.`
          : `Vs ${nb}: ${mejor.y.nombre} with ${mejor.mejor} deals at least ${pct(Math.min(mejor.hace, 1))}% and takes up to ${pct(Math.min(mejor.recibe, 1))}%${mejor.rapido ? ' (outspeeds)' : ''}.`
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
  })
  return { puntos, consejos, modo: 'calculadora' }
}

// --- Punto de entrada -------------------------------------------------------------------------
// equipo: [{ nombre, alias, especie, types, nivel?, movimientos?, naturaleza?, ivs?, evs?, habilidad? }]
export const calcularRiesgo = async ({ jefe, equipo = [], gen = 3, cap = null }) => {
  if (!jefe?.pokemon?.length || !equipo.length) return null
  const tt = await tiposEs()
  const conDatos = equipo.every((y) => y.nivel && y.movimientos?.length)

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

  return {
    nivel: Math.max(0, Math.min(4, Math.round(nivel))),
    modo: r.modo,
    consejos: r.consejos.slice(0, 8)
  }
}
