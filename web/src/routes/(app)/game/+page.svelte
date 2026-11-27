<script>
  import { t, traducirNombre } from '$lib/lockedex/idioma'
  import AvisosReglas from '$lib/lockedex/AvisosReglas.svelte'
  import FinPartida from '$lib/lockedex/FinPartida.svelte'
  import SalonFama from '$lib/lockedex/SalonFama.svelte'
  import Sacrificio from '$lib/lockedex/Sacrificio.svelte'
  import Genlocke from '$lib/lockedex/Genlocke.svelte'
  import GeneradorHuevos from '$lib/lockedex/GeneradorHuevos.svelte'
  import IconoLx from '@iconify/svelte/dist/OfflineIcon.svelte'
  import { Diario as IconoDiario, Ficha as IconoFicha, Loop as IconoRecargar } from '$icons'
  import { leerReglas } from '$lib/lockedex/reglas.js'
  import TarjetaEntrenador from '$lib/lockedex/TarjetaEntrenador.svelte'
  import Diario from '$lib/lockedex/Diario.svelte'
  let runTerminada = false
  import { onMount, afterUpdate, getContext } from 'svelte'
  import { leerPartida, alCambiarDatos } from '$lib/lockedex/partida.js'
  import { zonaDelSav } from '$lib/lockedex/zonas.js'
  import { browser } from '$app/environment'
  import { fade, slide } from 'svelte/transition'

  import { Loader, Tabs } from '$lib/components/core'

  import { SupportBanner } from '$lib/components/navs'
  import { GameRoute, Search } from '$lib/components/Game'
  import { Settings } from '$lib/components/Settings'

  import Icon from '@iconify/svelte/dist/OfflineIcon.svelte'
  import { Arrow, Hide } from '$icons'

  import deferStyles from '$lib/utils/defer-styles'
  import debounce from '$lib/utils/debounce'

  import { Expanded as Games } from '$lib/data/games.js'
  import {
    getGameStore,
    read,
    readdata,
    savedGames,
    activeGame,
    updateGame,
    parse
  } from '$lib/store'

  let gameStore, gameKey, gameData
  const { open: abrirVentana } = getContext('simple-modal')
  const abrirFicha = () => abrirVentana(TarjetaEntrenador, { id: $activeGame })
  // Recargar la partida del emulador vinculada (o ir a vincularla). Lo hace Sincronizacion.svelte
  $: savVinculado = typeof window !== 'undefined' && $activeGame ? localStorage.getItem(`lockedex.savruta.${$activeGame}`) : null
  const recargarSav = () => window.dispatchEvent(new Event('lx:recargar-sav'))
  const abrirDiario = () => abrirVentana(Diario, { id: $activeGame })
  const abrirHuevos = () => abrirVentana(GeneradorHuevos, { id: $activeGame })
  // con el Egglocke activo, el generador de huevos a mano (se mira al cambiar de run o de datos)
  $: egglocke = !!($activeGame && gameData && leerReglas($activeGame).egglocke)
  let routeEl

  let search = ''

  let filter = 'nuzlocke'
  const filters = [
    { label: 'Nuzlocke', val: 'nuzlocke' },
    { label: 'Routes', val: 'route' },
    { label: 'Bosses', val: 'bosses' },
    { label: 'Upcoming', val: 'upcoming' }
  ]

  let routeFilter = 'all'
  let routeFilters = [
    { label: 'All', val: 'all' },
    { label: 'Upcoming', val: 'upcoming' },
    { label: 'Planned', val: 'planned' },
    { label: 'Missed', val: 'missed' }
  ]

  let bossFilter = 'all'
  const bossFilters = [
    { label: 'All', val: 'all' },
    { label: 'Gym leaders', val: 'gym-leader' },
    { label: 'Elite Four', val: 'elite-four' },
    { label: 'Rival fights', val: 'rival' },
    { label: 'Evil team', val: 'evil-team' }
  ]

  let route
  const fetchRoute = async (gen) => {
    if (route) return route
    const res = await fetch(`/api/route/${gen}.json`)
    route = await res.json()
    return route
  }

  onMount(() => {
    parse((saves) => {
      if (!browser) return
      let game = saves[$activeGame]
      if (!game.id) return
      savedGames.update(
        updateGame({
          ...game,
          updated: +new Date()
        })
      )
    })($savedGames)
  })

  afterUpdate(() => {
    deferStyles(`/assets/items/${gameKey}.css`)
  })

  const setup = () =>
    new Promise((resolve) => {
      console.time('setup')
      const [, key, id] = readdata()
      if (browser && !id) return (window.location = '/')

      gameStore = getGameStore(id)
      gameKey = key

      fetchRoute(Games[key].pid).then((r) => {
        console.timeEnd('setup')
        resolve(r)
      })

      gameStore.subscribe(
        read((game) => {
          console.timeLog('setup')
          gameData = game
        })
      )
    })

  const _onsearch = (e) => (search = e.detail.search)
  const onsearch = debounce(_onsearch, 350)

  // Con el .sav vinculado (RojoFuego, VerdeHoja y Esmeralda), la zona donde está tu personaje: el botón
  // pasa a ser «Estás en …». Se relee cada vez que llega una partida nueva del emulador
  let zonaSav = null
  const leerZonaSav = async () => {
    const p = $activeGame ? leerPartida($activeGame) : null
    zonaSav = p ? (await zonaDelSav(p).catch(() => null))?.zona || null : null
  }
  onMount(() => {
    leerZonaSav()
    return alCambiarDatos(leerZonaSav)
  })
  $: posSav = zonaSav && route?.length ? route.findIndex((r) => r.type === 'route' && r.name === zonaSav) : -1

  // «Seguir en…»: la zona siguiente a la última de la lista con algo apuntado. Lo que no es de la lista
  // (herencia del Genlocke, capturas añadidas desde el .sav sin zona, zonas personalizadas) no cuenta;
  // antes se esperaba a «gastar» todas las entradas y con una de esas acababa en la última zona
  const latestnav = (routes, game) => {
    const custom = new Set((game?.__custom || []).map((c) => c.id))
    const apuntadas = new Set()
    for (const [id, loc] of Object.entries(game || {})) {
      if (id.startsWith('__') || !loc?.pokemon || !loc.status || custom.has(id)) continue
      apuntadas.add(id)
      if (loc.location) apuntadas.add(loc.location)
    }
    let ultima = -1
    routes.forEach((r, n) => {
      if (r.type === 'route' && apuntadas.has(r.name)) ultima = n
    })
    let i = ultima + 1
    while (i < routes.length && routes[i].type !== 'route') i++

    const r = routes[Math.min(i, routes.length - 1)]
    return { ...r, id: i }
  }
</script>

{#await setup()}
  <Loader />
{:then route}
  <div
    id="game_el"
    out:fade|local={{ duration: 250 }}
    in:fade|local={{ duration: 250, delay: 300 }}
    class="container mx-auto overflow-hidden pb-24"
  >
    <div class="flex snap-start flex-row flex-wrap justify-center pb-16">
      <main
        id="main"
        class="p-container relative flex flex-col gap-y-4 md:py-6"
      >
        <div
          class="flex snap-y snap-start snap-always flex-col items-start justify-between gap-y-4 pt-14 md:mb-6 md:flex-row md:pt-14 lg:gap-y-0"
        >
          <div class="flex w-full flex-col gap-y-2">
            <AvisosReglas />
            <FinPartida id={$activeGame} datos={gameData} bind:terminada={runTerminada} />
            <SalonFama id={$activeGame} datos={gameData} />
            <Sacrificio id={$activeGame} datos={gameData} />
            <Genlocke id={$activeGame} datos={gameData} />
            <div class="lx-acciones-run">
              {#if filter === 'nuzlocke'}
                {#if posSav >= 0}
                  <!-- Con el .sav vinculado: la zona donde está tu personaje ahora mismo -->
                  <button
                    transition:slide|local={{ duration: 250 }}
                    class="lx-continuar lx-continuar-sav"
                    on:click={routeEl.setroute({ ...route[posSav], id: posSav })}
                    title={t('Según tu partida del emulador (la última vez que guardaste)', 'From your emulator save (last time you saved)')}
                    data-lx-original
                  >
                    <span class="lx-continuar-cursor">◉</span>
                    {t('Estás en', 'You are at')} <b>{traducirNombre(route[posSav].name)}</b>
                  </button>
                {:else}
                  <button
                    transition:slide|local={{ duration: 250 }}
                    class="lx-continuar"
                    on:click={routeEl.setroute(latestnav(route, gameData))}
                    data-lx-original
                  >
                    <span class="lx-continuar-cursor">▶</span>
                    {t('Seguir en', 'Continue at')} <b>{traducirNombre(latestnav(route, gameData).name)}</b>
                  </button>
                {/if}
              {/if}
              <button class="lx-continuar lx-accion-run" on:click={abrirDiario} title={t('Todo lo que ha pasado en la run', 'Everything that happened in the run')} data-lx-original>
                <IconoLx inline icon={IconoDiario} class="lx-accion-icono" />{t('Diario', 'Diary')}
              </button>
              {#if egglocke}
                <button class="lx-continuar lx-accion-run lx-accion-huevos" on:click={abrirHuevos} title={t('Reparte huevos al azar y mételos en tu partida', 'Hand out random eggs and put them in your save')} data-lx-original>
                  <img src="/lx/iconos/huevo.png" alt="" width="24" height="24" />{t('Huevos', 'Eggs')}
                </button>
              {/if}
              <button class="lx-continuar lx-accion-run" on:click={abrirFicha} title={t('Imagen de tu run para compartir', 'An image of your run to share')} data-lx-original>
                <IconoLx inline icon={IconoFicha} class="lx-accion-icono" />{t('Ficha', 'Card')}
              </button>
              <button class="lx-continuar lx-accion-run" on:click={recargarSav} title={savVinculado ? t(`Volver a leer ${savVinculado.split(/[\\/]/).pop()}`, `Read ${savVinculado.split(/[\\/]/).pop()} again`) : t('Elige la partida del emulador en Importar', 'Choose your emulator save in Import')} data-lx-original>
                <IconoLx inline icon={IconoRecargar} class="lx-accion-icono" />{savVinculado ? t('Recargar .sav', 'Reload .sav') : t('Vincular .sav', 'Link .sav')}
              </button>
            </div>

            <Tabs name="filter" tabs={filters} bind:selected={filter} />

            {#if filter === 'bosses'}
              <span transition:slide|local={{ duration: 250 }}>
                <Tabs
                  name="bosses"
                  tabs={bossFilters}
                  bind:selected={bossFilter}
                />
              </span>
            {/if}

            {#if filter === 'route'}
              <span transition:slide|local={{ duration: 250 }}>
                <Tabs
                  name="route"
                  tabs={routeFilters}
                  bind:selected={routeFilter}
                />
              </span>
            {/if}

            {#if filter === 'upcoming'}
              <span
                transition:slide|local={{ duration: 250 }}
                class="-mb-4 inline-block text-sm leading-5 tracking-tight dark:text-gray-400"
              >
                <Icon
                  inline={true}
                  height="1.2em"
                  icon={Hide}
                  class="-mt-1 mr-1 inline-block fill-current"
                /><b>{latestnav(route, gameData).id}</b> {t('ocultos', 'items hidden')}
              </span>
            {/if}
          </div>

          <div class="inline-flex">
            <Settings />

            <div class="fixed bottom-6 max-md:z-[8888] md:relative md:bottom-0">
              <Search on:search={onsearch} />
            </div>
          </div>
        </div>

        <div class:lx-run-terminada={runTerminada}>
        <GameRoute
          {route}
          {search}
          filters={{ main: filter, boss: bossFilter, route: routeFilter }}
          bind:this={routeEl}
          className="-mt-8 sm:mt-0"
          game={{ data: gameData, store: gameStore, key: gameKey }}
          progress={latestnav(route, gameData).id}
        />
        </div>
      </main>
    </div>
  </div>
{/await}

<style lang="postcss">
  /* Run terminada: la lista se ve apagada y no se puede tocar hasta deshacer o empezar otro intento */
  .lx-run-terminada {
    opacity: 0.45;
    filter: grayscale(0.6);
    pointer-events: none;
    user-select: none;
  }
  .lx-acciones-run {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px;
  }
  .lx-accion-run :global(.lx-accion-icono) {
    width: 22px;
    height: 22px;
    margin: -4px 4px -4px -4px;
    vertical-align: middle;
  }
  .lx-accion-huevos img {
    display: inline-block;
    width: 24px;
    height: 24px;
    margin: -6px 2px -6px -6px;
    vertical-align: middle;
    image-rendering: pixelated;
  }
  .lx-accion-run {
    font-family: 'VT323', monospace;
    font-size: 19px;
    line-height: 20px;
    color: #fff;
  }
  .lx-continuar {
    align-self: flex-start;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 3px 10px 3px 8px;
    font-size: 14px;
    color: var(--lx-lcd-texto);
    background: var(--lx-lcd);
    border: 2px solid var(--lx-tinta);
    border-radius: var(--lx-radio-sm);
    box-shadow: var(--lx-sombra-sm);
  }
  .lx-continuar b {
    font-family: 'VT323', monospace;
    font-size: 19px;
    font-weight: normal;
    color: #fff;
  }
  .lx-continuar-cursor {
    font-size: 10px;
    color: var(--lx-amarillo);
    animation: lx-parpadeo-cursor 1s steps(2) infinite;
  }
  @keyframes lx-parpadeo-cursor {
    50% {
      opacity: 0;
    }
  }
  .lx-continuar:active {
    transform: translate(2px, 2px);
    box-shadow: none;
  }

  :global(html, body) {
    @apply max-md:overflow-hidden;
  }

  @media (max-width: theme('screens.md')) {
    .container ~ :global(footer) {
      display: none;
    }

    .container {
      height: 100vh;
      overflow-y: scroll;
    }
  }

  .container {
    min-height: 100%;
    @apply snap-y snap-always;
  }
</style>
