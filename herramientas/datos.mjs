#!/usr/bin/env node
// Base de datos propia de Lockedex.
//
// La fuente de verdad son los archivos de `datos/` (legibles y fáciles de revisar en un diff).
// Este script los compila a los formatos que ya usa la app y los valida.
//
//   node herramientas/datos.mjs compilar    datos/ → web/src/lib/data/*.json
//   node herramientas/datos.mjs comprobar   valida datos/ y que la app esté al día (lo usa GitHub Actions)
//   node herramientas/datos.mjs extraer     (una sola vez) app → datos/, para empezar la migración
//
// Sin dependencias: solo Node.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DATOS = path.join(RAIZ, 'datos')
const APP = path.join(RAIZ, 'web', 'src', 'lib', 'data')
const POKEDEX = path.join(RAIZ, 'web', 'src', 'routes', 'api', 'pokemon.json', '_pokemon.json')
const MOVIMIENTOS = path.join(RAIZ, 'web', 'static', 'lx', 'movimientos.json')

// Colecciones: cada clave del JSON de la app es un archivo en datos/<carpeta>/<clave>.json
const COLECCIONES = [
  { carpeta: 'rutas', app: 'routes.json', compacto: true },
  { carpeta: 'jefes', app: 'league.json', compacto: true },
  { carpeta: 'parches', app: 'patches.json', compacto: true }
]
// Archivos sueltos: se copian tal cual (con formato legible en datos/)
const SUELTOS = [
  { datos: 'juegos.json', app: 'games.json', compacto: false },
  { datos: 'entrenadores.json', app: 'trainers.json', compacto: false }
]

// ---------------------------------------------------------------------------
// Formato legible: listas de valores simples en una línea, objetos planos en una línea
// si caben, y el resto indentado. Así cada ruta, jefe o Pokémon ocupa una línea en el diff.
const simple = (v) => v === null || typeof v !== 'object'
const plano = (v) =>
  !simple(v) && Object.values(v).every((x) => simple(x) || (Array.isArray(x) && x.every(simple)))

const formatear = (v, nivel = 0) => {
  const sangria = '  '.repeat(nivel)
  const dentro = '  '.repeat(nivel + 1)
  if (simple(v)) return JSON.stringify(v)
  if (Array.isArray(v)) {
    if (!v.length) return '[]'
    if (v.every(simple)) return '[' + v.map((x) => JSON.stringify(x)).join(', ') + ']'
    return '[\n' + v.map((x) => dentro + formatear(x, nivel + 1)).join(',\n') + '\n' + sangria + ']'
  }
  const claves = Object.keys(v)
  if (!claves.length) return '{}'
  if (plano(v)) {
    const linea = '{ ' + claves.map((k) => JSON.stringify(k) + ': ' + formatear(v[k])).join(', ') + ' }'
    if (linea.length + sangria.length <= 160) return linea
  }
  return '{\n' + claves.map((k) => dentro + JSON.stringify(k) + ': ' + formatear(v[k], nivel + 1)).join(',\n') + '\n' + sangria + '}'
}

const leer = (archivo) => JSON.parse(fs.readFileSync(archivo, 'utf8'))
const escribir = (archivo, texto) => {
  fs.mkdirSync(path.dirname(archivo), { recursive: true })
  fs.writeFileSync(archivo, texto)
}
const serializarApp = (obj, compacto) => (compacto ? JSON.stringify(obj) : JSON.stringify(obj, null, 2)) + '\n'

// ---------------------------------------------------------------------------
// extraer: app → datos (punto de partida de la migración)
const extraer = () => {
  const indice = {}
  for (const c of COLECCIONES) {
    const obj = leer(path.join(APP, c.app))
    indice[c.carpeta] = Object.keys(obj)
    for (const [clave, valor] of Object.entries(obj)) {
      escribir(path.join(DATOS, c.carpeta, `${clave}.json`), formatear(valor) + '\n')
    }
  }
  for (const s of SUELTOS) escribir(path.join(DATOS, s.datos), formatear(leer(path.join(APP, s.app))) + '\n')
  escribir(path.join(DATOS, 'indice.json'), formatear(indice) + '\n')
  console.log('Extraído a datos/')
}

// ---------------------------------------------------------------------------
// compilar: datos → objetos de la app (en memoria)
const compilarEnMemoria = () => {
  const indice = fs.existsSync(path.join(DATOS, 'indice.json')) ? leer(path.join(DATOS, 'indice.json')) : {}
  const salida = {}
  const errores = []
  for (const c of COLECCIONES) {
    const dir = path.join(DATOS, c.carpeta)
    const archivos = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith('.json')) : []
    const claves = archivos.map((f) => f.slice(0, -5))
    // Mismo orden que el índice; lo nuevo va al final por orden alfabético
    const orden = (indice[c.carpeta] || []).filter((k) => claves.includes(k))
    for (const k of claves.sort()) if (!orden.includes(k)) orden.push(k)
    const obj = {}
    for (const k of orden) {
      try {
        obj[k] = leer(path.join(dir, `${k}.json`))
      } catch (e) {
        errores.push(`datos/${c.carpeta}/${k}.json no es JSON válido: ${e.message}`)
      }
    }
    salida[c.app] = { obj, compacto: c.compacto }
  }
  for (const s of SUELTOS) {
    try {
      salida[s.app] = { obj: leer(path.join(DATOS, s.datos)), compacto: s.compacto }
    } catch (e) {
      errores.push(`datos/${s.datos} no es JSON válido: ${e.message}`)
    }
  }
  return { salida, errores }
}

const compilar = () => {
  const { salida, errores } = compilarEnMemoria()
  if (errores.length) return fallar(errores)
  for (const [archivo, { obj, compacto }] of Object.entries(salida)) escribir(path.join(APP, archivo), serializarApp(obj, compacto))
  console.log(`Compilado: ${Object.keys(salida).join(', ')}`)
}

// ---------------------------------------------------------------------------
// Validación
const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[^a-z0-9]/g, '')

const validar = (salida) => {
  const errores = []
  const avisos = []
  const juegos = salida['games.json'].obj
  const rutas = salida['routes.json'].obj
  const jefes = salida['league.json'].obj
  const parches = salida['patches.json'].obj

  const especies = new Set()
  for (const p of leer(POKEDEX)) for (const k of [p.alias, p.sprite, p.name, p.evoline]) if (k) especies.add(norm(k))
  const movimientos = new Set(Object.keys(leer(MOVIMIENTOS)).map(norm))

  // Juegos
  for (const [clave, j] of Object.entries(juegos)) {
    for (const campo of ['pid', 'lid', 'title', 'gen', 'logo']) {
      if (!j[campo]) errores.push(`juegos.json › ${clave}: falta «${campo}»`)
    }
    if (j.pid && j.pid !== clave) errores.push(`juegos.json › ${clave}: pid «${j.pid}» no coincide con la clave`)
    if (j.patchId && !parches[j.patchId]) avisos.push(`juegos.json › ${clave}: no hay datos/parches/${j.patchId}.json`)
    const tieneRutas = rutas[clave] || rutas[j.lid] || Object.keys(rutas).some((k) => k.startsWith(clave))
    if (j.supported !== false && !tieneRutas) avisos.push(`juegos.json › ${clave}: no hay rutas`)
  }

  // Pokémon propios de cada ROM hack (formas regionales, fakemon…) que vienen en su parche
  const especiesParche = (patchId) => {
    const pt = parches[patchId] || {}
    return new Set([...Object.keys(pt.pokemon || {}), ...Object.keys(pt.fakemon || {})].map(norm))
  }
  const patchDeRutas = (clave) => {
    const j = juegos[clave] || Object.values(juegos).find((x) => clave.startsWith(x.pid) || x.lid === clave)
    return j?.patchId
  }
  const conocida = (nombre, extra) => especies.has(norm(nombre)) || extra.has(norm(nombre))

  // Rutas
  const desconocidas = new Map()
  for (const [clave, lista] of Object.entries(rutas)) {
    const extra = especiesParche(patchDeRutas(clave))
    if (!Array.isArray(lista)) {
      errores.push(`rutas/${clave}.json: debe ser una lista`)
      continue
    }
    lista.forEach((it, i) => {
      const donde = `rutas/${clave}.json › #${i + 1}${it?.name ? ` (${it.name})` : ''}`
      if (!it || typeof it !== 'object') return errores.push(`${donde}: no es un objeto`)
      if (!['route', 'gym'].includes(it.type)) errores.push(`${donde}: «type» debe ser "route" o "gym"`)
      if (typeof it.name !== 'string' || !it.name) errores.push(`${donde}: falta «name»`)
      if (it.type === 'route' && it.encounters !== undefined) {
        if (!Array.isArray(it.encounters) || !it.encounters.every((e) => typeof e === 'string'))
          errores.push(`${donde}: «encounters» debe ser una lista de nombres`)
        else
          for (const e of it.encounters)
            if (!conocida(e, extra)) desconocidas.set(e, (desconocidas.get(e) || new Set()).add(clave))
      }
      if (it.type === 'gym') {
        if (it.value === undefined || it.value === '') errores.push(`${donde}: falta «value» (id del jefe)`)
        if (!it.group) avisos.push(`${donde}: jefe sin «group» (se muestra sin categoría)`)
      }
    })
  }
  for (const [e, donde] of desconocidas)
    avisos.push(`Pokémon desconocido en rutas: «${e}» (${[...donde].slice(0, 4).join(', ')}${donde.size > 4 ? '…' : ''})`)

  // Jefes
  const patchDe = Object.fromEntries(Object.values(juegos).map((j) => [j.lid, j.patchId]))
  const movsDesconocidos = new Map()
  const espDesconocidas = new Map()
  for (const [lid, grupo] of Object.entries(jefes)) {
    const movsParche = new Set(Object.keys(parches[patchDe[lid]]?.move || {}).map(norm))
    const extra = especiesParche(patchDe[lid])
    for (const [id, jefe] of Object.entries(grupo || {})) {
      const donde = `jefes/${lid}.json › ${id}`
      if (!jefe?.name) errores.push(`${donde}: falta «name»`)
      if (!Array.isArray(jefe?.pokemon)) {
        errores.push(`${donde}: «pokemon» debe ser una lista`)
        continue
      }
      jefe.pokemon.forEach((p, i) => {
        const d = `${donde} › Pokémon ${i + 1}`
        if (typeof p?.name !== 'string' || !p.name) return errores.push(`${d}: falta «name»`)
        if (p.level === undefined || p.level === '' || isNaN(+p.level)) errores.push(`${d} (${p.name}): «level» no es un número`)
        if (!Array.isArray(p.moves)) errores.push(`${d} (${p.name}): «moves» debe ser una lista`)
        if (!conocida(p.name, extra)) espDesconocidas.set(p.name, (espDesconocidas.get(p.name) || new Set()).add(lid))
        for (const m of p.moves || []) {
          const n = norm(typeof m === 'string' ? m : m?.name)
          if (n && !n.startsWith('hiddenpower') && !movimientos.has(n) && !movsParche.has(n))
            movsDesconocidos.set(m, (movsDesconocidos.get(m) || new Set()).add(lid))
        }
      })
    }
  }
  for (const [e, donde] of espDesconocidas) avisos.push(`Pokémon desconocido en jefes: «${e}» (${[...donde].join(', ')})`)
  for (const [m, donde] of movsDesconocidos) avisos.push(`Movimiento desconocido en jefes: «${m}» (${[...donde].join(', ')})`)

  return { errores, avisos }
}

const fallar = (errores) => {
  console.error(`✖ ${errores.length} error(es) en datos/:`)
  for (const e of errores.slice(0, 200)) console.error('  - ' + e)
  process.exit(1)
}

const comprobar = () => {
  const { salida, errores: deLectura } = compilarEnMemoria()
  if (deLectura.length) return fallar(deLectura)
  const { errores, avisos } = validar(salida)

  // La app tiene que estar compilada desde datos/
  for (const [archivo, { obj, compacto }] of Object.entries(salida)) {
    // En Windows git puede convertir los saltos de línea a CRLF: se comparan sin ellos
    const actual = fs.existsSync(path.join(APP, archivo)) ? fs.readFileSync(path.join(APP, archivo), 'utf8').replace(/\r\n/g, '\n') : ''
    if (actual !== serializarApp(obj, compacto))
      errores.push(`web/src/lib/data/${archivo} no está al día con datos/: ejecuta «node herramientas/datos.mjs compilar»`)
  }

  if (avisos.length) {
    console.log(`⚠ ${avisos.length} aviso(s) (no bloquean):`)
    for (const a of avisos.slice(0, process.env.TODOS ? 9999 : 60)) console.log('  - ' + a)
    if (!process.env.TODOS && avisos.length > 60) console.log(`  … y ${avisos.length - 60} más`)
  }
  if (errores.length) return fallar(errores)
  const n = (k) => Object.keys(salida[k].obj).length
  console.log(`✔ datos/ correcto: ${n('games.json')} juegos, ${n('routes.json')} listas de rutas, ${n('league.json')} ligas de jefes, ${n('patches.json')} parches`)
}

const orden = process.argv[2]
if (orden === 'extraer') extraer()
else if (orden === 'compilar') compilar()
else if (orden === 'comprobar') comprobar()
else {
  console.log('Uso: node herramientas/datos.mjs <compilar|comprobar|extraer>')
  process.exit(2)
}
