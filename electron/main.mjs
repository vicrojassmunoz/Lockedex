// Lockedex — tracker de Nuzlocke para escritorio
// Basado en la app web de nuzlocke-redux (código abierto, BSD-3). Guarda las
// partidas en un archivo en tu ordenador.

import { app, BrowserWindow, Menu, shell, dialog, ipcMain, globalShortcut, session, nativeImage } from 'electron'
import http from 'node:http'
import fs from 'node:fs'
import fsp from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const NOMBRE = 'Lockedex'
const NOMBRE_ANTERIOR = 'Nuzlocke Tracker'
const WEB_ORIGINAL = 'https://nuzlocke-redux.vercel.app/'
const PUERTO_PREFERIDO = 47135
const COPIAS_A_CONSERVAR = 30

app.setName(NOMBRE)

if (!app.requestSingleInstanceLock()) {
  app.quit()
  process.exit(0)
}

// ---------------------------------------------------------------------------
// Rutas de datos
// ---------------------------------------------------------------------------
const carpetaDatos = () => path.join(app.getPath('documents'), NOMBRE)
const archivoPartidas = () => path.join(carpetaDatos(), 'partidas.json')
const carpetaCopias = () => path.join(carpetaDatos(), 'Copias de seguridad')
const archivoVentana = () => path.join(app.getPath('userData'), 'ventana.json')

const asegurarCarpetas = () => {
  fs.mkdirSync(carpetaDatos(), { recursive: true })
  fs.mkdirSync(carpetaCopias(), { recursive: true })
}

// Trae las partidas de la versión anterior (Documentos\Nuzlocke Tracker)
const migrarDatosAnteriores = () => {
  const antigua = path.join(app.getPath('documents'), NOMBRE_ANTERIOR)
  const archivoAntiguo = path.join(antigua, 'partidas.json')
  if (fs.existsSync(archivoPartidas()) || !fs.existsSync(archivoAntiguo)) return
  asegurarCarpetas()
  fs.copyFileSync(archivoAntiguo, archivoPartidas())
  const copiasAntiguas = path.join(antigua, 'Copias de seguridad')
  if (fs.existsSync(copiasAntiguas)) {
    for (const f of fs.readdirSync(copiasAntiguas)) {
      const destino = path.join(carpetaCopias(), f)
      if (!fs.existsSync(destino)) fs.copyFileSync(path.join(copiasAntiguas, f), destino)
    }
  }
  fs.writeFileSync(
    path.join(antigua, 'LEEME - ahora en Lockedex.txt'),
    'Tus partidas se han copiado a Documentos\\Lockedex. Esta carpeta ya no se usa y puedes borrarla cuando quieras.\r\n'
  )
}

const fecha = (d = new Date()) => {
  const p = (n) => String(n).padStart(2, '0')
  return {
    dia: `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`,
    hora: `${p(d.getHours())}-${p(d.getMinutes())}-${p(d.getSeconds())}`
  }
}

const esEstadoValido = (texto) => {
  try {
    const datos = JSON.parse(texto)
    return !!datos && typeof datos.claves === 'object' && datos.claves !== null
  } catch {
    return false
  }
}

const copiasOrdenadas = () => {
  try {
    return fs
      .readdirSync(carpetaCopias())
      .filter((f) => f.startsWith('partidas-') && f.endsWith('.json'))
      .map((f) => path.join(carpetaCopias(), f))
      .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)
  } catch {
    return []
  }
}

const limpiarCopias = () => {
  const diarias = copiasOrdenadas().filter((f) =>
    /partidas-\d{4}-\d{2}-\d{2}\.json$/.test(f)
  )
  for (const viejo of diarias.slice(COPIAS_A_CONSERVAR)) {
    try {
      fs.unlinkSync(viejo)
    } catch {}
  }
}

// Una copia al día del archivo tal y como estaba antes del primer cambio del día
const copiaDiaria = () => {
  if (!fs.existsSync(archivoPartidas())) return
  const destino = path.join(carpetaCopias(), `partidas-${fecha().dia}.json`)
  if (fs.existsSync(destino)) return
  fs.copyFileSync(archivoPartidas(), destino)
  limpiarCopias()
}

const copiaManual = () => {
  if (!fs.existsSync(archivoPartidas())) return null
  const { dia, hora } = fecha()
  const destino = path.join(carpetaCopias(), `partidas-${dia}_${hora}.json`)
  fs.copyFileSync(archivoPartidas(), destino)
  return destino
}

const leerEstado = () => {
  const candidatos = [archivoPartidas(), ...copiasOrdenadas()]
  for (const archivo of candidatos) {
    try {
      const texto = fs.readFileSync(archivo, 'utf8')
      if (esEstadoValido(texto)) {
        if (archivo !== archivoPartidas()) {
          console.warn(`[escritorio] partidas.json dañado, usando ${archivo}`)
        }
        return texto
      }
    } catch {}
  }
  return null
}

let colaEscritura = Promise.resolve()
const escribirEstado = (texto) => {
  colaEscritura = colaEscritura.then(async () => {
    asegurarCarpetas()
    copiaDiaria()
    const tmp = archivoPartidas() + '.tmp'
    await fsp.writeFile(tmp, texto, 'utf8')
    await fsp.rename(tmp, archivoPartidas())
  })
  return colaEscritura
}

// ---------------------------------------------------------------------------
// Servidor local con la app web
// ---------------------------------------------------------------------------
const manejarEstado = (req, res) => {
  if (req.method === 'GET') {
    const texto = leerEstado()
    if (!texto) {
      res.writeHead(204, { 'Cache-Control': 'no-store' })
      return res.end()
    }
    res.writeHead(200, {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store'
    })
    return res.end(texto)
  }

  if (req.method === 'POST') {
    const trozos = []
    let tam = 0
    req.on('data', (c) => {
      tam += c.length
      if (tam > 200 * 1024 * 1024) req.destroy()
      else trozos.push(c)
    })
    req.on('end', async () => {
      const texto = Buffer.concat(trozos).toString('utf8')
      if (!esEstadoValido(texto)) {
        res.writeHead(400)
        return res.end('Datos no válidos')
      }
      try {
        await escribirEstado(texto)
        res.writeHead(204)
        res.end()
      } catch (e) {
        console.error('[escritorio] Error al guardar', e)
        res.writeHead(500)
        res.end(String(e))
      }
    })
    return
  }

  res.writeHead(405)
  res.end()
}

const escuchar = (servidor, puerto) =>
  new Promise((resolve, reject) => {
    servidor.once('error', reject)
    servidor.listen(puerto, '127.0.0.1', () => {
      servidor.off('error', reject)
      resolve(servidor.address().port)
    })
  })

// Todo se sirve en local, así que no se guarda nada en caché: tras una actualización
// la caché del navegador podía mezclar trozos de la versión anterior con la nueva.
const sinCache = (res) => {
  const poner = res.setHeader.bind(res)
  res.setHeader = (clave, valor) =>
    poner(clave, String(clave).toLowerCase() === 'cache-control' ? 'no-cache' : valor)
  const escribir = res.writeHead.bind(res)
  res.writeHead = (codigo, ...resto) => {
    for (const h of resto) {
      if (!h || typeof h !== 'object' || Array.isArray(h)) continue
      for (const k of Object.keys(h)) if (k.toLowerCase() === 'cache-control') h[k] = 'no-cache'
    }
    return escribir(codigo, ...resto)
  }
}

const limpiarCaches = async () => {
  try {
    await session.defaultSession.clearCache()
    await session.defaultSession.clearStorageData({ storages: ['serviceworkers', 'cachestorage'] })
  } catch (e) {
    registrar('No se pudo limpiar la caché', e)
  }
}

const arrancarServidor = async () => {
  let manejador = null
  const servidor = http.createServer((req, res) => {
    if (req.url.startsWith('/__escritorio/estado')) return manejarEstado(req, res)
    sinCache(res)
    if (!manejador) {
      res.writeHead(503)
      return res.end('Cargando…')
    }
    manejador(req, res, () => {
      res.writeHead(404)
      res.end('No encontrado')
    })
  })

  let puerto
  try {
    puerto = await escuchar(servidor, PUERTO_PREFERIDO)
  } catch {
    puerto = await escuchar(servidor, 0)
  }

  const origen = `http://127.0.0.1:${puerto}`
  process.env.ORIGIN = origen
  const { handler } = await import(
    pathToFileURL(path.join(__dirname, 'app', 'handler.js')).href
  )
  manejador = handler
  return origen
}

// ---------------------------------------------------------------------------
// Ventanas
// ---------------------------------------------------------------------------
let ventana = null
let compacto = null
let origen = null

const ROJO = '#dc0a2d'
const ALTO_BARRA = 52

app.userAgentFallback = `${app.userAgentFallback} Lockedex/${app.getVersion()}`

const archivoConfig = () => path.join(app.getPath('userData'), 'config.json')
const leerConfig = () => {
  try {
    return JSON.parse(fs.readFileSync(archivoConfig(), 'utf8'))
  } catch {
    return {}
  }
}
const guardarConfig = (cambios) => {
  try {
    const c = { ...leerConfig(), ...cambios }
    fs.mkdirSync(path.dirname(archivoConfig()), { recursive: true })
    fs.writeFileSync(archivoConfig(), JSON.stringify(c, null, 2))
  } catch {}
}

const leerEstadoVentana = () => leerConfig().ventana || { width: 1280, height: 860 }

const guardarEstadoVentana = () => {
  if (!ventana || ventana.isDestroyed()) return
  guardarConfig({ ventana: { ...ventana.getNormalBounds(), maximizada: ventana.isMaximized() } })
}

const esInterna = (url) => {
  try {
    return new URL(url).origin === origen
  } catch {
    return false
  }
}

const guardarDesdeVentana = async (v = ventana) => {
  if (!v || v.isDestroyed()) return
  try {
    const r = await Promise.race([
      v.webContents.executeJavaScript('window.__escritorioGuardar ? window.__escritorioGuardar() : true'),
      new Promise((r) => setTimeout(() => r('tiempo agotado'), 3000))
    ])
    await colaEscritura
    if (process.env.NUZ_DEBUG) console.log('[escritorio] guardado al cerrar:', r)
  } catch (e) {
    if (process.env.NUZ_DEBUG) console.log('[escritorio] fallo al guardar al cerrar', e)
  }
}

const opcionesWeb = (extra = []) => ({
  contextIsolation: true,
  nodeIntegration: false,
  sandbox: true,
  spellcheck: false,
  preload: path.join(__dirname, 'preload.cjs'),
  additionalArguments: [`--lx-version=${app.getVersion()}`, ...extra]
})

const protegerNavegacion = (v) => {
  v.webContents.setWindowOpenHandler(({ url }) => {
    if (esInterna(url)) return { action: 'allow' }
    if (/^https?:/.test(url)) shell.openExternal(url)
    return { action: 'deny' }
  })
  v.webContents.on('will-navigate', (e, url) => {
    if (esInterna(url)) return
    e.preventDefault()
    if (/^https?:/.test(url)) shell.openExternal(url)
  })
  v.on('page-title-updated', (e) => e.preventDefault())
}

const crearVentana = () => {
  const estado = leerEstadoVentana()
  ventana = new BrowserWindow({
    x: estado.x,
    y: estado.y,
    width: estado.width || 1280,
    height: estado.height || 860,
    minWidth: 520,
    minHeight: 500,
    title: NOMBRE,
    icon: path.join(__dirname, 'icono.png'),
    backgroundColor: ROJO,
    titleBarStyle: 'hidden',
    titleBarOverlay: { color: ROJO, symbolColor: '#ffffff', height: ALTO_BARRA - 4 },
    show: false,
    webPreferences: opcionesWeb()
  })
  if (estado.maximizada) ventana.maximize()
  if (process.env.NUZ_DEBUG) globalThis.__ventana = ventana

  ventana.once('ready-to-show', () => ventana.show())
  protegerNavegacion(ventana)
  vigilarErrores(ventana, 'ventana')

  let cerrando = false
  ventana.on('close', async (e) => {
    guardarEstadoVentana()
    if (cerrando) return
    e.preventDefault()
    await guardarDesdeVentana()
    cerrando = true
    if (compacto && !compacto.isDestroyed()) compacto.destroy()
    ventana.close()
  })

  // Prueba de arranque (la usa la compilación automática en Windows)
  if (process.argv.includes('--prueba-arranque')) {
    const fallo = setTimeout(() => app.exit(2), 60000)
    ventana.webContents.once('did-finish-load', async () => {
      await new Promise((r) => setTimeout(r, 4000))
      const ok = await ventana.webContents
        .executeJavaScript("!!document.querySelector('.lx-barra') && !!localStorage.getItem('nuzlocke.user')")
        .catch(() => false)
      clearTimeout(fallo)
      console.log(ok ? 'PRUEBA_ARRANQUE_OK' : 'PRUEBA_ARRANQUE_FALLO')
      app.exit(ok ? 0 : 1)
    })
  }

  ventana.loadURL(origen + '/')
}

// Modo compacto: ventanita siempre encima con tu equipo y el próximo jefe
const alternarCompacto = () => {
  if (compacto && !compacto.isDestroyed()) {
    compacto.close()
    return
  }
  const c = leerConfig().compacto || {}
  compacto = new BrowserWindow({
    x: c.x,
    y: c.y,
    width: c.width || 340,
    height: c.height || 600,
    minWidth: 280,
    minHeight: 260,
    title: `${NOMBRE} · compacto`,
    icon: path.join(__dirname, 'icono.png'),
    backgroundColor: ROJO,
    alwaysOnTop: true,
    titleBarStyle: 'hidden',
    titleBarOverlay: { color: ROJO, symbolColor: '#ffffff', height: 34 },
    skipTaskbar: false,
    webPreferences: opcionesWeb(['--lx-compacto'])
  })
  compacto.setAlwaysOnTop(true, 'floating')
  protegerNavegacion(compacto)
  vigilarErrores(compacto, 'compacto')
  compacto.on('close', () => {
    if (!compacto.isDestroyed()) guardarConfig({ compacto: compacto.getBounds() })
  })
  compacto.on('closed', () => (compacto = null))
  compacto.loadURL(origen + '/compacto')
}

const enfocarPrincipal = () => {
  if (!ventana || ventana.isDestroyed()) return
  if (ventana.isMinimized()) ventana.restore()
  ventana.show()
  ventana.focus()
}

// ---------------------------------------------------------------------------
// Copias de seguridad y diálogos
// ---------------------------------------------------------------------------
const restaurarCopia = async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog(ventana, {
    title: 'Restaurar copia de seguridad',
    defaultPath: carpetaCopias(),
    filters: [{ name: 'Partidas', extensions: ['json'] }],
    properties: ['openFile']
  })
  if (canceled || !filePaths[0]) return

  const texto = fs.readFileSync(filePaths[0], 'utf8')
  if (!esEstadoValido(texto)) {
    return dialog.showMessageBox(ventana, {
      type: 'error',
      title: 'Archivo no válido',
      message: 'Ese archivo no es una copia de seguridad de Lockedex.'
    })
  }

  const { response } = await dialog.showMessageBox(ventana, {
    type: 'warning',
    buttons: ['Restaurar', 'Cancelar'],
    defaultId: 1,
    cancelId: 1,
    title: 'Restaurar copia de seguridad',
    message: '¿Sustituir tus partidas actuales por esta copia?',
    detail: 'Antes de restaurar se guardará una copia de tus partidas actuales en la carpeta de copias de seguridad.'
  })
  if (response !== 0) return

  await guardarDesdeVentana()
  copiaManual()
  const datos = JSON.parse(texto)
  datos.claves['__escritorio.rev'] = String(Date.now())
  if (compacto && !compacto.isDestroyed()) compacto.close()
  await ventana.loadURL('about:blank')
  await escribirEstado(JSON.stringify(datos))
  ventana.loadURL(origen + '/')
}

const hacerCopia = async () => {
  await guardarDesdeVentana()
  const destino = copiaManual()
  dialog.showMessageBox(ventana, {
    type: destino ? 'info' : 'warning',
    title: 'Copia de seguridad',
    message: destino ? 'Copia de seguridad guardada.' : 'Todavía no hay partidas que copiar.',
    detail: destino || ''
  })
}

const acercaDe = () =>
  dialog.showMessageBox(ventana, {
    type: 'none',
    icon: nativeImage.createFromPath(path.join(__dirname, 'icono.png')).resize({ width: 64, height: 64 }),
    title: `Acerca de ${NOMBRE}`,
    message: `${NOMBRE} · v${app.getVersion()}`,
    detail: [
      'Tu Pokédex para Nuzlockes.',
      '',
      'Basado en nuzlocke-redux (nuzlocke-redux.vercel.app), creado por domtronn',
      'y mantenido por Bassel-T, con licencia BSD-3. Datos de movimientos y',
      'nombres en español: PokeAPI.',
      '',
      'Tus partidas se guardan en:',
      archivoPartidas(),
      '',
      'Atajos: Ctrl+Alt+L modo compacto · Ctrl+Alt+K traer Lockedex al frente',
      '',
      'Lockedex no envía estadísticas ni usa Google Analytics.',
      'Pokémon y sus nombres son marcas de Nintendo, Creatures Inc. y GAME FREAK inc.'
    ].join('\n')
  })

// ---------------------------------------------------------------------------
// Registro de errores (Documentos\Lockedex\registro-de-errores.txt)
// ---------------------------------------------------------------------------
const archivoRegistro = () => path.join(carpetaDatos(), 'registro-de-errores.txt')
const registrar = (origenTexto, mensaje) => {
  try {
    asegurarCarpetas()
    const linea = `[${new Date().toISOString()}] v${app.getVersion()} ${origenTexto}: ${String(mensaje).slice(0, 2000)}\r\n`
    const ruta = archivoRegistro()
    if (fs.existsSync(ruta) && fs.statSync(ruta).size > 512 * 1024) {
      const texto = fs.readFileSync(ruta, 'utf8')
      fs.writeFileSync(ruta, texto.slice(texto.length / 2))
    }
    fs.appendFileSync(ruta, linea)
  } catch {}
}
process.on('uncaughtException', (e) => registrar('principal', e?.stack || e))
process.on('unhandledRejection', (e) => registrar('principal', e?.stack || e))

const vigilarErrores = (v, nombre) => {
  v.webContents.on('console-message', (e, nivel, mensaje, linea, fuente) => {
    const lvl = e?.level ?? nivel
    const msg = e?.message ?? mensaje
    if (lvl === 'error' || lvl === 3) registrar(nombre, `${msg} (${e?.sourceId ?? fuente ?? ''}:${e?.lineNumber ?? linea ?? ''})`)
  })
  v.webContents.on('render-process-gone', (_e, d) => registrar(nombre, `la ventana se cerró de golpe: ${d?.reason}`))
  v.webContents.on('did-fail-load', (_e, codigo, desc, url) => registrar(nombre, `no cargó ${url}: ${codigo} ${desc}`))
}

// ---------------------------------------------------------------------------
// Partida del emulador (.sav)
// ---------------------------------------------------------------------------
let savVigilado = null
const EXT_SAV = ['sav', 'srm', 'sa1', 'sa2', 'dsv', 'fla']

const leerSav = (ruta) => {
  const datos = fs.readFileSync(ruta)
  return { ruta, nombre: path.basename(ruta), fecha: fs.statSync(ruta).mtimeMs, datos: new Uint8Array(datos) }
}

ipcMain.handle('lx:elegir-sav', async (e) => {
  const v = BrowserWindow.fromWebContents(e.sender)
  const { canceled, filePaths } = await dialog.showOpenDialog(v, {
    title: 'Elige la partida de tu emulador',
    defaultPath: leerConfig().carpetaSav || app.getPath('documents'),
    filters: [
      { name: 'Partidas de emulador', extensions: EXT_SAV },
      { name: 'Todos los archivos', extensions: ['*'] }
    ],
    properties: ['openFile']
  })
  if (canceled || !filePaths[0]) return null
  guardarConfig({ carpetaSav: path.dirname(filePaths[0]) })
  return leerSav(filePaths[0])
})

ipcMain.handle('lx:leer-sav', (_e, ruta) => {
  try {
    return leerSav(ruta)
  } catch {
    return null
  }
})

// Escribir una partida modificada (huevos del Egglocke). Antes, una copia de seguridad al lado del
// original. Si el archivo ha cambiado desde que se leyó (el emulador guardó mientras tanto), no se toca.
ipcMain.handle('lx:escribir-sav', async (_e, { ruta, datos, fechaLeida }) => {
  try {
    if (!ruta || !fs.existsSync(ruta)) return { ok: false, motivo: 'no-existe' }
    const actual = fs.statSync(ruta)
    if (fechaLeida && Math.abs(actual.mtimeMs - fechaLeida) > 1) return { ok: false, motivo: 'cambiado' }
    const sello = new Date().toISOString().replace(/[-:]/g, '').replace('T', '-').slice(0, 15)
    const copia = path.join(path.dirname(ruta), `${path.basename(ruta)}.antes-de-lockedex-${sello}.bak`)
    await fsp.copyFile(ruta, copia)
    const temporal = ruta + '.lockedex-tmp'
    await fsp.writeFile(temporal, Buffer.from(datos))
    await fsp.rename(temporal, ruta)
    return { ok: true, copia, nombreCopia: path.basename(copia), fecha: fs.statSync(ruta).mtimeMs }
  } catch (e) {
    return { ok: false, motivo: 'error', detalle: String(e?.message || e) }
  }
})

// ---------------------------------------------------------------------------
// Randomizer: la ROM del usuario (.gba) se lee y la aleatorizada se guarda AL LADO, con otro nombre.
// La original no se toca nunca.
// ---------------------------------------------------------------------------
ipcMain.handle('lx:elegir-rom', async (e) => {
  // Solo para las pruebas automáticas (con NUZ_DEBUG): una ROM fija en vez del diálogo
  if (process.env.NUZ_DEBUG && process.env.LOCKEDEX_ROM_PRUEBA && fs.existsSync(process.env.LOCKEDEX_ROM_PRUEBA)) {
    const r = process.env.LOCKEDEX_ROM_PRUEBA
    return { ruta: r, nombre: path.basename(r), tamano: fs.statSync(r).size, datos: new Uint8Array(fs.readFileSync(r)) }
  }
  const v = BrowserWindow.fromWebContents(e.sender)
  const { canceled, filePaths } = await dialog.showOpenDialog(v, {
    title: 'Elige tu ROM de la 3.ª generación',
    defaultPath: leerConfig().carpetaRom || leerConfig().carpetaSav || app.getPath('documents'),
    filters: [
      { name: 'ROM de Game Boy Advance', extensions: ['gba'] },
      { name: 'Todos los archivos', extensions: ['*'] }
    ],
    properties: ['openFile']
  })
  if (canceled || !filePaths[0]) return null
  const ruta = filePaths[0]
  const st = fs.statSync(ruta)
  if (st.size > 32 * 1024 * 1024) return { ruta, nombre: path.basename(ruta), error: 'grande' }
  guardarConfig({ carpetaRom: path.dirname(ruta) })
  return { ruta, nombre: path.basename(ruta), tamano: st.size, datos: new Uint8Array(fs.readFileSync(ruta)) }
})

ipcMain.handle('lx:guardar-rom-aleatoria', async (_e, { rutaOriginal, datos, sufijo, registroTexto }) => {
  try {
    if (!rutaOriginal || !fs.existsSync(rutaOriginal)) return { ok: false, motivo: 'no-existe' }
    const dir = path.dirname(rutaOriginal)
    const base = path.basename(rutaOriginal, path.extname(rutaOriginal))
    const limpio = String(sufijo || 'aleatoria').replace(/[\\/:*?"<>|]/g, '').slice(0, 40)
    let destino = path.join(dir, `${base} (Lockedex ${limpio}).gba`)
    for (let n = 2; fs.existsSync(destino) && n < 100; n++) destino = path.join(dir, `${base} (Lockedex ${limpio} ${n}).gba`)
    if (path.resolve(destino) === path.resolve(rutaOriginal)) return { ok: false, motivo: 'misma' }
    await fsp.writeFile(destino, Buffer.from(datos))
    let registro = null
    if (registroTexto) {
      registro = destino.replace(/\.gba$/i, '.log.txt')
      await fsp.writeFile(registro, registroTexto, 'utf8')
    }
    return { ok: true, ruta: destino, nombre: path.basename(destino), registro: registro && path.basename(registro) }
  } catch (e) {
    return { ok: false, motivo: 'error', detalle: String(e?.message || e) }
  }
})

ipcMain.handle('lx:mostrar-archivo', (_e, ruta) => {
  if (ruta && fs.existsSync(ruta)) shell.showItemInFolder(ruta)
  return true
})

ipcMain.handle('lx:vigilar-sav', (_e, ruta) => {
  if (savVigilado) fs.unwatchFile(savVigilado)
  savVigilado = null
  if (!ruta || !fs.existsSync(ruta)) return false
  savVigilado = ruta
  fs.watchFile(ruta, { interval: 1500 }, (actual, anterior) => {
    if (actual.mtimeMs === anterior.mtimeMs) return
    for (const v of BrowserWindow.getAllWindows()) v.webContents.send('lx:sav-cambiado', ruta)
  })
  return true
})

// ---------------------------------------------------------------------------
// Actualizaciones automáticas (GitHub Releases)
// ---------------------------------------------------------------------------
let estadoActualizacion = null
let actualizador = null
let busquedaManual = false

const avisarActualizacion = (estado) => {
  estadoActualizacion = { ...estado, manual: busquedaManual }
  for (const v of BrowserWindow.getAllWindows()) v.webContents.send('lx:actualizacion', estadoActualizacion)
  if (['al-dia', 'error', 'lista'].includes(estado.estado)) busquedaManual = false
}

const mb = (bytes) => `${(bytes / 1048576).toFixed(0)} MB`

const prepararActualizaciones = async () => {
  if (!app.isPackaged || !fs.existsSync(path.join(process.resourcesPath, 'app-update.yml'))) return
  try {
    const { default: eu } = await import('electron-updater')
    actualizador = eu.autoUpdater
    actualizador.autoDownload = true
    // Registro del actualizador: ahí se ve si la descarga es diferencial («Download block maps»,
    // «Full: … To download: …») o si ha tenido que bajar el instalador entero
    actualizador.logger = {
      info: (m) => registrar('actualizaciones', m),
      warn: (m) => registrar('actualizaciones', m),
      error: (m) => registrar('actualizaciones', m),
      debug: () => {}
    }
    actualizador.autoInstallOnAppQuit = true
    actualizador.on('checking-for-update', () => avisarActualizacion({ estado: 'buscando' }))
    actualizador.on('update-available', (i) => avisarActualizacion({ estado: 'descargando', version: i.version, progreso: 0 }))
    actualizador.on('update-not-available', () => avisarActualizacion({ estado: 'al-dia' }))
    actualizador.on('download-progress', (p) =>
      avisarActualizacion({
        estado: 'descargando',
        version: estadoActualizacion?.version,
        progreso: Math.round(p.percent),
        mb: `${mb(p.transferred)} de ${mb(p.total)}`,
        velocidad: `${(p.bytesPerSecond / 1048576).toFixed(1)} MB/s`
      })
    )
    actualizador.on('update-downloaded', (i) => avisarActualizacion({ estado: 'lista', version: i.version }))
    actualizador.on('error', (e) => {
      registrar('actualizaciones', e?.stack || e)
      avisarActualizacion({ estado: 'error', mensaje: String(e?.message || e) })
    })
    setTimeout(() => actualizador.checkForUpdates().catch(() => {}), 8000)
    setInterval(() => actualizador.checkForUpdates().catch(() => {}), 4 * 60 * 60 * 1000)
  } catch (e) {
    registrar('actualizaciones', e?.stack || e)
  }
}

ipcMain.handle('lx:estado-actualizacion', () => estadoActualizacion)
if (process.env.NUZ_DEBUG) globalThis.__avisar = avisarActualizacion

const buscarActualizacion = async () => {
  busquedaManual = true
  if (!actualizador) return avisarActualizacion({ estado: 'no-disponible' })
  // Si ya está descargando o lista, se vuelve a enseñar ese estado
  if (['descargando', 'lista'].includes(estadoActualizacion?.estado)) return avisarActualizacion(estadoActualizacion)
  try {
    await actualizador.checkForUpdates()
  } catch (e) {
    avisarActualizacion({ estado: 'error', mensaje: String(e?.message || e) })
  }
}

const instalarActualizacion = async () => {
  if (!actualizador) return
  avisarActualizacion({ estado: 'instalando', version: estadoActualizacion?.version })
  await guardarDesdeVentana()
  if (compacto && !compacto.isDestroyed()) await guardarDesdeVentana(compacto)
  // Instalador visible (con su barra de progreso) y Lockedex se vuelve a abrir al terminar
  setTimeout(() => actualizador.quitAndInstall(false, true), 600)
}

// ---------------------------------------------------------------------------
// Acciones pedidas desde la ventana
// ---------------------------------------------------------------------------
// El modo compacto no escribe la partida directamente: la ventana principal tiene los datos
// en memoria y los sobrescribiría. Le reenviamos la acción para que la aplique ella.
ipcMain.handle('lx:accion-partida', async (_e, datos) => {
  if (!ventana || ventana.isDestroyed()) return { ok: false, motivo: 'sin-ventana' }
  ventana.webContents.send('lx:accion-partida', datos)
  return { ok: true }
})

ipcMain.handle('lx:accion', async (_e, nombre) => {
  switch (nombre) {
    case 'copia':
      return hacerCopia()
    case 'restaurar':
      return restaurarCopia()
    case 'carpeta':
      asegurarCarpetas()
      return shell.openPath(carpetaDatos())
    case 'acerca':
      return acercaDe()
    case 'compacto':
      return alternarCompacto()
    case 'principal':
      return enfocarPrincipal()
    case 'buscar-actualizacion':
      return buscarActualizacion()
    case 'instalar-actualizacion':
      return instalarActualizacion()
    case 'web-original':
      return shell.openExternal(WEB_ORIGINAL)
    case 'registro':
      if (!fs.existsSync(archivoRegistro())) registrar('info', 'registro creado (todavía no hay errores)')
      return shell.openPath(archivoRegistro())
    case 'devtools':
      return ventana?.webContents.toggleDevTools()
  }
})

// Menú oculto: solo mantiene los atajos de teclado habituales
const construirMenu = () => {
  const plantilla = [
    {
      label: 'Lockedex',
      submenu: [
        { label: 'Copia de seguridad', accelerator: 'CmdOrCtrl+S', click: hacerCopia },
        { label: 'Recargar', role: 'reload' },
        { label: 'Atrás', accelerator: 'Alt+Left', click: () => ventana?.webContents.navigationHistory.goBack() },
        { label: 'Aumentar zoom', role: 'zoomIn', accelerator: 'CmdOrCtrl+=' },
        { label: 'Reducir zoom', role: 'zoomOut' },
        { label: 'Tamaño original', role: 'resetZoom' },
        { label: 'Pantalla completa', role: 'togglefullscreen' },
        { label: 'Herramientas de desarrollo', role: 'toggleDevTools' },
        { label: 'Salir', role: 'quit' }
      ]
    }
  ]
  Menu.setApplicationMenu(Menu.buildFromTemplate(plantilla))
}

// ---------------------------------------------------------------------------
// Arranque
// ---------------------------------------------------------------------------
app.on('second-instance', enfocarPrincipal)
app.on('window-all-closed', () => app.quit())
app.on('will-quit', () => globalShortcut.unregisterAll())

app.whenReady().then(async () => {
  try {
    migrarDatosAnteriores()
    asegurarCarpetas()
    await limpiarCaches()
    origen = await arrancarServidor()
    construirMenu()
    crearVentana()
    globalShortcut.register('CommandOrControl+Alt+L', alternarCompacto)
    globalShortcut.register('CommandOrControl+Alt+K', enfocarPrincipal)
    prepararActualizaciones()
  } catch (e) {
    dialog.showErrorBox(NOMBRE, `No se pudo arrancar Lockedex:\n\n${e?.stack || e}`)
    app.quit()
  }
})
