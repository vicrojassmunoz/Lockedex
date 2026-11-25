<script>
  import {
    activeGame,
    savedGames,
    updateGame,
    parse,
    readdata,
    getGameStore
  } from '$lib/store'
  import { fade, fly } from 'svelte/transition'

  import { browser } from '$app/environment'
  import { page } from '$app/stores'

  import { MiniTeamController } from '$c/TeamBuilder'

  let game = {},
    games
  activeGame.subscribe((id) => {
    savedGames.subscribe(
      parse((g) => {
        game = g[id]
        games = Object.values(g).filter((i) => i.id !== id)
      })
    )
  })

  const load = (game) => {
    $activeGame = game.id
    document.body.style = 'opacity: 0; transition: opacity: 0.2s'
    window.location.reload()
  }

  // Abandonar la run: nuevo intento (lo que se consiguió queda en el historial de intentos)
  const reset = (_) => {
    if (
      !window.confirm(
        t(
          'Esto vacía la run: encuentros, equipo y caja. Lo conseguido queda en tu historial de intentos. ¿Seguro?',
          "This will reset all data for this run, including your encounters, team & box. What you achieved stays in your attempt history. Are you sure?"
        )
      )
    )
      return
    const [, , id] = readdata()
    nuevoIntento(id)
  }

  import ThemeToggle from '$lib/components/theme-toggle.svelte'
  import { nuevoIntento } from '$lib/lockedex/derrotas.js'
  import { t } from '$lib/lockedex/idioma.js'
  import { Icon, Logo, Button, Popover } from '$lib/components/core'
  import { Box, Save, Game, Grave, Caret, CaretRight, Dots } from '$icons'

  const pages = [
    { name: 'Game', link: '/game', icon: Game },
    { name: 'Box', link: '/box', icon: Box },
    { name: 'Grave', link: '/graveyard', icon: Grave }
  ]
</script>

<svelte:head>
  <title>Lockedex | {game?.name || ''}</title>
</svelte:head>

<nav class="lx-cabecera-partida lx-lcd {$page.url.pathname.replace('/', '')}">
  <div class="p-container">
    <div class="inline-flex items-center">
      <a href="/" class="{$$restProps.class || ''} home group">
        {#if game?.game}
          <Logo
            logo="{game?.game}"
            pictureClass="game--{game?.game}"
            class="h-10 w-auto max-md:pt-2 sm:w-20 md:mr-4 md:h-auto"
            alt="{game?.game} logo"
            aspect="192x96"
          />

          <h1
            in:fade
            class="hidden group-hover:border-black dark:group-hover:border-white lg:block lg:line-clamp-1"
            class:sm:text-xl={game?.name?.length <= 20}
            class:sm:text-lg={game?.name?.length > 20}
          >
            {(game?.name || '').slice(0, 30)}{game?.name?.length > 30
              ? '...'
              : ''}
          </h1>
        {/if}
      </a>

      {#if browser}
        <Popover
          title="Load & manage game saves"
          position={window?.innerWidth < 700 ? 'bottom' : 'right'}
        >
          <span class="inline-flex">
            <Icon
              inline={true}
              class="ml-2 fill-current transition"
              icon={Save}
            />
            <Icon
              inline={true}
              class="-ml-0.5 hidden fill-current transition sm:block"
              icon={CaretRight}
            />
            <Icon
              inline={true}
              class="-ml-0.5 block fill-current transition sm:hidden"
              icon={Caret}
            />
          </span>

          <ul
            in:fly={{ duration: 250, y: 50 }}
            out:fade|local={{ duration: 100 }}
            class="popover mt-6 ml-4 flex max-h-[80vh] w-60 flex-col divide-y overflow-scroll rounded-xl bg-white shadow-lg dark:divide-gray-700 dark:bg-gray-900 sm:mt-4 sm:ml-2"
            slot="popover"
          >
            <strong
              class="z-50 -mb-px rounded-t-xl bg-black py-3 px-4 text-white dark:bg-black sm:bg-gray-800"
              >Games</strong
            >

            {#each games as game}
              <button on:click={load(game)}>
                <li
                  class="inline-flex w-full cursor-pointer items-center justify-between px-4 py-2 text-left text-sm text-gray-600 transition hover:text-blue-400 dark:text-gray-200 dark:hover:text-blue-500"
                  title="Load game {game.name}"
                >
                  {game.name}
                  <Logo
                    alt="{game.name} logo"
                    logo="{game?.game}"
                    class="ml-2 w-16"
                    aspect="192x96"
                  />
                </li>
              </button>
            {/each}

            <li class="px-4 py-3 text-center">
              <Button on:click={reset} rounded solid class="w-full text-sm"
                >New Attempt</Button
              >
              <p class="pt-2 text-xs italic leading-4 opacity-50">
                Abandon your <b>{game?.name || ''}</b> run, reset all encounters
                and start attempt {+(game?.attempts || 1) + 1}
              </p>
            </li>
          </ul>
        </Popover>
      {/if}
    </div>

    {#if $page.url.pathname !== '/graveyard'}<MiniTeamController />{/if}

    <span class="relative inline-flex">
      <span class="lx-nav-vieja"><ThemeToggle /></span>

      {#each pages as p}
        <a
          class="link"
          class:active={p.link == $page.url.pathname}
          href={p.link}
        >
          <Icon inline={true} icon={p.icon} />
          {p.name}
        </a>
      {/each}
    </span>
  </div>
</nav>

<style lang="postcss">
  /* Cabecera de la partida: franja de pantalla oscura (LCD) con el equipo y las pestañas */
  nav {
    position: fixed;
    z-index: 5000;
    @apply container mx-auto mb-8 md:mb-2;
    border-bottom: 3px solid var(--lx-tinta);
  }

  nav :global(.p-container) {
    @apply px-0;
  }

  @media (min-width: theme('screens.sm')) {
    nav {
      width: 100%;
      left: 0;
      right: 0;
    }

    /* Difuminado para que el contenido pase por debajo sin corte brusco */
    nav::before {
      content: '';
      background: linear-gradient(var(--lx-pantalla) 30%, transparent);
      pointer-events: none;
      @apply absolute -bottom-6 h-5 w-full;
    }

    nav.graveyard::before {
      display: none;
    }
  }

  h1 {
    @apply -mb-1.5 border-b-2 border-transparent transition sm:mb-0;
    font-family: 'VT323', monospace;
    font-size: 24px;
    letter-spacing: 1px;
    color: #f7f7f2;
  }

  a.home {
    @apply ml-4 -mt-4 inline-flex h-12 items-center md:mt-0 md:-ml-2;
  }
  a.home :global(img) {
    filter: drop-shadow(0 2px 0 rgba(0, 0, 0, 0.5));
  }

  a.link {
    @apply inline-flex items-center gap-x-1.5 p-2 px-3 transition md:p-4;
    font-family: 'VT323', monospace;
    font-size: 21px;
    line-height: 1;
    letter-spacing: 0.5px;
  }

  a.link.active {
    cursor: default;
    color: var(--lx-amarillo);
    background: rgba(255, 255, 255, 0.07);
    box-shadow: inset 0 -4px 0 var(--lx-amarillo);
  }
  a.link:not(.active) {
    cursor: pointer;
    color: rgba(142, 232, 255, 0.72);
  }
  a.link:not(.active):hover {
    color: #fff;
  }

  /* Huecos del equipo */
  nav :global(.lx-hueco-equipo) {
    border-radius: 10px;
    background: rgba(255, 255, 255, 0.06);
    box-shadow: inset 0 0 0 2px rgba(142, 232, 255, 0.22);
  }
  nav :global(.lx-hueco-equipo:hover) {
    box-shadow: inset 0 0 0 2px var(--lx-amarillo);
  }
  nav :global(.lx-silueta) {
    filter: invert(1) brightness(1.4);
    opacity: 0.25 !important;
  }
  nav :global(.lx-hueco-equipo:hover .lx-silueta) {
    opacity: 0.5 !important;
  }

  /* Botones de la cabecera (tema, partidas) en claro sobre la pantalla */
  nav :global(button),
  nav :global(.popover-trigger) {
    color: inherit;
  }

  :global(.game--sw),
  :global(.game--sh) {
    @apply -mr-4 -ml-4;
  }

  :global(.game--emkaizo) {
    @apply -mr-2 -ml-2;
  }

  @media (min-width: theme('screens.md')) {
    :global(.game--sw),
    :global(.game--sh) {
      @apply -mr-6 ml-0;
    }

    :global(.game--emkaizo) {
      @apply -mr-2 ml-0;
    }
  }
</style>
