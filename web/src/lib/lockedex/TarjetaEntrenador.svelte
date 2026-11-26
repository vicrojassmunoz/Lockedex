<script>
  // Ficha de entrenador para compartir: una imagen PNG con tu equipo, medallas, caídos y reglas,
  // dibujada en un canvas a píxeles (como la tarjeta de entrenador de RojoFuego)
  import { onMount, getContext } from 'svelte'
  import Games from '$lib/data/games.json'
  import { leerPartida, cargarRutas, resumirPartida } from './partida.js'
  import { leerReglas, PLANTILLAS, REGLAS } from './reglas.js'
  import { leerSavGuardado } from './equipo.js'
  import { leerEstado } from './derrotas.js'
  import { leerSalon, miembrosConSprite } from './salon.js'
  import { nombreJuego } from './juegos.js'
  import { createImgUrl } from '$utils/rewrites'
  import { t, idioma, traducirNombre } from './idioma.js'

  export let id = ''
  // Entrada del Salón de la Fama: si se pasa, la ficha enseña el equipo que venció al Campeón
  export let entrada = null

  const { close } = getContext('simple-modal')
  const S = 2 // cada píxel de la «consola» son 2×2 en la imagen
  const W = 300
  const H = 200
  const es = idioma() === 'es'

  let lienzo
  let url = ''
  let estado = 'cargando'
  let aviso = ''

  // Colores de la tarjeta: azul en curso, oro si eres Campeón, cobre si la run acabó en game over
  const COLORES = {
    curso: { fondo: '#78b0f0', franja: '#3868c0', claro: '#a8d0f8', tinta: '#183058' },
    campeon: { fondo: '#f0d068', franja: '#b88820', claro: '#f8e8a0', tinta: '#584010' },
    fin: { fondo: '#e09868', franja: '#a85830', claro: '#f0c0a0', tinta: '#502010' }
  }
  // Hojas de medallas sacadas de las tarjetas de entrenador de los juegos (8 de 16×16)
  const HOJAS = { kanto: '/lx/medallas/kanto.png', johto: '/lx/medallas/johto.png', hoenn: '/lx/medallas/hoenn.png' }

  const cargarImg = (src) =>
    new Promise((ok) => {
      const i = new Image()
      i.onload = () => ok(i)
      i.onerror = () => ok(null)
      i.src = src
    })

  const mayus = (x) => String(x || '').toUpperCase()

  const reunirDatos = async () => {
    const p = leerPartida(id)
    if (!p) throw new Error('sin run')
    const rutas = await cargarRutas(p.info?.lid)
    const resumen = resumirPartida(p, Array.isArray(rutas) ? rutas : [])
    const sav = leerSavGuardado(id)
    let perfil = {}
    try {
      perfil = JSON.parse(localStorage.getItem('lockedex.perfil') || '{}') || {}
    } catch {}
    const reglas = leerReglas(id)
    const fin = leerEstado(id).fin
    const salon = entrada || leerSalon().find((e) => e.clave === `${id}#${p.intentos}`)
    const lugaresEquipo = salon ? salon.equipo.map((m) => ({ lugar: m.lugar, sprite: m.alias })) : resumen.equipo.map((e) => ({ lugar: e.lugar, sprite: e.pokemon }))
    const equipo = salon?.equipo?.length ? salon.equipo : await miembrosConSprite(lugaresEquipo, p.datos, sav)
    const plantilla = PLANTILLAS[reglas.plantilla]
    const activas = REGLAS.filter((r) => reglas[r.id] && reglas[r.id] !== '').length
    // por número de medalla, no por el orden de la lista (en RojoFuego Sabrina, la 6, va antes que Koga, la 5)
    const orden = (j) => (/^\d+$/.test(String(j.value)) ? +j.value : 1000 + j.indice)
    const gimnasios = resumen.jefes.filter((j) => j.group === 'gym-leader').sort((a, b) => orden(a) - orden(b))
    return {
      nombre: sav?.entrenador?.nombre || perfil.nombre || t('ENTRENADOR', 'TRAINER'),
      avatar: perfil.avatar || 'rs-may',
      run: p.nombre,
      juego: nombreJuego(p.juego, Games[p.juego]),
      region: Games[p.juego]?.region,
      intento: p.intentos,
      capturas: resumen.encuentros.filter((e) => [1, 2, 3, 5, 6].includes(+e.status)).length,
      caidos: resumen.muertos.length,
      tiempo: sav?.entrenador?.horas != null ? `${sav.entrenador.horas}:${String(sav.entrenador.minutos || 0).padStart(2, '0')}` : null,
      dias: Math.max(1, Math.round((Date.now() - p.creada) / 86400000)),
      reglas: plantilla && reglas.plantilla !== 'libre' ? (es ? plantilla.es : plantilla.en) : activas ? t(`${activas} reglas`, `${activas} rules`) : t('Sin reglas', 'No rules'),
      equipo,
      medallas: gimnasios.slice(0, 8).map((j) => !!j.pasado),
      tipo: salon || resumen.campeon ? 'campeon' : fin ? 'fin' : 'curso'
    }
  }

  // Recuadro de esquinas escalonadas, como los de los menús de GBA
  const caja = (ctx, x, y, w, h, relleno, borde, r = 2) => {
    const pasos = { 1: [1], 2: [2, 1], 3: [3, 1, 1], 4: [4, 2, 1, 1] }[r] || []
    ctx.fillStyle = borde
    for (let f = 0; f < h; f++) {
      const s = f < pasos.length ? pasos[f] : h - 1 - f < pasos.length ? pasos[h - 1 - f] : 0
      ctx.fillRect((x + s) * S, (y + f) * S, (w - 2 * s) * S, S)
    }
    ctx.fillStyle = relleno
    for (let f = 1; f < h - 1; f++) {
      const s = f - 1 < pasos.length ? pasos[f - 1] : h - 2 - f < pasos.length ? pasos[h - 2 - f] : 0
      ctx.fillRect((x + 1 + s) * S, (y + f) * S, (w - 2 - 2 * s) * S, S)
    }
  }
  const texto = (ctx, s, x, y, color, { alinear = 'left', sombra = null, max = null } = {}) => {
    ctx.textAlign = alinear
    ctx.textBaseline = 'top'
    let cad = String(s)
    if (max) while (cad.length > 1 && ctx.measureText(cad).width > max * S) cad = cad.slice(0, -2) + '…'
    if (sombra) {
      ctx.fillStyle = sombra
      ctx.fillText(cad, (x + 1) * S, (y + 1) * S)
    }
    ctx.fillStyle = color
    ctx.fillText(cad, x * S, y * S)
  }
  // Medalla genérica (para las regiones sin hoja de medallas): octógono dorado o hueco
  const medallaGenerica = (ctx, x, y, tiene, c) => {
    const filas = [[5, 6], [3, 10], [2, 12], [1, 14], [1, 14], [0, 16], [0, 16], [0, 16], [0, 16], [0, 16], [0, 16], [1, 14], [1, 14], [2, 12], [3, 10], [5, 6]]
    filas.forEach(([s, w], f) => {
      ctx.fillStyle = tiene ? (f < 6 ? '#f8e070' : '#d8a830') : c.franja
      ctx.globalAlpha = tiene ? 1 : 0.45
      ctx.fillRect((x + s) * S, (y + f) * S, w * S, S)
    })
    ctx.globalAlpha = 1
  }

  const dibujar = async (d) => {
    await document.fonts.load(`${12 * S}px "LX Pixel"`).catch(() => {})
    const ctx = lienzo.getContext('2d')
    ctx.imageSmoothingEnabled = false
    ctx.clearRect(0, 0, W * S, H * S)
    ctx.font = `${12 * S}px "LX Pixel", monospace`
    const c = COLORES[d.tipo]

    // Tarjeta y franjas diagonales del fondo
    caja(ctx, 0, 0, W, H, c.fondo, c.tinta, 4)
    ctx.save()
    ctx.beginPath()
    ctx.rect(2 * S, 2 * S, (W - 4) * S, (H - 4) * S)
    ctx.clip()
    ctx.fillStyle = c.claro
    for (let x = -H; x < W; x += 24) {
      ctx.beginPath()
      ctx.moveTo((x + 0) * S, H * S)
      ctx.lineTo((x + 8) * S, H * S)
      ctx.lineTo((x + 8 + H) * S, 0)
      ctx.lineTo((x + H) * S, 0)
      ctx.fill()
    }
    ctx.restore()

    // Cabecera
    caja(ctx, 4, 4, W - 8, 20, c.franja, c.tinta, 2)
    texto(ctx, t('FICHA DE ENTRENADOR', 'TRAINER CARD'), 12, 8, '#f8f8f8', { sombra: c.tinta })
    texto(ctx, 'LOCKEDEX', W - 12, 8, c.claro, { alinear: 'right', sombra: c.tinta })

    // Datos
    caja(ctx, 6, 28, 206, 92, '#f8f8f8', c.tinta, 2)
    const filas = [
      [t('NOMBRE', 'NAME'), mayus(d.nombre)],
      ['RUN', d.run],
      [t('JUEGO', 'GAME'), d.juego],
      [t('INTENTO', 'ATTEMPT'), d.intento],
      [t('CAPTURAS', 'CATCHES'), `${d.capturas}   ${t('CAÍDOS', 'FAINTED')} ${d.caidos}`],
      [t('TIEMPO', 'TIME'), d.tiempo || t(`${d.dias} día${d.dias > 1 ? 's' : ''}`, `${d.dias} day${d.dias > 1 ? 's' : ''}`)],
      [t('REGLAS', 'RULES'), d.reglas]
    ]
    filas.forEach(([k, v], i) => {
      const y = 32 + i * 12
      texto(ctx, k, 12, y, '#707880')
      texto(ctx, v, 80, y, '#283038', { max: 126 })
    })

    // Avatar
    caja(ctx, 216, 28, 78, 62, c.claro, c.tinta, 2)
    const av = await cargarImg(`/assets/img/leaders/${d.avatar}.png`)
    if (av) ctx.drawImage(av, (216 + 3) * S, (28 + 5) * S, 72 * S, 52 * S)
    // Sello del estado de la run
    const sello = { campeon: t('CAMPEÓN', 'CHAMPION'), fin: 'GAME OVER', curso: t('EN CURSO', 'ONGOING') }[d.tipo]
    caja(ctx, 216, 94, 78, 26, c.franja, c.tinta, 2)
    texto(ctx, sello, 255, 101, '#f8f8f8', { alinear: 'center', sombra: c.tinta })

    // Equipo
    caja(ctx, 6, 124, W - 12, 48, c.claro, c.tinta, 2)
    const [tabla, ...sprites] = await Promise.all([
      fetch('/lx/sprites-recorte.json').then((r) => r.json()).catch(() => ({})),
      ...d.equipo.slice(0, 6).map((m) => cargarImg(createImgUrl({ imgId: m.imgId }, { ext: 'png' })))
    ])
    const n6 = Math.min(6, d.equipo.length)
    d.equipo.slice(0, 6).forEach((m, i) => {
      const cx = Math.round(W / 2 - (n6 * 47) / 2 + i * 47 + 23)
      const img = sprites[i]
      if (img) {
        const r = img.naturalWidth === 96 ? tabla[String(m.imgId)] : null
        const [x, , lado, ys] = r || [0, 0, img.naturalWidth, 0]
        const y = r ? ys ?? r[1] : 0
        const dst = 34
        ctx.drawImage(img, x, y, lado, lado, (cx - dst / 2) * S, 126 * S, dst * S, dst * S)
      }
      texto(ctx, m.nivel ? `${t('Nv', 'Lv')}${m.nivel}` : m.mote || traducirNombre(m.nombre || m.alias), cx, 159, c.tinta, { alinear: 'center', max: 45 })
    })
    if (!d.equipo.length) texto(ctx, t('Sin equipo todavía', 'No team yet'), W / 2, 142, c.tinta, { alinear: 'center' })

    // Medallas
    const hoja = HOJAS[d.region] ? await cargarImg(HOJAS[d.region]) : null
    const n = Math.max(8, d.medallas.length)
    for (let i = 0; i < Math.min(n, 8); i++) {
      const x = 12 + i * 20
      const y = 178
      const tiene = !!d.medallas[i]
      if (hoja) {
        ctx.globalAlpha = tiene ? 1 : 0.22
        ctx.drawImage(hoja, i * 16, 0, 16, 16, x * S, y * S, 16 * S, 16 * S)
        ctx.globalAlpha = 1
      } else medallaGenerica(ctx, x, y, tiene, c)
    }
    const fecha = new Date(entrada?.fecha || Date.now()).toLocaleDateString(es ? 'es-ES' : 'en-GB')
    texto(ctx, fecha, W - 12, 181, c.tinta, { alinear: 'right' })

    url = lienzo.toDataURL('image/png')
  }

  onMount(async () => {
    try {
      const d = await reunirDatos()
      await dibujar(d)
      estado = 'lista'
    } catch (e) {
      console.error('[ficha]', e)
      estado = 'error'
    }
  })

  const nombreArchivo = () => `lockedex-ficha-${new Date().toISOString().slice(0, 10)}.png`
  const copiar = async () => {
    try {
      const blob = await new Promise((ok) => lienzo.toBlob(ok, 'image/png'))
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
      aviso = t('¡Copiada! Pégala donde quieras', 'Copied! Paste it anywhere')
    } catch {
      aviso = t('No se pudo copiar: usa «Guardar PNG»', 'Could not copy: use «Save PNG»')
    }
    setTimeout(() => (aviso = ''), 2500)
  }
</script>

<section class="lx-ficha" data-lx-original>
  <header>
    <h2>{t('Ficha de entrenador', 'Trainer card')}</h2>
    <button class="lx-ficha-x" on:click={close} aria-label={t('Cerrar', 'Close')}>✕</button>
  </header>
  <div class="lx-ficha-lienzo">
    <canvas bind:this={lienzo} width={W * S} height={H * S} class:lx-oculto={estado !== 'lista'} />
    {#if estado === 'cargando'}<p>{t('Dibujando la ficha…', 'Drawing the card…')}</p>{/if}
    {#if estado === 'error'}<p>{t('No se pudo dibujar la ficha de esta run.', 'Could not draw the card for this run.')}</p>{/if}
  </div>
  <footer>
    <span class="lx-ficha-aviso">{aviso}</span>
    <button on:click={copiar} disabled={estado !== 'lista'}>{t('Copiar imagen', 'Copy image')}</button>
    <a class="lx-ficha-boton" class:lx-desactivado={estado !== 'lista'} href={url || undefined} download={nombreArchivo()}>{t('Guardar PNG', 'Save PNG')}</a>
  </footer>
</section>

<style>
  .lx-ficha {
    width: min(660px, calc(100vw - 32px));
    background: #f8f8f8;
    color: #283038;
    border: 4px solid #283850;
    border-radius: 12px;
    box-shadow: 6px 6px 0 rgba(0, 0, 0, 0.4);
    font-family: 'LX Pixel', 'VT323', monospace;
  }
  :global(.dark) .lx-ficha {
    background: #1c2430;
    color: #e8eef5;
  }
  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 14px;
    background: #3868c0;
    color: #fff;
    border-radius: 7px 7px 0 0;
  }
  h2 {
    font-size: 24px;
    line-height: 24px;
    text-shadow: 2px 2px 0 #183058;
  }
  .lx-ficha-x {
    font-size: 18px;
    padding: 0 6px;
  }
  .lx-ficha-lienzo {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 200px;
    padding: 14px;
  }
  canvas {
    width: 100%;
    max-width: 600px;
    height: auto;
    image-rendering: pixelated;
  }
  .lx-oculto {
    display: none;
  }
  footer {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 10px;
    padding: 0 14px 14px;
    font-size: 12px;
  }
  .lx-ficha-aviso {
    margin-right: auto;
    color: #3868c0;
  }
  footer button,
  .lx-ficha-boton {
    padding: 4px 14px;
    color: #fff;
    background: #3868c0;
    box-shadow: inset 0 -2px 0 #183058;
    clip-path: polygon(2px 0, calc(100% - 2px) 0, 100% 2px, 100% calc(100% - 2px), calc(100% - 2px) 100%, 2px 100%, 0 calc(100% - 2px), 0 2px);
  }
  footer button:hover,
  .lx-ficha-boton:hover {
    background: #4880d8;
  }
  footer button:disabled,
  .lx-desactivado {
    opacity: 0.5;
    pointer-events: none;
  }
</style>
