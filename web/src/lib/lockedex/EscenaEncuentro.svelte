<script>
  // «¡Un Pokémon salvaje!»: apuntar un encuentro como en un combate de GBA. Primero eliges qué ha salido
  // (los de la zona, con su método y nivel), aparece en la hierba y eliges en el menú de combate
  // CAPTURADO, VARIOCOLOR, HUYÓ o LO DEBILITÉ. Si lo capturas, la Poké Ball se mueve tres veces y te pregunta
  // el mote. Todo se salta con un clic o Intro y se maneja con las flechas.
  import { onMount, onDestroy, tick, getContext } from 'svelte'
  import { createImgUrl } from '$utils/rewrites'
  import { resumenEspecie } from './encuentros.js'
  import { norm } from './datos.js'
  import { marco } from './gba.js'
  import { t, traducirNombre, idioma } from './idioma.js'

  export let zona = '' // nombre de la zona tal cual (inglés)
  export let candidatos = [] // Pokémon de la zona (objetos de la Pokédex)
  export let metodos = null // método, nivel y % por alias normalizado
  export let buscarTodos = async () => [] // todos los que se pueden apuntar, para «Otro…»
  export let repetidos = new Set() // líneas evolutivas que ya tienes
  export let conMote = true
  export let elegir = (_) => _ // ({ pokemon, estado, mote }) → la fila

  const { close } = getContext('simple-modal')
  const es = idioma() === 'es'
  const CAJA = marco({ tinta: '#283850', fondo: '#f8f8f8', luz: '#ffffff', sombra: '#c8d0d8', r: 3 })
  const MENU = marco({ tinta: '#283850', fondo: '#f8f8f8', luz: '#ffffff', sombra: '#c8d0d8', r: 2 })
  const nombreZona = traducirNombre(zona)

  let fase = 'elige' // elige → aparece → menu → (captura → mote) | sale
  let filtro = ''
  let todos = null
  let marcado = 0
  let pokemon = null
  let estado = null
  let mote = ''
  let cursor = 0
  let entradaFiltro, entradaMote
  const relojes = []
  const despues = (ms, f) => relojes.push(setTimeout(f, ms))
  const parar = () => relojes.splice(0).forEach(clearTimeout)
  onDestroy(parar)

  onMount(async () => {
    await tick()
    entradaFiltro?.focus()
  })

  const nombre = (p) => traducirNombre(p?.name || p?.alias || '')
  const MAYUS = (p) => (mote || nombre(p)).toLocaleUpperCase(es ? 'es' : 'en')
  $: lista = (() => {
    const f = norm(filtro)
    const base = f && todos ? todos : candidatos
    const res = f ? base.filter((p) => norm(nombre(p)).includes(f) || norm(p.alias).includes(f)) : base
    return res.slice(0, 40)
  })()
  $: if (marcado >= lista.length) marcado = Math.max(0, lista.length - 1)
  const escribir = async (e) => {
    filtro = e.currentTarget.value
    marcado = 0
    if (filtro && !todos) todos = await buscarTodos().catch(() => [])
  }
  const sub = (p) => resumenEspecie(metodos?.[norm(p.alias || p.name)], zona, es)

  // 1 → 2: aparece en la hierba
  const elegirPokemon = (p) => {
    if (!p) return
    pokemon = p
    fase = 'aparece'
    despues(900, () => fase === 'aparece' && (fase = 'menu'))
  }

  // Menú de combate (2×2, como LUCHAR / MOCHILA / POKéMON / HUIR)
  const OPCIONES = [
    { id: 1, es: 'CAPTURADO', en: 'CAUGHT' },
    { id: 6, es: 'VARIOCOLOR', en: 'SHINY' },
    { id: 4, es: 'HUYÓ', en: 'FLED', sale: ['ha huido', 'fled'] },
    { id: 'ko', es: 'LO DEBILITÉ', en: 'I KO\'D IT', sale: ['se ha debilitado', 'fainted'] }
  ]
  const accion = (o) => {
    estado = o
    if (o.id === 1 || o.id === 6) {
      fase = 'captura'
      despues(1500, irAMote)
    } else {
      fase = 'sale'
      despues(1100, terminar)
    }
  }
  const irAMote = async () => {
    if (fase !== 'captura') return
    if (!conMote) return terminar()
    fase = 'mote'
    await tick()
    entradaMote?.focus()
  }
  const terminar = () => {
    parar()
    elegir({ pokemon, estado: estado.id === 'ko' ? 4 : estado.id, mote: mote.trim() })
    close()
  }

  const tecla = (e) => {
    const k = e.key
    if (fase === 'elige') {
      if (k === 'ArrowDown' || k === 'ArrowRight') marcado = Math.min(lista.length - 1, marcado + (k === 'ArrowDown' ? 4 : 1))
      else if (k === 'ArrowUp' || k === 'ArrowLeft') marcado = Math.max(0, marcado - (k === 'ArrowUp' ? 4 : 1))
      else if (k === 'Enter') elegirPokemon(lista[marcado])
      else return
      e.preventDefault()
    } else if (fase === 'aparece' && (k === 'Enter' || k === ' ')) {
      e.preventDefault()
      parar()
      fase = 'menu'
    } else if (fase === 'menu') {
      if (k === 'ArrowRight' || k === 'ArrowLeft') cursor = cursor ^ 1
      else if (k === 'ArrowDown' || k === 'ArrowUp') cursor = cursor ^ 2
      else if (k === 'Enter' || k === ' ') accion(OPCIONES[cursor])
      else if (k === 'Backspace') fase = 'elige'
      else return
      e.preventDefault()
    } else if (fase === 'captura' && (k === 'Enter' || k === ' ')) {
      e.preventDefault()
      parar()
      irAMote()
    } else if (fase === 'sale' && (k === 'Enter' || k === ' ')) {
      e.preventDefault()
      terminar()
    } else if (fase === 'mote' && k === 'Enter') {
      e.preventDefault()
      terminar()
    }
  }
  const pulsarPantalla = () => {
    if (fase === 'aparece') {
      parar()
      fase = 'menu'
    } else if (fase === 'captura') {
      parar()
      irAMote()
    } else if (fase === 'sale') terminar()
  }
  const img = (p, variocolor = false) => createImgUrl(p, { ext: 'png', shiny: variocolor })
</script>

<svelte:window on:keydown={tecla} />

<section class="lx-enc" data-lx-original>
  <button class="lx-enc-x" on:click={close} aria-label={t('Cerrar', 'Close')} title={t('Cerrar sin apuntar nada', 'Close without logging')}>✕</button>

  {#if fase === 'elige'}
    <header class="lx-enc-cab">
      <span>{t(`¿Qué ha salido en ${nombreZona}?`, `What appeared in ${nombreZona}?`)}</span>
    </header>
    <input
      class="lx-enc-filtro"
      bind:this={entradaFiltro}
      value={filtro}
      on:input={escribir}
      placeholder={candidatos.length ? t('Escribe para buscar otro…', 'Type to search another…') : t('Escribe el Pokémon…', 'Type the Pokémon…')}
    />
    <div class="lx-enc-lista" role="listbox">
      {#each lista as p, i (p.alias || p.name)}
        {@const s = sub(p)}
        <button
          role="option"
          aria-selected={i === marcado}
          class:lx-marcado={i === marcado}
          class:lx-repe={repetidos.has(p.evoline)}
          on:click={() => elegirPokemon(p)}
          on:mouseenter={() => (marcado = i)}
          title={s?.detalle || nombre(p)}
        >
          <img src={img(p)} alt="" loading="lazy" />
          <b>{nombre(p)}</b>
          {#if s}<small>{s.linea}</small>{/if}
          {#if repetidos.has(p.evoline)}<small class="lx-enc-repe">{t('repetido', 'dupe')}</small>{/if}
        </button>
      {:else}
        <p class="lx-enc-nada">{t('No hay ninguno con ese nombre.', 'None with that name.')}</p>
      {/each}
    </div>
  {:else}
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <div class="lx-enc-pantalla" on:click={pulsarPantalla}>
      <span class="lx-enc-plataforma" />
      {#if fase !== 'captura' && fase !== 'mote'}
        <img
          class="lx-enc-salvaje"
          class:lx-enc-entra={fase === 'aparece'}
          class:lx-enc-huye={fase === 'sale' && estado?.id === 4}
          class:lx-enc-cae={fase === 'sale' && estado?.id === 'ko'}
          src={img(pokemon)}
          alt=""
        />
      {:else}
        <img class="lx-enc-salvaje lx-enc-dentro" src={img(pokemon, estado?.id === 6)} alt="" />
        <img class="lx-enc-ball" class:lx-enc-lanza={fase === 'captura'} src="/lx/objetos/poke-ball.png" alt="" />
      {/if}
      {#if estado?.id === 6 && (fase === 'captura' || fase === 'mote')}<span class="lx-enc-brillo">✦</span>{/if}
    </div>

    <div class="lx-enc-abajo">
      <div class="lx-enc-texto" style={CAJA}>
        {#if fase === 'aparece'}
          <p class="lx-enc-escribe">{t(`¡Un ${MAYUS(pokemon)} salvaje apareció!`, `A wild ${MAYUS(pokemon)} appeared!`)}</p>
        {:else if fase === 'menu'}
          <p>{t(`¿Qué pasó con ${MAYUS(pokemon)}?`, `What happened to ${MAYUS(pokemon)}?`)}</p>
        {:else if fase === 'captura'}
          <p>{t(`¡Ya está! ¡Has atrapado a ${MAYUS(pokemon)}!`, `Gotcha! ${MAYUS(pokemon)} was caught!`)}</p>
        {:else if fase === 'sale'}
          <p>{t(`¡${MAYUS(pokemon)} ${estado.sale[0]}!`, `${MAYUS(pokemon)} ${estado.sale[1]}!`)}</p>
        {:else if fase === 'mote'}
          <p>{t(`¿Quieres ponerle un mote a ${nombre(pokemon).toLocaleUpperCase('es')}?`, `Give a nickname to ${nombre(pokemon).toUpperCase()}?`)}</p>
        {/if}
      </div>
      {#if fase === 'menu'}
        <div class="lx-enc-menu" style={MENU} role="menu">
          {#each OPCIONES as o, i}
            <button role="menuitem" class:lx-cursor={cursor === i} on:click={() => accion(o)} on:mouseenter={() => (cursor = i)}>
              {es ? o.es : o.en}
            </button>
          {/each}
        </div>
      {/if}
    </div>

    {#if fase === 'mote'}
      <div class="lx-enc-mote">
        <input bind:this={entradaMote} bind:value={mote} maxlength="12" placeholder={nombre(pokemon)} />
        <button on:click={() => ((mote = ''), terminar())}>{t('Sin mote', 'No nickname')}</button>
        <button class="lx-enc-ok" on:click={terminar}>OK</button>
      </div>
    {/if}
  {/if}
</section>

<style>
  .lx-enc {
    position: relative;
    width: min(460px, 94vw);
    margin: 0 auto;
    padding: 12px;
    color: #283850;
    background: #e8e8f0;
    border: 3px solid #283850;
    border-radius: 10px;
    font-family: 'LX Pixel', 'VT323', monospace;
  }
  :global(html.dark) .lx-enc {
    background: #2c2948;
    color: #f4f0e4;
  }
  .lx-enc-x {
    position: absolute;
    top: 6px;
    right: 8px;
    z-index: 3;
    font-size: 14px;
    opacity: 0.7;
  }
  .lx-enc-cab {
    font-size: 18px;
    line-height: 22px;
    padding-right: 20px;
  }
  .lx-enc-filtro {
    width: 100%;
    margin: 6px 0;
    padding: 2px 8px;
    color: #283850;
    background: #f8f8f8;
    border: 2px solid #283850;
    border-radius: 4px;
    font-family: inherit;
    font-size: 15px;
  }
  .lx-enc-lista {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 4px;
    max-height: 320px;
    overflow-y: auto;
  }
  .lx-enc-lista button {
    display: flex;
    flex-direction: column;
    align-items: center;
    min-width: 0;
    padding: 2px 2px 4px;
    border: 2px solid transparent;
    border-radius: 6px;
    background: rgba(255, 255, 255, 0.5);
    color: inherit;
    line-height: 1.1;
  }
  :global(html.dark) .lx-enc-lista button {
    background: rgba(255, 255, 255, 0.06);
  }
  .lx-enc-lista button.lx-marcado {
    border-color: #e05060;
  }
  .lx-enc-lista button.lx-repe img {
    filter: grayscale(1);
    opacity: 0.6;
  }
  .lx-enc-lista img {
    width: 56px;
    height: 56px;
    image-rendering: pixelated;
  }
  .lx-enc-lista b {
    font-weight: normal;
    font-size: 14px;
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .lx-enc-lista small {
    font-size: 10px;
    opacity: 0.75;
    text-align: center;
  }
  .lx-enc-repe {
    color: #c03040;
  }
  .lx-enc-nada {
    grid-column: 1 / -1;
    text-align: center;
    opacity: 0.7;
  }
  .lx-enc-pantalla {
    position: relative;
    height: 170px;
    overflow: hidden;
    border: 2px solid #283850;
    border-radius: 6px;
    background: linear-gradient(#b8e0f8, #e0f4fc 45%, #a8d880 45%, #88c060);
    cursor: pointer;
  }
  .lx-enc-plataforma {
    position: absolute;
    right: 34px;
    top: 104px;
    width: 150px;
    height: 34px;
    border-radius: 50%;
    background: #78b048;
    box-shadow: inset 0 -6px 0 #5a9038, 0 0 0 2px #487828;
  }
  .lx-enc-salvaje {
    position: absolute;
    right: 56px;
    top: 14px;
    width: 106px;
    height: 106px;
    image-rendering: pixelated;
  }
  /* Entra desde la izquierda como en los combates de la 3.ª gen */
  .lx-enc-entra {
    animation: lx-enc-entra 0.6s steps(12, end);
  }
  @keyframes lx-enc-entra {
    from { transform: translateX(-280px); filter: brightness(0.3); }
    80% { filter: brightness(0.3); }
    to { transform: translateX(0); filter: none; }
  }
  .lx-enc-huye {
    animation: lx-enc-huye 0.6s steps(10, end) forwards;
  }
  @keyframes lx-enc-huye {
    to { transform: translateX(260px); }
  }
  .lx-enc-cae {
    animation: lx-enc-cae 0.7s steps(14, end) forwards;
  }
  @keyframes lx-enc-cae {
    to { transform: translateY(100px); clip-path: inset(0 0 100% 0); }
  }
  /* Captura: el Pokémon se mete en la Poké Ball (destello y se encoge) y la Ball se mueve tres veces */
  .lx-enc-dentro {
    animation: lx-enc-dentro 0.35s steps(6, end) forwards;
  }
  @keyframes lx-enc-dentro {
    from { transform: scale(1); filter: brightness(2); }
    to { transform: translate(0, 30px) scale(0); filter: brightness(3); }
  }
  .lx-enc-ball {
    position: absolute;
    right: 96px;
    top: 74px;
    width: 26px;
    height: 26px;
    image-rendering: pixelated;
  }
  .lx-enc-lanza {
    animation: lx-enc-sacude 1.2s steps(1, end) 0.3s;
    transform-origin: 50% 90%;
  }
  @keyframes lx-enc-sacude {
    0%, 30%, 60%, 90% { transform: rotate(0); }
    10%, 40%, 70% { transform: rotate(-25deg); }
    20%, 50%, 80% { transform: rotate(25deg); }
  }
  .lx-enc-brillo {
    position: absolute;
    right: 120px;
    top: 50px;
    color: #f8e050;
    font-size: 22px;
    text-shadow: 0 0 6px #fff;
    animation: lx-enc-brilla 0.6s steps(3, end) infinite;
  }
  @keyframes lx-enc-brilla {
    50% { opacity: 0.2; }
  }
  .lx-enc-abajo {
    display: flex;
    gap: 6px;
    margin-top: 8px;
  }
  .lx-enc-texto {
    flex: 1;
    padding: 4px 8px;
    min-height: 48px;
    color: #283850;
    font-size: 16px;
    line-height: 20px;
  }
  .lx-enc-escribe {
    overflow: hidden;
    white-space: nowrap;
    animation: lx-enc-escribe 0.5s steps(24, end);
  }
  @keyframes lx-enc-escribe {
    from { max-width: 0; }
    to { max-width: 100%; }
  }
  .lx-enc-menu {
    display: grid;
    grid-template-columns: auto auto;
    gap: 0 10px;
    padding: 2px 6px;
    color: #283850;
    font-size: 15px;
  }
  .lx-enc-menu button {
    position: relative;
    padding-left: 12px;
    text-align: left;
    white-space: nowrap;
  }
  .lx-enc-menu button.lx-cursor::before {
    content: '▶';
    position: absolute;
    left: 0;
    font-size: 10px;
    line-height: 22px;
  }
  .lx-enc-mote {
    display: flex;
    gap: 6px;
    margin-top: 6px;
  }
  .lx-enc-mote input {
    flex: 1;
    min-width: 0;
    padding: 2px 8px;
    color: #283850;
    background: #f8f8f8;
    border: 2px solid #283850;
    border-radius: 4px;
    font-family: inherit;
    font-size: 16px;
  }
  .lx-enc-mote button {
    padding: 0 8px;
    border: 2px solid #283850;
    border-radius: 4px;
    background: #f8f8f8;
    color: #283850;
  }
  .lx-enc-mote .lx-enc-ok {
    background: #c83848;
    color: #fff;
  }
</style>
