<script>
  export const MODES = { build: 'build', compare: 'compare' }
  export let id = 0,
    mode = MODES.build
  export let boss

  import { onMount, getContext } from 'svelte'

  import { X } from '$icons'
  import { Tabs, Button, IconButton, Loader } from '$c/core'
  import { t } from '$lib/lockedex/idioma.js'
  import { registrarDerrota, contarCaidos } from '$lib/lockedex/derrotas.js'
  import { activeGame } from '$lib/store'
  import { get as leerTienda } from 'svelte/store'
  import { TeamBuildCard, CompareCard, Actions } from '$c/BossBattle'
  import {
    getGameStore,
    read,
    patch,
    readdata,
    readTeam,
    readTeams,
    readBox
  } from '$lib/store'

  import calcAdvice from '$utils/advice'
  import { toList, regionise, capitalise } from '$utils/string'
  import { locid } from '$utils/pokemon'
  import { nonnull } from '$utils/obj'

  const { getPkmn } = getContext('game')
  const { close } = getContext('simple-modal')

  let tab = mode === MODES.build ? 0 : 1,
    tabs = ['Team', 'Compare']

  // Util Functions
  const makeTeam = (locs, result) =>
    locs.map(makeTeammate.bind({}, result)).filter((i) => i)

  const makeTeammate = (mons, location) =>
    mons.find((m) => locid(m.original) === location)

  const settab = (i) => () => (tab = i)
  const handlesubmit = (team) => () => {
    const teamLocs = team.map((o) => locid(o.original))
    const same =
      teamLocs.every((it, i) => ogTeam[i] === it) &&
      teamLocs.length === ogTeam.length

    const teamList = toList(team.map((t) => regionise(capitalise(t.name))))

    if (
      !same &&
      window.confirm(
        `This team is different to your active one, would you like to make ${teamList} your active team?`
      )
    ) {
      gameStore.update(patch({ __team: teamLocs.slice(0, 6) }))
    }

    const teamData = nonnull({
      id: boss.id,
      name: boss.name,
      group: boss.type,
      type: boss.speciality,
      team: team.map((i) => ({ sprite: i.alias, id: locid(i.original) }))
    })

    gameStore.update(
      patch({
        __teams: bossTeams.filter((t) => t.id !== boss.id).concat(teamData)
      })
    )

    close()
  }

  // Derrota contra este jefe: se apunta y, según las reglas, es game over (lo enseña la pantalla de la partida)
  const handlederrota = (team) => () => {
    const id = leerTienda(activeGame)
    let datos = {}
    try {
      datos = JSON.parse(leerTienda(gameStore) || '{}')
    } catch {}
    const r = registrarDerrota({
      id,
      jefe: { id: boss.id, nombre: boss.name, tipo: boss.type },
      motivo: 'jefe',
      equipo: team.map((i) => i.alias),
      caidos: contarCaidos(datos)
    })
    close()
    if (!r.fin)
      window.alert(
        r.vidas !== null
          ? t(`Derrota apuntada. Te quedan ${r.vidas} vidas.`, `Defeat logged. ${r.vidas} lives left.`)
          : t('Derrota apuntada. Con tus reglas la run sigue.', 'Defeat logged. With your rules the run goes on.')
      )
  }

  const resetTeam = () => (teamLocs = readTeam(rawData))
  const clearTeam = () => (teamLocs = [])
  const toggleMon = (e) => {
    const mon = e.detail
    if (teamLocs.includes(locid(mon))) {
      teamLocs = teamLocs.filter((i) => i !== locid(mon))
    } else {
      if (teamLocs.length === 6) return
      teamLocs = teamLocs.concat(locid(mon))
    }
  }

  // Data and setup functions
  let gameStore, rawData, boxData, teamLocs, ogTeam, bossTeams

  async function setup(cb) {
    const [, , id] = readdata()

    gameStore = getGameStore(id)
    gameStore.subscribe(
      read((data) => {
        rawData = data
        bossTeams = readTeams(data)

        boxData = readBox(data)
        ogTeam = teamLocs =
          bossTeams.find((i) => i.id === boss.id)?.team?.map((i) => i.id) ||
          readTeam(data) ||
          []

        cb(rawData, boxData, teamLocs)
      })
    )
  }

  async function fetchPkmnSet(mons, key = 'pokemon') {
    return await Promise.all(
      mons.map((m) => getPkmn(m[key]).then((res) => ({ original: m, ...res })))
    )
  }

  let loading = true
  let analysisResult
  onMount(async () => {
    setup(async (_, boxData) => {
      const boxMons = await fetchPkmnSet(boxData)
      const gymMons = await fetchPkmnSet(boss.pokemon, 'name')

      const advice = calcAdvice(boxMons, gymMons)
      analysisResult = {
        ...advice,
        box: boxMons,
        gym: gymMons,
        mons: boxMons.concat(gymMons)
      }

      loading = false
    })
  })
</script>

{#if loading}
  <Loader />
{:else if !analysisResult.box.length}
  <div
    class="lx-panel px-6 py-8 text-center text-lg"
  >
    <p class="mb-2">
      {#if t('es', 'en') === 'es'}¿Cómo piensas vencer a <b>{boss.name}</b> sin Pokémon?{:else}How do you expect to beat <b>{boss.name}</b> with no Pokémon?{/if}
    </p>
    <p class="mb-4">{t('¡Sal ahí fuera y hazte con todos!', "Go back out there and Catch 'em All!")}</p>

    <IconButton
      borderless
      rounded
      src={X}
      on:click={close}
      containerClassName="fixed top-4 right-4 z-[100]"
    />

    <Button solid rounded on:click={close}>{t('Cerrar', 'Close')}</Button>
  </div>
{:else}
  {@const team = makeTeam(teamLocs, analysisResult.mons)}

  <IconButton
    borderless
    rounded
    src={X}
    on:click={close}
    containerClassName="fixed top-4 right-4 z-[100]"
  />

  <CompareCard
    on:select={toggleMon}
    {team}
    {id}
    class={tab === 1 ? '' : 'hidden'}
    box={analysisResult.box}
    gym={analysisResult.gym}
    advice={analysisResult}
  >
    <Tabs className="lx-vs-pestanas flex-1" slot="tabs" bind:active={tab} {tabs} />
    <Actions
      slot="actions"
      on:toggle={settab(0)}
      on:complete={handlesubmit(team)}
      on:derrota={handlederrota(team)}
      class="justify-center rounded-b-lg bg-white px-6 pt-1 pb-2 dark:bg-gray-900 md:-mt-4"
      {...boss}
      {team}
    >
      <span slot="switch-text">{t('Montar equipo', 'Build team')}</span>
    </Actions>
  </CompareCard>

  <TeamBuildCard
    on:select={toggleMon}
    on:clear={clearTeam}
    on:reset={resetTeam}
    {team}
    {boss}
    class={tab === 0 ? '' : 'hidden'}
    box={analysisResult.box}
    gym={analysisResult.gym}
    summary={analysisResult.summary}
  >
    <Tabs className="lx-vs-pestanas" slot="tabs" bind:active={tab} {tabs} />
    <Actions
      slot="actions"
      on:toggle={settab(1)}
      on:complete={handlesubmit(team)}
      on:derrota={handlederrota(team)}
      {...boss}
      {team}
    >
      <span slot="switch-text">{t('Comparar equipo', 'Compare team')}</span>
    </Actions>
  </TeamBuildCard>
{/if}
