<script>
  import { Recommendation, BoxTeam, Advice } from './'
  import ReglasCombate from '$lib/lockedex/ReglasCombate.svelte'
  import { activeGame } from '$lib/store'
  import { leerReglas, sinCalculos } from '$lib/lockedex/reglas.js'

  import TypeLogo from '$c/type-logo.svelte'
  import { Icon, Tooltip, Accordion } from '$c/core'
  import { Info } from '$icons'

  import { summarise } from '$utils/types'
  import { capitalise } from '$utils/string'
  import { t, traducirNombre } from '$lib/lockedex/idioma'
  const esp = t('es', 'en') === 'es'

  export let name,
    team = [],
    box = [],
    recommendations = [],
    advice = {},
    pokemon = [],
    jefe = ''
</script>

<div
  class="rec-card relative z-20 mx-auto h-auto translate-y-20 rounded-b-lg bg-white px-4 py-2 dark:bg-gray-900 md:translate-y-24 md:py-4 md:px-8 md:pb-2"
>
  <div
    class="mx-auto flex w-auto flex-wrap items-start pt-2 md:w-[48ch] md:pt-0"
  >
    <slot name="tabs" />

    <ReglasCombate id={$activeGame} {pokemon} equipo={team} {jefe} />

    <BoxTeam on:clear on:reset on:select {team} {box} boss={{ name }} />

    <!-- Randomlocke con tipos aleatorizados: el análisis y las recomendaciones salen de los tipos del juego
         original, así que no se enseñan -->
    {#if sinCalculos(leerReglas($activeGame))}
      <p class="lx-sin-tipos">Con tipos aleatorizados no se analizan los tipos de los equipos.</p>
    {:else}
    <Accordion className="md:-ml-4 -mb-2 py-2">
      <h2 slot="heading">Team analysis</h2>
      <div
        slot="item"
        class="mt-4 mb-2 flex flex-wrap items-center justify-center gap-1 gap-y-4"
      >
        {#key team}
          {#await summarise(team) then result}
            {#if result.result}
              {#each result.result as [type, { resist = 0, weak = 0 }]}
                <div class="grid-rows-13 grid gap-1">
                  {#each Array(result.max - resist).fill() as _}
                    <span class="h-1 w-8 rounded-sm bg-gray-100 dark:bg-gray-700" />
                  {/each}
                  {#each Array(resist).fill() as _}
                    <span class="h-1 w-8 rounded-sm bg-green-500" />
                  {/each}
                  <TypeLogo class="scale-75" {type}>
                    <p class="py-2 px-1 text-center">
                      {#if esp}
                        <b>{resist || 'Ninguno'}</b> de tu equipo {resist === 1 ? 'resiste' : 'resisten'}
                        <b>{traducirNombre(capitalise(type))}</b>
                        <br />
                        <b>{weak || 'Ninguno'}</b> de tu equipo {weak === 1 ? 'es débil' : 'son débiles'} a
                        <b>{traducirNombre(capitalise(type))}</b>
                      {:else}
                        <b>{resist || 'None'}</b>
                        of your Team resist{resist === 1 ? 's' : ''}
                        <b>{capitalise(type)}</b>
                        <br />
                        <b>{weak || 'None'}</b> of your Team {weak === 1 ? 'is' : 'are'} weak to
                        <b>{capitalise(type)}</b>
                      {/if}
                    </p>
                  </TypeLogo>
                  {#each Array(weak).fill() as _}
                    <span class="h-1 w-8 rounded-sm bg-red-500" />
                  {/each}
                  {#each Array(result.max - weak).fill() as _}
                    <span class="h-1 w-8 rounded-sm bg-gray-100 dark:bg-gray-700" />
                  {/each}
                </div>
              {/each}
            {/if}
          {/await}
        {/key}
      </div>
    </Accordion>

    <Accordion className="md:-ml-4 -mb-2">
      <h2 slot="heading" class="my-4 inline-flex w-full">
        Recommendations
        <span class="ml-2 cursor-help">
          <Icon class="inline scale-150" inline icon={Info} />
          <Tooltip side="right">
            {t(
              `Según los movimientos y debilidades del equipo de ${name}, y las estadísticas, resistencias y potencial ofensivo de tus Pokémon. Usa también tu propio criterio para montar el equipo.`,
              `Based on ${name}'s team's movesets, weaknesses and your Pokémon's beneficial stats and both resistive and offensive potential. You should still use your own knowledge to properly craft a team.`
            )}
          </Tooltip>
        </span>
      </h2>

      <div slot="item" class="flex w-auto flex-wrap">
        <div class="md:min-w-1/2 w-full md:flex-1">
          <ul class="my-2 flex justify-around gap-x-6 md:justify-start">
            {#each recommendations.slice(0, 3) as poke, i}
              <Recommendation {...poke} {i} />
            {/each}
          </ul>
          {#if advice.dmgclass}
            {@const dclass = advice.dmgclass[0]}
            {@const defclass =
              dclass === 'physical' ? 'Defense' : 'Special Defense'}
            <p
              class="mt-2 w-auto text-center text-xs italic max-md:mb-2 md:text-left"
            >
              {#if esp}
                El equipo de {name} solo usa movimientos <b>{dclass === 'physical' ? 'físicos' : 'especiales'}</b>.
                <br class="hidden md:block" />
                Te conviene usar Pokémon con mucha <b>{dclass === 'physical' ? 'Defensa' : 'Defensa Especial'}</b>.
              {:else}
                {name}'s team only uses <b>{dclass}</b> moves.
                <br class="hidden md:block" />
                You should use Pokémon with a high <b>{defclass}</b> stat.
              {/if}
            </p>
          {/if}
        </div>

        <div class="md:min-w-1/2 flex w-full flex-col justify-start md:flex-1">
          <Advice types={advice.weak}>
            {#if esp}<b class="dark:text-gray-400">Todo</b> el equipo de {name} es débil a:{:else}{name}'s team are <b class="dark:text-gray-400">all</b> weak to:{/if}
          </Advice>

          <Advice types={advice.resist}>
            {#if esp}<b class="dark:text-gray-400">Todo</b> el equipo de {name} resiste:{:else}{name}'s team are <b class="dark:text-gray-400">all</b> resistant to:{/if}
          </Advice>

          <Advice types={advice.immunity}>
            {t(`El equipo de ${name} es inmune a:`, `${name}'s team have immunities to:`)}
          </Advice>
        </div>
      </div>
    </Accordion>
    {/if}

    <slot />
  </div>
</div>

<style>
  p {
    @apply text-xs italic text-gray-500 max-md:text-center;
  }
  h2 {
    @apply text-sm font-bold;
  }
</style>
