// Reglas del Nuzlocke de cada run (se guardan aparte de los ajustes originales)
import { writable } from 'svelte/store'
import { especies, clavePokemon, norm } from './datos.js'
import { idioma, traducirNombre } from './idioma.js'
import { claveSav } from './equipo.js'
import { nivelMaximo } from './partida.js'
import { leerParejas, parejaDe } from './parejas.js'

const es = () => idioma() === 'es'
const clave = (id) => `lockedex.reglas.${id}`

// Avisos de reglas por fila de encuentro (lugar → textos), para marcar la fila que rompe una regla.
// Lo rellena AvisosReglas.svelte y lo lee pokemon-selector.svelte.
export const avisosFila = writable({})

// Catálogo de reglas. tipo: 'si' (activable) o 'tipo' (elige un tipo)
export const REGLAS = [
  { id: 'regalos', grupo: 'clausulas', es: 'Cláusula de regalos', en: 'Gift clause', desc: ['Los Pokémon de regalo no gastan el encuentro de la zona: puedes añadir un encuentro extra desde el menú ⋮ de esa zona.', 'Gift Pokémon do not use up the area encounter: add an extra encounter from that area’s ⋮ menu.'] },
  { id: 'variocolor', grupo: 'clausulas', es: 'Cláusula variocolor', en: 'Shiny clause', desc: ['Un shiny siempre se puede capturar, aunque ya tuvieras encuentro en esa zona (menú ⋮ → variocolor extra).', 'A shiny can always be caught, even if you already had an encounter there (⋮ menu → extra shiny).'] },
  { id: 'estaticos', grupo: 'clausulas', es: 'Estáticos aparte', en: 'Static clause', desc: ['Los encuentros estáticos y legendarios no gastan el encuentro de la zona.', 'Static and legendary encounters do not use up the area encounter.'] },
  { id: 'especie', grupo: 'clausulas', es: 'Cláusula de especie', en: 'Species clause', desc: ['Una captura por línea evolutiva: en el buscador se marcan como «repetido» los Pokémon cuya línea ya tienes, y avisa si capturas uno.', 'One catch per evolution line: the search marks Pokémon whose line you already have as «dupe», and warns if you catch one.'] },
  { id: 'revivir', grupo: 'clausulas', tipo: 'opciones', opciones: [['', 'No', 'Off'], ['medalla', '1 por medalla', '1 per badge'], ['1', '1 en toda la run', '1 per run'], ['3', '3 en toda la run', '3 per run']], es: 'Cláusula de revivir', en: 'Revive clause', desc: ['Permite revivir Pokémon caídos desde el cementerio (botón «Revivir»): uno por cada medalla o un número fijo en toda la run.', 'Fainted Pokémon can be revived from the graveyard («Revive» button): one per badge or a fixed number per run.'] },
  { id: 'vidas', grupo: 'dificultad', tipo: 'opciones', opciones: [['', 'No', 'Off'], ['3', '3 vidas', '3 lives'], ['5', '5 vidas', '5 lives'], ['10', '10 vidas', '10 lives'], ['20', '20 vidas', '20 lives']], es: 'Modo con vidas', en: 'Lives mode', desc: ['Cada Pokémon caído, cada derrota contra un jefe y cada revivido gastan una vida; sin vidas, game over.', 'Each fainted Pokémon, boss defeat and revive costs a life; out of lives, game over.'] },
  { id: 'nivelMax', grupo: 'dificultad', es: 'Nivel máximo obligatorio', en: 'Hard level caps', desc: ['Avisa si tu equipo supera el nivel máximo del próximo jefe: en los avisos de la partida, en el VS y en la ventana compacta (necesita tu .sav importado o vinculado).', 'Warns if your team is above the next boss’s level cap: in the run warnings, the VS window and the compact window (needs your .sav imported or linked).'] },
  { id: 'sinObjetos', grupo: 'dificultad', tipo: 'opciones', opciones: [['', 'Sin límite', 'No limit'], ['0', 'Prohibidos', 'Banned'], ['1', '1 por combate', '1 per battle'], ['2', '2 por combate', '2 per battle'], ['3', '3 por combate', '3 per battle']], es: 'Objetos en combate', en: 'Items in battle', desc: ['Prohibidos o limitados a unos pocos por combate contra un jefe. Con límite, la ventana compacta lleva la cuenta de los que gastas.', 'Banned, or limited to a few per boss battle. With a limit, the compact window counts the ones you use.'] },
  { id: 'set', grupo: 'dificultad', es: 'Modo Set', en: 'Set mode', desc: ['Sin cambio gratis cuando debilitas a un Pokémon del rival (en los juegos, «Estilo: Fijo»). Recordatorio en el asistente, el VS y la ventana compacta.', 'No free switch after knocking out a foe (the games’ «Battle style: Set»). Reminder in the assistant, the VS window and the compact window.'] },
  { id: 'gameover', grupo: 'dificultad', es: 'Game over si cae todo el equipo', en: 'Game over on wipe', desc: ['Si cae todo tu equipo, la app te propone dar la run por perdida (puedes seguir si no fue así) y avisa si no te queda ningún Pokémon vivo.', 'If your whole team faints, the app offers to end the run (you can keep playing if it did not) and warns if no Pokémon are left alive.'] },
  { id: 'sinLegendarios', grupo: 'variantes', es: 'Sin legendarios', en: 'No legendaries', desc: ['Avisa si capturas un legendario o singular.', 'Warns if you catch a legendary or mythical.'] },
  { id: 'wedlocke', grupo: 'variantes', es: 'Wedlocke (parejas)', en: 'Wedlocke (pairs)', desc: ['Cada Pokémon va en pareja con otro (se elige en la Caja) y en cada combate solo puede salir uno de los dos. Si uno cae, el otro puede buscar pareja nueva. El asistente y el VS lo recuerdan.', 'Each Pokémon is paired with another (set in the Box) and only one of each pair may fight in a battle. If one faints, the other can find a new partner. The assistant and VS window remind you.'] },
  { id: 'monotipo', grupo: 'variantes', tipo: 'tipo', es: 'Monotipo', en: 'Monotype', desc: ['Solo Pokémon del tipo elegido. Avisa si capturas uno que no lo es.', 'Only Pokémon of the chosen type. Warns otherwise.'] },
  { id: 'randomlocke', grupo: 'variantes', es: 'Randomlocke (juego aleatorizado)', en: 'Randomlocke (randomized game)', desc: ['Puedes registrar cualquier Pokémon en cada ruta y no se muestran sugerencias de encuentros.', 'Any Pokémon can be logged on each route and encounter suggestions are off.'] },
  { id: 'entrenadoresAleatorios', grupo: 'variantes', depende: 'randomlocke', es: 'Entrenadores también aleatorizados', en: 'Trainers randomized too', desc: ['Oculta los equipos de los jefes; puedes apuntar el equipo real cuando lo veas.', 'Hides boss teams; you can log the real team when you see it.'] },
  { id: 'nivelesJefes', grupo: 'variantes', depende: 'randomlocke', tipo: 'opciones', opciones: [['', 'Como el original', 'As original'], ['10', '+10 %', '+10%'], ['20', '+20 %', '+20%'], ['30', '+30 %', '+30%'], ['50', '+50 %', '+50%']], es: 'Niveles de los jefes', en: 'Boss levels', desc: ['Si el randomizer subió el nivel de los entrenadores: el nivel máximo, la barra de EXP, los equipos y el riesgo usan el nivel ajustado.', 'If the randomizer raised trainer levels: level caps, the EXP bar, teams and risk use the adjusted level.'] },
  { id: 'datosAleatorios', grupo: 'variantes', depende: 'randomlocke', es: 'Tipos, habilidades o movimientos aleatorizados', en: 'Types, abilities or moves randomized', desc: ['El riesgo y el asistente de combate salen de los datos de cada especie; con esto activado no se calculan (no serían fiables).', 'Risk and the battle assistant come from species data; with this on they are not calculated (they would be wrong).'] }
]

// Randomlocke con niveles de jefes cambiados: factor y ajuste de un nivel o de un equipo de jefe
export const factorNiveles = (reglas) => (reglas?.randomlocke && +reglas.nivelesJefes ? 1 + +reglas.nivelesJefes / 100 : 1)
export const ajustarNivel = (n, reglas) => {
  const f = factorNiveles(reglas)
  if (f === 1 || n == null || n === '' || isNaN(+n)) return n
  return Math.min(100, Math.round(+n * f))
}
export const ajustarEquipoJefe = (pokemon, reglas) =>
  factorNiveles(reglas) === 1
    ? pokemon
    : (pokemon || []).map((p) => (/^[+-]/.test('' + p?.level) || isNaN(parseInt(p?.level, 10)) ? p : { ...p, level: '' + ajustarNivel(parseInt(p.level, 10), reglas) }))
// Con tipos, habilidades o movimientos aleatorizados, los cálculos con datos de las especies no valen
export const sinCalculos = (reglas) => !!(reglas?.randomlocke && reglas?.datosAleatorios)

export const GRUPOS_REGLAS = {
  clausulas: ['Cláusulas', 'Clauses'],
  dificultad: ['Dificultad', 'Difficulty'],
  variantes: ['Variantes', 'Variants']
}

export const PLANTILLAS = {
  clasico: {
    es: 'Nuzlocke clásico',
    en: 'Classic Nuzlocke',
    reglas: { regalos: true, variocolor: true, estaticos: true, gameover: true },
    // Ajustes de la app: índice → valor (1 sugerencias, 2 repetidos, 3 niveles máx., 0 muerte permanente)
    ajustes: { 2: '1' }
  },
  hardcore: {
    es: 'Hardcore',
    en: 'Hardcore',
    reglas: { regalos: false, variocolor: true, estaticos: false, nivelMax: true, sinObjetos: '0', set: true, gameover: true },
    ajustes: { 0: '1', 2: '2', 3: '3', 6: '1' }
  },
  extremo: {
    es: 'Extremo (10 vidas)',
    en: 'Extreme (10 lives)',
    reglas: { regalos: true, variocolor: true, vidas: '10', nivelMax: true, sinObjetos: '0' },
    ajustes: { 2: '1', 3: '3' }
  },
  randomlocke: {
    es: 'Randomlocke',
    en: 'Randomlocke',
    reglas: { regalos: true, variocolor: true, gameover: true, randomlocke: true, entrenadoresAleatorios: true },
    ajustes: { 1: '0', 3: '3' }
  },
  libre: {
    es: 'A mi manera',
    en: 'My own rules',
    reglas: {},
    ajustes: {}
  }
}

export const leerReglas = (id) => {
  if (typeof window === 'undefined' || !id) return {}
  try {
    const r = JSON.parse(localStorage.getItem(clave(id)) || '{}') || {}
    // «Sin objetos en combate» era un sí/no: ahora es «Objetos en combate» con límite (true = prohibidos)
    if (r.sinObjetos === true) r.sinObjetos = '0'
    return r
  } catch {
    return {}
  }
}

export const guardarReglas = (id, reglas) => localStorage.setItem(clave(id), JSON.stringify(reglas))

export const aplicarAjustes = (ajustes = '', plantilla) => {
  const lista = (ajustes || '').split('')
  for (const [i, v] of Object.entries(PLANTILLAS[plantilla]?.ajustes || {})) lista[+i] = v
  return lista.map((x) => (x === undefined ? '0' : x)).join('')
}

// Recordatorios cortos para el asistente de combate
export const limiteObjetos = (reglas) => (reglas?.sinObjetos === true || reglas?.sinObjetos === '0' ? 0 : +reglas?.sinObjetos || null)
export const recordatorios = (reglas) =>
  [
    limiteObjetos(reglas) === 0 && (es() ? 'Sin objetos en combate' : 'No items in battle'),
    limiteObjetos(reglas) > 0 && (es() ? `Máx. ${limiteObjetos(reglas)} objeto${limiteObjetos(reglas) > 1 ? 's' : ''} por combate` : `Max ${limiteObjetos(reglas)} item${limiteObjetos(reglas) > 1 ? 's' : ''} per battle`),
    reglas.set && (es() ? 'Modo Set' : 'Set mode'),
    reglas.wedlocke && (es() ? 'Wedlocke: de cada pareja solo combate uno' : 'Wedlocke: only one of each pair fights'),
    reglas.nivelMax && (es() ? 'Nivel máximo obligatorio' : 'Hard level caps')
  ].filter(Boolean)

// Comprueba la run contra sus reglas y devuelve avisos
export const comprobarReglas = async ({ partida, resumen, liga, pokedex }) => {
  const reglas = leerReglas(partida?.id)
  const avisos = []
  if (!partida || !resumen) return avisos

  if (reglas.gameover && resumen.muertos.length && !resumen.vivos.length) {
    avisos.push({
      nivel: 'error',
      texto: es()
        ? 'Game over: no te queda ningún Pokémon vivo. Puedes empezar un nuevo intento desde el menú de la partida.'
        : 'Game over: no Pokémon left alive. Start a new attempt from the run menu.'
    })
  }

  if (reglas.nivelMax && resumen.siguienteJefe && liga) {
    const cap = ajustarNivel(nivelMaximo(liga[resumen.siguienteJefe.value]), reglas)
    let sav = null
    try {
      sav = JSON.parse(localStorage.getItem(claveSav(partida.id)) || 'null')
    } catch {}
    if (cap && sav?.equipo?.length) {
      const pasados = sav.equipo.filter((p) => p.nivel > cap)
      if (pasados.length)
        avisos.push({
          nivel: 'error',
          texto: es()
            ? `Nivel máximo ${cap} (${resumen.siguienteJefe.boss}): ${pasados.map((p) => `${p.mote} (Nv. ${p.nivel})`).join(', ')} lo ${pasados.length > 1 ? 'superan' : 'supera'}.`
            : `Level cap ${cap} (${resumen.siguienteJefe.boss}): ${pasados.map((p) => `${p.mote} (Lv. ${p.nivel})`).join(', ')} over the cap.`
        })
    } else if (cap && !sav) {
      avisos.push({
        nivel: 'info',
        texto: es()
          ? `Nivel máximo ${cap} para ${resumen.siguienteJefe.boss}. Importa tu .sav para que Lockedex vigile los niveles.`
          : `Level cap ${cap} for ${resumen.siguienteJefe.boss}. Import your .sav so Lockedex can watch levels.`
      })
    }
  }

  const capturados = resumen.encuentros.filter((e) => [1, 2, 3, 5, 6].includes(+e.status))

  if (reglas.sinLegendarios) {
    const esp = await especies()
    for (const e of capturados) {
      if (esp[clavePokemon(e.pokemon, esp)]?.l)
        avisos.push({
          nivel: 'aviso',
          lugares: [e.lugar],
          texto: es() ? `${e.lugar}: ${e.nickname || e.pokemon} es legendario o singular.` : `${e.lugar}: ${e.nickname || e.pokemon} is legendary or mythical.`
        })
    }
  }

  if (reglas.monotipo && pokedex) {
    for (const e of capturados) {
      const tipos = pokedex[norm(e.pokemon)]?.types || []
      if (tipos.length && !tipos.includes(reglas.monotipo))
        avisos.push({
          nivel: 'aviso',
          lugares: [e.lugar],
          texto: es()
            ? `${e.lugar}: ${e.nickname || e.pokemon} no es de tipo ${reglas.monotipo} (monotipo).`
            : `${e.lugar}: ${e.nickname || e.pokemon} is not ${reglas.monotipo} type (monotype).`
        })
    }
  }

  // Cláusula de especie: dos capturas de la misma línea evolutiva
  if (reglas.especie && pokedex) {
    const porLinea = {}
    for (const e of capturados) {
      const p = pokedex[norm(e.pokemon)]
      const linea = p?.evoline || p?.alias || norm(e.pokemon)
      ;(porLinea[linea] ||= []).push(e)
    }
    for (const lista of Object.values(porLinea))
      if (lista.length > 1)
        avisos.push({
          nivel: 'aviso',
          lugares: lista.map((e) => e.lugar),
          texto: es()
            ? `Cláusula de especie: ${lista.map((e) => `${e.nickname || e.pokemon} (${e.lugar})`).join(' y ')} son de la misma línea evolutiva.`
            : `Species clause: ${lista.map((e) => `${e.nickname || e.pokemon} (${e.lugar})`).join(' and ')} share an evolution line.`
        })
  }

  // Segundo encuentro en una zona: las filas extra («<lugar> · extra / variocolor / estático») solo valen
  // con su cláusula y si de verdad son un regalo, un shiny o un estático
  for (const e of capturados) {
    const m = String(e.lugar).match(/^(.*) · (extra|variocolor|estático)$/)
    if (!m) continue
    const [, base, tipo] = m
    const deLaZona = resumen.encuentros.filter((x) => traducirNombre(String(x.lugar)) === base || x.lugar === base)
    const nombre = e.nickname || e.pokemon
    let motivo = null
    if (tipo === 'extra') {
      if (!reglas.regalos) motivo = es() ? 'sin la cláusula de regalos' : 'without the gift clause'
      else if (+e.status !== 2 && !deLaZona.some((x) => +x.status === 2)) motivo = es() ? 'y ninguno de los dos es un regalo' : 'and neither is a gift'
    } else if (tipo === 'variocolor') {
      if (+e.status !== 6) motivo = es() ? 'por la cláusula variocolor, pero no está marcado como shiny' : 'under the shiny clause, but it is not marked shiny'
    } else if (!reglas.estaticos) motivo = es() ? 'sin la regla de estáticos aparte' : 'without the static clause'
    if (motivo)
      avisos.push({
        nivel: 'aviso',
        lugares: [e.lugar],
        texto: es() ? `Segundo encuentro en ${base} (${nombre}) ${motivo}.` : `Second encounter in ${base} (${nombre}) ${motivo}.`
      })
  }

  // Wedlocke: los del equipo sin pareja y los que se han quedado sin ella porque su pareja cayó
  if (reglas.wedlocke) {
    const parejas = leerParejas(partida.id)
    const VIVOS = [1, 2, 3, 6]
    const porLugar = Object.fromEntries(resumen.encuentros.map((e) => [e.lugar, e]))
    const nombre = (e) => e.nickname || e.pokemon
    const equipo = (partida.datos?.__team || []).map((l) => porLugar[l]).filter((e) => e && VIVOS.includes(+e.status))
    const solos = equipo.filter((e) => !parejaDe(parejas, e.lugar))
    if (solos.length)
      avisos.push({
        nivel: 'info',
        texto: es()
          ? `Wedlocke: ${solos.map(nombre).join(', ')} ${solos.length > 1 ? 'no tienen' : 'no tiene'} pareja (se elige en la Caja, en el detalle de cada Pokémon).`
          : `Wedlocke: ${solos.map(nombre).join(', ')} ${solos.length > 1 ? 'have' : 'has'} no partner (set it in the Box, in each Pokémon's details).`
      })
    for (const [a, b] of parejas) {
      const ea = porLugar[a], eb = porLugar[b]
      if (!ea || !eb) continue
      const [vivo, caido] = +ea.status === 5 && VIVOS.includes(+eb.status) ? [eb, ea] : +eb.status === 5 && VIVOS.includes(+ea.status) ? [ea, eb] : []
      if (vivo)
        avisos.push({
          nivel: 'info',
          texto: es()
            ? `Wedlocke: ${nombre(vivo)} se ha quedado sin pareja (${nombre(caido)} cayó). Puede emparejarse de nuevo en la Caja.`
            : `Wedlocke: ${nombre(vivo)} lost their partner (${nombre(caido)} fainted). They can pair up again in the Box.`
        })
    }
  }

  // Cláusula de regalos: recordar que el regalo no gasta el encuentro de la zona
  if (reglas.regalos) {
    const regalos = resumen.encuentros.filter((e) => +e.status === 2)
    // las filas extra se llaman «<lugar> · extra» (ver nombreExtra en pokemon-selector)
    const lugares = resumen.encuentros.map((e) => traducirNombre(String(e.lugar)))
    for (const e of regalos) {
      const base = traducirNombre(String(e.lugar))
      const tieneExtra = lugares.some((l) => l.startsWith(base + ' · '))
      if (!tieneExtra)
        avisos.push({
          nivel: 'info',
          texto: es()
            ? `${e.lugar}: ${e.nickname || e.pokemon} es un regalo, así que aún puedes tener tu encuentro de la zona (menú de la fila → «Encuentro extra»).`
            : `${e.lugar}: ${e.nickname || e.pokemon} is a gift, so you still get the area's encounter (row menu → «Extra encounter»).`
        })
    }
  }

  return avisos
}
