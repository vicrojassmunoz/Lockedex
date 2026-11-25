<script>
  // Asistente de combate: riesgo, consejos y movimientos de tu equipo hasta el nivel máximo
  import { onMount, getContext } from 'svelte'
  import Riesgo from './Riesgo.svelte'
  import { calcularRiesgo } from './riesgo.js'
  import { equipoCompleto } from './equipo.js'
  import { partidaActiva, cargarRutas, resumirPartida } from './partida.js'
  import { aprendizaje, movimientos, clavePokemon, norm } from './datos.js'
  import { idioma } from './idioma.js'
  import { COLOR_TIPO } from './colores.js'
  import { leerReglas, recordatorios } from './reglas.js'
  let reglasActivas = []

  export let jefe
  export let cap = null
  export let ocultarEquipo = false
  export let valor = ''
  export let juego = ''
  export let inicial = 'fire'
  import { goto } from '$app/navigation'
  const abrirAnalista = () => {
    close()
    goto(`/analista?juego=${juego}&jefe=${valor}&inicial=${inicial || 'fire'}&equipo=run`)
  }

  const { close } = getContext('simple-modal')
  const es = idioma() === 'es'

  let cargando = true
  let riesgo = null
  let miembros = []
  let info = null
  let movs = {}

  const sprite = (m) => (m.imgId ? `/assets/img/pokemon/base-${m.imgId}.png` : '/assets/img/pokemon/base-201-question.png')

  onMount(async () => {
    const partida = partidaActiva()
    info = partida?.info
    reglasActivas = recordatorios(leerReglas(partida?.id))
    if (!partida) return (cargando = false)
    const rutas = await cargarRutas(info.lid)
    const resumen = resumirPartida(partida, rutas)
    const eq = await equipoCompleto(partida, resumen)
    movs = await movimientos()
    const tabla = await aprendizaje(info.grupo)
    const porNivel = tabla?.nivel || {}

    miembros = eq.miembros.map((m) => {
      const lista = porNivel[clavePokemon(m.especie || m.alias, porNivel)] || []
      const hasta = cap || 100
      const desde = m.nivel || 0
      const actuales = (m.movimientos || []).map((id) => Object.values(movs).find((x) => x.id === id)).filter(Boolean)
      const proximos = lista
        .filter(([nv]) => nv > desde && nv <= hasta)
        .map(([nv, k]) => ({ nv, m: movs[k] }))
        .filter((x) => x.m)
      const probables = m.nivel ? [] : lista.filter(([nv]) => nv <= hasta).slice(-4).map(([nv, k]) => ({ nv, m: movs[k] })).filter((x) => x.m)
      return { ...m, actuales, proximos, probables }
    })
    riesgo = await calcularRiesgo({ jefe, equipo: eq.miembros, gen: info.gen, cap })
    cargando = false
  })
</script>

<section class="lx-asistente" data-lx-original>
  <header>
    <div>
      <small>{es ? 'ASISTENTE DE COMBATE' : 'BATTLE ASSISTANT'}</small>
      <h2>{ocultarEquipo ? '???' : jefe?.name}</h2>
      {#if cap}<span class="lx-cap">{es ? 'Nivel máximo' : 'Level cap'} {cap}</span>{/if}
      {#each reglasActivas as r}<span class="lx-regla-chip">{r}</span>{/each}
    </div>
    {#if riesgo}<Riesgo nivel={riesgo.nivel} grande />{/if}
    {#if juego && valor !== ''}
      <button class="lx-analista-boton" on:click={abrirAnalista} title={es ? 'Prueba otros equipos, niveles y movimientos' : 'Try other teams, levels and moves'}>
        {es ? 'Probar en el Analista →' : 'Try in Analyst →'}
      </button>
    {/if}
    <button class="lx-cerrar" on:click={close} aria-label={es ? 'Cerrar' : 'Close'}>✕</button>
  </header>

  {#if cargando}
    <p class="lx-cargando">{es ? 'Analizando el combate…' : 'Analysing the battle…'}</p>
  {:else if !miembros.length}
    <p class="lx-vacio">
      {es
        ? 'Añade Pokémon a tu equipo (o importa tu partida .sav) para ver el análisis.'
        : 'Add Pokémon to your team (or import your .sav) to see the analysis.'}
    </p>
  {:else}
    {#if riesgo}
      <div class="lx-bloque">
        <h3>{es ? 'Consejos' : 'Tips'}</h3>
        {#if ocultarEquipo}
          <p class="lx-vacio">{es ? 'Revela el equipo del jefe para ver los consejos.' : "Reveal the boss's team to see tips."}</p>
        {:else}
          <ul class="lx-consejos">
            {#each riesgo.consejos as c}
              <li class="lx-{c.tipo}">{c.texto}</li>
            {/each}
          </ul>
        {/if}
        <p class="lx-modo">
          {riesgo.modo === 'calculadora'
            ? es ? 'Calculado con los niveles, movimientos, naturalezas e IVs de tu partida del emulador.' : 'Calculated with the levels, moves, natures and IVs from your emulator save.'
            : es ? 'Estimación por tipos. Importa tu partida .sav para un cálculo de daño exacto.' : 'Type-based estimate. Import your .sav for exact damage calcs.'}
        </p>
      </div>
    {/if}

    <div class="lx-bloque">
      <h3>{es ? `Tu equipo hasta el nivel ${cap || '—'}` : `Your team up to level ${cap || '—'}`}</h3>
      {#if info?.romhack}
        <p class="lx-modo">{es ? 'ROM hack: los movimientos por nivel son los del juego base y pueden no coincidir.' : 'ROM hack: level-up moves are from the base game and may differ.'}</p>
      {/if}
      <div class="lx-miembros">
        {#each miembros as m}
          <article>
            <div class="lx-m-cab">
              <img src={sprite(m)} alt="" class="pixelated" />
              <div>
                <b>{m.nombre}</b>
                <span>{m.nivel ? (es ? 'Nv. ' : 'Lv. ') + m.nivel : ''}</span>
                <span class="lx-tipos">
                  {#each m.types as t}<i style="background:{COLOR_TIPO[t]}" />{/each}
                </span>
              </div>
            </div>
            {#if m.actuales.length}
              <p class="lx-sub">{es ? 'Movimientos actuales' : 'Current moves'}</p>
              <div class="lx-movs">
                {#each m.actuales as mv}
                  <span data-lx-mov={mv.en} style="--c:{COLOR_TIPO[mv.tipo]}">{es ? mv.es : mv.en}</span>
                {/each}
              </div>
            {/if}
            {#if m.proximos.length}
              <p class="lx-sub">{es ? 'Aprenderá antes del combate' : 'Will learn before the fight'}</p>
              <div class="lx-movs">
                {#each m.proximos as x}
                  <span data-lx-mov={x.m.en} style="--c:{COLOR_TIPO[x.m.tipo]}"><small>{x.nv}</small>{es ? x.m.es : x.m.en}</span>
                {/each}
              </div>
            {:else if m.nivel}
              <p class="lx-sub">{es ? 'No aprende nada nuevo antes del nivel máximo' : 'Learns nothing new before the cap'}</p>
            {/if}
            {#if m.probables.length}
              <p class="lx-sub">{es ? 'Movimientos probables al nivel máximo' : 'Likely moves at the cap'}</p>
              <div class="lx-movs">
                {#each m.probables as x}
                  <span data-lx-mov={x.m.en} style="--c:{COLOR_TIPO[x.m.tipo]}"><small>{x.nv}</small>{es ? x.m.es : x.m.en}</span>
                {/each}
              </div>
            {/if}
          </article>
        {/each}
      </div>
    </div>
  {/if}
</section>

<style>
  .lx-asistente {
    width: min(880px, calc(100vw - 48px));
    max-height: calc(100vh - 120px);
    overflow: auto;
    background: #fbfbf7;
    color: #1b1b1f;
    border: 4px solid #1b1b1f;
    border-radius: 16px;
    box-shadow: 6px 6px 0 rgba(0, 0, 0, 0.4);
    font-size: 14px;
  }
  :global(.dark) .lx-asistente {
    background: #16202c;
    color: #e8eef5;
  }
  header {
    position: sticky;
    top: 0;
    z-index: 2;
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 14px 18px;
    background: linear-gradient(180deg, #ff3355, #dc0a2d 60%, #c10826);
    color: #fff;
    border-bottom: 4px solid #8b0a1e;
  }
  header > div:first-child {
    flex: 1;
  }
  header small {
    font-family: 'VT323', monospace;
    font-size: 16px;
    letter-spacing: 2px;
    opacity: 0.85;
  }
  header h2 {
    font-family: 'VT323', monospace;
    font-size: 40px;
    line-height: 0.9;
    text-shadow: 2px 2px 0 #8b0a1e;
  }
  .lx-cap {
    font-family: 'VT323', monospace;
    font-size: 20px;
    background: #1b1b1f;
    color: #ffcb05;
    padding: 1px 8px;
    border-radius: 6px;
  }
  .lx-analista-boton {
    align-self: center;
    font-family: 'VT323', monospace;
    font-size: 19px;
    background: #1b1b1f;
    color: #ffcb05;
    border-radius: 8px;
    padding: 4px 10px;
  }
  .lx-regla-chip {
    font-family: 'VT323', monospace;
    font-size: 18px;
    background: rgba(0, 0, 0, 0.3);
    padding: 1px 8px;
    border-radius: 6px;
    margin-left: 4px;
  }
  .lx-cerrar {
    align-self: flex-start;
    width: 32px;
    height: 32px;
    border-radius: 8px;
    background: rgba(0, 0, 0, 0.25);
    font-size: 16px;
  }
  .lx-bloque {
    padding: 14px 18px;
    border-bottom: 2px dashed rgba(0, 0, 0, 0.12);
  }
  h3 {
    font-family: 'VT323', monospace;
    font-size: 24px;
    margin-bottom: 6px;
  }
  .lx-consejos {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .lx-consejos li {
    padding: 7px 10px 7px 30px;
    border-radius: 8px;
    position: relative;
    background: rgba(0, 0, 0, 0.04);
  }
  .lx-consejos li::before {
    position: absolute;
    left: 10px;
    font-weight: bold;
  }
  .lx-bien::before {
    content: '✓';
    color: #16a34a;
  }
  .lx-mal::before {
    content: '✕';
    color: #dc2626;
  }
  .lx-aviso::before {
    content: '!';
    color: #d97706;
    left: 13px !important;
  }
  .lx-modo,
  .lx-vacio,
  .lx-cargando {
    opacity: 0.65;
    font-size: 12px;
    margin-top: 8px;
  }
  .lx-cargando,
  .lx-vacio {
    padding: 18px;
    font-size: 14px;
  }
  .lx-miembros {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
    gap: 10px;
    margin-top: 8px;
  }
  article {
    border: 3px solid #1b1b1f;
    border-radius: 12px;
    padding: 8px 10px 10px;
    background: #fff;
  }
  :global(.dark) article {
    background: #2c2948;
    border-color: #0b1118;
  }
  .lx-m-cab {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .lx-m-cab img {
    width: 56px;
    height: 56px;
    image-rendering: pixelated;
    margin: -6px 0;
  }
  .lx-m-cab b {
    display: block;
    font-family: 'VT323', monospace;
    font-size: 22px;
    line-height: 1;
  }
  .lx-m-cab span {
    font-family: 'VT323', monospace;
    font-size: 16px;
    opacity: 0.8;
    margin-right: 6px;
  }
  .lx-tipos i {
    display: inline-block;
    width: 22px;
    height: 8px;
    border-radius: 3px;
    margin-right: 2px;
  }
  .lx-sub {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    opacity: 0.6;
    margin: 8px 0 4px;
  }
  .lx-movs {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }
  .lx-movs span {
    font-size: 12px;
    padding: 2px 7px;
    border-radius: 6px;
    background: var(--c, #888);
    color: #fff;
    text-shadow: 1px 1px 0 rgba(0, 0, 0, 0.35);
  }
  .lx-movs small {
    font-family: 'VT323', monospace;
    font-size: 14px;
    margin-right: 4px;
    opacity: 0.9;
  }
</style>
