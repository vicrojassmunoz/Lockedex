<script>
  export let game,
    id,
    location = '',
    starter = '',
    type,
    forceLevelCap = false,
    forceVs = false,
    defeated = false,
    reader = false

  // Core leaader data
  let pokemon = [],
    name = '',
    speciality = '',
    img

  $: boss = { pokemon, name, speciality, id, img, type }

  // Extra leader data
  let doubleBattle = false,
    effect,
    info

  import { browser } from '$app/environment'
  import { getContext } from 'svelte'
  import { fade } from 'svelte/transition'

  import Pokemon from '$lib/components/pokemon-card.svelte'
  import TypeBadge from '$lib/components/type-badge.svelte'
  import Label from '$lib/components/label.svelte'

  import { createImgUrl } from '$utils/rewrites'
  import { toList } from '$utils/string'

  import { Picture, Icon, PIcon, IconButton, Accordion, Tooltip } from '$c/core'
  import { Wrapper as SettingWrapper } from '$lib/components/Settings'

  import { Loop as Badge, Ball, Info } from '$icons'
  import { Vs } from '$lib/components/BossBattle'
  import { bossToImage } from '$utils/rewrites'

  import Effect from '$lib/components/Effect.svelte'

  // Modo sin spoilers (ajuste por partida): 0 = todo, 1 = ocultar equipos, 2 = ocultar jefes
  import { onDestroy } from 'svelte'
  import { parse, activeGame, savedGames } from '$lib/store'
  import { settingsDefault, getSetting } from '$lib/components/Settings/_data'

  let spoilers = 0
  let revealed = false
  const unsubSpoilers = savedGames.subscribe(
    parse((saves) => {
      const { settings } = saves[$activeGame] || {}
      spoilers = +(settings || settingsDefault)[getSetting('spoilers')] || 0
    })
  )
  onDestroy(unsubSpoilers)

  // Lockedex: nivel de riesgo y asistente de combate
  import Riesgo from '$lib/lockedex/Riesgo.svelte'
  import Asistente from '$lib/lockedex/Asistente.svelte'
  import { calcularRiesgo } from '$lib/lockedex/riesgo.js'
  import { equipoActual } from '$lib/lockedex/equipo.js'
  import { alCambiarDatos } from '$lib/lockedex/partida.js'
  import { onMount as alMontar } from 'svelte'

  let riesgo = null
  let tarjetaEl
  let vista = false
  let pendienteRiesgo = null
  const evaluarRiesgo = async () => {
    if (!browser || reader || !pokemon?.length) return
    try {
      await new Promise((r) => (window.requestIdleCallback || setTimeout)(r, { timeout: 800 }))
      const actual = await equipoActual()
      if (!actual) return
      riesgo = await calcularRiesgo({ jefe: boss, equipo: actual.eq.miembros, gen: actual.partida.info.gen, cap: levelCap })
    } catch (e) {
      console.error('[riesgo]', e)
    }
  }
  alMontar(() => {
    if (!browser || reader) return
    const io = new IntersectionObserver((e) => {
      if (e.some((x) => x.isIntersecting) && !vista) {
        vista = true
        evaluarRiesgo()
      }
    }, { rootMargin: '200px' })
    if (tarjetaEl) io.observe(tarjetaEl)
    const quitar = alCambiarDatos(() => {
      if (!vista) return
      clearTimeout(pendienteRiesgo)
      pendienteRiesgo = setTimeout(evaluarRiesgo, 600)
    })
    return () => {
      io.disconnect()
      quitar()
    }
  })
  $: if (vista && !loading && pokemon.length) evaluarRiesgo()
  const abrirAsistente = () =>
    open(Asistente, { jefe: boss, cap: levelCap, ocultarEquipo: !showBoss })

  $: showTeam = reader || spoilers < 1 || revealed || defeated
  $: showBoss = reader || spoilers < 2 || revealed || defeated
  const reveal = () => (revealed = true)

  const { getLeague } = getContext('game')
  const { open } = getContext('simple-modal')

  let CompareModal
  const loadmodal = async () => {
    if (CompareModal) return CompareModal
    return import('$lib/components/ProgressModal.svelte').then((m) => {
      CompareModal = m.default
      return CompareModal
    })
  }

  const openCompare = (id) => () =>
    loadmodal().then((modal) => open(modal, { boss, mode: 'compare', id }))
  const openBuilder = () =>
    loadmodal().then((modal) => open(modal, { boss, mode: 'build' }))

  export let loading = true

  const fetchData = async (starter) => {
    if (!browser) return
    try {
      const league = await getLeague(game, starter)
      const data = league[id]

      img = bossToImage(data);

      pokemon = data.pokemon
      name = data.name
      speciality = data.speciality

      doubleBattle = data.doubleBattle
      effect = data.effect
      info = data.info
      loading = false
    } catch (e) {
      console.error(e)
    }
  }

  $: (async () => await fetchData(starter))()

  $: levelCap = pokemon.every(
    (it) => it.level.startsWith('+') || it.level.startsWith('-')
  )
    ? null
    : pokemon.reduce((acc, it) => Math.max(acc, it.level), 0)
  $: maxStat = pokemon.reduce(
    (acc, it) => Math.max(acc, Math.max(...Object.values(it.stats))),
    0
  )
</script>

{#if reader}
  <h4 class="sr-only">
    {name} - {#if location}{location}{/if}
  </h4>
  <p class="sr-only">
    {name} has a team of {pokemon.length}, made up of
    {toList(pokemon, (p) => `a level ${p?.level} ${p?.name}`)}. The level cap
    for this fight is level {levelCap}.
  </p>
{/if}

<div class="relative my-6" bind:this={tarjetaEl}>
  <Accordion
    jsenabled={!reader}
    iconClassName="transition duration-1000 {loading
      ? 'opacity-0'
      : 'opacity-100'}"
  >
    <span
      slot="heading"
      class:md:-ml-2={!!img}
      class="-mt-4 inline-flex h-16 items-center gap-x-2 text-left"
    >
      {#if defeated && !loading}
        <div class="z-50 -ml-2 w-0" in:fade={{ delay: 150 }}>
          <span
            class="grayscale-1 absolute top-4 left-2 -mx-2 -rotate-30 scale-75 border-2 border-red-600 bg-red-300 pl-2 pr-1.5 font-mono text-base font-bold uppercase leading-4 tracking-widest text-red-700 md:left-12 md:scale-100"
          >
            defeated
          </span>
        </div>
      {/if}

      {#if img}
        <span
          class="relative -mx-5 transition"
          class:grayscale={defeated}
          class:brightness-0={!showBoss}
          class:dark:invert={!showBoss}
        >
          <Picture
            src="{img.src}"
            alt={showBoss ? name : 'Hidden boss'}
            pixelated
            className="w-18 md:w-36"
            aspect="72x52"
          />
        </span>
      {/if}

      <span class="flex flex-col gap-y-2">
        <span class="inline-flex h-6 gap-x-2">
          {#if loading}
            <span
              class="-ml-9 w-20 animate-pulse rounded-md bg-gray-400 md:ml-0 md:w-24"
            />
          {:else}
            <div>
              <h4 class="text-xl font-medium">{showBoss ? name : '???'}</h4>
              {#if img?.author}
                <a
                  href={img.link}
                  target="_blank"
                  rel="noreferrer"
                  on:click|stopPropagation={function () {}}
                  class:mt-6={location}
                  class="absolute text-tiny italic text-gray-500 transition hover:text-indigo-300 hover:underline dark:text-gray-600 dark:hover:text-indigo-400"
                >
                  Sprite by <strong>{img.author}</strong>
                </a>
              {/if}
            </div>
          {/if}

          {#if speciality && showBoss}
            <div class:grayscale={defeated}>
              <TypeBadge type={speciality} />
            </div>
          {/if}

          {#if info}
            <span class="ml-1 text-xl">
              <Tooltip>
                {@html info}
              </Tooltip>
              <Icon class="mt-1" inline icon={Info} />
            </span>
          {/if}

          {#if effect}
            <Effect {effect} class="-mt-1 h-fit text-4xl" />
          {/if}

          {#if doubleBattle}
            <Effect effect="double-battle" class="text-3xl" />
          {/if}
        </span>

        {#if loading}
          <div
            class="-ml-9 h-4 w-32 animate-pulse rounded-md bg-gray-400 md:ml-0 md:w-48"
          />
        {:else if location}
          <h5 class="text-md -mt-1 h-4 font-medium">
            <span>{location}</span>
          </h5>
        {/if}
      </span>

      <div class="absolute top-0 right-0 inline-flex gap-x-2">
        {#if loading}
          <div class="-mt-2 h-14 w-14 animate-pulse rounded-md bg-gray-400" />
        {:else}
          <span
            class:grayscale={defeated}
            class="hidden items-center gap-x-2 lg:inline-flex"
            class:!hidden={!showTeam}
          >
            {#each pokemon as p, i (p.name + i)}
              <PIcon
                name={p.icon || p.name}
                className="-m-4 z-10 relative"
              />
            {/each}
          </span>

          <SettingWrapper id="team-caps" on="1">
            <Label
              heading="Max"
              className="-mr-4"
              body={Math.min(6, pokemon.length)}
            />
          </SettingWrapper>

          {#if riesgo && !defeated}
            <button
              class="lx-boton-riesgo -mt-1"
              on:click|stopPropagation={abrirAsistente}
              title="Asistente de combate"
            >
              <Riesgo
                nivel={riesgo.nivel}
                consejos={riesgo.consejos}
                modo={riesgo.modo}
                ocultarConsejos={!showTeam}
              />
            </button>
          {/if}

          {#if levelCap}
            <SettingWrapper let:setting id="level-caps">
              {#if (setting === 1 && (type === 'gym-leader' || type === 'elite-four')) || (setting === 2 && (type === 'gym-leader' || type === 'elite-four' || type === 'rival')) || setting === 3 || forceLevelCap}
                <Label heading="Lvl cap" body={levelCap} />
              {/if}
            </SettingWrapper>
          {/if}

          {#if forceVs}
            <IconButton
              on:click={openBuilder}
              title="Load team builder against the {showBoss ? boss.name : 'hidden'} boss fight"
              class="h-12 pl-0.5 md:mt-1"
              rounded
            >
              <Vs
                containerClass="translate-y-3 scale-90"
                class="bg-white dark:bg-gray-800"
              />
            </IconButton>
          {/if}
        {/if}
      </div>
    </span>

    <div
      slot="item"
      class="mt-8 grid gap-y-10 md:grid-cols-2 md:gap-x-2 lg:grid-cols-2 lg:gap-x-6"
    >
      {#if !showTeam}
        <div
          class="col-span-full flex flex-col items-center gap-y-3 rounded-xl border-2 border-dashed border-gray-300 py-8 text-center dark:border-gray-700"
        >
          <p class="text-sm text-gray-600 dark:text-gray-400">
            Spoiler-free mode: this {showBoss ? 'team' : 'boss'} is hidden.
          </p>
          <button
            class="rounded-lg bg-indigo-700 px-4 py-2 text-xs font-medium text-white ring-2 ring-white transition hover:ring-indigo-400"
            on:click|stopPropagation={reveal}
          >
            Reveal {showBoss ? 'team' : 'boss'}
          </button>
        </div>
      {:else}
      {#each pokemon as p, id (p.name + id)}
        <Pokemon
          {...p}
          class="snap-start scroll-mt-6"
          sprite={createImgUrl(p, { ext: 'png' })}
          {maxStat}
        >
          <button
            class:mt-0={p.moves.length < 3}
            class="compare z-50 mx-8 mb-2 opacity-25 transition hover:opacity-75"
            slot="footer"
            on:click={openCompare(id)}
          >
            <span class="absolute -mb-2 h-8 w-8 transform md:scale-75">
              <Icon
                inline={true}
                class="absolute"
                height="1.4em"
                icon={Badge}
              />
              <Icon
                inline={true}
                class="absolute -top-0.5 right-1.5 rounded-full bg-white dark:bg-gray-800"
                height="0.8em"
                icon={Ball}
              />
              <Icon
                inline={true}
                class="absolute bottom-2 -left-0.5 rounded-full bg-white dark:bg-gray-800"
                height="0.8em"
                icon={Ball}
              />
            </span>
            <span class="ml-8 md:ml-6 md:text-xs"> Compare </span>
          </button>
        </Pokemon>
      {/each}
      {/if}
    </div>
  </Accordion>
</div>
