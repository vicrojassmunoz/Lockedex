<script>
  // Cabecera de Lockedex: la tapa de la Pokédex (lente, luces, navegación, EXP y menú).
  // Su disposición es fija (no cambia al navegar) para que Windows no confunda
  // los botones con la zona de arrastre de la ventana.
  import { onMount } from 'svelte'
  import { page } from '$app/stores'
  import { goto } from '$app/navigation'
  import { browser } from '$app/environment'
  import { idioma, cambiarIdioma } from './idioma.js'
  import { partidaActiva, cargarRutas, resumirPartida, alCambiarDatos } from './partida.js'

  const es = idioma() === 'es'
  const lx = typeof window !== 'undefined' ? window.lockedex : null

  let menuAbierto = false
  let navAbierta = false
  let parpadeo = false
  let resumen = null
  let partida = null
  let version = lx?.version || ''
  let aviso = null
  let avisoVisible = false
  let avisosReglas = 0
  let temporizadorAviso

  const enlaces = [
    { href: '/', es: 'Inicio', en: 'Home' },
    { href: '/game', es: 'Partida', en: 'Run', partida: true },
    { href: '/saves', es: 'Partidas', en: 'Saves' },
    { href: '/analista', es: 'Analista', en: 'Analyst' },
    { href: '/perfil', es: 'Perfil', en: 'Profile' },
    { href: '/guides', es: 'Guías', en: 'Guides' }
  ]

  const actualizar = async () => {
    try {
      partida = partidaActiva()
      if (!partida?.info) return (resumen = null)
      const rutas = await cargarRutas(partida.info.lid)
      resumen = resumirPartida(partida, rutas)
    } catch (e) {
      console.error('[barra]', e)
    }
  }

  // Navegación interna con plan B: si en 2,5 s no ha cambiado de página,
  // se navega a la antigua usanza (recargando)
  const ir = async (e, href) => {
    if (e.ctrlKey || e.metaKey || e.shiftKey || e.button > 0) return
    e.preventDefault()
    navAbierta = false
    if (location.pathname === href) return
    const vigilante = setTimeout(() => {
      if (location.pathname !== href) location.href = href
    }, 2500)
    try {
      await goto(href)
    } catch (err) {
      console.error('[navegación]', err)
      location.href = href
    } finally {
      clearTimeout(vigilante)
    }
  }

  const mostrarAviso = (estado) => {
    aviso = estado
    clearTimeout(temporizadorAviso)
    const automatico = !estado?.manual
    // Los avisos de búsqueda automática solo se enseñan si hay algo útil
    avisoVisible =
      !!estado &&
      (estado.estado === 'descargando' ||
        estado.estado === 'lista' ||
        estado.estado === 'instalando' ||
        (!automatico && ['buscando', 'al-dia', 'error', 'no-disponible'].includes(estado.estado)))
    if (['al-dia', 'error', 'no-disponible'].includes(estado?.estado))
      temporizadorAviso = setTimeout(() => (avisoVisible = false), estado.estado === 'error' ? 9000 : 5000)
  }

  onMount(() => {
    actualizar()
    const quitar = alCambiarDatos(actualizar)
    const guardado = () => {
      parpadeo = true
      setTimeout(() => (parpadeo = false), 700)
    }
    window.addEventListener('lx:guardado', guardado)
    const alAvisar = (e) => (avisosReglas = e.detail || 0)
    window.addEventListener('lx:avisos', alAvisar)
    const cerrar = (e) => {
      if (!e.target.closest?.('.lx-menu, .lx-boton-menu')) menuAbierto = false
      if (!e.target.closest?.('.lx-nav-mini')) navAbierta = false
    }
    document.addEventListener('click', cerrar)
    lx?.alActualizar?.(mostrarAviso)
    return () => {
      quitar()
      window.removeEventListener('lx:guardado', guardado)
      document.removeEventListener('click', cerrar)
    }
  })

  const accion = (nombre) => {
    menuAbierto = false
    lx?.accion(nombre)
  }

  const activo = (href, ruta) => (href === '/' ? ruta === '/' : ruta.startsWith(href))

  $: ruta = $page.url.pathname
  $: if (browser && ruta) actualizar()
  $: porcentaje = Math.round((resumen?.progreso || 0) * 100)
  $: seccion = enlaces.find((e) => activo(e.href, ruta)) || null
</script>

<header class="lx-barra">
  <div class="lx-arrastre lx-logo-bloque">
    <div class="lx-lente" class:lx-parpadeo={parpadeo} title={es ? 'Guardado' : 'Saved'}>
      <span />
    </div>
    <div class="lx-luces">
      <i class="lx-luz lx-r" class:lx-encendida-r={avisosReglas > 0} title={avisosReglas ? (es ? 'Hay avisos de reglas en tu partida' : 'Your run has rule warnings') : ''} />
      <i class="lx-luz lx-a" class:lx-encendida-a={aviso?.estado === 'descargando' || aviso?.estado === 'buscando'} />
      <i class="lx-luz lx-v" class:lx-encendida={parpadeo} />
    </div>
    <span class="lx-marca">LOCKEDEX</span>
  </div>

  <nav class="lx-enlaces" aria-label="Lockedex">
    {#each enlaces as e}
      <a
        href={e.partida && !resumen ? '/saves' : e.href}
        class:lx-activo={activo(e.href, ruta)}
        class:lx-inactivo={e.partida && !resumen}
        title={e.partida && !resumen ? (es ? 'Carga una partida primero' : 'Load a run first') : ''}
        on:click={(ev) => ir(ev, e.partida && !resumen ? '/saves' : e.href)}
        data-lx-original>{es ? e.es : e.en}</a
      >
    {/each}
  </nav>

  <div class="lx-nav-mini" data-lx-original>
    <button class="lx-boton lx-nav-mini-boton" on:click={() => (navAbierta = !navAbierta)}>
      {seccion ? (es ? seccion.es : seccion.en) : es ? 'Ir a' : 'Go to'} ▾
    </button>
    {#if navAbierta}
      <div class="lx-menu lx-menu-izq">
        {#each enlaces as e}
          <a
            href={e.partida && !resumen ? '/saves' : e.href}
            class:lx-activo-menu={activo(e.href, ruta)}
            on:click={(ev) => ir(ev, e.partida && !resumen ? '/saves' : e.href)}>{es ? e.es : e.en}</a
          >
        {/each}
      </div>
    {/if}
  </div>

  <div class="lx-arrastre lx-hueco" />

  <a
    href="/game"
    class="lx-exp"
    class:lx-exp-vacia={!resumen}
    title={resumen ? `${partida.nombre} · ${partida.info.titulo}` : es ? 'Sin partida activa' : 'No active run'}
    on:click={(ev) => ir(ev, resumen ? '/game' : '/saves')}
    data-lx-original
  >
    <span class="lx-exp-nivel">
      <small>{es ? 'MED' : 'BDG'}</small>{resumen ? resumen.medallas : '–'}
    </span>
    <span class="lx-exp-caja">
      <span class="lx-exp-etq">EXP</span>
      <span class="lx-exp-pista">
        <span class="lx-exp-relleno" style="width:{porcentaje}%" />
      </span>
      <span class="lx-exp-pct">{resumen ? porcentaje + '%' : '—'}</span>
    </span>
  </a>

  <div class="lx-acciones">
    {#if lx}
      <button class="lx-boton" on:click={() => accion('compacto')} title={es ? 'Modo compacto (Ctrl+Alt+L)' : 'Compact mode (Ctrl+Alt+L)'} data-lx-original>
        <svg viewBox="0 0 24 24"><path d="M4 4h16v12H4zM8 20h8" stroke="currentColor" stroke-width="2.4" fill="none" stroke-linecap="round" /></svg>
      </button>
    {/if}
    <a href="/importar" class="lx-boton" on:click={(ev) => ir(ev, '/importar')} title={es ? 'Importar partida del emulador (.sav)' : 'Import emulator save (.sav)'} data-lx-original>
      <svg viewBox="0 0 24 24"><path d="M12 3v12m0 0-4.5-4.5M12 15l4.5-4.5M4 17v3h16v-3" stroke="currentColor" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round" /></svg>
    </a>
    <button class="lx-boton lx-boton-menu" on:click={() => (menuAbierto = !menuAbierto)} title={es ? 'Menú' : 'Menu'} data-lx-original>
      <svg viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" /></svg>
      {#if aviso?.estado === 'lista'}<i class="lx-punto" />{/if}
    </button>

    {#if menuAbierto}
      <div class="lx-menu" data-lx-original>
        {#if lx}
          <button on:click={() => accion('copia')}>{es ? 'Hacer copia de seguridad' : 'Back up now'}</button>
          <button on:click={() => accion('restaurar')}>{es ? 'Restaurar copia…' : 'Restore backup…'}</button>
          <button on:click={() => accion('carpeta')}>{es ? 'Abrir carpeta de partidas' : 'Open saves folder'}</button>
          <hr />
        {/if}
        <button on:click={() => cambiarIdioma(es ? 'en' : 'es')}>
          {es ? 'Language: English' : 'Idioma: Español'}
        </button>
        {#if lx}
          {#if aviso?.estado === 'lista'}
            <button class="lx-menu-destacado" on:click={() => accion('instalar-actualizacion')}>
              {es ? `Instalar Lockedex v${aviso.version}` : `Install Lockedex v${aviso.version}`}
            </button>
          {:else}
            <button on:click={() => accion('buscar-actualizacion')}>{es ? 'Buscar actualizaciones' : 'Check for updates'}</button>
          {/if}
          <button on:click={() => accion('registro')}>{es ? 'Abrir registro de errores' : 'Open error log'}</button>
          <button on:click={() => accion('web-original')}>{es ? 'Web original (nuzlocke-redux)' : 'Original website'}</button>
          <hr />
          <button on:click={() => accion('acerca')}>{es ? 'Acerca de Lockedex' : 'About Lockedex'} {version ? 'v' + version : ''}</button>
        {/if}
      </div>
    {/if}
  </div>
</header>
<div class="lx-bisagra" />
<div class="lx-marco" />

{#if avisoVisible && aviso}
  <div class="lx-actualizacion lx-act-{aviso.estado}" role="status" aria-live="polite" data-lx-original>
    {#if aviso.estado === 'buscando'}
      <span class="lx-girando" />
      <span>{es ? 'Buscando actualizaciones…' : 'Checking for updates…'}</span>
    {:else if aviso.estado === 'descargando'}
      <div class="lx-act-texto">
        <b>{es ? 'Descargando' : 'Downloading'} Lockedex {aviso.version ? 'v' + aviso.version : ''}</b>
        <span class="lx-act-barra"><i style="width:{aviso.progreso || 0}%" /></span>
        <small>
          {aviso.progreso || 0}%{aviso.mb ? ` · ${aviso.mb}` : ''}{aviso.velocidad ? ` · ${aviso.velocidad}` : ''}
          · {es ? 'puedes seguir usando la app' : 'you can keep using the app'}
        </small>
      </div>
    {:else if aviso.estado === 'lista'}
      <div class="lx-act-texto">
        <b>{es ? `Lockedex v${aviso.version} está lista` : `Lockedex v${aviso.version} is ready`}</b>
        <small>{es ? 'Se instala en unos segundos y Lockedex se vuelve a abrir. Tus partidas no se tocan.' : 'Installs in a few seconds and Lockedex reopens. Your runs are untouched.'}</small>
      </div>
      <button class="lx-act-boton" on:click={() => accion('instalar-actualizacion')}>{es ? 'Actualizar ahora' : 'Update now'}</button>
      <button class="lx-act-cerrar" on:click={() => (avisoVisible = false)} title={es ? 'Más tarde (se instalará al cerrar)' : 'Later (installs on exit)'}>✕</button>
    {:else if aviso.estado === 'instalando'}
      <span class="lx-girando" />
      <span>{es ? 'Guardando tus partidas y abriendo el instalador…' : 'Saving your runs and opening the installer…'}</span>
    {:else if aviso.estado === 'al-dia'}
      <span class="lx-ok">✓</span>
      <span>{es ? `Estás al día (v${version})` : `You're up to date (v${version})`}</span>
    {:else if aviso.estado === 'no-disponible'}
      <span>{es ? 'Esta copia de Lockedex no se actualiza sola.' : 'This copy of Lockedex does not auto-update.'}</span>
    {:else if aviso.estado === 'error'}
      <span class="lx-mal">!</span>
      <div class="lx-act-texto">
        <b>{es ? 'No se pudo comprobar si hay actualizaciones' : 'Could not check for updates'}</b>
        <small>{es ? '¿Estás sin conexión? Se volverá a intentar más tarde.' : 'Offline? It will retry later.'}</small>
      </div>
      <button class="lx-act-cerrar" on:click={() => (avisoVisible = false)}>✕</button>
    {/if}
  </div>
{/if}

<style>
  .lx-barra {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    height: var(--lx-barra);
    z-index: 9500;
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 0 12px;
    padding-right: calc(100vw - env(titlebar-area-x, 0px) - env(titlebar-area-width, 100vw) + 12px);
    background: linear-gradient(180deg, var(--lx-rojo-claro) 0%, var(--lx-rojo) 45%, #c10826 100%);
    color: #fff;
    user-select: none;
    font-family: 'VT323', monospace;
    -webkit-app-region: no-drag;
  }
  /* Solo estas zonas sirven para arrastrar la ventana */
  .lx-arrastre {
    -webkit-app-region: drag;
  }
  .lx-logo-bloque {
    display: flex;
    align-items: center;
    gap: 12px;
    height: 100%;
    flex: none;
  }
  .lx-hueco {
    flex: 1;
    align-self: stretch;
    min-width: 12px;
  }
  .lx-bisagra {
    position: fixed;
    top: calc(var(--lx-barra) - 4px);
    left: 0;
    right: 0;
    height: 4px;
    z-index: 9501;
    background: linear-gradient(180deg, var(--lx-rojo-oscuro), #5a0614);
    pointer-events: none;
  }

  /* Lente y luces */
  .lx-lente {
    flex: none;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: #fff;
    box-shadow: 0 0 0 2px var(--lx-negro), 2px 3px 0 2px rgba(0, 0, 0, 0.25);
    display: grid;
    place-items: center;
  }
  .lx-lente span {
    width: 26px;
    height: 26px;
    border-radius: 50%;
    background: radial-gradient(circle at 34% 30%, #e0f7ff 0 12%, #5fd0ff 26%, var(--lx-cian) 48%, #0a6aa8 100%);
    box-shadow: inset 0 0 0 2px #0b4f7c;
    transition: filter 0.2s, box-shadow 0.2s;
  }
  .lx-lente.lx-parpadeo span {
    filter: brightness(1.45) saturate(1.2);
    box-shadow: inset 0 0 0 2px #0b4f7c, 0 0 14px 4px rgba(95, 208, 255, 0.85);
  }
  .lx-luces {
    display: flex;
    gap: 6px;
    align-self: flex-start;
    margin-top: 8px;
  }
  .lx-luz {
    width: 11px;
    height: 11px;
    border-radius: 50%;
    border: 2px solid var(--lx-negro);
  }
  .lx-r {
    background: radial-gradient(circle at 35% 30%, #ffb3b3, #ff2b2b 60%);
  }
  .lx-a {
    background: radial-gradient(circle at 35% 30%, #fff3b0, var(--lx-amarillo) 60%);
  }
  .lx-v {
    background: radial-gradient(circle at 35% 30%, #c8ffd9, #1aa65a 60%);
    transition: box-shadow 0.2s, filter 0.2s;
  }
  .lx-v.lx-encendida {
    filter: brightness(1.4);
    box-shadow: 0 0 10px 3px rgba(61, 220, 132, 0.9);
  }

  .lx-marca {
    font-size: 30px;
    letter-spacing: 3px;
    line-height: 1;
    color: #fff;
    text-shadow: 2px 2px 0 var(--lx-rojo-oscuro), 3px 3px 0 rgba(0, 0, 0, 0.35);
    margin-right: 4px;
  }

  .lx-enlaces {
    display: flex;
    gap: 4px;
    background: rgba(0, 0, 0, 0.18);
    padding: 4px;
    border-radius: 9px;
    box-shadow: inset 0 2px 0 rgba(0, 0, 0, 0.2);
  }
  .lx-enlaces a {
    font-size: 19px;
    line-height: 1;
    padding: 4px 10px 3px;
    border-radius: 6px;
    color: #ffe3e7;
  }
  .lx-enlaces a:hover {
    background: rgba(255, 255, 255, 0.14);
    color: #fff;
  }
  .lx-enlaces a.lx-activo {
    background: var(--lx-negro);
    color: var(--lx-amarillo);
    box-shadow: inset 0 -2px 0 rgba(255, 255, 255, 0.08);
  }

  /* Barra de experiencia */
  .lx-exp {
    display: flex;
    align-items: center;
    gap: 8px;
    flex: none;
    width: 250px;
    background: var(--lx-negro);
    border-radius: 8px;
    padding: 4px 10px 4px 6px;
    box-shadow: inset 0 0 0 2px #000, 0 2px 0 rgba(0, 0, 0, 0.25);
  }
  .lx-exp-vacia {
    opacity: 0.55;
  }
  .lx-exp-nivel {
    font-size: 22px;
    line-height: 1;
    color: var(--lx-amarillo);
    background: #2c2c33;
    padding: 2px 6px 1px;
    border-radius: 5px;
  }
  .lx-exp-nivel small {
    font-size: 13px;
    margin-right: 3px;
    color: #c9c9d1;
  }
  .lx-exp-caja {
    display: flex;
    align-items: center;
    gap: 6px;
    flex: 1;
  }
  .lx-exp-etq {
    font-size: 16px;
    color: var(--lx-amarillo);
    letter-spacing: 1px;
  }
  .lx-exp-pista {
    flex: 1;
    height: 9px;
    border-radius: 5px;
    background: #3a3a42;
    border: 2px solid #55555f;
    overflow: hidden;
  }
  .lx-exp-relleno {
    display: block;
    height: 100%;
    background: linear-gradient(180deg, #8ee8ff, #3cc4f0 55%, #1e9ad0);
    box-shadow: 0 0 6px rgba(60, 196, 240, 0.7);
    transition: width 0.8s cubic-bezier(0.2, 0.8, 0.2, 1);
  }
  .lx-exp-pct {
    font-size: 18px;
    color: #fff;
    min-width: 38px;
    text-align: right;
  }

  /* Acciones */
  .lx-acciones {
    display: flex;
    gap: 6px;
    position: relative;
  }
  .lx-boton {
    height: 32px;
    min-width: 32px;
    display: grid;
    place-items: center;
    border-radius: 8px;
    background: rgba(0, 0, 0, 0.22);
    color: #fff;
    box-shadow: inset 0 2px 0 rgba(0, 0, 0, 0.2);
    font-size: 18px;
    padding: 0 6px;
  }
  .lx-boton:hover {
    background: rgba(0, 0, 0, 0.38);
  }
  .lx-boton svg {
    width: 18px;
    height: 18px;
  }
  .lx-boton-nueva {
    background: var(--lx-amarillo);
    color: var(--lx-negro);
    padding: 0 10px;
    animation: latido 1.4s ease-in-out infinite;
  }
  @keyframes latido {
    50% {
      transform: scale(1.06);
    }
  }
  .lx-menu {
    position: absolute;
    right: 0;
    top: 40px;
    min-width: 250px;
    background: #fbfbf7;
    color: var(--lx-negro);
    border: 3px solid var(--lx-negro);
    border-radius: 10px;
    box-shadow: 4px 4px 0 rgba(0, 0, 0, 0.35);
    padding: 6px;
    display: flex;
    flex-direction: column;
    font-family: Inter, system-ui, sans-serif;
  }
  :global(.dark) .lx-menu {
    background: #16202c;
    color: #e8eef5;
  }
  .lx-menu button {
    text-align: left;
    padding: 7px 10px;
    border-radius: 6px;
    font-size: 14px;
  }
  .lx-menu button:hover {
    background: var(--lx-rojo);
    color: #fff;
  }
  .lx-menu hr {
    border: 0;
    border-top: 2px dashed rgba(0, 0, 0, 0.15);
    margin: 4px 2px;
  }

  .lx-enlaces a.lx-inactivo {
    opacity: 0.45;
  }
  .lx-r.lx-encendida-r {
    animation: parpadeo-r 1.2s ease-in-out infinite;
  }
  @keyframes parpadeo-r {
    50% {
      filter: brightness(1.5);
      box-shadow: 0 0 10px 3px rgba(255, 43, 43, 0.95);
    }
  }
  .lx-a.lx-encendida-a {
    animation: parpadeo-a 0.9s ease-in-out infinite;
  }
  @keyframes parpadeo-a {
    50% {
      filter: brightness(1.6);
      box-shadow: 0 0 10px 3px rgba(255, 203, 5, 0.9);
    }
  }
  .lx-boton-menu {
    position: relative;
  }
  .lx-punto {
    position: absolute;
    top: 3px;
    right: 3px;
    width: 9px;
    height: 9px;
    border-radius: 50%;
    background: var(--lx-amarillo);
    box-shadow: 0 0 0 2px var(--lx-rojo);
  }
  .lx-menu a {
    padding: 7px 10px;
    border-radius: 6px;
    font-size: 15px;
    font-family: 'VT323', monospace;
    font-size: 20px;
  }
  .lx-menu a:hover {
    background: var(--lx-rojo);
    color: #fff;
  }
  .lx-menu .lx-activo-menu {
    background: var(--lx-negro);
    color: var(--lx-amarillo);
  }
  .lx-menu-destacado {
    background: var(--lx-amarillo) !important;
    color: var(--lx-negro) !important;
    font-weight: 600;
  }
  .lx-nav-mini {
    display: none;
    position: relative;
  }
  .lx-nav-mini-boton {
    font-size: 20px;
    padding: 0 10px;
  }
  .lx-menu-izq {
    left: 0;
    right: auto;
    min-width: 180px;
  }

  /* Estado de las actualizaciones (debajo de la cabecera, a la derecha) */
  .lx-actualizacion {
    position: fixed;
    top: calc(var(--lx-barra) + 10px);
    right: 22px;
    z-index: 9550;
    display: flex;
    align-items: center;
    gap: 10px;
    max-width: 420px;
    padding: 10px 12px;
    background: #1b1b1f;
    color: #fff;
    border: 3px solid #000;
    border-radius: 12px;
    box-shadow: 4px 4px 0 rgba(0, 0, 0, 0.35);
    font-family: Inter, system-ui, sans-serif;
    font-size: 13px;
    animation: bajar 0.2s ease-out;
  }
  @keyframes bajar {
    from {
      opacity: 0;
      transform: translateY(-8px);
    }
  }
  .lx-act-texto {
    display: flex;
    flex-direction: column;
    gap: 4px;
    flex: 1;
    min-width: 0;
  }
  .lx-act-texto small {
    opacity: 0.75;
    font-size: 12px;
  }
  .lx-act-barra {
    display: block;
    height: 8px;
    border-radius: 4px;
    background: #3a3a42;
    overflow: hidden;
  }
  .lx-act-barra i {
    display: block;
    height: 100%;
    background: linear-gradient(180deg, #8ee8ff, #3cc4f0 55%, #1e9ad0);
    transition: width 0.4s;
  }
  .lx-act-boton {
    flex: none;
    background: var(--lx-amarillo);
    color: var(--lx-negro);
    font-weight: 700;
    border-radius: 8px;
    padding: 6px 10px;
  }
  .lx-act-cerrar {
    flex: none;
    opacity: 0.6;
    padding: 0 4px;
  }
  .lx-girando {
    flex: none;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    border: 3px solid rgba(255, 255, 255, 0.25);
    border-top-color: var(--lx-amarillo);
    animation: girar 0.8s linear infinite;
  }
  @keyframes girar {
    to {
      transform: rotate(360deg);
    }
  }
  .lx-ok {
    color: var(--lx-verde);
    font-weight: 700;
    font-size: 18px;
  }
  .lx-mal {
    color: #ff5a6e;
    font-weight: 700;
    font-size: 18px;
  }

  /* Ventanas medianas y estrechas */
  @media (max-width: 1180px) {
    .lx-exp {
      width: 190px;
    }
    .lx-exp-etq {
      display: none;
    }
  }
  @media (max-width: 1080px) {
    .lx-marca {
      display: none;
    }
  }
  @media (max-width: 900px) {
    .lx-enlaces {
      display: none;
    }
    .lx-nav-mini {
      display: block;
    }
  }
  @media (max-width: 640px) {
    .lx-exp {
      width: 92px;
      padding-right: 6px;
    }
    .lx-exp-pista {
      display: none;
    }
    .lx-luces {
      display: none;
    }
    .lx-actualizacion {
      left: 12px;
      right: 12px;
      max-width: none;
    }
  }
</style>
