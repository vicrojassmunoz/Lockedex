<script>
  // Cabecera de Lockedex: la tapa de la Pokédex (lente, luces, menú y barra de EXP)
  import { onMount } from 'svelte'
  import { page } from '$app/stores'
  import { idioma, cambiarIdioma } from './idioma.js'
  import { partidaActiva, cargarRutas, resumirPartida, alCambiarDatos } from './partida.js'

  const es = idioma() === 'es'
  const lx = typeof window !== 'undefined' ? window.lockedex : null

  let menuAbierto = false
  let parpadeo = false
  let resumen = null
  let partida = null
  let version = lx?.version || ''
  let aviso = null

  const enlaces = [
    { href: '/', es: 'Inicio', en: 'Home' },
    { href: '/game', es: 'Partida', en: 'Run', partida: true },
    { href: '/saves', es: 'Partidas', en: 'Saves' },
    { href: '/perfil', es: 'Perfil', en: 'Profile' },
    { href: '/guides', es: 'Guías', en: 'Guides' }
  ]

  const actualizar = async () => {
    partida = partidaActiva()
    if (!partida?.info) return (resumen = null)
    const rutas = await cargarRutas(partida.info.lid)
    resumen = resumirPartida(partida, rutas)
  }

  onMount(() => {
    actualizar()
    const quitar = alCambiarDatos(actualizar)
    const guardado = () => {
      parpadeo = true
      setTimeout(() => (parpadeo = false), 700)
    }
    window.addEventListener('lx:guardado', guardado)
    const cerrar = (e) => {
      if (!e.target.closest?.('.lx-menu, .lx-boton-menu')) menuAbierto = false
    }
    document.addEventListener('click', cerrar)
    lx?.alActualizar?.((estado) => (aviso = estado))
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

  $: ruta = $page.url.pathname
  $: if (ruta) actualizar()
  $: porcentaje = Math.round((resumen?.progreso || 0) * 100)
</script>

<header class="lx-barra" class:lx-con-partida={!!resumen}>
  <div class="lx-lente" class:lx-parpadeo={parpadeo} title={es ? 'Guardado' : 'Saved'}>
    <span />
  </div>
  <div class="lx-luces">
    <i class="lx-luz lx-r" />
    <i class="lx-luz lx-a" />
    <i class="lx-luz lx-v" class:lx-encendida={parpadeo} />
  </div>

  <a href="/" class="lx-marca lx-sin-arrastre">LOCKEDEX</a>

  <nav class="lx-enlaces lx-sin-arrastre" aria-label="Lockedex">
    {#each enlaces as e}
      {#if !e.partida || resumen}
        <a
          href={e.href}
          class:lx-activo={e.href === '/' ? ruta === '/' : ruta.startsWith(e.href)}
          data-lx-original>{es ? e.es : e.en}</a
        >
      {/if}
    {/each}
  </nav>

  {#if resumen}
    <a href="/game" class="lx-exp lx-sin-arrastre" title="{partida.nombre} · {partida.info.titulo}" data-lx-original>
      <span class="lx-exp-nivel">
        <small>{es ? 'MED' : 'BDG'}</small>{resumen.medallas}
      </span>
      <span class="lx-exp-caja">
        <span class="lx-exp-etq">EXP</span>
        <span class="lx-exp-pista">
          <span class="lx-exp-relleno" style="width:{porcentaje}%" />
        </span>
        <span class="lx-exp-pct">{porcentaje}%</span>
      </span>
    </a>
  {/if}

  <div class="lx-acciones lx-sin-arrastre">
    {#if aviso?.estado === 'lista'}
      <button class="lx-boton lx-boton-nueva" on:click={() => accion('instalar-actualizacion')} data-lx-original>
        {es ? '¡Actualizar!' : 'Update!'}
      </button>
    {/if}
    {#if lx}
      <button class="lx-boton" on:click={() => accion('compacto')} title={es ? 'Modo compacto (Ctrl+Alt+L)' : 'Compact mode (Ctrl+Alt+L)'} data-lx-original>
        <svg viewBox="0 0 24 24"><path d="M4 4h16v12H4zM8 20h8" stroke="currentColor" stroke-width="2.4" fill="none" stroke-linecap="round" /></svg>
      </button>
    {/if}
    <a href="/importar" class="lx-boton" title={es ? 'Importar partida del emulador (.sav)' : 'Import emulator save (.sav)'} data-lx-original>
      <svg viewBox="0 0 24 24"><path d="M12 3v12m0 0-4.5-4.5M12 15l4.5-4.5M4 17v3h16v-3" stroke="currentColor" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round" /></svg>
    </a>
    <button class="lx-boton lx-boton-menu" on:click={() => (menuAbierto = !menuAbierto)} title={es ? 'Menú' : 'Menu'} data-lx-original>
      <svg viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" /></svg>
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
          <button on:click={() => accion('buscar-actualizacion')}>{es ? 'Buscar actualizaciones' : 'Check for updates'}</button>
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
    -webkit-app-region: drag;
    user-select: none;
    font-family: 'VT323', monospace;
  }
  .lx-sin-arrastre,
  .lx-barra a,
  .lx-barra button {
    -webkit-app-region: no-drag;
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
    margin-left: auto;
    background: var(--lx-negro);
    border-radius: 8px;
    padding: 4px 10px 4px 6px;
    box-shadow: inset 0 0 0 2px #000, 0 2px 0 rgba(0, 0, 0, 0.25);
    min-width: 230px;
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
  .lx-barra:not(.lx-con-partida) .lx-acciones {
    margin-left: auto;
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

  @media (max-width: 900px) {
    .lx-enlaces {
      display: none;
    }
    .lx-exp {
      min-width: 0;
    }
  }
</style>
