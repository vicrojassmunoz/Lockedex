<script>
  import { browser } from '$app/environment'
  import { onMount, getContext } from 'svelte'
  import { fade } from 'svelte/transition'

  import { Grave, GraveRow, Fog } from './'
  import { NuzlockeGroups } from '$lib/data/states'
  import Audio from '$lib/components/Audio.svelte'

  import { locid } from '$utils/pokemon'
  import { chunk } from '$utils/arr'
  import { capitalise } from '$utils/string'
  import { summarise } from '$utils/badges'

  import { activeGame, getGame, read, readTeams, patch } from '$lib/store'
  import { Loader, Toggle, Tooltip, PIcon } from '$c/core'

  import { IMG } from '$utils/rewrites'
  import { leerReglas } from '$lib/lockedex/reglas.js'
  import { estadoRun, revividosDisponibles, revivir } from '$lib/lockedex/derrotas.js'
  import { t } from '$lib/lockedex/idioma.js'

  let DeathModal
  const openDeathModal = async (args) => {
    if (DeathModal) open(DeathModal, args)
    import('$lib/components/DeathModal/index.svelte').then((m) => {
      DeathModal = m.default
      open(DeathModal, args)
    })
  }

  // TODO: Bind all the death data to the fields in the form :vomit:

  let box = {},
    bossData = {},
    gameStore
  activeGame.subscribe((gameId) => {
    if (browser && !gameId) return
    gameStore = getGame(gameId)
    gameStore.subscribe(
      read((data) => {
        box = data
        bossData = readTeams(data)
      })
    )
  })

  const region = getContext('region')
  const { open } = getContext('simple-modal')
  const { getPkmn } = getContext('game')

  const handleEdit = (p) => async (o) => {
    const pokemon = await getPkmn(o.detail.pokemon)

    const mode =
      o.detail?.death?.opponent || o.detail?.death?.trainer ? 'edit' : 'new'

    const submit = (death) => {
      mode === 'new'
        ? gameStore.update(patch({ [p._id]: { ...p, death } }))
        : gameStore.update(
            patch({ [p._id]: { ...p, death: { ...p.death, ...death } } })
          )
    }

    openDeathModal({ ...o.detail, submit, pokemon, mode })
  }

  const chunkSize = 6
  // Cláusula de revivir: cuántos quedan (por medalla o un número fijo) y el botón de cada tumba
  let idRun = ''
  activeGame.subscribe((g) => (idRun = g))
  $: tiendaDerrotas = estadoRun(idRun)
  $: reglasRun = browser ? leerReglas(idRun) : {}
  $: medallasRun = (Array.isArray(box?.__teams) ? box.__teams : []).filter((e) => e?.group === 'gym-leader').length
  $: revivibles = revividosDisponibles(reglasRun, $tiendaDerrotas, medallasRun)
  const revivirP = (p) => () => {
    if (!window.confirm(t(`¿Revivir a ${p.nickname || capitalise(p.pokemon)}? Vuelve a la caja como capturado.`, `Revive ${p.nickname || capitalise(p.pokemon)}? It goes back to the box as caught.`))) return
    revivir(idRun, p._id, p.pokemon, gameStore)
  }

  let graveyard = []
  $: graveyard = Object.keys(box)
    .map(key => ({...box[key], _id: key}))
    .filter((i) => i.pokemon)
    .filter((i) => NuzlockeGroups.Dead.includes(i.status))

  let chunked = []
  $: chunked = chunk(
    graveyard,
    chunkSize // Force 2 rows minimum
  )

  let showFog = true,
    showAudio = true;
</script>

<svelte:head>
  <title>Lockedex | Cementerio</title>
</svelte:head>

<main
  class="w-screen snap-y snap-always overflow-hidden max-md:h-screen max-md:overflow-y-scroll md:w-auto md:overflow-auto {region}"
>
  <div
    class="snap-start scroll-mt-4 px-4 pt-14 sm:px-8 md:pt-14"
    in:fade={{ duration: 500, delay: 200 }}
  >
    {#if !graveyard.length}
      <span
        class="col-span-4 flex h-96 items-center justify-center text-center text-xl dark:text-gray-600"
      >
        You have no Pokémon in the graveyard.<br />Congratulations!
      </span>
    {:else}
      <div
        class="relative z-[999999] mx-auto mb-6 w-full md:fixed md:bottom-0 md:right-6 md:w-64"
      >
        <div class="my-2 mx-auto flex items-center justify-between gap-x-2">
          <h2 class="text-base font-medium text-gray-900 dark:text-gray-50">
            Fog animation
          </h2>
          <Toggle id="fog" bind:state={showFog} />
        </div>

        <div class="my-2 mx-auto flex items-center justify-between gap-x-2">
          <h2 class="text-base font-medium text-gray-900 dark:text-gray-50">
            Audio
          </h2>
          <Toggle id="audio" bind:state={showAudio} />
        </div>
      </div>

      {#if showAudio}<Audio
          class="bottom-8 left-0 z-[999999] lg:fixed"
          src="/audio/lavender.mp3"
        />{/if}
      {#if showFog}<Fog />{/if}
    {/if}
  </div>

  {#if graveyard.length && reglasRun?.revivir}
    <p class="lx-revivir-info">
      {revivibles > 0
        ? t(`Cláusula de revivir: puedes revivir a ${revivibles} Pokémon.`, `Revive clause: you can revive ${revivibles} Pokémon.`)
        : t('Cláusula de revivir: no te quedan revividos ahora mismo.', 'Revive clause: no revives left right now.')}
    </p>
  {/if}
  {#if graveyard.length}
    <div class="mt-8 pb-48 sm:pb-64">
      {#each chunked as row, i}
        <GraveRow {i} maxRows={chunked.length}>
          {#each row as p, j (p._id)}
            {@const result = summarise(p, bossData)}

            <div
              class="flex {j % 2
                ? 'flex-row-reverse'
                : 'flex-row'} snap-start -scroll-mt-2 items-center justify-between max-sm:mt-10 max-sm:px-6 md:inline-block"
              in:fade={{
                duration: 800,
                delay:
                  Math.min(3000 / graveyard.length, 500) * (i * chunkSize + j) +
                  1000
              }}
            >
              <Grave
                pokemon={p.pokemon}
                nickname={p.nickname}
                death={p?.death}
                on:click={handleEdit(p)}
              >
                <svelte:fragment slot="badges">
                  {#if result}
                    {@const { icons, summary } = result}
                    <div
                      class="-mb-6 -mt-1 flex w-20 scale-75 flex-wrap place-content-center gap-x-1 leading-4 grayscale transition group-hover:grayscale-0"
                    >
                      <Tooltip>{summary}</Tooltip>
                      {#each icons as icon}
                        <PIcon name={icon} type="b" />
                      {/each}
                    </div>
                  {/if}
                </svelte:fragment>
              </Grave>
              {#if revivibles > 0}
                <button class="lx-revivir" on:click={revivirP(p)} title={t('Cláusula de revivir', 'Revive clause')}>
                  <img src="/lx/objetos/revivir.png" alt="" />{t('Revivir', 'Revive')}
                </button>
              {/if}
            </div>
          {/each}
        </GraveRow>
      {/each}
    </div>
  {/if}
</main>

<style>
  .lx-revivir-info {
    margin-top: 1rem;
    text-align: center;
    font-size: 13px;
    color: var(--lx-texto-suave);
  }
  .lx-revivir {
    display: inline-flex;
    align-items: center;
    gap: 2px;
    margin: 4px auto 0;
    padding: 1px 8px 1px 2px;
    font-family: 'LX Pixel', 'VT323', monospace;
    font-size: 12px;
    color: var(--lx-texto);
    background: var(--lx-panel);
    border: 2px solid var(--lx-tinta);
    border-radius: var(--lx-radio-sm);
    box-shadow: var(--lx-sombra-sm);
  }
  .lx-revivir img {
    width: 22px;
    height: 22px;
    image-rendering: pixelated;
  }
  .lx-revivir:hover {
    background: var(--lx-acento-suave);
  }
  @media (max-width: theme('screens.md')) {
    main {
      height: calc(100vh - 38px);
      overflow-y: scroll;
    }
  }
</style>
