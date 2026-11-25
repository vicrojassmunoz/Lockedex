<script>
  // Equipo de un jefe como el menú de equipo de los juegos de GBA: el primer Pokémon en grande y el
  // resto en barras. Al pulsar uno se abre su ficha, hecha como la pantalla de datos del Pokémon.
  // Todo va a píxeles: marcos escalonados (gba.js), letra pixelada y barras de PS de la consola.
  import { createEventDispatcher } from 'svelte'
  import { PIcon, Icon } from '$c/core'
  import { Physical, Special, Status } from '$icons'
  import { createImgUrl, UNOWN } from '$utils/rewrites'
  import { marco, bola, TIPO_GBA } from './gba.js'
  import { t, traducirNombre } from './idioma.js'

  export let pokemon = []

  const despachar = createEventDispatcher()

  let abierto = null

  const mayus = (s) => String(s || '').replace(/(^|[-\s])([a-z])/g, (m, a, b) => a + b.toUpperCase())
  const nombreEspecie = (p) => traducirNombre(mayus(String(p.name || '').replace(/-/g, ' ')))
  const colorTipo = (tipo) => TIPO_GBA[String(tipo || '').toLowerCase()] || '#a8a878'

  // Estadísticas al nivel del jefe sin EVs: con sus IVs reales si se conocen (3.ª gen, de pret) y, si no,
  // con IVs perfectos (el peor caso), igual que el medidor de riesgo
  const ivDe = (p) => (p?.iv !== undefined && p?.iv !== null && p?.iv !== '' && Number.isFinite(+p.iv) ? +p.iv : 31)
  const ivReal = (p) => ivDe(p) !== 31 || (p?.iv !== undefined && p?.iv !== null)
  const ps = (p) => {
    const b = +p.stats?.hp || 0
    const n = +p.level || 1
    if (!b) return null
    if (b === 1) return 1
    return Math.floor(((2 * b + ivDe(p)) * n) / 100) + n + 10
  }
  const stat = (p, k) => {
    if (k === 'hp') return ps(p)
    const b = +p.stats?.[k] || 0
    if (!b) return null
    return Math.floor(((2 * b + ivDe(p)) * (+p.level || 1)) / 100) + 5
  }
  const textoPs = (p) =>
    ivReal(p)
      ? t(`PS reales (IVs ${ivDe(p)}, los del juego)`, `Real HP (IVs ${ivDe(p)}, from the game)`)
      : t('PS con IVs perfectos (el peor caso)', 'HP with perfect IVs (worst case)')
  const total = (s) => Object.values(s || {}).reduce((a, b) => a + (+b || 0), 0)
  const ICONO_CLASE = { physical: Physical, special: Special, status: Status }
  const ETIQUETAS = [
    ['hp', 'PS', 'HP'],
    ['atk', 'ATAQUE', 'ATTACK'],
    ['def', 'DEFENSA', 'DEFENSE'],
    ['spa', 'AT. ESP.', 'SP. ATK'],
    ['spd', 'DEF. ESP.', 'SP. DEF'],
    ['spe', 'VELOCID.', 'SPEED']
  ]

  // Paleta de la consola
  const MARCOS = {
    fondo: marco({ tinta: '#183c38', fondo: '#2b766d', luz: '#3c9488', sombra: '#215c55', r: 3, relleno: false }),
    hueco: marco({ tinta: '#283850', fondo: '#4890e8', luz: '#88c8f8', sombra: '#3070c8', r: 3 }),
    elegido: marco({ tinta: '#e85020', fondo: '#98d8f8', luz: '#d8f4ff', sombra: '#68b8e8', r: 3 }),
    vacio: marco({ tinta: '#1d5650', fondo: '#2f7f76', luz: '#2f7f76', sombra: '#2f7f76', r: 3 }),
    ficha: marco({ tinta: '#283850', fondo: '#e0e8f0', luz: '#f8fcff', sombra: '#b0c0d0', r: 3, relleno: false }),
    panel: marco({ tinta: '#687890', fondo: '#f8f8f8', luz: '#ffffff', sombra: '#d8e0e8', r: 2 }),
    ventana: marco({ tinta: '#283850', fondo: '#c8e8f8', luz: '#e8f8ff', sombra: '#98c8e8', r: 2, relleno: false }),
    boton: marco({ tinta: '#283850', fondo: '#f8f8f8', luz: '#ffffff', sombra: '#c8d0d8', r: 2 }),
    mini: marco({ tinta: '#283850', fondo: '#f8f8f8', luz: '#ffffff', sombra: '#c8d0d8', r: 1 })
  }
  const BOLA = bola()

  const elegir = (i) => (abierto = abierto === i ? null : i)
  const mover = (d) => (abierto = (abierto + d + pokemon.length) % pokemon.length)
  $: primero = pokemon[0]
  $: resto = pokemon.slice(1)
  $: huecosVacios = Math.max(0, 5 - resto.length)
  $: elegido = abierto !== null ? pokemon[abierto] : null
</script>

<div class="lx-me" style={MARCOS.fondo}>
  <div class="lx-me-izq">
    {#if primero}
      <button
        class="lx-me-slot lx-me-grande"
        class:lx-me-sel={abierto === 0}
        style={abierto === 0 ? MARCOS.elegido : MARCOS.hueco}
        on:click={() => elegir(0)}
        title={t('Ver su ficha', 'See details')}
      >
        <img class="lx-me-ball" src={BOLA} alt="" aria-hidden="true" />
        <PIcon name={primero.name} className="lx-me-icono" />
        <span class="lx-me-datos">
          <b>{nombreEspecie(primero)}</b>
          <span class="lx-me-nv"><small>{t('Nv', 'Lv')}</small>{primero.level}</span>
        </span>
        {#if primero.held}<span class="lx-me-objeto" title={primero.held.name}><PIcon type="item" name={primero.held.sprite} /></span>{/if}
        <span class="lx-me-ps"><i>{t('PS', 'HP')}</i><span class="lx-me-barra"><span /></span></span>
        {#if ps(primero)}<span class="lx-me-num" title={textoPs(primero)}>{ps(primero)}/{ps(primero)}</span>{/if}
      </button>
    {/if}
  </div>

  <div class="lx-me-der">
    {#each resto as p, i (p.name + i)}
      <button
        class="lx-me-slot"
        class:lx-me-sel={abierto === i + 1}
        style={abierto === i + 1 ? MARCOS.elegido : MARCOS.hueco}
        on:click={() => elegir(i + 1)}
        title={t('Ver su ficha', 'See details')}
      >
        <PIcon name={p.name} className="lx-me-icono" />
        <span class="lx-me-datos">
          <b>{nombreEspecie(p)}</b>
          <span class="lx-me-nv"><small>{t('Nv', 'Lv')}</small>{p.level}</span>
        </span>
        {#if p.held}<span class="lx-me-objeto" title={p.held.name}><PIcon type="item" name={p.held.sprite} /></span>{/if}
        <span class="lx-me-vida">
          <span class="lx-me-ps"><i>{t('PS', 'HP')}</i><span class="lx-me-barra"><span /></span></span>
          {#if ps(p)}<span class="lx-me-num" title={textoPs(p)}>{ps(p)}/{ps(p)}</span>{/if}
        </span>
      </button>
    {/each}
    {#each Array(huecosVacios) as _}
      <span class="lx-me-slot lx-me-vacio" style={MARCOS.vacio} aria-hidden="true" />
    {/each}
  </div>
</div>

{#if elegido}
  <section class="lx-gf" style={MARCOS.ficha}>
    <header class="lx-gf-cab">
      <span class="lx-gf-titulo">{t('INFO. POKéMON', 'POKéMON INFO')}</span>
      {#if pokemon.length > 1}
        <span class="lx-gf-nav">
          <button style={MARCOS.mini} on:click={() => mover(-1)} title={t('Anterior', 'Previous')}>◀</button>
          <span>{abierto + 1}/{pokemon.length}</span>
          <button style={MARCOS.mini} on:click={() => mover(1)} title={t('Siguiente', 'Next')}>▶</button>
        </span>
      {/if}
      <button class="lx-gf-cerrar" style={MARCOS.mini} on:click={() => (abierto = null)} title={t('Cerrar', 'Close')}>×</button>
    </header>

    <div class="lx-gf-cuerpo">
      <div class="lx-gf-izq">
        <div class="lx-gf-ventana" style={MARCOS.ventana}>
          {#key elegido.name}
            <img src={createImgUrl(elegido, { ext: 'png' })} alt="" on:error={(e) => (e.currentTarget.src = UNOWN)} />
          {/key}
        </div>
        <div class="lx-gf-placa">
          <img src={BOLA} alt="" aria-hidden="true" />
          <b>{nombreEspecie(elegido)}</b>
          <span class="lx-me-nv"><small>{t('Nv', 'Lv')}</small>{elegido.level}</span>
        </div>
        <div class="lx-gf-tipos">
          {#each elegido.types || [] as tipo}
            <span class="lx-gf-tipo" style="--c:{colorTipo(tipo)}">{traducirNombre(mayus(tipo))}</span>
          {/each}
        </div>
        <div class="lx-gf-panel lx-gf-datos" style={MARCOS.panel}>
          {#if elegido.ability?.name}
            <span class="lx-gf-etq">{t('HABILIDAD', 'ABILITY')}</span>
            <span class="lx-gf-valor"><span class="cursor-help" data-lx-hab={elegido.ability.name}>{elegido.ability.name}</span></span>
          {/if}
          <span class="lx-gf-etq">{t('OBJETO', 'ITEM')}</span>
          {#if elegido.held?.name}
            <span class="lx-gf-valor lx-gf-obj"><PIcon type="item" name={elegido.held.sprite} /><span class="cursor-help" data-lx-obj={elegido.held.name}>{elegido.held.name}</span></span>
          {:else}
            <span class="lx-gf-valor lx-gf-nada">{t('NINGUNO', 'NONE')}</span>
          {/if}
        </div>
      </div>

      <div class="lx-gf-panel lx-gf-stats" style={MARCOS.panel}>
        <span />
        <span
          class="lx-gf-col"
          title={ivReal(elegido)
            ? t(`Con sus IVs reales (${ivDe(elegido)}) y sin EVs`, `With its real IVs (${ivDe(elegido)}) and no EVs`)
            : t('Con IVs perfectos y sin EVs: el peor caso', 'Perfect IVs and no EVs: worst case')}
        >
          {t('Nv', 'Lv')}{elegido.level}
        </span>
        <span class="lx-gf-col">{t('BASE', 'BASE')}</span>
        {#each ETIQUETAS as [k, es, en]}
          <span class="lx-gf-st">{t(es, en)}</span>
          <span class="lx-gf-v">{stat(elegido, k) ?? '—'}</span>
          <span class="lx-gf-b">{+(elegido.stats?.[k] || 0) || '—'}</span>
        {/each}
        <span class="lx-gf-st lx-gf-total">{t('TOTAL', 'TOTAL')}</span>
        <span />
        <span class="lx-gf-b lx-gf-total">{total(elegido.stats)}</span>
      </div>

      <div class="lx-gf-panel lx-gf-movs" style={MARCOS.panel}>
        {#each elegido.moves || [] as m}
          <div class="lx-gf-mov">
            <span class="lx-gf-mov-nombre cursor-help" data-lx-mov={m.name} data-lx-pot={m.power || ''}>{m.name}</span>
            <span class="lx-gf-mov-datos">
              <span class="lx-gf-tipo" style="--c:{colorTipo(m.type)}">{traducirNombre(mayus(m.type))}</span>
              {#if ICONO_CLASE[m.damage_class]}<Icon inline icon={ICONO_CLASE[m.damage_class]} class="lx-gf-clase" />{/if}
              <span class="lx-gf-pot"><small>{t('POT', 'PWR')}</small>{m.power || '—'}</span>
            </span>
          </div>
        {:else}
          <span class="lx-gf-nada">{t('Sin movimientos conocidos', 'No known moves')}</span>
        {/each}
      </div>
    </div>

    <div class="lx-gf-pie">
      <button class="lx-gf-boton" style={MARCOS.boton} on:click={() => despachar('comparar', abierto)}>
        {t('Comparar con mi equipo', 'Compare with my team')}
      </button>
    </div>
  </section>
{/if}

<style>
  /* Todo lo de este menú va con la letra pixelada a tamaños enteros (12 px = escala 1, 24 px = escala 2) */
  .lx-me,
  .lx-gf {
    font-family: 'LX Pixel', 'VT323', monospace;
    -webkit-font-smoothing: none;
    font-smooth: never;
  }

  /* Fondo del menú: verde azulado con rayas, como la pantalla de equipo de la 3.ª generación */
  .lx-me {
    display: grid;
    grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.4fr);
    gap: 8px 12px;
    padding: 6px 4px;
    background-color: #2b766d;
    background-image: repeating-linear-gradient(0deg, #317f75 0 2px, #2b766d 2px 6px);
  }
  @media (max-width: 700px) {
    .lx-me {
      grid-template-columns: minmax(0, 1fr);
    }
  }
  .lx-me-izq {
    display: flex;
    flex-direction: column;
    padding: 10px 0 0 6px;
  }
  .lx-me-der {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  /* Huecos del equipo */
  .lx-me-slot {
    position: relative;
    display: grid;
    grid-template-columns: 50px minmax(0, 1fr) auto;
    align-items: center;
    column-gap: 4px;
    min-height: 58px;
    padding: 0 4px 0 0;
    text-align: left;
    color: #f8f8f8;
  }
  button.lx-me-slot:hover:not(.lx-me-sel) {
    filter: brightness(1.08);
  }
  /* El elegido lleva el doble contorno naranja de la consola */
  .lx-me-sel {
    filter: drop-shadow(2px 0 0 #f8a848) drop-shadow(-2px 0 0 #f8a848) drop-shadow(0 2px 0 #f8a848)
      drop-shadow(0 -2px 0 #f8a848);
  }
  .lx-me-vacio {
    min-height: 40px;
  }
  .lx-me-slot :global(.lx-me-icono) {
    justify-self: center;
    transform: scale(1.25);
    image-rendering: pixelated;
  }
  .lx-me-datos {
    display: flex;
    flex-direction: column;
    min-width: 0;
    gap: 2px;
  }
  .lx-me-datos b,
  .lx-gf-placa b {
    font-size: 24px;
    /* 26 px: con menos, el «overflow: hidden» del puntos suspensivos corta la base de las letras y su sombra */
    line-height: 26px;
    font-weight: normal;
    text-transform: uppercase;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .lx-me-datos b,
  .lx-me-nv,
  .lx-me-num {
    text-shadow: 2px 2px 0 #283850;
  }
  .lx-me-sel .lx-me-datos b,
  .lx-me-sel .lx-me-nv,
  .lx-me-sel .lx-me-num {
    color: #f8f8f8;
    text-shadow: 2px 2px 0 #305890;
  }
  .lx-me-nv {
    font-size: 24px;
    line-height: 20px;
    padding-left: 16px;
  }
  .lx-me-nv small {
    font-size: 12px;
    margin-right: 2px;
  }
  .lx-me-objeto {
    position: absolute;
    left: 30px;
    bottom: -4px;
    transform: scale(0.65);
    transform-origin: left bottom;
    image-rendering: pixelated;
  }

  /* Barra de PS de la consola: etiqueta amarilla en un marco oscuro, verde a dos tonos */
  .lx-me-vida {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 2px;
  }
  .lx-me-ps {
    display: flex;
    align-items: stretch;
    width: 112px;
    height: 14px;
    padding: 2px 2px 2px 0;
    background: #404858;
    clip-path: polygon(
      2px 0,
      calc(100% - 2px) 0,
      100% 2px,
      100% calc(100% - 2px),
      calc(100% - 2px) 100%,
      2px 100%,
      0 calc(100% - 2px),
      0 2px
    );
  }
  .lx-me-ps i {
    font-style: normal;
    font-size: 12px;
    line-height: 10px;
    color: #f8c838;
    padding: 0 3px 0 4px;
  }
  .lx-me-barra {
    flex: 1;
    background: #283040;
  }
  .lx-me-barra span {
    display: block;
    width: 100%;
    height: 100%;
    background: linear-gradient(#78f8a8 0 4px, #58d080 4px);
  }
  .lx-me-num {
    font-size: 24px;
    line-height: 20px;
    text-align: right;
  }

  /* Primer Pokémon, en grande */
  .lx-me-grande {
    grid-template-columns: 50px minmax(0, 1fr);
    grid-template-rows: auto auto auto;
    row-gap: 6px;
    padding: 8px 8px 4px 4px;
  }
  .lx-me-grande .lx-me-ps {
    grid-column: 1 / span 2;
    width: 100%;
  }
  .lx-me-grande .lx-me-num {
    grid-column: 1 / span 2;
  }
  .lx-me-grande .lx-me-objeto {
    left: 30px;
    bottom: auto;
    top: 22px;
  }
  .lx-me-ball {
    position: absolute;
    left: -18px;
    top: -18px;
    width: 24px;
    height: 24px;
    image-rendering: pixelated;
  }

  /* ---------- Ficha: la pantalla de datos del Pokémon ---------- */
  .lx-gf {
    margin-top: 8px;
    color: #404850;
    background-color: #e0e8f0;
    background-image: repeating-linear-gradient(45deg, #e8eef6 0 4px, #e0e8f0 4px 8px);
  }
  .lx-gf-cab {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: -2px -2px 8px;
    padding: 4px 6px 6px 10px;
    background: #4868a0;
    box-shadow: inset 0 -2px 0 #304878, inset 0 2px 0 #6888c0;
  }
  .lx-gf-titulo {
    flex: 1;
    font-size: 24px;
    line-height: 24px;
    color: #f8f8f8;
    text-shadow: 2px 2px 0 #283850;
  }
  .lx-gf-nav {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 24px;
    line-height: 20px;
    color: #f8f8f8;
    text-shadow: 2px 2px 0 #283850;
  }
  .lx-gf-nav button,
  .lx-gf-cerrar {
    min-width: 28px;
    font-size: 12px;
    line-height: 12px;
    color: #404850;
    text-shadow: none;
  }
  .lx-gf-cerrar {
    font-size: 24px;
    line-height: 12px;
  }
  .lx-gf-nav button:hover,
  .lx-gf-cerrar:hover {
    filter: brightness(0.94);
  }

  .lx-gf-cuerpo {
    display: grid;
    grid-template-columns: 168px minmax(0, 0.9fr) minmax(0, 1.1fr);
    gap: 10px;
    align-items: start;
    padding: 0 4px;
  }
  @media (max-width: 760px) {
    .lx-gf-cuerpo {
      grid-template-columns: 168px minmax(0, 1fr);
    }
    .lx-gf-movs {
      grid-column: 1 / -1;
    }
  }
  .lx-gf-izq {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .lx-gf-ventana {
    display: grid;
    place-items: center;
    height: 148px;
    background-color: #c8e8f8;
    background-image: linear-gradient(transparent 70%, #a8d8f0 70%);
  }
  .lx-gf-ventana img {
    width: 128px;
    height: 128px;
    object-fit: contain;
    image-rendering: pixelated;
  }
  .lx-gf-placa {
    display: grid;
    grid-template-columns: 24px minmax(0, 1fr);
    align-items: center;
    column-gap: 6px;
    color: #404850;
    text-shadow: 2px 2px 0 #c8d0d8;
  }
  .lx-gf-placa img {
    width: 24px;
    height: 24px;
    image-rendering: pixelated;
  }
  .lx-gf-placa .lx-me-nv {
    grid-column: 2;
    padding-left: 0;
  }

  /* Iconos de tipo de la 3.ª generación */
  .lx-gf-tipos {
    display: flex;
    gap: 4px;
  }
  .lx-gf-tipo {
    display: inline-grid;
    place-items: center;
    min-width: 64px;
    height: 24px;
    padding: 0 6px;
    font-size: 12px;
    line-height: 12px;
    text-transform: uppercase;
    color: #f8f8f8;
    text-shadow: 1px 1px 0 color-mix(in srgb, var(--c) 45%, #000);
    background: linear-gradient(color-mix(in srgb, var(--c) 75%, #fff) 0 50%, var(--c) 50%);
    box-shadow: inset 0 0 0 2px color-mix(in srgb, var(--c) 50%, #000);
    clip-path: polygon(
      2px 0,
      calc(100% - 2px) 0,
      100% 2px,
      100% calc(100% - 2px),
      calc(100% - 2px) 100%,
      2px 100%,
      0 calc(100% - 2px),
      0 2px
    );
  }

  /* Recuadros blancos con texto oscuro y sombra clara, como en la consola */
  .lx-gf-panel {
    color: #404850;
    text-shadow: 2px 2px 0 #d0d8e0;
    font-size: 24px;
    line-height: 22px;
  }
  .lx-gf-datos {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 2px 2px 4px;
  }
  .lx-gf-etq {
    align-self: flex-start;
    padding: 2px 6px;
    font-size: 12px;
    line-height: 12px;
    color: #f8f8f8;
    text-shadow: 1px 1px 0 #283850;
    background: #6880b0;
  }
  .lx-gf-valor {
    text-transform: uppercase;
    overflow-wrap: anywhere;
  }
  .lx-gf-valor + .lx-gf-etq {
    margin-top: 4px;
  }
  .lx-gf-obj {
    display: flex;
    align-items: center;
    gap: 2px;
  }
  .lx-gf-obj :global(img) {
    image-rendering: pixelated;
  }
  .lx-gf-nada {
    color: #98a0a8;
    text-shadow: none;
  }

  .lx-gf-stats {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto auto;
    column-gap: 10px;
    row-gap: 4px;
    padding: 4px 6px 6px;
  }
  .lx-gf-col {
    font-size: 12px;
    line-height: 12px;
    text-align: right;
    color: #6880b0;
    text-shadow: none;
  }
  .lx-gf-st {
    white-space: nowrap;
  }
  .lx-gf-v {
    text-align: right;
  }
  .lx-gf-b {
    text-align: right;
    min-width: 36px;
    color: #8890a0;
    text-shadow: 2px 2px 0 #e0e4ea;
  }
  .lx-gf-total {
    margin-top: 4px;
    padding-top: 4px;
    border-top: 2px dotted #b8c0cc;
  }

  .lx-gf-movs {
    display: flex;
    flex-direction: column;
    padding: 2px 6px;
  }
  .lx-gf-mov {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 5px 0 6px;
  }
  .lx-gf-mov + .lx-gf-mov {
    border-top: 2px dotted #b8c0cc;
  }
  .lx-gf-mov-nombre {
    text-transform: uppercase;
  }
  .lx-gf-mov-datos {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .lx-gf-mov-datos :global(.lx-gf-clase) {
    width: 20px;
    height: 20px;
    fill: #687890;
  }
  .lx-gf-pot {
    margin-left: auto;
  }
  .lx-gf-pot small {
    font-size: 12px;
    margin-right: 4px;
    color: #6880b0;
    text-shadow: none;
  }

  .lx-gf-pie {
    display: flex;
    justify-content: flex-end;
    padding: 8px 4px 2px;
  }
  /* Botón de menú: aparece el cursor ▶ al pasar por encima */
  .lx-gf-boton {
    position: relative;
    padding: 0 8px 0 22px;
    font-size: 24px;
    line-height: 26px;
    color: #404850;
    text-shadow: 2px 2px 0 #d0d8e0;
  }
  .lx-gf-boton::before {
    content: '▶';
    position: absolute;
    left: 4px;
    top: 50%;
    transform: translateY(-50%);
    font-size: 12px;
    line-height: 12px;
    color: #404850;
    text-shadow: none;
    opacity: 0;
  }
  .lx-gf-boton:hover::before,
  .lx-gf-boton:focus-visible::before {
    opacity: 1;
  }
  .lx-gf-boton:active {
    transform: translateY(2px);
  }
</style>
