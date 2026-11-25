<script>
  import Themes from '$data/theme.json'
  import { Expanded as Games } from '$data/games.js'
  import { Logo as Picture } from '$c/core'
  import { Hero } from '$c/Guide'

  import { toSlug } from '$lib/utils/string'
  import { IMG } from '$lib/utils/rewrites'

  import { Logo } from '$lib/components/core'
  import { coincideJuego, nombreJuego } from '$lib/lockedex/juegos.js'
  import { idioma } from '$lib/lockedex/idioma.js'

  const es = idioma() === 'es'
  let busqueda = ''
  const claves = Object.keys(Games)
  $: lista = Object.values(Games)
    .map((g, i) => ({ ...g, clave: claves[i] }))
    .filter((g) => coincideJuego(g.clave, g, busqueda))

  const title = `Lockedex | Guías Nuzlocke`
  const description = `Find guides to Nuzlocking every Pokémon game from Generation 1 to 8 as well as some of the most popular Rom Hacks.`
</script>

<svelte:head>
  <title>{title}</title>
  <meta property=og:title content={title} />
  <meta property=twitter:title content={title} />

  <meta content={description} name=description />
  <meta content={description} name=twitter:description  />
</svelte:head>

<Hero theme={['#ff3355', '#a8061f', '#fff']}>
  <svelte:fragment slot=hero>
    <div>
      <small>Lockedex</small>
      <h1 data-lx-original>{es ? 'Guías Nuzlocke de Pokémon' : 'Pokémon Nuzlocke Guides'}</h1>
    </div>
  </svelte:fragment>
</Hero>

<div class="lx-buscar-guia" data-lx-original>
  <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="2.4" fill="none" /><path d="m20 20-4-4" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" /></svg>
  <!-- svelte-ignore a11y-autofocus -->
  <input
    type="search"
    bind:value={busqueda}
    autofocus
    placeholder={es ? 'Buscar guía… (Esmeralda, Platino, Radical Red, gen 4…)' : 'Search guide… (Emerald, Platinum, Radical Red, gen 4…)'}
  />
  {#if busqueda}<span>{lista.length} {es ? (lista.length === 1 ? 'guía' : 'guías') : lista.length === 1 ? 'guide' : 'guides'}</span>{/if}
</div>

<main>
  {#if !lista.length}
    <p class="lx-sin-guias" data-lx-original>{es ? `No hay ninguna guía que coincida con «${busqueda}».` : `No guide matches “${busqueda}”.`}</p>
  {/if}
  {#each lista as { clave, logo, difficulty, region, title, gen, pid, lastUpdated = '9th Jan 2022'} (clave)}
    <a
      title='{title} Guide'
      style='--col1:{Themes?.[pid]?.[0]};--col2:{Themes?.[pid]?.[1]}'
      href='/guides/{toSlug(title)}'
    >
      <div>
        <div>
            <Logo
              logo="{logo}"
              alt={title + ' logo'}
              role="presentation"
              aspect=180x90
              class=drop-shadow-mark/>
        </div>
        <div>
          {#if es}
            <h2 data-lx-original>Guía Nuzlocke de Pokémon {nombreJuego(clave, { title })}</h2>
            <p data-lx-original>
              Todos los encuentros y combates contra jefes de Pokémon {nombreJuego(clave, { title })}
              para que llegues a campeón de la región de {region[0].toUpperCase() + region.slice(1)}.
            </p>
            <small>
              <span>{lastUpdated}</span>
              <span data-lx-original>Ver guía</span>
            </small>
          {:else}
            <h2>Pokémon {title} Nuzlocke Guide</h2>
            <p>
              See every Pokémon encounter & boss battle you'll face in
              Pokémon {title} to help you become the champion of the
              {region} region.
            </p>
            <small>
              <span>{lastUpdated}</span>
              <span>Read More</span>
            </small>
          {/if}
        </div>

        {#if difficulty}
          <span>

            <small class='lx-dificultad absolute top-2 left-2 z-40'>
              {difficulty}
            </small>
            </span>
          {/if}
      </div>
    </a>
  {/each}
</main>

<style lang="postcss">
  .lx-buscar-guia {
    display: flex;
    align-items: center;
    gap: 8px;
    max-width: 640px;
    margin: 28px auto -20px;
    padding: 8px 14px;
    border: 3px solid #1b1b1f;
    border-radius: 12px;
    background: #fff;
    box-shadow: 4px 4px 0 rgba(0, 0, 0, 0.15);
    position: relative;
    z-index: 30;
  }
  :global(.dark) .lx-buscar-guia {
    background: #111827;
  }
  .lx-buscar-guia svg {
    width: 20px;
    height: 20px;
    opacity: 0.6;
  }
  .lx-buscar-guia input {
    flex: 1;
    border: 0;
    outline: none;
    background: transparent;
    font-size: 16px;
  }
  .lx-buscar-guia span {
    font-family: 'VT323', monospace;
    font-size: 18px;
    opacity: 0.7;
  }
  .lx-dificultad {
    padding: 2px 10px;
    font-family: 'VT323', monospace;
    font-size: 16px;
    letter-spacing: 1px;
    color: var(--lx-amarillo);
    background: var(--lx-lcd);
    border: 2px solid var(--lx-tinta);
    border-radius: 6px;
  }
  .lx-sin-guias {
    width: 100%;
    text-align: center;
    opacity: 0.6;
    padding: 30px 0;
  }
  main {
    @apply flex flex-wrap max-w-6xl mx-auto px-4 md:px-12 mt-12 pb-40
  }

  h1 {
    @apply text-6xl font-bold max-w-xl mt-1 mb-12 leading-normal text-center mx-auto
  }

  small {
    display: flex;
    @apply uppercase tracking-widest text-center block mx-auto
  }

  div {
    @apply mx-auto
  }

  main > a {
    @apply flex w-full md:w-1/2 lg:w-1/3 p-2
  }

  /* Tarjetas de guía: contorno de tinta, cabecera con el color del juego y sombra plana */
  main > a > div {
    @apply transition overflow-hidden relative;
    background: var(--lx-panel);
    border: 3px solid var(--lx-tinta);
    border-radius: var(--lx-radio);
    box-shadow: var(--lx-sombra);
  }

  main > a > div:hover {
    transform: translate(-2px, -3px);
    box-shadow: 7px 8px 0 rgba(0, 0, 0, 0.2);
  }

  :global(.dark) main > a > div {
    background: var(--lx-panel);
  }

  div > div:first-child + div {
    @apply px-4 py-4 tracking-widest leading-normal;
  }

  h2 {
    @apply mb-2;
    font-family: 'VT323', monospace;
    font-size: 24px;
    line-height: 1.05;
    letter-spacing: 0.3px;
  }

  p {
    @apply text-sm pb-8
  }

  :global(.dark) p {
    @apply text-gray-400
  }

  div div:first-child {
    background: repeating-linear-gradient(135deg, rgba(255, 255, 255, 0.06) 0 2px, transparent 2px 7px),
      linear-gradient(130deg, var(--col1), var(--col2));
    border-bottom: 3px solid var(--lx-tinta);
    @apply px-3 py-6 md:py-4 flex justify-center rounded-none;
  }

  :global(.drop-shadow-mark) {
    transform: none !important;
  }

  p + small {
    @apply flex justify-between left-4 absolute bottom-3 right-4 m-0 mt-2 font-medium text-gray-600
  }

  :global(.dark) p + small {
    @apply text-gray-200
  }

</style>
