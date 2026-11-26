<script>
  import { recorte } from '$lib/lockedex/recorte.js'
  import { urlAnimada, alFallarSprite, ajustarGif } from '$lib/lockedex/animado.js'
  // Caja del PC: rejilla de 30 huecos por caja y panel de detalle del Pokémon elegido.
  import { createEventDispatcher, onMount } from 'svelte'
  import { PIcon, Icon } from '$c/core'
  import { Ball, Deceased, External, Shiny } from '$icons'
  import TypeLogo from '$lib/components/type-logo.svelte'
  import { drag } from '$utils/drag'
  import { locid } from '$utils/pokemon'
  import { createImgUrl, UNOWN } from '$utils/rewrites'
  import { toDb } from '$utils/link'
  import { summarise } from '$utils/badges'
  import { t, traducirNombre } from './idioma'

  export let lista = []
  export let Pokemon = {}
  export let equipo = []
  export let victorias = []
  export let evoHecha = false
  export let Particles = null

  const despachar = createEventDispatcher()
  const HUECOS = 30
  const COLUMNAS = 6

  let caja = 0
  let elegido = null
  let rejilla

  $: cajas = Math.max(1, Math.ceil(lista.length / HUECOS))
  $: if (caja > cajas - 1) caja = cajas - 1
  $: enCaja = lista.slice(caja * HUECOS, caja * HUECOS + HUECOS)
  $: huecos = Array.from({ length: HUECOS }, (_, i) => enCaja[i] || null)
  // Si el elegido desaparece (filtro, muerte…), se elige el primero de la caja
  $: if (!elegido || !lista.some((p) => locid(p) === locid(elegido))) elegido = enCaja[0] || null
  $: if (elegido) elegido = lista.find((p) => locid(p) === locid(elegido)) || elegido
  $: datos = elegido ? Pokemon[elegido.pokemon] : null
  $: enEquipo = elegido && (equipo || []).includes(locid(elegido))
  $: puedeEquipo = elegido && (enEquipo || !equipo || equipo.length < 6)
  $: medallas = elegido ? summarise(elegido, victorias) : null

  const ETIQUETAS = [
    ['hp', 'PS', 'HP'],
    ['atk', 'Ataque', 'Attack'],
    ['def', 'Defensa', 'Defense'],
    ['spa', 'At. Esp.', 'Sp. Atk'],
    ['spd', 'Def. Esp.', 'Sp. Def'],
    ['spe', 'Velocidad', 'Speed']
  ]
  const colorStat = (v) => (v >= 110 ? '#38bdf8' : v >= 85 ? '#4ade80' : v >= 60 ? '#facc15' : '#f87171')
  const total = (s) => Object.values(s || {}).reduce((a, b) => a + (+b || 0), 0)

  const lugar = (p) => {
    const sitio = p.customName || p.location
    if (p.location === 'Starter') return t('Tu Pokémon inicial', 'Your starter Pokémon')
    if (!sitio || (p.customId && !p.customName)) return t('Lugar desconocido', 'Unknown place')
    if (p.status === 2) return t('Regalo en ', 'Gift at ') + traducirNombre(sitio)
    if (p.status === 3) return t('Intercambio en ', 'Traded at ') + traducirNombre(sitio)
    return t('Capturado en ', 'Met at ') + traducirNombre(sitio)
  }

  const elegir = (p) => p && (elegido = p)
  const cambiarCaja = (d) => {
    caja = (caja + d + cajas) % cajas
    elegido = lista[caja * HUECOS] || null
  }

  // Flechas para moverse por la rejilla
  const teclas = (e) => {
    const i = enCaja.findIndex((p) => locid(p) === locid(elegido))
    if (i < 0) return
    const mov = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: COLUMNAS, ArrowUp: -COLUMNAS }[e.key]
    if (!mov) return
    e.preventDefault()
    const j = i + mov
    if (j >= 0 && j < enCaja.length) {
      elegido = enCaja[j]
      rejilla?.querySelectorAll('button.lx-hueco')[j]?.focus()
    } else if (e.key === 'ArrowRight' && cajas > 1) cambiarCaja(1)
    else if (e.key === 'ArrowLeft' && cajas > 1) cambiarCaja(-1)
  }

  onMount(() => {
    if (!elegido) elegido = enCaja[0] || null
  })
</script>

<div class="lx-caja">
  <section class="lx-caja-pc">
    <header class="lx-caja-cabecera">
      <button class="lx-caja-flecha" on:click={() => cambiarCaja(-1)} disabled={cajas < 2} title={t('Caja anterior', 'Previous box')}>◀</button>
      <span class="lx-caja-nombre" data-lx-original>
        {t('CAJA', 'BOX')} {caja + 1}
        <small>{lista.length} {lista.length === 1 ? 'Pokémon' : 'Pokémon'}</small>
      </span>
      <button class="lx-caja-flecha" on:click={() => cambiarCaja(1)} disabled={cajas < 2} title={t('Caja siguiente', 'Next box')}>▶</button>
    </header>

    <div class="lx-caja-rejilla" bind:this={rejilla} on:keydown={teclas} role="listbox" aria-label={t('Pokémon de la caja', 'Box Pokémon')}>
      {#each huecos as p, i (p ? locid(p) : 'vacio-' + i)}
        {#if p}
          {@const sel = elegido && locid(elegido) === locid(p)}
          <button
            class="lx-hueco"
            class:lx-sel={sel}
            role="option"
            aria-selected={sel}
            title={traducirNombre(Pokemon[p.pokemon]?.name || p.pokemon) + (p.nickname ? ` · ${p.nickname}` : '')}
            use:drag={{ data: p, effect: 'add', hideImg: true }}
            on:click={() => elegir(p)}
            on:focus={() => elegir(p)}
          >
            <PIcon class="data-drag-img invisible absolute -left-20 -top-20 -z-20" name={p.pokemon} />
            {#if sel}<span class="lx-mano" aria-hidden="true">▼</span>{/if}
            <PIcon class="lx-hueco-icono" name={p.pokemon} />
            {#if (equipo || []).includes(locid(p))}
              <span class="lx-hueco-equipo-marca" title={t('En el equipo', 'In your team')}><Icon inline icon={Ball} /></span>
            {/if}
            {#if p.status === 6}<span class="lx-hueco-shiny" title={t('Variocolor', 'Shiny')}>✦</span>{/if}
          </button>
        {:else}
          <span class="lx-hueco lx-vacio" aria-hidden="true" />
        {/if}
      {/each}
    </div>

    {#if !lista.length}
      <p class="lx-caja-vacia">{t('No hay Pokémon que coincidan.', 'No Pokémon match.')}</p>
    {/if}
  </section>

  <aside class="lx-caja-detalle lx-panel" data-lx-original>
    {#if elegido && datos}
      <div class="lx-det-cabecera lx-lcd">
        <div class="lx-det-sprite">
          {#if evoHecha === `${elegido.id}@${elegido.location}` && Particles}
            <span class="lx-det-particulas">
              <svelte:component this={Particles} amount={25} icons={['ice-stone', 'dawn-stone', 'fire-stone']} on:end={() => despachar('finEvo')} />
            </span>
          {/if}
          {#key `${elegido.id}@${elegido.location}`}
            <!-- Sprite animado de Negro/Blanco; sin internet, el fijo de siempre -->
            <img
              use:recorte
              class="lx-det-img"
              src={urlAnimada(datos, elegido.status === 6) || createImgUrl(datos, { shiny: elegido.status === 6, ext: 'png' })}
              data-fase={urlAnimada(datos, elegido.status === 6) ? 'animado' : 'fijo'}
              alt={datos.name}
              on:load={ajustarGif(124)}
              on:error={alFallarSprite(createImgUrl(datos, { shiny: elegido.status === 6, ext: 'png' }), UNOWN)}
            />
          {/key}
          {#if elegido.status === 6}<Icon inline icon={Shiny} class="lx-det-brillo fill-current" />{/if}
        </div>
        <div class="lx-det-nombres">
          {#if elegido.nickname}
            <h3>{elegido.nickname}</h3>
            <p class="lx-det-especie">{traducirNombre(datos.name)}</p>
          {:else}
            <h3>{traducirNombre(datos.name)}</h3>
          {/if}
          <div class="lx-det-tipos">
            {#each datos.types || [] as tipo}
              <TypeLogo type={tipo.toLowerCase()} />
            {/each}
          </div>
        </div>
      </div>

      <dl class="lx-det-datos">
        {#if elegido.nature}
          <div><dt>{t('Naturaleza', 'Nature')}</dt><dd>{traducirNombre(elegido.nature)}</dd></div>
        {/if}
        <div><dt>{t('Origen', 'Origin')}</dt><dd>{lugar(elegido)}</dd></div>
        {#if medallas}
          <div>
            <dt>{t('Combates', 'Battles')}</dt>
            <dd class="lx-det-medallas" title={medallas.summary}>
              {#each medallas.icons as icono}<PIcon name={icono} type="b" />{/each}
            </dd>
          </div>
        {/if}
      </dl>

      <div class="lx-det-stats">
        {#each ETIQUETAS as [k, es, en]}
          {@const v = +(datos.baseStats?.[k] || 0)}
          <span class="lx-stat-nombre">{t(es, en)}</span>
          <span class="lx-stat-valor">{v}</span>
          <span class="lx-stat-barra"><i style="width:{Math.min(100, (v / 180) * 100)}%;background:{colorStat(v)}" /></span>
        {/each}
        <span class="lx-stat-nombre lx-stat-total">{t('Total', 'Total')}</span>
        <span class="lx-stat-valor lx-stat-total">{total(datos.baseStats)}</span>
        <span />
      </div>

      <div class="lx-det-acciones">
        {#if puedeEquipo}
          <button class="lx-btn" class:lx-btn-activo={enEquipo} on:click={() => despachar('equipo', elegido)}>
            <Icon inline icon={Ball} class="fill-current" />
            {enEquipo ? t('Quitar del equipo', 'Remove from team') : t('Al equipo', 'Add to team')}
          </button>
        {/if}
        {#if datos.evos?.length}
          <button class="lx-btn" on:click={() => despachar('evolucionar', elegido)}>
            <span class="lx-btn-glifo" aria-hidden="true">▲</span>
            {t('Evolucionar', 'Evolve')}
          </button>
        {/if}
        <button class="lx-btn lx-btn-peligro" on:click={() => despachar('matar', elegido)}>
          <Icon inline icon={Deceased} class="fill-current" />
          {t('Ha caído', 'Fainted')}
        </button>
        {#if !elegido.customName}
          <a class="lx-btn" href={toDb(datos.alias || elegido.pokemon)} target="_blank" rel="noreferrer">
            <Icon inline icon={External} class="fill-current" />
            {t('Ficha en Pokémon DB', 'Pokémon DB')}
          </a>
        {/if}
      </div>
    {:else}
      <p class="lx-caja-vacia">{t('Elige un Pokémon de la caja.', 'Pick a Pokémon from the box.')}</p>
    {/if}
  </aside>
</div>

<style>
  .lx-caja {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(260px, 340px);
    gap: 28px;
    align-items: start;
    margin-top: 18px;
  }
  @media (max-width: 900px) {
    .lx-caja {
      grid-template-columns: minmax(0, 1fr);
    }
  }

  /* Marco de la caja */
  .lx-caja-pc {
    border: 3px solid var(--lx-tinta);
    border-radius: var(--lx-radio);
    background: var(--lx-panel);
    box-shadow: var(--lx-sombra);
    overflow: hidden;
  }
  .lx-caja-cabecera {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    padding: 8px 10px;
    background: linear-gradient(var(--lx-rojo-claro), var(--lx-rojo));
    border-bottom: 3px solid var(--lx-tinta);
    color: #fff;
  }
  .lx-caja-nombre {
    font-family: 'VT323', monospace;
    font-size: 28px;
    line-height: 1;
    letter-spacing: 3px;
    text-shadow: 2px 2px 0 rgba(0, 0, 0, 0.45);
    display: inline-flex;
    align-items: baseline;
    gap: 10px;
  }
  .lx-caja-nombre small {
    font-size: 18px;
    letter-spacing: 1px;
    opacity: 0.85;
  }
  .lx-caja-flecha {
    width: 34px;
    height: 30px;
    border-radius: 8px;
    border: 2px solid var(--lx-tinta);
    background: #fff;
    color: var(--lx-rojo);
    font-size: 14px;
    box-shadow: 2px 2px 0 rgba(0, 0, 0, 0.3);
  }
  .lx-caja-flecha:disabled {
    opacity: 0.35;
    box-shadow: none;
  }
  .lx-caja-flecha:not(:disabled):active {
    transform: translate(2px, 2px);
    box-shadow: none;
  }

  /* Fondo de la caja: cuadrícula suave */
  .lx-caja-rejilla {
    display: grid;
    grid-template-columns: repeat(6, minmax(0, 1fr));
    gap: 8px;
    padding: 18px 16px 16px;
    background-color: #cfe8d8;
    background-image: linear-gradient(45deg, rgba(255, 255, 255, 0.35) 25%, transparent 25%, transparent 75%, rgba(255, 255, 255, 0.35) 75%),
      linear-gradient(45deg, rgba(255, 255, 255, 0.35) 25%, transparent 25%, transparent 75%, rgba(255, 255, 255, 0.35) 75%);
    background-size: 36px 36px;
    background-position: 0 0, 18px 18px;
  }
  :global(html.dark) .lx-caja-rejilla {
    background-color: #183a30;
    background-image: linear-gradient(45deg, rgba(255, 255, 255, 0.04) 25%, transparent 25%, transparent 75%, rgba(255, 255, 255, 0.04) 75%),
      linear-gradient(45deg, rgba(255, 255, 255, 0.04) 25%, transparent 25%, transparent 75%, rgba(255, 255, 255, 0.04) 75%);
  }

  .lx-hueco {
    position: relative;
    aspect-ratio: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 10px;
    background: rgba(255, 255, 255, 0.55);
    border: 2px solid rgba(27, 27, 31, 0.18);
    transition: transform 0.1s, border-color 0.1s, background 0.1s;
    cursor: pointer;
  }
  :global(html.dark) .lx-hueco {
    background: rgba(255, 255, 255, 0.06);
    border-color: rgba(255, 255, 255, 0.1);
  }
  .lx-vacio {
    cursor: default;
    background: rgba(255, 255, 255, 0.22);
    border-style: dashed;
  }
  :global(html.dark) .lx-vacio {
    background: transparent;
  }
  button.lx-hueco:hover {
    border-color: var(--lx-tinta);
    background: rgba(255, 255, 255, 0.85);
  }
  :global(html.dark) button.lx-hueco:hover {
    border-color: #9ca3af;
    background: rgba(255, 255, 255, 0.12);
  }
  button.lx-hueco:focus-visible {
    outline: 3px solid var(--lx-amarillo);
    outline-offset: 1px;
  }
  .lx-sel {
    border-color: var(--lx-rojo) !important;
    background: #fff !important;
    box-shadow: 0 0 0 2px var(--lx-rojo), 3px 3px 0 rgba(0, 0, 0, 0.2);
  }
  :global(html.dark) .lx-sel {
    background: rgba(255, 255, 255, 0.16) !important;
  }
  .lx-hueco :global(.lx-hueco-icono) {
    transform: scale(2);
    image-rendering: pixelated;
  }
  .lx-sel :global(.lx-hueco-icono) {
    animation: lx-salto 0.6s steps(2) infinite;
  }
  @keyframes lx-salto {
    50% {
      transform: scale(2) translateY(-2px);
    }
  }
  .lx-mano {
    position: absolute;
    top: -15px;
    left: 50%;
    transform: translateX(-50%);
    color: var(--lx-rojo);
    font-size: 14px;
    line-height: 1;
    text-shadow: 1px 1px 0 var(--lx-tinta);
    animation: lx-mano 0.8s ease-in-out infinite;
    z-index: 2;
  }
  @keyframes lx-mano {
    50% {
      transform: translate(-50%, -3px);
    }
  }
  .lx-hueco-equipo-marca {
    position: absolute;
    right: 2px;
    bottom: 1px;
    font-size: 13px;
    color: var(--lx-rojo);
    filter: drop-shadow(0 1px 0 #fff);
  }
  .lx-hueco-shiny {
    position: absolute;
    left: 4px;
    top: 1px;
    font-size: 13px;
    color: #f59e0b;
    text-shadow: 0 1px 0 #fff;
  }
  .lx-caja-vacia {
    padding: 14px;
    text-align: center;
    color: var(--lx-texto-suave);
  }

  /* Panel de detalle */
  .lx-caja-detalle {
    padding: 0 0 14px;
    position: sticky;
    top: 96px;
  }
  .lx-det-cabecera {
    display: flex;
    gap: 12px;
    align-items: center;
    padding: 12px 14px;
    border-bottom: 3px solid var(--lx-tinta);
  }
  .lx-det-sprite {
    position: relative;
    width: 112px;
    height: 112px;
    flex: none;
    border-radius: 12px;
    background: radial-gradient(circle at 50% 60%, rgba(142, 232, 255, 0.25), transparent 70%);
  }
  .lx-det-sprite {
    display: grid;
    place-items: center;
  }
  .lx-det-sprite img {
    width: 100%;
    height: 100%;
    object-fit: contain;
    image-rendering: pixelated;
    filter: drop-shadow(2px 3px 0 rgba(0, 0, 0, 0.45));
  }
  .lx-det-sprite :global(.lx-det-brillo) {
    position: absolute;
    right: 0;
    top: 0;
    color: #fde68a;
    font-size: 22px;
  }
  .lx-det-particulas {
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    z-index: 10;
  }
  .lx-det-nombres h3 {
    font-family: 'VT323', monospace;
    font-size: 30px;
    line-height: 1;
    color: #f7f7f2;
    letter-spacing: 0.5px;
    word-break: break-word;
  }
  .lx-det-especie {
    font-family: 'VT323', monospace;
    font-size: 19px;
    color: var(--lx-lcd-texto);
  }
  .lx-det-tipos {
    display: flex;
    gap: 4px;
    margin-top: 6px;
  }

  .lx-det-datos {
    display: grid;
    gap: 6px;
    padding: 12px 16px 4px;
    font-size: 14px;
  }
  .lx-det-datos div {
    display: grid;
    grid-template-columns: 96px minmax(0, 1fr);
    align-items: center;
    gap: 8px;
  }
  .lx-det-datos dt {
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--lx-texto-suave);
  }
  .lx-det-medallas {
    display: flex;
    flex-wrap: wrap;
    gap: 2px;
  }

  .lx-det-stats {
    display: grid;
    grid-template-columns: 82px 34px minmax(0, 1fr);
    align-items: center;
    gap: 5px 8px;
    padding: 10px 16px 6px;
    font-size: 13px;
  }
  .lx-stat-nombre {
    color: var(--lx-texto-suave);
  }
  .lx-stat-valor {
    text-align: right;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
  }
  .lx-stat-barra {
    height: 10px;
    border-radius: 5px;
    background: var(--lx-panel-2);
    border: 1.5px solid var(--lx-tinta);
    overflow: hidden;
  }
  .lx-stat-barra i {
    display: block;
    height: 100%;
    border-right: 1.5px solid var(--lx-tinta);
  }
  .lx-stat-total {
    margin-top: 4px;
    color: var(--lx-texto);
    font-weight: 700;
  }

  .lx-det-acciones {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    padding: 10px 16px 0;
  }
  .lx-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 10px;
    font-size: 13px;
    font-weight: 600;
    border: 2px solid var(--lx-tinta);
    border-radius: var(--lx-radio-sm);
    background: var(--lx-panel);
    color: var(--lx-texto);
    box-shadow: var(--lx-sombra-sm);
    transition: color 0.12s, background 0.12s;
  }
  :global(html.dark) .lx-btn {
    border-color: #6b7280;
  }
  .lx-btn:hover {
    color: var(--lx-rojo);
  }
  .lx-btn:active {
    transform: translate(2px, 2px);
    box-shadow: none;
  }
  .lx-btn :global(picture),
  .lx-btn :global(img),
  .lx-btn :global(span:has(> img)) {
    width: 22px !important;
    height: 22px !important;
    margin: -4px -2px;
    display: inline-block;
    object-fit: contain;
  }
  .lx-btn-glifo {
    font-size: 11px;
    color: #16a34a;
  }
  .lx-btn-activo {
    background: var(--lx-acento-suave);
    color: var(--lx-rojo);
  }
  .lx-btn-peligro:hover {
    background: var(--lx-rojo);
    color: #fff;
  }
</style>
