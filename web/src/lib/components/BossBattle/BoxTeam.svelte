<script>
  // Equipo y Caja de la ventana del VS, como el PC de los juegos: seis huecos de equipo arriba y la caja
  // abajo con el fondo de cuadros, iconos a ×2 y salto a dos fotogramas al pasar por encima.
  import { createEventDispatcher } from 'svelte'
  import { crossfade } from 'svelte/transition'
  import { flip } from 'svelte/animate'

  import { PIcon } from '$c/core'
  import { t } from '$lib/lockedex/idioma.js'
  import { encajarIcono } from '$lib/lockedex/encajar.js'

  import { chunk } from '$utils/arr'
  import { locid } from '$utils/pokemon'

  const [send, receive] = crossfade({ duration: 200 })
  const dispatch = createEventDispatcher()

  export let team = [],
    box = []

  const POR_CAJA = 6 * 3

  $: teamList = team.map((t) => locid(t?.original))
  $: boxList = box
    .filter((i) => !teamList.includes(locid(i?.original)))
    .sort((a, b) => b.total - a.total)

  let page = 0,
    pages,
    max

  $: (pages = chunk(boxList, POR_CAJA)), (max = Math.max(pages.length - 1, 0))
  $: if (page > max) page = max

  const select = (poke) => () => dispatch('select', poke)
  const clear = () => dispatch('clear')
  const reset = () => dispatch('reset')
</script>

<div class="lx-bt">
  <div class="lx-bt-bloque">
    <div class="lx-bt-cabecera">
      <h2>{t('Equipo', 'Team')}</h2>
      <span class="lx-bt-acciones">
        <button disabled={team.length == 0} on:click={clear} class="lx-bt-enlace">
          {t('Vaciar', 'Clear')}
        </button>
        <button on:click={reset} class="lx-bt-enlace">{t('Restablecer', 'Reset')}</button>
      </span>
    </div>

    <ul class="lx-bt-rejilla lx-bt-equipo">
      {#each team as poke (locid(poke.original))}
        {@const og = poke.original}
        <button
          title={t(`Sacar a ${og.pokemon} del equipo`, `Remove ${og.pokemon} from team`)}
          class="lx-bt-hueco lx-bt-lleno"
          on:click={select(og)}
          animate:flip={{ duration: 200 }}
          in:receive={{ key: locid(og) }}
          out:send|local={{ key: locid(og) }}
          use:encajarIcono={{ nombre: og.pokemon, max: 60, escala: 2 }}
        >
          <PIcon class="lx-bt-icono lx-encajar" name={og.pokemon} />
        </button>
      {/each}
      {#each Array(Math.max(0, 6 - team.length)) as _}
        <div class="lx-bt-hueco lx-bt-libre">
          <img class="lx-hueco-ball" src="/lx/objetos/poke-ball.png" alt="" aria-hidden="true" />
        </div>
      {/each}
    </ul>
  </div>

  <div class="lx-bt-bloque">
    <div class="lx-bt-cabecera">
      <h2>
        {t('Caja', 'Box')}
        {#if pages.length > 1}<small>{page + 1}/{pages.length}</small>{/if}
      </h2>
      {#if pages.length > 1}
        <span class="lx-bt-flechas">
          <button disabled={page === 0} on:click={() => (page -= 1)} title={t('Caja anterior', 'Previous box')}>◀</button>
          <button disabled={page === max} on:click={() => (page += 1)} title={t('Caja siguiente', 'Next box')}>▶</button>
        </span>
      {/if}
    </div>

    <ul class="lx-bt-rejilla lx-bt-caja">
      {#key page}
        {#each pages[page] || [] as poke (locid(poke.original))}
          {@const og = poke.original}
          <button
            title={team.length === 6
              ? t('¡Tu equipo está lleno!', 'Your team is full!')
              : t(`Meter a ${og.pokemon} en el equipo`, `Add ${og.pokemon} to your team`)}
            class="lx-bt-hueco"
            disabled={team.length === 6}
            on:click={select(og)}
            animate:flip={{ duration: 200 }}
            in:receive={{ key: locid(og) }}
            out:send|local={{ key: locid(og) }}
            use:encajarIcono={{ nombre: og.pokemon, max: 60, escala: 2 }}
          >
            <PIcon class="lx-bt-icono lx-encajar" name={og.pokemon} />
          </button>
        {/each}
      {/key}
      {#if !boxList.length}
        <li class="lx-bt-vacia">{t('No queda nadie en la caja', 'Nobody left in the box')}</li>
      {/if}
    </ul>
  </div>
</div>

<style>
  .lx-bt {
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-top: 16px;
    width: 100%;
  }
  .lx-bt-cabecera {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    margin-bottom: 6px;
  }
  h2 {
    font-family: 'LX Pixel', 'VT323', monospace;
    font-size: 24px;
    line-height: 24px;
    font-weight: normal;
  }
  h2 small {
    font-size: 12px;
    margin-left: 6px;
    opacity: 0.7;
  }
  .lx-bt-acciones {
    display: flex;
    gap: 14px;
  }
  .lx-bt-enlace {
    font-size: 12px;
    text-decoration: underline;
    text-underline-offset: 2px;
    opacity: 0.6;
  }
  .lx-bt-enlace:hover:enabled {
    opacity: 1;
  }
  .lx-bt-enlace:disabled {
    opacity: 0.3;
  }
  .lx-bt-flechas {
    display: flex;
    gap: 4px;
  }
  .lx-bt-flechas button {
    width: 26px;
    height: 22px;
    font-size: 12px;
    color: #f8f8f8;
    background: #283850;
    clip-path: polygon(2px 0, calc(100% - 2px) 0, 100% 2px, 100% calc(100% - 2px), calc(100% - 2px) 100%, 2px 100%, 0 calc(100% - 2px), 0 2px);
  }
  .lx-bt-flechas button:disabled {
    opacity: 0.3;
  }

  /* Rejillas de seis columnas: el equipo sobre el verde azulado del menú y la caja con el fondo de
     cuadros del PC */
  .lx-bt-rejilla {
    display: grid;
    grid-template-columns: repeat(6, 64px);
    gap: 6px;
    padding: 8px;
    width: fit-content;
    border: 2px solid var(--lx-tinta);
    clip-path: polygon(4px 0, calc(100% - 4px) 0, 100% 4px, 100% calc(100% - 4px), calc(100% - 4px) 100%, 4px 100%, 0 calc(100% - 4px), 0 4px);
  }
  .lx-bt-equipo {
    background: repeating-linear-gradient(0deg, rgba(255, 255, 255, 0.08) 0 2px, transparent 2px 4px), #2f6f63;
  }
  .lx-bt-caja {
    min-height: 84px;
    background-color: #cfe8d8;
    background-image: linear-gradient(45deg, rgba(255, 255, 255, 0.35) 25%, transparent 25%, transparent 75%, rgba(255, 255, 255, 0.35) 75%),
      linear-gradient(45deg, rgba(255, 255, 255, 0.35) 25%, transparent 25%, transparent 75%, rgba(255, 255, 255, 0.35) 75%);
    background-size: 32px 32px;
    background-position: 0 0, 16px 16px;
  }
  :global(html.dark) .lx-bt-caja {
    background-color: #183a30;
    background-image: linear-gradient(45deg, rgba(255, 255, 255, 0.04) 25%, transparent 25%, transparent 75%, rgba(255, 255, 255, 0.04) 75%),
      linear-gradient(45deg, rgba(255, 255, 255, 0.04) 25%, transparent 25%, transparent 75%, rgba(255, 255, 255, 0.04) 75%);
  }
  .lx-bt-vacia {
    grid-column: 1 / -1;
    align-self: center;
    text-align: center;
    font-size: 12px;
    color: #405048;
  }
  :global(html.dark) .lx-bt-vacia {
    color: #b8d0c8;
  }

  .lx-bt-hueco {
    position: relative;
    width: 64px;
    height: 56px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .lx-bt-lleno {
    background: rgba(255, 255, 255, 0.16);
    box-shadow: inset 0 0 0 2px rgba(255, 255, 255, 0.35);
  }
  .lx-bt-lleno:hover {
    background: rgba(220, 10, 45, 0.35);
  }
  .lx-bt-libre {
    background: rgba(0, 0, 0, 0.15);
  }
  .lx-bt-caja .lx-bt-hueco:hover:enabled {
    background: rgba(255, 255, 255, 0.55);
  }
  .lx-bt-hueco:disabled {
    filter: grayscale(1);
    opacity: 0.6;
  }
  /* Hueco libre del equipo: Poké Ball apagada, como un hueco vacío del menú de los juegos */
  .lx-hueco-ball {
    width: 32px;
    height: 32px;
    image-rendering: pixelated;
    filter: grayscale(1) opacity(0.45);
  }

  .lx-bt-hueco :global(.lx-bt-icono) {
    pointer-events: none;
    transform: scale(var(--lx-esc, 2));
    image-rendering: pixelated;
  }
  .lx-bt-caja :global(.lx-bt-icono) {
    transform: scale(calc(var(--lx-esc, 2) * -1), var(--lx-esc, 2));
  }
  /* Salto a dos fotogramas, como el icono del menú de equipo de la GBA */
  .lx-bt-lleno :global(.lx-bt-icono) {
    animation: lx-bt-salto 1s steps(1, end) infinite;
  }
  .lx-bt-caja .lx-bt-hueco:hover:enabled :global(.lx-bt-icono) {
    animation: lx-bt-salto-caja 0.5s steps(1, end) infinite;
  }
  @keyframes lx-bt-salto {
    50% {
      transform: scale(var(--lx-esc, 2)) translateY(-2px);
    }
  }
  @keyframes lx-bt-salto-caja {
    50% {
      transform: scale(calc(var(--lx-esc, 2) * -1), var(--lx-esc, 2)) translateY(-2px);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .lx-bt-hueco :global(.lx-bt-icono) {
      animation: none !important;
    }
  }
</style>
