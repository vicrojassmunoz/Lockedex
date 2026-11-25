<script>
  export let logo, title, theme, pid, description
  import { Logo as Picture } from '$c/core'
  import { IMG } from '$lib/utils/rewrites'
  import { t } from '$lib/lockedex/idioma'
  import ThemeToggle from '$c/theme-toggle.svelte'
  import Icon from '@iconify/svelte/dist/OfflineIcon.svelte'
  import { Home } from '$icons'
  import { Track } from '$icons'

  import { savedGames, createGame } from '$store'

  const onnew = () => {
    savedGames.update(createGame(title + ' Nuzlocke', pid))
    window.location = '/game'
  }
</script>

<header
  style="--col1: {theme?.[0]}; --col2: {theme?.[1]}; --col3: {theme?.[2] ||
    '#000'}"
>
  <div class="g-container nav lx-nav-vieja">
    <a title="Home" href="/">
      <Icon inline={true} height="1.4rem" icon={Home} class="fill-current" />
    </a>
    <div>
      <ThemeToggle />
    </div>
  </div>

  <div class="g-container hero">
    {#if $$slots.hero}
      <slot name="hero" />
    {:else}
      <div>
        <small>Lockedex</small>
        <h1 data-lx-original>{t(`Guía Nuzlocke de Pokémon ${title}`, `Pokémon ${title} Nuzlocke Guide`)}</h1>

        <p data-lx-original>
          {#if description}
            {@html description}
          {:else if t('es', 'en') === 'es'}
            Todo lo que necesitas para un <strong>Nuzlocke de {title}</strong>: los Pokémon disponibles en cada zona,
            el número de encuentros y los equipos completos de todos los <strong>jefes</strong>.
          {:else}
            This guide contains useful information for a <strong
              >{title} Nuzlocke</strong
            >. Lists of all of the available Pokémon, the number of encounters,
            and detailed overviews of all <strong>Boss battles</strong>.
          {/if}
        </p>

        <button on:click={onnew} data-lx-original>
          <span>
            {t('Empezar partida', 'Start tracking')}
            <Icon
              inline={true}
              icon={Track}
              class="ml-2 translate-y-1 fill-current"
              height="1.4rem"
            />
          </span>
        </button>
      </div>

      <div>
        <Picture
          logo="{logo}"
          alt="{title} Logo"
          role="presentation"
          loading="eager"
          aspect="384x192"
          class="drop-shadow-mark h-32 w-auto md:-mt-16 md:h-auto"
        />
      </div>
    {/if}
  </div>

  <div class="lx-hero-borde" aria-hidden="true" />
</header>

<slot />

{#if !$$slots.hero}
  <div
    class="end g-container"
    style="--col1: {theme?.[0]}; --col2: {theme?.[1]}; --col3: {theme?.[2] ||
      '#000'}"
  >
    <p data-lx-original>
      {#if t('es', 'en') === 'es'}
        ¿Listo para el <b>Nuzlocke de Pokémon {title}</b>? Lleva tus encuentros, tu equipo y los jefes en
        <b>Lockedex</b>.
      {:else}
        Now that you're ready to take on the <b>Pokémon {title} Nuzlocke Challenge</b>, why not keep track of all
        your encounters with <b>Lockedex</b>?
      {/if}

      <br />

      <button class="inverted" on:click={onnew}>
        {t('Empezar partida', 'Start tracking')}
        <Icon
          inline={true}
          icon={Track}
          class="ml-2 translate-y-1 fill-current"
          height="1.4rem"
        />
      </button>
    </p>
  </div>
{/if}

<style lang="postcss">
  /* Cabecera tipo chasis: color del juego con rayado fino y canto oscuro abajo */
  header {
    position: relative;
    color: var(--col3);
    background: repeating-linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0 2px, transparent 2px 7px),
      linear-gradient(150deg, var(--col1), var(--col2));
  }
  .lx-hero-borde {
    height: 12px;
    margin-top: 28px;
    background: rgba(0, 0, 0, 0.32);
    border-top: 3px solid rgba(0, 0, 0, 0.55);
    box-shadow: 0 3px 0 var(--lx-tinta);
  }

  small {
    font-family: 'VT323', monospace;
    font-size: 22px;
    letter-spacing: 3px;
    text-transform: uppercase;
  }

  p {
    @apply text-sm leading-6 tracking-wide;
  }

  h1 {
    @apply my-4 text-4xl font-bold tracking-wide md:text-6xl;
  }

  .g-container {
    @apply flex flex-col-reverse items-start md:flex-row md:justify-between;
  }
  .g-container h1 {
    @apply max-w-3xl;
  }
  .g-container p {
    @apply max-w-xl;
  }
  .g-container > div {
    @apply relative;
  }

  :global(svg.waves) {
    @apply relative lg:-mt-24;
  }
  :global(.drop-shadow-mark) {
    @apply -translate-y-1/4 md:translate-y-1/4;
    filter: drop-shadow(4px 6px 0 rgba(0, 0, 0, 0.35));
  }

  button {
    @apply z-50 my-6 cursor-pointer px-6 py-3 text-xl font-medium tracking-wide opacity-100 transition;
    background-color: var(--col3);
    border: 3px solid var(--lx-tinta);
    border-radius: var(--lx-radio-sm);
    box-shadow: 4px 4px 0 rgba(0, 0, 0, 0.35);
    cursor: pointer;
  }
  button:active {
    transform: translate(3px, 3px);
    box-shadow: none;
  }

  button.inverted {
    @apply mx-auto flex text-white;
    background: linear-gradient(130deg, var(--col1), var(--col2));
  }

  button:hover {
    opacity: 0.85;
  }

  button span {
    @apply flex;
    color: var(--col1);
  }

  header div:first-child {
    z-index: 60;
    position: relative;
  }

  .hero {
    @apply pt-20;
  }
  .nav {
    @apply flex flex-row justify-between py-4;
  }
  .nav div {
    @apply -mt-2;
  }
  .end {
    @apply mt-12 -mb-6 text-center;
  }
  .end p {
    @apply mx-auto text-base leading-loose;
  }

  header :global(svg) {
    @apply translate-y-px;
  }
</style>
