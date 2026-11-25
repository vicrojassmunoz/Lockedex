<script>
  // Equipo de un jefe como el menú de equipo de los juegos: el primer Pokémon en grande y el resto
  // en barras. Al pulsar uno se despliega su ficha.
  import { createEventDispatcher } from 'svelte'
  import { PIcon, Icon } from '$c/core'
  import { Physical, Special, Status } from '$icons'
  import { createImgUrl, UNOWN } from '$utils/rewrites'
  import { COLOR_TIPO } from './colores.js'
  import { t, traducirNombre } from './idioma.js'

  export let pokemon = []

  const despachar = createEventDispatcher()

  let abierto = null

  const mayus = (s) => String(s || '').replace(/(^|[-\s])([a-z])/g, (m, a, b) => a + b.toUpperCase())
  const nombreEspecie = (p) => traducirNombre(mayus(String(p.name || '').replace(/-/g, ' ')))
  // PS al nivel del jefe con IVs perfectos y sin EVs (el peor caso, igual que el medidor de riesgo)
  const ps = (p) => {
    const b = +p.stats?.hp || 0
    const n = +p.level || 1
    if (!b) return null
    if (b === 1) return 1
    return Math.floor(((2 * b + 31) * n) / 100) + n + 10
  }
  const total = (s) => Object.values(s || {}).reduce((a, b) => a + (+b || 0), 0)
  const colorStat = (v) => (v >= 110 ? '#38bdf8' : v >= 85 ? '#4ade80' : v >= 60 ? '#facc15' : '#f87171')
  const ICONO_CLASE = { physical: Physical, special: Special, status: Status }
  const ETIQUETAS = [
    ['hp', 'PS', 'HP'],
    ['atk', 'Atq.', 'Atk'],
    ['def', 'Def.', 'Def'],
    ['spa', 'At. Esp.', 'Sp. Atk'],
    ['spd', 'Def. Esp.', 'Sp. Def'],
    ['spe', 'Vel.', 'Speed']
  ]

  const elegir = (i) => (abierto = abierto === i ? null : i)
  $: primero = pokemon[0]
  $: resto = pokemon.slice(1)
  $: huecosVacios = Math.max(0, 5 - resto.length)
  $: elegido = abierto !== null ? pokemon[abierto] : null
</script>

<div class="lx-me">
  <div class="lx-me-izq">
    {#if primero}
      <button class="lx-me-slot lx-me-grande" class:lx-me-sel={abierto === 0} on:click={() => elegir(0)} title={t('Ver su ficha', 'See details')}>
        <span class="lx-me-ball" aria-hidden="true" />
        <PIcon name={primero.name} className="lx-me-icono" />
        <span class="lx-me-datos">
          <b>{nombreEspecie(primero)}</b>
          <small>{t('Nv', 'Lv')}{primero.level}</small>
        </span>
        <span class="lx-me-ps">
          <i>PS</i><span class="lx-me-barra"><span /></span>
        </span>
        {#if ps(primero)}<span class="lx-me-num" title={t('PS con IVs perfectos (el peor caso)', 'HP with perfect IVs (worst case)')}>{ps(primero)}/ {ps(primero)}</span>{/if}
      </button>
    {/if}
  </div>

  <div class="lx-me-der">
    {#each resto as p, i (p.name + i)}
      <button class="lx-me-slot" class:lx-me-sel={abierto === i + 1} on:click={() => elegir(i + 1)} title={t('Ver su ficha', 'See details')}>
        <PIcon name={p.name} className="lx-me-icono" />
        <span class="lx-me-datos">
          <b>{nombreEspecie(p)}</b>
          <small>{t('Nv', 'Lv')}{p.level}</small>
        </span>
        {#if p.held}<span class="lx-me-objeto" title={p.held.name}><PIcon type="item" name={p.held.sprite} /></span>{/if}
        <span class="lx-me-ps">
          <i>PS</i><span class="lx-me-barra"><span /></span>
        </span>
        {#if ps(p)}<span class="lx-me-num" title={t('PS con IVs perfectos (el peor caso)', 'HP with perfect IVs (worst case)')}>{ps(p)}/ {ps(p)}</span>{/if}
      </button>
    {/each}
    {#each Array(huecosVacios) as _}
      <span class="lx-me-slot lx-me-vacio" aria-hidden="true" />
    {/each}
  </div>
</div>

{#if elegido}
  <section class="lx-me-ficha">
    <div class="lx-me-ficha-cab">
      <img
        class="lx-me-sprite"
        src={createImgUrl(elegido, { ext: 'png' })}
        alt=""
        on:error={(e) => (e.currentTarget.src = UNOWN)}
      />
      <div class="lx-me-ficha-nombre">
        <h4>{nombreEspecie(elegido)} <small>{t('Nv', 'Lv')}{elegido.level}</small></h4>
        <div class="lx-me-tipos">
          {#each elegido.types || [] as tipo}
            <span class="lx-me-tipo" style="--c:{COLOR_TIPO[String(tipo).toLowerCase()] || '#888'}">{traducirNombre(mayus(tipo))}</span>
          {/each}
        </div>
        <dl>
          {#if elegido.ability?.name}
            <div><dt>{t('Habilidad', 'Ability')}</dt><dd><span class="cursor-help" data-lx-hab={elegido.ability.name}>{elegido.ability.name}</span></dd></div>
          {/if}
          {#if elegido.held?.name}
            <div>
              <dt>{t('Objeto', 'Item')}</dt>
              <dd class="lx-me-obj"><PIcon type="item" name={elegido.held.sprite} /><span class="cursor-help" data-lx-obj={elegido.held.name}>{elegido.held.name}</span></dd>
            </div>
          {/if}
        </dl>
      </div>
      <button class="lx-me-cerrar" on:click={() => (abierto = null)} title={t('Cerrar', 'Close')}>✕</button>
    </div>

    <div class="lx-me-cuerpo">
      <div class="lx-me-movs">
        {#each elegido.moves || [] as m}
          <div class="lx-me-mov" style="--c:{COLOR_TIPO[String(m.type).toLowerCase()] || '#888'}">
            <span class="lx-me-mov-nombre cursor-help" data-lx-mov={m.name} data-lx-pot={m.power || ''}>{m.name}</span>
            <span class="lx-me-mov-datos">
              <span class="lx-me-mov-tipo">{traducirNombre(mayus(m.type))}</span>
              {#if ICONO_CLASE[m.damage_class]}<Icon inline icon={ICONO_CLASE[m.damage_class]} class="fill-current" />{/if}
              {#if m.power}<b>{m.power}</b>{:else}<b>—</b>{/if}
            </span>
          </div>
        {/each}
      </div>

      <div class="lx-me-stats">
        {#each ETIQUETAS as [k, es, en]}
          {@const v = +(elegido.stats?.[k] || 0)}
          <span class="lx-me-st-n">{t(es, en)}</span>
          <span class="lx-me-st-v">{v}</span>
          <span class="lx-me-st-b"><i style="width:{Math.min(100, (v / 180) * 100)}%;background:{colorStat(v)}" /></span>
        {/each}
        <span class="lx-me-st-n lx-me-total">{t('Total', 'Total')}</span>
        <span class="lx-me-st-v lx-me-total">{total(elegido.stats)}</span>
        <span />
      </div>
    </div>

    <button class="lx-me-comparar" on:click={() => despachar('comparar', abierto)}>
      {t('Comparar con mi equipo', 'Compare with my team')} ▸
    </button>
  </section>
{/if}

<style>
  /* Fondo del menú: verde azulado con rayas, como la pantalla de equipo de la 3.ª generación */
  .lx-me {
    display: grid;
    grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.4fr);
    gap: 10px 14px;
    padding: 14px;
    border: 3px solid var(--lx-tinta);
    border-radius: var(--lx-radio);
    background-color: #2f7f76;
    background-image: repeating-linear-gradient(0deg, rgba(255, 255, 255, 0.07) 0 2px, transparent 2px 6px);
    box-shadow: inset 0 0 0 3px rgba(0, 0, 0, 0.15);
  }
  @media (max-width: 700px) {
    .lx-me {
      grid-template-columns: minmax(0, 1fr);
    }
  }
  .lx-me-izq {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .lx-me-der {
    display: flex;
    flex-direction: column;
    gap: 7px;
  }

  /* Huecos del equipo */
  .lx-me-slot {
    position: relative;
    display: grid;
    grid-template-columns: 40px minmax(0, 1fr) auto;
    grid-template-rows: auto auto;
    align-items: center;
    column-gap: 8px;
    min-height: 54px;
    padding: 4px 12px 4px 6px;
    text-align: left;
    color: #fff;
    border-radius: 8px;
    background: linear-gradient(#4a9ae8 0 58%, #3a86d8 58%);
    border: 3px solid #384858;
    box-shadow: inset 0 0 0 2px rgba(255, 255, 255, 0.25);
    transition: transform 0.08s;
  }
  button.lx-me-slot:hover {
    transform: translateX(2px);
  }
  .lx-me-sel {
    border-color: #f87830;
    box-shadow: 0 0 0 2px #f87830, inset 0 0 0 2px rgba(255, 255, 255, 0.4);
  }
  .lx-me-vacio {
    min-height: 40px;
    background: rgba(255, 255, 255, 0.08);
    border: 3px solid rgba(0, 0, 0, 0.18);
    box-shadow: none;
  }
  .lx-me-slot :global(.lx-me-icono) {
    grid-row: 1 / span 2;
    transform: scale(1.25);
    image-rendering: pixelated;
    filter: drop-shadow(1px 1px 0 rgba(0, 0, 0, 0.35));
  }
  .lx-me-datos {
    grid-row: 1 / span 2;
    display: flex;
    flex-direction: column;
    min-width: 0;
  }
  .lx-me-datos b {
    font-family: 'VT323', monospace;
    font-size: 23px;
    line-height: 1;
    font-weight: normal;
    letter-spacing: 0.5px;
    text-shadow: 2px 2px 0 #304060;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .lx-me-datos small {
    font-family: 'VT323', monospace;
    font-size: 19px;
    line-height: 1;
    padding-left: 18px;
    text-shadow: 2px 2px 0 #304060;
  }
  .lx-me-ps {
    display: flex;
    align-items: center;
    width: 120px;
    height: 13px;
    border-radius: 7px;
    background: #404050;
    padding: 2px 3px 2px 2px;
  }
  .lx-me-ps i {
    font-style: normal;
    font-family: 'VT323', monospace;
    font-size: 13px;
    line-height: 1;
    color: #f8c030;
    padding: 0 4px 0 2px;
  }
  .lx-me-barra {
    flex: 1;
    height: 7px;
    border-radius: 4px;
    background: #fff;
    overflow: hidden;
  }
  .lx-me-barra span {
    display: block;
    height: 100%;
    background: linear-gradient(#70f8a8 0 50%, #58d080 50%);
  }
  .lx-me-num {
    font-family: 'VT323', monospace;
    font-size: 19px;
    line-height: 1;
    text-align: right;
    text-shadow: 2px 2px 0 #304060;
  }
  .lx-me-objeto {
    position: absolute;
    left: 28px;
    bottom: 2px;
    transform: scale(0.7);
    transform-origin: left bottom;
  }

  /* Primer Pokémon, en grande */
  .lx-me-grande {
    grid-template-columns: 40px minmax(0, 1fr);
    grid-template-rows: auto auto auto;
    padding: 12px 14px 10px 10px;
    background: linear-gradient(#90d8f8 0 55%, #70c0e8 55%);
    border-color: #384858;
  }
  .lx-me-grande .lx-me-datos {
    grid-row: 1 / span 1;
  }
  .lx-me-grande .lx-me-ps {
    grid-column: 1 / span 2;
    width: 100%;
    margin-top: 8px;
  }
  .lx-me-grande .lx-me-num {
    grid-column: 1 / span 2;
    margin-top: 3px;
  }
  .lx-me-ball {
    position: absolute;
    left: -12px;
    top: -12px;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    border: 3px solid #404050;
    background: linear-gradient(#f87830 0 44%, #404050 44% 56%, #f8f8f8 56%);
  }

  /* Ficha desplegada */
  .lx-me-ficha {
    margin-top: 10px;
    padding: 12px 14px 14px;
    border: 3px solid var(--lx-tinta);
    border-radius: var(--lx-radio);
    background: var(--lx-panel);
    box-shadow: var(--lx-sombra);
    color: var(--lx-texto);
  }
  .lx-me-ficha-cab {
    position: relative;
    display: flex;
    gap: 12px;
    align-items: center;
  }
  .lx-me-sprite {
    width: 96px;
    height: 96px;
    image-rendering: pixelated;
    object-fit: contain;
    border-radius: 12px;
    background: radial-gradient(circle at 50% 65%, rgba(0, 0, 0, 0.08), transparent 65%);
  }
  .lx-me-ficha-nombre h4 {
    font-family: 'VT323', monospace;
    font-size: 30px;
    line-height: 1;
    font-weight: normal;
  }
  .lx-me-ficha-nombre h4 small {
    font-size: 20px;
    color: var(--lx-texto-suave);
  }
  .lx-me-tipos {
    display: flex;
    gap: 4px;
    margin: 4px 0 6px;
  }
  .lx-me-tipo {
    padding: 1px 8px;
    font-family: 'VT323', monospace;
    font-size: 16px;
    letter-spacing: 1px;
    text-transform: uppercase;
    color: #fff;
    background: var(--c);
    border: 2px solid rgba(0, 0, 0, 0.35);
    border-radius: 6px;
  }
  .lx-me-ficha dl {
    display: grid;
    gap: 2px;
    font-size: 13px;
  }
  .lx-me-ficha dl div {
    display: flex;
    gap: 8px;
    align-items: center;
  }
  .lx-me-ficha dt {
    width: 72px;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--lx-texto-suave);
  }
  .lx-me-obj {
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }
  .lx-me-cerrar {
    position: absolute;
    right: 0;
    top: 0;
    width: 28px;
    height: 28px;
    border-radius: 8px;
    border: 2px solid var(--lx-tinta);
    background: var(--lx-panel);
    box-shadow: var(--lx-sombra-sm);
  }
  .lx-me-cuerpo {
    display: grid;
    grid-template-columns: minmax(0, 1.3fr) minmax(0, 1fr);
    gap: 14px;
    margin-top: 10px;
  }
  @media (max-width: 700px) {
    .lx-me-cuerpo {
      grid-template-columns: minmax(0, 1fr);
    }
  }
  /* Movimientos como en el menú de combate */
  .lx-me-movs {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 6px;
    align-content: start;
  }
  .lx-me-mov {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 6px 8px 5px 12px;
    border-radius: 8px;
    border: 2px solid var(--lx-tinta);
    background: linear-gradient(90deg, var(--c) 0 6px, var(--lx-panel-2) 6px);
  }
  .lx-me-mov-nombre {
    font-weight: 700;
    font-size: 14px;
    line-height: 1.15;
  }
  .lx-me-mov-datos {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    color: var(--lx-texto-suave);
  }
  .lx-me-mov-tipo {
    font-family: 'VT323', monospace;
    font-size: 15px;
    text-transform: uppercase;
    color: var(--c);
    filter: brightness(0.8);
  }
  .lx-me-mov-datos b {
    margin-left: auto;
    font-family: 'VT323', monospace;
    font-size: 18px;
    font-weight: normal;
    color: var(--lx-texto);
  }
  .lx-me-stats {
    display: grid;
    grid-template-columns: 64px 30px minmax(0, 1fr);
    align-items: center;
    gap: 4px 8px;
    font-size: 12.5px;
  }
  .lx-me-st-n {
    color: var(--lx-texto-suave);
  }
  .lx-me-st-v {
    text-align: right;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
  }
  .lx-me-st-b {
    height: 9px;
    border-radius: 5px;
    background: var(--lx-panel-2);
    border: 1.5px solid var(--lx-tinta);
    overflow: hidden;
  }
  .lx-me-st-b i {
    display: block;
    height: 100%;
  }
  .lx-me-total {
    margin-top: 3px;
    color: var(--lx-texto);
    font-weight: 700;
  }
  .lx-me-comparar {
    margin-top: 12px;
    padding: 5px 12px;
    font-family: 'VT323', monospace;
    font-size: 19px;
    border: 2px solid var(--lx-tinta);
    border-radius: var(--lx-radio-sm);
    background: var(--lx-lcd);
    color: var(--lx-lcd-texto);
    box-shadow: var(--lx-sombra-sm);
  }
  .lx-me-comparar:active {
    transform: translate(2px, 2px);
    box-shadow: none;
  }
</style>
