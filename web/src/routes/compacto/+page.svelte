<script>
  // Modo compacto: ventanita siempre encima para tener a mano tu run mientras juegas
  import { onMount } from 'svelte'
  import { partidaActiva, cargarRutas, cargarLiga, resumirPartida, nivelMaximo, alCambiarDatos } from '$lib/lockedex/partida.js'
  import { equipoCompleto } from '$lib/lockedex/equipo.js'
  import { calcularRiesgo } from '$lib/lockedex/riesgo.js'
  import Riesgo from '$lib/lockedex/Riesgo.svelte'
  import { idioma, iniciarTraduccion, traducirNombre } from '$lib/lockedex/idioma.js'
  import { COLOR_TIPO } from '$lib/lockedex/colores.js'

  const es = idioma() === 'es'
  let partida = null
  let resumen = null
  let miembros = []
  let jefe = null
  let datosJefe = null
  let cap = null
  let riesgo = null
  let spoilers = 0

  const sprite = (m) => (m.imgId ? `/assets/img/pokemon/base-${m.imgId}.png` : '/assets/img/pokemon/base-201-question.png')

  const actualizar = async () => {
    // Relee siempre lo último guardado por la ventana principal
    partida = partidaActiva()
    if (!partida?.info) return
    spoilers = +((partida.ajustes || '')[8] || 0) || 0
    const rutas = await cargarRutas(partida.info.lid)
    resumen = resumirPartida(partida, rutas)
    const eq = await equipoCompleto(partida, resumen)
    miembros = eq.miembros.slice(0, 6)
    jefe = resumen.siguienteJefe
    datosJefe = null
    cap = null
    riesgo = null
    if (jefe) {
      const liga = await cargarLiga(partida.juego, partida.datos.__starter || 'fire')
      datosJefe = liga?.[jefe.value] || null
      cap = nivelMaximo(datosJefe)
      if (datosJefe) riesgo = await calcularRiesgo({ jefe: datosJefe, equipo: eq.miembros, gen: partida.info.gen, cap })
    }
  }

  onMount(() => {
    document.documentElement.classList.add('lx-compacto')
    iniciarTraduccion().then(actualizar)
    const quitar = alCambiarDatos(actualizar)
    const reloj = setInterval(actualizar, 20000)
    return () => {
      quitar()
      clearInterval(reloj)
    }
  })

  const abrirPrincipal = () => window.lockedex?.accion('principal')
  $: porcentaje = Math.round((resumen?.progreso || 0) * 100)
  $: ocultoJefe = spoilers >= 2
  $: srcJefe = typeof datosJefe?.img === 'string' ? datosJefe.img : datosJefe?.img?.src
  $: imgJefe = srcJefe?.startsWith('/leaders/') ? `/assets/img${srcJefe}.png` : srcJefe?.startsWith('http') ? srcJefe : null
</script>

<svelte:head><title>Lockedex · compacto</title></svelte:head>

<div class="lx-mini" data-lx-original>
  <header>
    <i class="lx-mini-lente" />
    <b>LOCKEDEX</b>
  </header>

  {#if !partida}
    <p class="lx-mini-vacio">{es ? 'Abre o crea una partida en Lockedex.' : 'Open or create a run in Lockedex.'}</p>
  {:else if resumen}
    <section class="lx-mini-run">
      <div class="lx-mini-titulo">
        <span>{partida.nombre || partida.info.titulo}</span>
        <small>{partida.info.titulo}</small>
      </div>
      <div class="lx-mini-exp">
        <span class="lx-med">{resumen.medallas}<small>/{resumen.totalMedallas}</small></span>
        <span class="lx-pista"><i style="width:{porcentaje}%" /></span>
        <span class="lx-pct">{porcentaje}%</span>
      </div>
      <div class="lx-mini-cont">
        <span>◓ {resumen.vivos.length} {es ? 'vivos' : 'alive'}</span>
        <span>☠ {resumen.muertos.length}</span>
        <span>✕ {resumen.fallidos.length} {es ? 'fallidos' : 'missed'}</span>
      </div>
    </section>

    {#if jefe}
      <section class="lx-mini-jefe">
        <small>{es ? 'PRÓXIMO JEFE' : 'NEXT BOSS'}</small>
        <div class="lx-mini-jefe-fila">
          {#if imgJefe}
            <img
              src={imgJefe}
              alt=""
              class:lx-silueta={ocultoJefe}
            />
          {/if}
          <div>
            <b>{ocultoJefe ? '???' : jefe.boss}</b>
            <span>{traducirNombre(jefe.name)}</span>
          </div>
          {#if cap}
            <span class="lx-mini-cap"><small>{es ? 'NV. MÁX' : 'LV. CAP'}</small>{cap}</span>
          {/if}
        </div>
        {#if riesgo}
          <div class="lx-mini-riesgo"><Riesgo nivel={riesgo.nivel} consejos={riesgo.consejos} modo={riesgo.modo} ocultarConsejos={spoilers >= 1} /></div>
        {/if}
      </section>
    {/if}

    <section class="lx-mini-equipo">
      <small>{es ? 'EQUIPO' : 'TEAM'}</small>
      {#each miembros as m}
        <div class="lx-mini-p">
          <img src={sprite(m)} alt="" />
          <div>
            <b>{m.nombre}</b>
            <span class="lx-mini-tipos">{#each m.types as t}<i style="background:{COLOR_TIPO[t]}" />{/each}</span>
          </div>
          {#if m.nivel}<span class="lx-mini-nv">{es ? 'Nv' : 'Lv'} {m.nivel}</span>{/if}
          {#if m.psMax}<span class="lx-mini-ps"><i style="width:{Math.round((m.ps / m.psMax) * 100)}%" /></span>{/if}
        </div>
      {:else}
        <p class="lx-mini-vacio">{es ? 'Sin equipo todavía.' : 'No team yet.'}</p>
      {/each}
    </section>

    <button class="lx-mini-abrir" on:click={abrirPrincipal}>{es ? 'Abrir Lockedex' : 'Open Lockedex'} ↗</button>
  {/if}
</div>

<style>
  :global(html.lx-compacto) {
    background: #dc0a2d !important;
  }
  :global(html.lx-compacto body) {
    margin: 0 !important;
    min-height: 100vh;
    background: #dc0a2d !important;
    border-radius: 0 !important;
  }
  :global(html.lx-compacto footer) {
    display: none !important;
  }
  .lx-mini {
    font-family: Inter, system-ui, sans-serif;
    color: #1b1b1f;
    padding: 0 8px 10px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  header {
    height: 34px;
    display: flex;
    align-items: center;
    gap: 8px;
    color: #fff;
    -webkit-app-region: drag;
    padding-right: calc(100vw - env(titlebar-area-x, 0px) - env(titlebar-area-width, 100vw));
  }
  header b {
    font-family: 'VT323', monospace;
    font-size: 22px;
    letter-spacing: 2px;
    text-shadow: 2px 2px 0 #8b0a1e;
  }
  .lx-mini-lente {
    width: 18px;
    height: 18px;
    border-radius: 50%;
    border: 2px solid #fff;
    background: radial-gradient(circle at 34% 30%, #e0f7ff 0 12%, #5fd0ff 30%, #29b6f6 50%, #0a6aa8);
    box-shadow: 0 0 0 1px #1b1b1f;
  }
  section {
    background: #f3f4ee;
    border: 3px solid #1b1b1f;
    border-radius: 10px;
    padding: 8px 10px;
  }
  small {
    font-family: 'VT323', monospace;
    font-size: 14px;
    letter-spacing: 1px;
    opacity: 0.7;
  }
  .lx-mini-titulo span {
    display: block;
    font-family: 'VT323', monospace;
    font-size: 22px;
    line-height: 1;
  }
  .lx-mini-exp {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-top: 6px;
    background: #1b1b1f;
    border-radius: 7px;
    padding: 3px 7px;
    color: #fff;
  }
  .lx-med {
    font-family: 'VT323', monospace;
    font-size: 20px;
    color: #ffcb05;
  }
  .lx-med small {
    color: #a1a1aa;
    opacity: 1;
  }
  .lx-pista {
    flex: 1;
    height: 8px;
    border-radius: 4px;
    background: #3a3a42;
    overflow: hidden;
  }
  .lx-pista i {
    display: block;
    height: 100%;
    background: linear-gradient(180deg, #8ee8ff, #3cc4f0 55%, #1e9ad0);
    transition: width 0.6s;
  }
  .lx-pct {
    font-family: 'VT323', monospace;
    font-size: 18px;
  }
  .lx-mini-cont {
    display: flex;
    gap: 10px;
    font-size: 12px;
    margin-top: 5px;
  }
  .lx-mini-jefe-fila {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .lx-mini-jefe-fila img {
    width: 64px;
    height: 48px;
    object-fit: contain;
    image-rendering: pixelated;
  }
  .lx-silueta {
    filter: brightness(0);
  }
  .lx-mini-jefe-fila div {
    flex: 1;
  }
  .lx-mini-jefe-fila b {
    display: block;
    font-family: 'VT323', monospace;
    font-size: 24px;
    line-height: 1;
  }
  .lx-mini-jefe-fila span {
    font-size: 12px;
    opacity: 0.75;
  }
  .lx-mini-cap {
    display: flex;
    flex-direction: column;
    align-items: center;
    font-family: 'VT323', monospace;
    font-size: 28px !important;
    line-height: 0.9;
    background: #1b1b1f;
    color: #ffcb05;
    border-radius: 7px;
    padding: 3px 7px;
    opacity: 1 !important;
  }
  .lx-mini-cap small {
    color: #a1a1aa;
    font-size: 11px;
  }
  .lx-mini-riesgo {
    margin-top: 6px;
  }
  .lx-mini-equipo {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .lx-mini-p {
    display: grid;
    grid-template-columns: 44px 1fr auto;
    grid-template-rows: auto auto;
    align-items: center;
    column-gap: 6px;
  }
  .lx-mini-p img {
    grid-row: span 2;
    width: 44px;
    height: 44px;
    image-rendering: pixelated;
  }
  .lx-mini-p b {
    font-family: 'VT323', monospace;
    font-size: 20px;
    line-height: 1;
  }
  .lx-mini-tipos i {
    display: inline-block;
    width: 18px;
    height: 6px;
    border-radius: 3px;
    margin-right: 2px;
  }
  .lx-mini-nv {
    font-family: 'VT323', monospace;
    font-size: 18px;
  }
  .lx-mini-ps {
    grid-column: 2 / span 2;
    height: 5px;
    border-radius: 3px;
    background: #3a3a42;
    overflow: hidden;
  }
  .lx-mini-ps i {
    display: block;
    height: 100%;
    background: #3ddc84;
  }
  .lx-mini-vacio {
    font-size: 13px;
    opacity: 0.7;
    color: #fff;
  }
  section .lx-mini-vacio {
    color: inherit;
  }
  .lx-mini-abrir {
    font-family: 'VT323', monospace;
    font-size: 18px;
    color: #fff;
    background: rgba(0, 0, 0, 0.25);
    border-radius: 8px;
    padding: 4px;
  }
</style>
