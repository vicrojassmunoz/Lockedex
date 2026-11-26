<script>
  // Herencia del Genlocke: el equipo campeón de la run anterior, para añadirlo a la Caja de esta
  import { getGameStore, patch } from '$lib/store'
  import { leerGenlocke, lugarHerencia } from './genlocke.js'
  import { leerPartida } from './partida.js'
  import { t, traducirNombre } from './idioma.js'

  export let id = ''
  export let datos = {}

  $: enlace = leerGenlocke(id)
  $: anterior = enlace ? leerPartida(enlace.anterior) : null
  let oculto = false
  $: oculto = typeof localStorage !== 'undefined' && localStorage.getItem(`lockedex.genlockeOculto.${id}`) === '1'
  $: pendientes = (enlace?.herencia || []).filter((m) => !datos?.[lugarHerencia(m)])

  const sprite = (m) => (m.imgId ? `/assets/img/pokemon/base-${m.imgId}.png` : '/assets/img/pokemon/base-201-question.png')
  const nombre = (m) => m.mote || traducirNombre(m.nombre || m.alias)

  // Entra como regalo (no gasta encuentro) con su mote
  const anadir = (lista) => {
    const cambios = {}
    for (const m of lista) cambios[lugarHerencia(m)] = { pokemon: m.alias, nickname: m.mote || '', status: 2, location: lugarHerencia(m), genlocke: true }
    getGameStore(id).update(patch(cambios))
  }
  const ocultar = () => {
    localStorage.setItem(`lockedex.genlockeOculto.${id}`, '1')
    oculto = true
  }
</script>

{#if enlace?.herencia?.length && !oculto}
  <section class="lx-genlocke" data-lx-original>
    <header>
      <span>{t('HERENCIA DEL GENLOCKE', 'GENLOCKE INHERITANCE')} · {t(`juego ${(enlace.cadena?.length || 1) + 1}`, `game ${(enlace.cadena?.length || 1) + 1}`)}</span>
      <button on:click={ocultar} title={t('Ocultar', 'Hide')}>✕</button>
    </header>
    <p>
      {t('Tu equipo campeón de', 'Your champion team from')} <b>{anterior?.nombre || t('la run anterior', 'the previous run')}</b>.
      {t('Consíguelos en este juego como diga tu reglamento (intercambio, crianza…) y añádelos a la Caja: entran como regalos.', 'Get them in this game as your ruleset says (trade, breeding…) and add them to the Box: they come in as gifts.')}
    </p>
    <ul>
      {#each enlace.herencia as m}
        {@const dentro = !!datos?.[lugarHerencia(m)]}
        <li class:lx-dentro={dentro}>
          <img src={sprite(m)} alt="" width="48" height="48" />
          <span>{nombre(m)}</span>
          {#if dentro}<small>✓ {t('en la Caja', 'in the Box')}</small>{:else}<button on:click={() => anadir([m])}>{t('Añadir', 'Add')}</button>{/if}
        </li>
      {/each}
    </ul>
    {#if pendientes.length > 1}
      <button class="lx-genlocke-todos" on:click={() => anadir(pendientes)}>{t('Añadir todos a la Caja', 'Add all to the Box')}</button>
    {/if}
  </section>
{/if}

<style>
  .lx-genlocke {
    padding: 8px 12px 10px;
    color: #e8f0ff;
    background: repeating-linear-gradient(0deg, rgba(255, 255, 255, 0.03) 0 2px, transparent 2px 4px), #182848;
    border: 3px solid #5078c8;
    box-shadow: inset 0 0 0 2px #182848, inset 0 0 0 4px #284888;
    font-family: 'LX Pixel', 'VT323', monospace;
    font-size: 12px;
  }
  header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 18px;
    line-height: 22px;
    color: #90b8ff;
    text-shadow: 2px 2px 0 #000;
  }
  header button {
    font-size: 14px;
    color: #90b8ff;
  }
  p {
    margin: 4px 0 6px;
    line-height: 16px;
  }
  p b {
    font-weight: normal;
    color: #f8d048;
  }
  ul {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
  li {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 84px;
    padding: 2px 4px 4px;
    background: rgba(255, 255, 255, 0.06);
    border-radius: 6px;
  }
  li img {
    image-rendering: pixelated;
  }
  li span {
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  li small {
    color: #80d090;
  }
  li.lx-dentro {
    opacity: 0.7;
  }
  li button,
  .lx-genlocke-todos {
    margin-top: 2px;
    padding: 0 8px;
    color: #182848;
    background: #90b8ff;
    box-shadow: inset 0 -2px 0 #5078c8;
  }
  .lx-genlocke-todos {
    margin-top: 8px;
    padding: 2px 12px;
  }
</style>
