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
  import { t as tr } from '$lib/lockedex/idioma.js'

  import { Picture, Icon, PIcon, IconButton, Accordion, Tooltip } from '$c/core'
  import { Wrapper as SettingWrapper } from '$lib/components/Settings'

  import { Loop as Badge, Ball, Info } from '$icons'
  import { Vs } from '$lib/components/BossBattle'
  import { bossToImage } from '$utils/rewrites'
  import MenuEquipo from '$lib/lockedex/MenuEquipo.svelte'

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

  // Lockedex: Randomlocke (equipos de jefes aleatorizados, apuntados a mano)
  import { leerReglas, ajustarEquipoJefe, sinCalculos } from '$lib/lockedex/reglas.js'
  import { leerEquiposJefes, comoJefe } from '$lib/lockedex/jefes.js'
  import { cargarCalc, urlSprite, cargarPokedex } from '$lib/lockedex/analista.js'
  import { infoJuego } from '$lib/lockedex/datos.js'
  import EquipoJefe from '$lib/lockedex/EquipoJefe.svelte'

  let reglasRun = {}
  let equipoReal = null
  let pokedexRun = {}
  const leerRandom = () => {
    if (!browser) return
    reglasRun = leerReglas($activeGame)
    equipoReal = leerEquiposJefes($activeGame)[id] || null
  }
  $: aleatorio = !!(reglasRun.randomlocke && reglasRun.entrenadoresAleatorios)
  $: if (browser && aleatorio && !Object.keys(pokedexRun).length) cargarPokedex(game).then((p) => (pokedexRun = p))
  const jefeParaRiesgo = async () => {
    if (!aleatorio) return boss
    if (!equipoReal?.length) return null
    const datos = await cargarCalc(infoJuego(game)?.gen || 9)
    return comoJefe(name, equipoReal, datos)
  }
  const apuntarEquipo = () =>
    open(EquipoJefe, {
      partidaId: $activeGame,
      juego: game,
      jefeId: id,
      nombre: name,
      cap: levelCap,
      alGuardar: () => {
        leerRandom()
        evaluarRiesgo()
      }
    })

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
      leerRandom()
      const jefeRiesgo = sinCalculos(reglasRun) ? null : await jefeParaRiesgo()
      riesgo = jefeRiesgo ? await calcularRiesgo({ jefe: jefeRiesgo, equipo: actual.eq.miembros, gen: actual.partida.info.gen, cap: levelCap, grupo: actual.partida.info.grupo }) : null
    } catch (e) {
      console.error('[riesgo]', e)
    }
  }
  alMontar(() => {
    if (!browser || reader) return
    leerRandom()
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
  const abrirAsistente = async () => {
    const jefeRiesgo = await jefeParaRiesgo()
    if (!jefeRiesgo) return apuntarEquipo()
    open(Asistente, { jefe: jefeRiesgo, cap: levelCap, ocultarEquipo: !showBoss, valor: id, juego: game, inicial: starter })
  }

  $: showTeam = !aleatorio && (reader || spoilers < 1 || revealed || defeated)
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

      // Randomlocke con los niveles de los jefes subidos: el equipo ya con el nivel ajustado
      pokemon = ajustarEquipoJefe(data.pokemon, leerReglas($activeGame))
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
    {tr(
      `${name} tiene un equipo de ${pokemon.length}: ${toList(pokemon, (p) => `${p?.name} de nivel ${p?.level}`, 'y')}. El nivel máximo para este combate es ${levelCap}.`,
      `${name} has a team of ${pokemon.length}, made up of ${toList(pokemon, (p) => `a level ${p?.level} ${p?.name}`)}. The level cap for this fight is level ${levelCap}.`
    )}
  </p>
{/if}

<div class="lx-jefe relative my-6" bind:this={tarjetaEl}>
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
            <button
              class="lx-vs"
              on:click={openBuilder}
              title={showBoss ? `Preparar el equipo contra ${boss.name}` : 'Preparar el equipo para este combate'}
              data-lx-original
            >VS</button>
          {/if}
        {/if}
      </div>
    </span>

    <div
      slot="item"
      class="mt-8 grid gap-y-10 md:grid-cols-2 md:gap-x-2 lg:grid-cols-2 lg:gap-x-6"
    >
      {#if aleatorio}
        <div class="lx-random col-span-full" data-lx-original>
          {#if equipoReal?.length}
            <div class="lx-random-equipo">
              {#each equipoReal as p}
                <span class="lx-random-p">
                  <img src={urlSprite(pokedexRun, p.especie) || '/assets/img/pokemon/base-201-question.png'} alt="" />
                  <b>{p.especie}</b>
                  <small>Nv. {p.nivel}</small>
                  {#each p.movimientos || [] as mv}<em data-lx-mov={mv}>{mv}</em>{/each}
                </span>
              {/each}
            </div>
            <button class="lx-random-boton" on:click|stopPropagation={apuntarEquipo}>Editar equipo apuntado</button>
          {:else}
            <p>{sinCalculos(reglasRun)
              ? tr('Randomlocke: el equipo de este jefe es aleatorio. Puedes apuntarlo para tenerlo a mano (con tipos aleatorizados no se calcula el riesgo).', 'Randomlocke: this boss team is random. You can log it for reference (risk is not calculated with randomized types).')
              : tr('Randomlocke: el equipo de este jefe es aleatorio. Apúntalo cuando lo veas para calcular el riesgo.', 'Randomlocke: this boss team is random. Log it when you see it to calculate risk.')}</p>
            <button class="lx-random-boton" on:click|stopPropagation={apuntarEquipo}>Apuntar equipo real</button>
          {/if}
        </div>
      {:else if !showTeam}
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
      <div class="col-span-full">
        <MenuEquipo {pokemon} on:comparar={(e) => openCompare(e.detail)()} />
      </div>
      {/if}
    </div>
  </Accordion>
</div>

<style>
  .lx-random {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    padding: 14px;
    border: 2px dashed #a1a1aa;
    border-radius: 12px;
    text-align: center;
    font-size: 14px;
  }
  .lx-random-equipo {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    justify-content: center;
  }
  .lx-random-p {
    display: flex;
    flex-direction: column;
    align-items: center;
    min-width: 96px;
  }
  .lx-random-p img {
    width: 56px;
    height: 56px;
    image-rendering: pixelated;
  }
  .lx-random-p b {
    font-family: 'VT323', monospace;
    font-size: 19px;
    line-height: 1;
  }
  .lx-random-p small {
    font-size: 12px;
    opacity: 0.7;
  }
  .lx-random-p em {
    font-style: normal;
    font-size: 11px;
  }
  .lx-random-boton {
    background: #dc0a2d;
    color: #fff;
    font-weight: 600;
    font-size: 13px;
    padding: 6px 14px;
    border-radius: 8px;
    border: 2px solid #1b1b1f;
  }
  /* Botón VS de Lockedex */
  .lx-vs {
    margin-left: 6px;
    width: 42px;
    height: 34px;
    font-family: 'VT323', monospace;
    font-size: 22px;
    line-height: 1;
    letter-spacing: 1px;
    color: #fff;
    background: linear-gradient(var(--lx-rojo-claro), var(--lx-rojo));
    border: 2px solid var(--lx-tinta);
    border-radius: var(--lx-radio-sm);
    box-shadow: var(--lx-sombra-sm);
    text-shadow: 1px 1px 0 rgba(0, 0, 0, 0.45);
  }
  .lx-vs:hover {
    background: var(--lx-rojo-claro);
  }
  .lx-vs:active {
    transform: translate(2px, 2px);
    box-shadow: none;
  }
</style>
