<script>
  // Escena de evolución, como en los juegos: «¿Eh? ¡X está evolucionando!», la silueta pasa de una forma a
  // la otra cada vez más rápido, un destello y «¡Enhorabuena!». Dura unos dos segundos; un clic o Intro la
  // acaba y Escape la cancela (como el botón B). Con varias evoluciones posibles, primero se elige.
  // Mismas props que el modal heredado (base, evolutions, select) más el mote y soloEscena (para las
  // evoluciones que ya llegaron aplicadas del .sav: solo se enseña).
  import { onMount, onDestroy, getContext } from 'svelte'
  import { createImgUrl } from '$utils/rewrites'
  import { marco } from './gba.js'
  import { t, traducirNombre } from './idioma.js'

  export let base = ''
  export let evolutions = []
  export let select = (_) => _
  export let nickname = ''
  export let soloEscena = false

  const { close } = getContext('simple-modal')
  const { getPkmn } = getContext('game') || {}
  const CAJA = marco({ tinta: '#283850', fondo: '#f8f8f8', luz: '#ffffff', sombra: '#c8d0d8', r: 3 })

  let pkBase = null
  let opciones = []
  let elegida = evolutions.length === 1 ? evolutions[0] : null
  let fase = elegida ? 'evoluciona' : 'elige'
  let cual = 'base' // la forma que se ve
  let silueta = false
  let destello = false
  const relojes = []
  const despues = (ms, f) => relojes.push(setTimeout(f, ms))
  onDestroy(() => relojes.forEach(clearTimeout))

  const pk = async (alias) => (getPkmn ? getPkmn(alias).catch(() => null) : null)
  onMount(async () => {
    pkBase = await pk(base)
    opciones = await Promise.all(evolutions.map(async (e) => ({ alias: e, p: await pk(e) })))
    if (fase === 'evoluciona') empezar()
  })

  $: pkEvo = opciones.find((o) => o.alias === elegida)?.p || null
  $: nombreBase = traducirNombre(pkBase?.name || base)
  $: nombreEvo = traducirNombre(pkEvo?.name || elegida || '')
  $: quien = nickname || nombreBase

  // Tiempos de cada cambio de silueta: cada vez más rápidos, como en la 3.ª gen
  const CAMBIOS = [220, 200, 170, 150, 130, 110, 95, 80, 70, 60, 55, 50, 45, 40, 40]
  const empezar = () => {
    fase = 'evoluciona'
    let t0 = 450
    despues(t0, () => (silueta = true))
    CAMBIOS.forEach((d, i) => {
      t0 += d
      despues(t0, () => (cual = i % 2 === 0 ? 'evo' : 'base'))
    })
    t0 += 120
    despues(t0, () => ((cual = 'evo'), (destello = true)))
    despues(t0 + 160, terminar)
  }
  const terminar = () => {
    if (fase === 'fin') return
    relojes.forEach(clearTimeout)
    cual = 'evo'
    silueta = false
    destello = false
    fase = 'fin'
    if (!soloEscena) select(elegida)
    despues(2600, close)
  }
  const elegir = (alias) => {
    elegida = alias
    empezar()
  }
  const tecla = (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return
    if (fase === 'evoluciona') terminar()
    else if (fase === 'fin') close()
    else return
    e.preventDefault()
  }
  const pulsar = () => (fase === 'evoluciona' ? terminar() : fase === 'fin' ? close() : null)
  const img = (p) => createImgUrl(p, { ext: 'png' })
</script>

<svelte:window on:keydown={tecla} />

<section class="lx-evo" data-lx-original>
  <button class="lx-evo-x" on:click={close} aria-label={t('Cancelar', 'Cancel')} title={fase === 'evoluciona' ? t('Cancelar la evolución', 'Stop the evolution') : t('Cerrar', 'Close')}>✕</button>

  {#if fase === 'elige'}
    <div class="lx-evo-elige">
      {#each opciones as o}
        <button on:click={() => elegir(o.alias)} title={traducirNombre(o.p?.name || o.alias)}>
          <img src={img(o.p)} alt="" />
          <span>{traducirNombre(o.p?.name || o.alias)}</span>
        </button>
      {/each}
    </div>
  {:else}
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <div class="lx-evo-pantalla" class:lx-evo-destello={destello} on:click={pulsar}>
      <i class="lx-evo-chispa" style="left:18%;top:22%" />
      <i class="lx-evo-chispa" style="left:76%;top:30%;animation-delay:.3s" />
      <i class="lx-evo-chispa" style="left:30%;top:70%;animation-delay:.6s" />
      <i class="lx-evo-chispa" style="left:68%;top:74%;animation-delay:.9s" />
      {#if pkBase}<img class="lx-evo-sprite" class:lx-evo-silueta={silueta} class:lx-oculto={cual !== 'base'} src={img(pkBase)} alt="" />{/if}
      {#if pkEvo}<img class="lx-evo-sprite" class:lx-evo-silueta={silueta} class:lx-oculto={cual !== 'evo'} class:lx-evo-llega={fase === 'fin'} src={img(pkEvo)} alt="" />{/if}
    </div>
  {/if}

  <div class="lx-evo-texto" style={CAJA}>
    {#if fase === 'elige'}
      <p>{t(`¿En qué evoluciona ${quien}?`, `What does ${quien} evolve into?`)}</p>
    {:else if fase === 'evoluciona'}
      <p>{t(`¿Eh? ¡${quien} está evolucionando!`, `What? ${quien} is evolving!`)}</p>
    {:else}
      <p>{t(`¡Enhorabuena! ¡Tu ${quien} ha evolucionado en ${nombreEvo}!`, `Congratulations! Your ${quien} evolved into ${nombreEvo}!`)}</p>
    {/if}
  </div>
</section>

<style>
  .lx-evo {
    position: relative;
    width: min(380px, 92vw);
    margin: 0 auto;
    padding: 12px;
    background: #e8e8f0;
    border: 3px solid #283850;
    border-radius: 10px;
    font-family: 'LX Pixel', 'VT323', monospace;
  }
  :global(html.dark) .lx-evo {
    background: #2c2948;
  }
  .lx-evo-x {
    position: absolute;
    top: 6px;
    right: 8px;
    z-index: 2;
    font-size: 14px;
    opacity: 0.7;
    color: #283850;
  }
  :global(html.dark) .lx-evo-x {
    color: #f4f0e4;
  }
  .lx-evo-pantalla {
    position: relative;
    height: 170px;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    border: 2px solid #283850;
    border-radius: 6px;
    background: radial-gradient(circle at 50% 55%, #3a4a8a 0, #1c2148 55%, #0c0f26 100%);
    cursor: pointer;
    transition: background-color 0.1s;
  }
  .lx-evo-destello {
    background: #ffffff;
  }
  .lx-evo-sprite {
    position: absolute;
    width: 112px;
    height: 112px;
    image-rendering: pixelated;
  }
  .lx-oculto {
    visibility: hidden;
  }
  /* Silueta blanca (en los juegos la forma se vuelve blanca mientras cambia) */
  .lx-evo-silueta {
    filter: brightness(0) invert(1);
  }
  .lx-evo-llega {
    animation: lx-evo-llega 0.5s ease-out;
  }
  @keyframes lx-evo-llega {
    from { transform: scale(1.25); filter: brightness(3); }
    to { transform: scale(1); filter: none; }
  }
  .lx-evo-chispa {
    position: absolute;
    width: 4px;
    height: 4px;
    background: #f8f0a0;
    box-shadow: 0 0 6px 2px rgba(248, 240, 160, 0.7);
    animation: lx-evo-chispa 1.2s steps(6, end) infinite;
  }
  @keyframes lx-evo-chispa {
    0%, 100% { opacity: 0; transform: scale(0.5); }
    50% { opacity: 1; transform: scale(1.4); }
  }
  .lx-evo-elige {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 8px;
    padding: 12px 0;
  }
  .lx-evo-elige button {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 96px;
    padding: 4px;
    border: 2px solid #283850;
    border-radius: 8px;
    background: #f8f8f8;
    color: #283850;
    font-size: 14px;
  }
  .lx-evo-elige button:hover {
    outline: 2px solid #e05060;
  }
  .lx-evo-elige img {
    width: 80px;
    height: 80px;
    image-rendering: pixelated;
  }
  .lx-evo-texto {
    margin-top: 8px;
    padding: 4px 8px;
    min-height: 40px;
    color: #283850;
    font-size: 16px;
    line-height: 20px;
  }
</style>
