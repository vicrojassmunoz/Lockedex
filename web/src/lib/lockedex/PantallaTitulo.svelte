<script>
  // Pantalla de título, como el menú de inicio de Esmeralda: CONTINUAR con la tarjeta de la run activa
  // (entrenador, juego, tiempo, capturas y medallas), NUEVA PARTIDA y OPCIONES. Las demás runs van debajo
  // como cartuchos: al pulsar uno pasa a ser la run activa y se abre. Se maneja con flechas e Intro.
  import { onMount, getContext } from 'svelte'
  import { goto } from '$app/navigation'
  import { PIcon } from '$c/core'
  import Games from '$lib/data/games.json'
  import { theme } from '$lib/store'
  import { leerPartidas, leerPartida, cargarRutas, resumirPartida, alCambiarDatos } from './partida.js'
  import { leerSavGuardado } from './equipo.js'
  import { leerEstado } from './derrotas.js'
  import { nombreJuego } from './juegos.js'
  import { marco } from './gba.js'
  import { t, idioma, cambiarIdioma } from './idioma.js'

  const { open } = getContext('simple-modal')
  const es = idioma() === 'es'
  const lx = typeof window !== 'undefined' ? window.lockedex : null

  // Hojas de medallas de las tarjetas de entrenador de los juegos (8 de 16×16 en fila)
  const HOJAS = { kanto: '/lx/medallas/kanto.png', johto: '/lx/medallas/johto.png', hoenn: '/lx/medallas/hoenn.png' }
  // Color de la etiqueta de cada cartucho (el de la caja del juego); si no está, el de su región
  const ETIQUETA = {
    red: '#d83830', blue: '#3060c8', yel: '#f0c020', gold: '#d0a030', silv: '#a8b0c0', crys: '#58b8e0',
    ruby: '#c82838', saph: '#2850b8', em: '#30a060', fr: '#e05828', lg: '#60b040', hg: '#e0a828', ss: '#b8c0d0',
    d: '#5878d8', p: '#d890b0', pt: '#8890a0', bl: '#383840', wh: '#e8e8e8', bl2: '#303038', wh2: '#f0f0f0',
    x: '#3068c0', y: '#c83040', or: '#c02830', as: '#2858c0', sun: '#f09020', moon: '#5848b0', usun: '#f07020',
    umoon: '#4838a0', sw: '#3890e0', sh: '#d84868', bd: '#4878e0', sp: '#d880b0', sc: '#e04838', vi: '#8048c0'
  }
  const REGION = { kanto: '#d84830', johto: '#d0a030', hoenn: '#30a060', sinnoh: '#5878d8', unova: '#505058', kalos: '#3068c0', alola: '#f09020', galar: '#3890e0', paldea: '#c84040' }
  const colorEtiqueta = (j) => ETIQUETA[j] || REGION[Games[j]?.region] || '#7888a0'
  const logo = (j) => (Games[j]?.logo ? `/assets/img/logos/${Games[j].logo}-small.png` : null)

  const MARCOS = {
    ventana: marco({ tinta: '#384870', fondo: '#f0f4f8', luz: '#ffffff', sombra: '#c8d4e0', r: 3 }),
    elegida: marco({ tinta: '#e05030', fondo: '#f8f8f8', luz: '#ffffff', sombra: '#f0d0c0', r: 3 }),
    mini: marco({ tinta: '#384870', fondo: '#f8f8f8', luz: '#ffffff', sombra: '#c8d0d8', r: 1 })
  }

  let partidas = []
  let activa = null
  let cargando = true

  const contar = (datos) => {
    const e = Object.entries(datos || {}).filter(([k, v]) => !k.startsWith('__') && v?.pokemon)
    return {
      capturas: e.filter(([, v]) => [1, 2, 3, 5, 6].includes(+v.status)).length,
      caidos: e.filter(([, v]) => +v.status === 5).length
    }
  }
  const fecha = (ms) => (ms ? new Date(ms).toLocaleDateString(es ? 'es-ES' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '')

  const cargar = async () => {
    const id = localStorage.getItem('nuzlocke')
    partidas = leerPartidas()
      .filter((p) => p.id && p.juego)
      .sort((a, b) => b.actualizada - a.actualizada)
      .map((p) => ({ ...p, ...contar(leerPartida(p.id)?.datos) }))
    const p = id ? leerPartida(id) : null
    if (!p) {
      activa = null
      cargando = false
      return
    }
    const rutas = await cargarRutas(p.info?.lid)
    const resumen = resumirPartida(p, Array.isArray(rutas) ? rutas : [])
    const sav = leerSavGuardado(id)
    let perfil = {}
    try {
      perfil = JSON.parse(localStorage.getItem('lockedex.perfil') || '{}') || {}
    } catch {}
    // por número de medalla, no por el orden de la lista (en RojoFuego Sabrina, la 6, va antes que Koga, la 5)
    const orden = (j) => (/^\d+$/.test(String(j.value)) ? +j.value : 1000 + j.indice)
    const gimnasios = resumen.jefes.filter((j) => j.group === 'gym-leader').sort((a, b) => orden(a) - orden(b))
    activa = {
      ...p,
      entrenador: sav?.entrenador?.nombre || perfil.nombre || t('ENTRENADOR', 'TRAINER'),
      tiempo: sav?.entrenador?.horas != null ? `${sav.entrenador.horas}:${String(sav.entrenador.minutos || 0).padStart(2, '0')}` : null,
      dias: Math.max(1, Math.round((Date.now() - p.creada) / 86400000)),
      ...contar(p.datos),
      equipo: resumen.equipo.map((e) => e.pokemon),
      medallas: gimnasios.slice(0, 8).map((j) => !!j.pasado),
      region: Games[p.juego]?.region,
      campeon: resumen.campeon,
      fin: !!leerEstado(id).fin
    }
    cargando = false
  }
  onMount(() => {
    cargar()
    return alCambiarDatos(() => cargar())
  })

  $: otras = partidas.filter((p) => p.id !== activa?.id)

  // Menú: CONTINUAR (si hay run), NUEVA PARTIDA y OPCIONES
  let vista = 'menu' // 'menu' | 'opciones'
  let sel = 0
  $: OPCIONES = [...(activa ? ['continuar'] : []), 'nueva', 'opciones']
  $: if (sel > OPCIONES.length - 1) sel = 0

  // Al cambiar de ventana, lo que queda bajo el ratón no se elige solo (el navegador manda un «mouseenter»
  // aunque no se mueva)
  let cambio = 0
  const alPasar = (f) => () => Date.now() - cambio > 400 && f()
  const elegir = (o) => {
    if (o === 'continuar') goto('/game')
    else if (o === 'nueva') goto('/new')
    else {
      vista = 'opciones'
      fila = 0
      cambio = Date.now()
    }
  }
  const volver = () => {
    vista = 'menu'
    cambio = Date.now()
  }
  const abrirCartucho = (p) => {
    localStorage.setItem('nuzlocke', p.id)
    // recarga completa: el resto de la app lee la run activa al arrancar
    location.href = '/game'
  }

  // OPCIONES, como la pantalla del juego: cada fila con ◀ valor ▶ o una acción
  let fila = 0
  $: oscuro = $theme === 'dark'
  const ponerTema = (osc) => {
    document.documentElement.classList.remove('greenscreen')
    theme.set(osc ? 'dark' : 'light')
    document.documentElement.classList.toggle('dark', osc)
  }
  const abrirAjustes = () => import('$lib/components/Settings').then((m) => open(m.Modal))
  $: FILAS = [
    { id: 'idioma', etq: t('IDIOMA', 'LANGUAGE'), valor: es ? 'ESPAÑOL' : 'ENGLISH', mover: () => cambiarIdioma(es ? 'en' : 'es') },
    { id: 'tema', etq: t('TEMA', 'THEME'), valor: oscuro ? t('OSCURO', 'DARK') : t('CLARO', 'LIGHT'), mover: () => ponerTema(!oscuro) },
    ...(activa ? [{ id: 'reglas', etq: t('REGLAS Y AJUSTES', 'RULES & SETTINGS'), accion: t('ABRIR', 'OPEN'), hacer: abrirAjustes, nota: activa.nombre }] : []),
    ...(lx ? [{ id: 'copia', etq: t('COPIA DE SEGURIDAD', 'BACKUP'), accion: t('HACER', 'BACK UP'), hacer: () => lx.accion('copia') }] : []),
    { id: 'salir', etq: t('SALIR', 'CANCEL'), hacer: volver }
  ]

  const teclas = (e) => {
    if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(e.target?.tagName) || document.querySelector('[role="dialog"]')) return
    const k = e.key
    let hecho = true
    if (vista === 'menu') {
      if (k === 'ArrowUp') sel = (sel + OPCIONES.length - 1) % OPCIONES.length
      else if (k === 'ArrowDown') sel = (sel + 1) % OPCIONES.length
      else if (k === 'Enter') elegir(OPCIONES[sel])
      else hecho = false
    } else {
      const f = FILAS[fila]
      if (k === 'ArrowUp') fila = (fila + FILAS.length - 1) % FILAS.length
      else if (k === 'ArrowDown') fila = (fila + 1) % FILAS.length
      else if ((k === 'ArrowLeft' || k === 'ArrowRight') && f.mover) f.mover()
      else if (k === 'Enter') (f.hacer || f.mover)?.()
      else if (k === 'Escape' || k === 'Backspace') volver()
      else hecho = false
    }
    if (hecho) e.preventDefault()
  }
</script>

<svelte:window on:keydown={teclas} />

<div class="lx-tit" data-lx-original>
  <h1 aria-level="1" class="lx-logo">
    <span class="lx-logo-pantalla lx-lcd">
      <img class="lx-logo-icono" src="/lx/icono.svg" alt="" width="92" height="92" />
      <span class="lx-logo-textos">
        <span class="lx-logo-texto">LOCKEDEX</span>
        <span class="lx-logo-sub">{t('Tu Pokédex para Nuzlockes', 'Your Nuzlocke Pokédex')}</span>
      </span>
    </span>
  </h1>

  {#if vista === 'menu'}
    <nav class="lx-tit-menu" aria-label={t('Menú principal', 'Main menu')}>
      {#if activa}
        <button
          class="lx-tit-ventana lx-tit-continuar"
          class:lx-tit-sel={OPCIONES[sel] === 'continuar'}
          style={OPCIONES[sel] === 'continuar' ? MARCOS.elegida : MARCOS.ventana}
          on:mouseenter={alPasar(() => (sel = OPCIONES.indexOf('continuar')))}
          on:click={() => elegir('continuar')}
        >
          <span class="lx-tit-titulo">
            {t('CONTINUAR', 'CONTINUE')}
            {#if activa.campeon}<small class="lx-tit-sello lx-tit-campeon">{t('CAMPEÓN', 'CHAMPION')}</small>
            {:else if activa.fin}<small class="lx-tit-sello lx-tit-fin">GAME OVER</small>{/if}
          </span>
          <span class="lx-tit-run">
            {#if logo(activa.juego)}<img src={logo(activa.juego)} alt={nombreJuego(activa.juego, Games[activa.juego])} />{/if}
            <span>{activa.nombre}{activa.intentos > 1 ? ` · ${t('intento', 'attempt')} ${activa.intentos}` : ''}</span>
          </span>
          <span class="lx-tit-datos">
            <span class="lx-tit-etq">{t('JUGADOR', 'PLAYER')}</span><span class="lx-tit-valor lx-tit-azul">{activa.entrenador}</span>
            <span class="lx-tit-etq">{t('TIEMPO', 'TIME')}</span>
            <span class="lx-tit-valor" title={activa.tiempo ? t('Tiempo de juego según tu .sav', 'Play time from your .sav') : t('Días desde que creaste la run', 'Days since you created the run')}>
              {activa.tiempo || (es ? `${activa.dias} ${activa.dias === 1 ? 'día' : 'días'}` : `${activa.dias} day${activa.dias === 1 ? '' : 's'}`)}
            </span>
            <span class="lx-tit-etq">{t('CAPTURAS', 'CAUGHT')}</span>
            <span class="lx-tit-valor">{activa.capturas}{#if activa.caidos}<small class="lx-tit-caidos">{' · ✝ '}{activa.caidos}</small>{/if}</span>
            <span class="lx-tit-etq">{t('MEDALLAS', 'BADGES')}</span>
            <span class="lx-tit-valor lx-tit-medallas">
              {#each activa.medallas as tiene, i}
                {#if HOJAS[activa.region]}
                  <span class="lx-tit-medalla" class:lx-tit-sin={!tiene} style="background-image:url({HOJAS[activa.region]});background-position:-{i * 24}px 0" />
                {:else}
                  <span class="lx-tit-medalla lx-tit-generica" class:lx-tit-sin={!tiene} />
                {/if}
              {:else}
                0
              {/each}
            </span>
          </span>
          {#if activa.equipo.length}
            <span class="lx-tit-equipo" aria-hidden="true">
              {#each activa.equipo as p, i}
                <span class="lx-tit-bota" style="--retraso:{(5 * ((i * 11) % 7)) / 10}s"><PIcon name={p} /></span>
              {/each}
            </span>
          {/if}
        </button>
      {/if}
      <button
        class="lx-tit-ventana"
        class:lx-tit-sel={OPCIONES[sel] === 'nueva'}
        style={OPCIONES[sel] === 'nueva' ? MARCOS.elegida : MARCOS.ventana}
        on:mouseenter={alPasar(() => (sel = OPCIONES.indexOf('nueva')))}
        on:click={() => elegir('nueva')}
      >
        <span class="lx-tit-titulo">{t('NUEVA PARTIDA', 'NEW GAME')}</span>
      </button>
      <button
        class="lx-tit-ventana"
        class:lx-tit-sel={OPCIONES[sel] === 'opciones'}
        style={OPCIONES[sel] === 'opciones' ? MARCOS.elegida : MARCOS.ventana}
        on:mouseenter={alPasar(() => (sel = OPCIONES.indexOf('opciones')))}
        on:click={() => elegir('opciones')}
      >
        <span class="lx-tit-titulo">{t('OPCIONES', 'OPTIONS')}</span>
      </button>
    </nav>
  {:else}
    <section class="lx-tit-ventana lx-tit-opciones" style={MARCOS.ventana} aria-label={t('Opciones', 'Options')}>
      <span class="lx-tit-titulo">{t('OPCIONES', 'OPTIONS')}</span>
      <ul>
        {#each FILAS as f, i (f.id)}
          <li class:lx-tit-fila-sel={fila === i} on:mouseenter={alPasar(() => (fila = i))}>
            <span class="lx-tit-cursor" aria-hidden="true">{fila === i ? '▶' : ''}</span>
            {#if f.mover}
              <span class="lx-tit-etq">{f.etq}</span>
              <span class="lx-tit-cambiar">
                <button style={MARCOS.mini} on:click={f.mover} aria-label={t('Cambiar', 'Change')}>◀</button>
                <b>{f.valor}</b>
                <button style={MARCOS.mini} on:click={f.mover} aria-label={t('Cambiar', 'Change')}>▶</button>
              </span>
            {:else if f.accion}
              <span class="lx-tit-etq">{f.etq}{#if f.nota}<small>{' · '}{f.nota}</small>{/if}</span>
              <button class="lx-tit-accion" style={MARCOS.mini} on:click={f.hacer}>{f.accion}</button>
            {:else}
              <button class="lx-tit-etq lx-tit-salir" on:click={f.hacer}>{f.etq}</button>
            {/if}
          </li>
        {/each}
      </ul>
    </section>
  {/if}

  {#if otras.length}
    <section class="lx-tit-cartuchos" aria-label={t('Otras partidas', 'Other runs')}>
      <h2>{t('OTRAS PARTIDAS', 'OTHER RUNS')}</h2>
      <div class="lx-tit-rejilla">
        {#each otras.slice(0, 8) as p (p.id)}
          <button class="lx-cart" on:click={() => abrirCartucho(p)} title={t(`Jugar a «${p.nombre}»`, `Play «${p.nombre}»`)}>
            <span class="lx-cart-estrias" aria-hidden="true" />
            <span class="lx-cart-etiqueta" style="--c:{colorEtiqueta(p.juego)}">
              {#if logo(p.juego)}<img src={logo(p.juego)} alt={nombreJuego(p.juego, Games[p.juego])} loading="lazy" />{:else}<b>{nombreJuego(p.juego, Games[p.juego])}</b>{/if}
            </span>
            <span class="lx-cart-nombre">{p.nombre}</span>
            <span class="lx-cart-datos">
              <span title={t('Capturas', 'Caught')}>◓ {p.capturas}</span>
              <span title={t('Caídos', 'Fallen')}>✝ {p.caidos}</span>
              {#if p.intentos > 1}<span title={t('Intento', 'Attempt')}>#{p.intentos}</span>{/if}
            </span>
            <small class="lx-cart-fecha">{fecha(p.actualizada)}</small>
          </button>
        {/each}
      </div>
      <a class="lx-tit-todas" href="/saves">{otras.length > 8 ? t(`Ver las ${partidas.length} partidas`, `See all ${partidas.length} runs`) : t('Gestionar partidas (compartir, borrar, importar…)', 'Manage runs (share, delete, import…)')}</a>
    </section>
  {:else if !cargando && !activa}
    <p class="lx-tit-vacio">{t('Aún no tienes ninguna run. Empieza con NUEVA PARTIDA o importa una en Partidas.', 'No runs yet. Start with NEW GAME or import one in Saves.')}</p>
  {/if}
</div>

<style>
  .lx-tit {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 18px;
    max-width: 760px;
    margin: 0 auto;
    padding: 28px 16px 64px;
  }

  /* Logotipo en la pantalla LCD */
  .lx-logo {
    display: flex;
    justify-content: center;
  }
  .lx-logo-pantalla {
    position: relative;
    display: flex;
    align-items: center;
    gap: 18px;
    padding: 14px 30px 14px 20px;
    border-radius: var(--lx-radio);
    border: 4px solid var(--lx-tinta);
    box-shadow: inset 0 0 0 4px #d9d9d2, inset 0 0 22px rgba(0, 0, 0, 0.6), var(--lx-sombra);
  }
  .lx-logo-icono {
    width: 92px;
    height: 92px;
    filter: drop-shadow(3px 4px 0 rgba(0, 0, 0, 0.45));
  }
  .lx-logo-textos {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
  }
  .lx-logo-texto {
    font-family: 'VT323', monospace;
    font-size: 84px;
    line-height: 0.85;
    letter-spacing: 6px;
    color: #f7f7f2;
    text-shadow: 3px 3px 0 var(--lx-rojo), 6px 6px 0 #4a0412;
  }
  .lx-logo-sub {
    font-family: 'VT323', monospace;
    font-size: 22px;
    color: var(--lx-lcd-texto);
    letter-spacing: 2px;
    margin-top: 8px;
  }
  @media (max-width: 560px) {
    .lx-logo-icono {
      width: 64px;
      height: 64px;
    }
    .lx-logo-texto {
      font-size: 60px;
      letter-spacing: 3px;
    }
  }

  /* Ventanas del menú, con la letra pixelada a tamaños enteros */
  .lx-tit-menu,
  .lx-tit-opciones,
  .lx-tit-cartuchos {
    font-family: 'LX Pixel', 'VT323', monospace;
    -webkit-font-smoothing: none;
  }
  .lx-tit-menu {
    display: flex;
    flex-direction: column;
    gap: 8px;
    width: min(480px, 100%);
  }
  .lx-tit-ventana {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: stretch;
    width: 100%;
    padding: 4px 12px;
    text-align: left;
    color: #303848;
    background: #f0f4f8;
  }
  .lx-tit-titulo {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 24px;
    line-height: 30px;
    color: #303848;
  }
  .lx-tit-sel .lx-tit-titulo {
    color: #d04020;
  }
  .lx-tit-sello {
    padding: 0 6px;
    border-radius: 3px;
    font-size: 12px;
    line-height: 16px;
    color: #fff;
  }
  .lx-tit-campeon {
    background: #c89820;
  }
  .lx-tit-fin {
    background: #a83828;
  }
  .lx-tit-run {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 2px 0 4px;
    font-size: 18px;
    line-height: 20px;
    color: #586880;
  }
  .lx-tit-run img {
    height: 26px;
    width: auto;
  }
  .lx-tit-datos {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    gap: 0 18px;
    padding-left: 6px;
    font-size: 24px;
    line-height: 28px;
  }
  .lx-tit-etq {
    color: #303848;
  }
  .lx-tit-valor {
    min-width: 0;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
  .lx-tit-azul {
    color: #3060c0;
  }
  .lx-tit-caidos {
    font-size: 18px;
    color: #a83828;
  }
  .lx-tit-medallas {
    display: flex;
    align-items: center;
    gap: 2px;
  }
  .lx-tit-medalla {
    display: inline-block;
    width: 24px;
    height: 24px;
    background-size: 192px 24px;
    background-repeat: no-repeat;
    image-rendering: pixelated;
  }
  .lx-tit-generica {
    clip-path: polygon(30% 0, 70% 0, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0 70%, 0 30%);
    background: linear-gradient(#f8e070 50%, #d8a830 50%);
    transform: scale(0.75);
  }
  .lx-tit-sin {
    filter: brightness(0);
    opacity: 0.14;
  }
  .lx-tit-equipo {
    position: absolute;
    right: 10px;
    top: 34px;
    display: grid;
    grid-template-columns: repeat(3, 40px);
    gap: 4px 4px;
  }
  .lx-tit-bota {
    display: flex;
    justify-content: center;
    height: 30px;
    animation: lx-tit-bota 3s steps(1, end) var(--retraso, 0.2s) infinite;
  }
  .lx-tit-bota > :global(*) {
    transform: scale(1.5);
    transform-origin: center bottom;
    image-rendering: pixelated;
  }
  @keyframes lx-tit-bota {
    5%,
    15%,
    25%,
    35%,
    45% {
      transform: translateY(-3px);
    }
    0%,
    10%,
    20%,
    30%,
    40%,
    50% {
      transform: translateY(0);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .lx-tit-bota {
      animation: none;
    }
  }
  @media (max-width: 520px) {
    .lx-tit-equipo {
      position: static;
      margin: 4px 0 2px 6px;
      grid-template-columns: repeat(6, 34px);
    }
  }

  /* OPCIONES */
  .lx-tit-opciones {
    width: min(520px, 100%);
    padding-bottom: 10px;
  }
  .lx-tit-opciones ul {
    display: flex;
    flex-direction: column;
    gap: 4px;
    margin-top: 6px;
  }
  .lx-tit-opciones li {
    display: grid;
    grid-template-columns: 18px minmax(0, 1fr) auto;
    align-items: center;
    min-height: 32px;
    font-size: 24px;
    line-height: 28px;
  }
  .lx-tit-fila-sel .lx-tit-etq {
    color: #d04020;
  }
  .lx-tit-opciones small {
    font-size: 18px;
    color: #687890;
  }
  .lx-tit-cursor {
    font-size: 16px;
    color: #d04020;
  }
  .lx-tit-cambiar {
    display: inline-flex;
    align-items: center;
    gap: 8px;
  }
  .lx-tit-cambiar b {
    min-width: 100px;
    font-weight: normal;
    text-align: center;
    color: #3060c0;
  }
  .lx-tit-cambiar button,
  .lx-tit-accion {
    min-width: 28px;
    padding: 0 4px;
    font-size: 18px;
    line-height: 20px;
    color: #303848;
  }
  .lx-tit-salir {
    text-align: left;
  }

  /* Cartuchos de las demás runs */
  .lx-tit-cartuchos {
    width: 100%;
    margin-top: 8px;
    text-align: center;
  }
  .lx-tit-cartuchos h2 {
    font-size: 24px;
    line-height: 28px;
    color: var(--lx-tinta);
    opacity: 0.75;
  }
  .lx-tit-rejilla {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 14px;
    margin-top: 8px;
  }
  .lx-cart {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 4px;
    padding: 14px 10px 8px;
    border: 3px solid #303040;
    border-radius: 8px 8px 4px 4px;
    background: #a0a0ac;
    box-shadow: inset 3px 3px 0 #c4c4ce, inset -3px -3px 0 #7c7c8a, 0 3px 0 rgba(0, 0, 0, 0.25);
    color: #202030;
    transition: transform 0.1s;
  }
  .lx-cart:hover,
  .lx-cart:focus-visible {
    transform: translateY(-4px);
    outline: none;
  }
  .lx-cart:focus-visible {
    border-color: #e05030;
  }
  .lx-cart-estrias {
    position: absolute;
    top: 4px;
    left: 24px;
    right: 24px;
    height: 6px;
    background: repeating-linear-gradient(90deg, #7c7c8a 0 3px, transparent 3px 7px);
  }
  .lx-cart-etiqueta {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 62px;
    padding: 4px;
    border: 2px solid #303040;
    border-radius: 3px;
    background: linear-gradient(var(--c) 0 14px, #f8f8f8 14px);
  }
  .lx-cart-etiqueta img {
    max-height: 40px;
    max-width: 100%;
    margin-top: 10px;
    object-fit: contain;
  }
  .lx-cart-etiqueta b {
    margin-top: 10px;
    font-size: 18px;
    font-weight: normal;
  }
  .lx-cart-nombre {
    font-size: 18px;
    line-height: 20px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .lx-cart-datos {
    display: flex;
    justify-content: center;
    gap: 10px;
    font-size: 18px;
    line-height: 18px;
  }
  .lx-cart-fecha {
    font-size: 12px;
    line-height: 12px;
    opacity: 0.75;
  }
  .lx-tit-todas {
    display: inline-block;
    margin-top: 12px;
    font-size: 18px;
    color: var(--lx-tinta);
    text-decoration: underline;
    opacity: 0.8;
  }
  .lx-tit-vacio {
    font-family: 'LX Pixel', 'VT323', monospace;
    font-size: 18px;
    color: var(--lx-tinta);
    opacity: 0.8;
    text-align: center;
  }
</style>
