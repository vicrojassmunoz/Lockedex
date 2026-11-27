<script>
  // Lo que dice la partida del emulador de un Pokémon: nivel, habilidad, movimientos (con su clase según la
  // generación) e IVs. Se usa en la ficha de la Caja PC y en la pestaña «PC del juego»
  import { onMount } from 'svelte'
  import { movimientos as cargarMovs, habilidades as cargarHabs, norm } from './datos.js'
  import { claseVista } from './genVista.js'
  import { COLOR_TIPO } from './colores.js'
  import { t, traducirNombre, idioma } from './idioma.js'

  export let s = null // Pokémon del .sav
  export let gen = 3

  const es = idioma() === 'es'
  const colorTipo = (tipo) => COLOR_TIPO[String(tipo || '').toLowerCase()] || '#a8a878'
  let movs = {}
  let porId = {}
  let habs = {}
  onMount(async () => {
    ;[movs, habs] = await Promise.all([cargarMovs().catch(() => ({})), cargarHabs().catch(() => ({}))])
    porId = Object.fromEntries(Object.values(movs || {}).map((m) => [m.id, m]))
  })

  $: habilidad = s?.habilidad ? habs?.[norm(s.habilidad)] : null
  $: lista = (s?.movimientos || []).map((id, i) => ({ ...(porId[id] || { en: `#${id}`, es: `#${id}` }), ppActual: s?.pp?.[i] }))
  const CLASE = { physical: ['Físico', 'Physical'], special: ['Especial', 'Special'], status: ['Estado', 'Status'] }
  const IVS = [
    ['hp', 'PS', 'HP'],
    ['atk', 'Atq', 'Atk'],
    ['def', 'Def', 'Def'],
    ['spa', 'AtE', 'SpA'],
    ['spd', 'DfE', 'SpD'],
    ['spe', 'Vel', 'Spe']
  ]
</script>

{#if s}
  <div class="lx-fs" data-lx-original>
    <div class="lx-fs-fila">
      <span class="lx-fs-etq">{t('Nivel', 'Level')}</span>
      <b>{s.nivel ?? '—'}</b>
      {#if habilidad || s.habilidad}
        <span class="lx-fs-etq">{t('Habilidad', 'Ability')}</span>
        <b class="cursor-help" data-lx-hab={habilidad?.en || s.habilidad}>{habilidad ? (es ? habilidad.es : habilidad.en) : traducirNombre(s.habilidad)}</b>
      {/if}
    </div>
    {#if lista.length}
      <ul class="lx-fs-movs">
        {#each lista as m}
          {@const clase = claseVista(m.clase, m.tipo, gen)}
          <li>
            <span class="lx-fs-tipo" style="--c:{colorTipo(m.tipo)}">{traducirNombre((m.tipo || '').charAt(0).toUpperCase() + (m.tipo || '').slice(1))}</span>
            <span class="lx-fs-mov cursor-help" data-lx-mov={m.en} data-lx-pot={m.potencia || ''}>{es ? m.es : m.en}</span>
            <small class="lx-fs-clase lx-fs-{clase}">{CLASE[clase] ? t(...CLASE[clase]) : ''}</small>
            <small class="lx-fs-pot">{m.potencia || '—'}</small>
            {#if m.ppActual != null}<small class="lx-fs-pp">{m.ppActual}/{m.pp ?? '?'} PP</small>{/if}
          </li>
        {/each}
      </ul>
    {/if}
    {#if s.ivs}
      <div class="lx-fs-ivs" title={t('IVs (0–31) de la partida', 'IVs (0–31) from your save')}>
        <span class="lx-fs-etq">IVs</span>
        {#each IVS as [k, e, n]}
          <span class:lx-fs-alto={s.ivs[k] >= 26} class:lx-fs-bajo={s.ivs[k] <= 5}><small>{t(e, n)}</small>{s.ivs[k]}</span>
        {/each}
      </div>
    {/if}
  </div>
{/if}

<style>
  .lx-fs {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin-top: 8px;
    padding: 8px;
    border: 2px solid var(--lx-tinta);
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.35);
    font-size: 0.9em;
  }
  :global(html.dark) .lx-fs {
    background: rgba(255, 255, 255, 0.04);
  }
  .lx-fs-fila {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 4px 8px;
  }
  .lx-fs-etq {
    font-size: 0.8em;
    opacity: 0.7;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .lx-fs-movs {
    display: grid;
    gap: 3px;
  }
  .lx-fs-movs li {
    display: grid;
    grid-template-columns: 62px minmax(0, 1fr) auto auto auto;
    align-items: center;
    gap: 6px;
  }
  .lx-fs-tipo {
    padding: 0 4px;
    border-radius: 4px;
    background: var(--c, #888);
    color: #fff;
    font-size: 0.75em;
    text-align: center;
    text-shadow: 0 1px 0 rgba(0, 0, 0, 0.4);
  }
  .lx-fs-mov {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .lx-fs-clase {
    font-size: 0.72em;
    opacity: 0.8;
  }
  .lx-fs-physical {
    color: #c03028;
  }
  .lx-fs-special {
    color: #3868c0;
  }
  :global(html.dark) .lx-fs-special {
    color: #7aa2f0;
  }
  :global(html.dark) .lx-fs-physical {
    color: #f07a72;
  }
  .lx-fs-pot,
  .lx-fs-pp {
    font-size: 0.75em;
    opacity: 0.75;
    text-align: right;
  }
  .lx-fs-ivs {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 2px 8px;
  }
  .lx-fs-ivs span small {
    margin-right: 2px;
    font-size: 0.75em;
    opacity: 0.7;
  }
  .lx-fs-alto {
    color: #2f9e44;
    font-weight: bold;
  }
  .lx-fs-bajo {
    color: #c03028;
  }
</style>
