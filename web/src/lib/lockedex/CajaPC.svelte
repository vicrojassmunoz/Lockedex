<script>
  import { encajarIcono } from './encajar.js'
  import { recorte } from '$lib/lockedex/recorte.js'
  import { urlAnimada, alFallarSprite, ajustarGif } from '$lib/lockedex/animado.js'
  // Caja del PC: rejilla de 30 huecos por caja y panel de detalle del Pokémon elegido.
  import { createEventDispatcher, onMount } from 'svelte'
  import { PIcon, Icon } from '$c/core'
  import { Ball, Deceased, External, Shiny } from '$icons'
  import TypeLogo from '$lib/components/type-logo.svelte'
  import { drag } from '$utils/drag'
  import { locid } from '$utils/pokemon'
  import { createImgUrl, UNOWN } from '$utils/rewrites'
  import { toDb } from '$utils/link'
  import { summarise } from '$utils/badges'
  import { t, traducirNombre } from './idioma'
  import { activeGame } from '$lib/store'
  import { leerReglas, sinCalculos } from './reglas.js'
  import { tiendaParejas, parejaDe, emparejar } from './parejas.js'
  import { tipoCambio, pendienteDeCambio, sePuedeCambiar, esInicial, aplicarCambio, deshacerCambio, eclosionadosDelSav, marcarCambiado } from './cambios.js'
  import { leerPartida } from './partida.js'
  import { fetchData } from '$utils/fetchers'

  export let lista = []
  export let Pokemon = {}
  export let equipo = []
  export let victorias = []
  export let evoHecha = false
  export let Particles = null
  // (idJefe, lugar) → ¿pudo estar en ese combate? (combatesPosibles.js)
  export let posible = () => true

  const despachar = createEventDispatcher()
  const HUECOS = 30
  const COLUMNAS = 6

  let caja = 0
  let elegido = null
  let rejilla

  $: cajas = Math.max(1, Math.ceil(lista.length / HUECOS))
  $: if (caja > cajas - 1) caja = cajas - 1
  $: enCaja = lista.slice(caja * HUECOS, caja * HUECOS + HUECOS)
  $: huecos = Array.from({ length: HUECOS }, (_, i) => enCaja[i] || null)
  // Si el elegido desaparece (filtro, muerte…), se elige el primero de la caja
  $: if (!elegido || !lista.some((p) => locid(p) === locid(elegido))) elegido = enCaja[0] || null
  $: if (elegido) elegido = lista.find((p) => locid(p) === locid(elegido)) || elegido
  $: datos = elegido ? Pokemon[elegido.pokemon] : null
  $: enEquipo = elegido && (equipo || []).includes(locid(elegido))
  $: puedeEquipo = elegido && (enEquipo || !equipo || equipo.length < 6)
  $: medallas = elegido ? summarise(elegido, (victorias || []).filter((v) => posible(v.id, locid(elegido)))) : null

  // Wedlocke: pareja del elegido (se elige en el detalle) y ♥ en los huecos emparejados
  $: wedlocke = !!leerReglas($activeGame).wedlocke
  $: tParejas = tiendaParejas($activeGame)
  $: parejas = $tParejas || []
  $: pareja = elegido ? parejaDe(parejas, elegido.location) : null
  $: candidatos = elegido ? lista.filter((p) => p.location !== elegido.location && [1, 2, 3, 6].includes(+p.status)) : []
  // Egglocke / Wonderlocke: lo que ha salido del huevo (o ha llegado por el intercambio)
  $: cambio = tipoCambio(leerReglas($activeGame))
  let especiesTodas = []
  $: if (cambio && !especiesTodas.length)
    fetchData().then((d) => (especiesTodas = Object.values(d?.aliasMap || {}).map((x) => ({ alias: x.alias, nombre: traducirNombre(x.name) }))))
  let nuevaEspecie = ''
  $: elegidaNueva = especiesTodas.find((x) => x.nombre.toLowerCase() === nuevaEspecie.trim().toLowerCase() || x.alias === nuevaEspecie.trim().toLowerCase())
  const apuntarCambio = () => {
    if (!elegidaNueva || !elegido) return
    aplicarCambio($activeGame, elegido.location, elegidaNueva.alias)
    nuevaEspecie = ''
  }
  // Los nacidos de un huevo en la partida del emulador que aún no están en la run, para elegirlos de un clic
  const lineaDe = (x) => (Pokemon[x] || Object.values(Pokemon).find((p) => p?.name?.toLowerCase() === String(x).toLowerCase()))?.evoline || null
  $: eclosionados = cambio === 'huevo' && elegido ? eclosionadosDelSav($activeGame, leerPartida($activeGame)?.datos || {}, lineaDe) : []
  const aliasDe = (especie) => especiesTodas.find((x) => x.alias === String(especie).toLowerCase() || x.nombre.toLowerCase() === traducirNombre(especie).toLowerCase())?.alias
  const nombreEspecie = (e) => traducirNombre(Pokemon[aliasDe(e) || String(e).toLowerCase()]?.name || String(e).charAt(0).toUpperCase() + String(e).slice(1))
  const apuntarEclosionado = (s) => {
    const alias = aliasDe(s.especie)
    if (!alias || !elegido) return
    aplicarCambio($activeGame, elegido.location, alias, { nickname: s.mote && s.mote.toLowerCase() !== String(s.especie).toLowerCase() ? s.mote : '', nature: s.naturaleza })
  }
  const nombreDe = (lugarP) => {
    const p = lista.find((x) => x.location === lugarP)
    return p ? p.nickname || traducirNombre(Pokemon[p.pokemon]?.name || p.pokemon) : traducirNombre(lugarP)
  }

  const ETIQUETAS = [
    ['hp', 'PS', 'HP'],
    ['atk', 'Ataque', 'Attack'],
    ['def', 'Defensa', 'Defense'],
    ['spa', 'At. Esp.', 'Sp. Atk'],
    ['spd', 'Def. Esp.', 'Sp. Def'],
    ['spe', 'Velocidad', 'Speed']
  ]
  const colorStat = (v) => (v >= 110 ? '#38bdf8' : v >= 85 ? '#4ade80' : v >= 60 ? '#facc15' : '#f87171')
  const total = (s) => Object.values(s || {}).reduce((a, b) => a + (+b || 0), 0)

  const lugar = (p) => {
    const sitio = p.customName || p.location
    if (p.location === 'Starter') return t('Tu Pokémon inicial', 'Your starter Pokémon')
    if (p.cambio?.tipo === 'huevo') return t('Salió de un huevo', 'Hatched from an egg') + (sitio ? t(' (captura de ', ' (catch from ') + traducirNombre(sitio) + ')' : '')
    if (p.cambio?.tipo === 'prodigioso') return t('Llegó por Intercambio Prodigioso', 'Came via Wonder Trade') + (sitio ? t(' (captura de ', ' (catch from ') + traducirNombre(sitio) + ')' : '')
    if (!sitio || (p.customId && !p.customName)) return t('Lugar desconocido', 'Unknown place')
    if (p.status === 2) return t('Regalo en ', 'Gift at ') + traducirNombre(sitio)
    if (p.status === 3) return t('Intercambio en ', 'Traded at ') + traducirNombre(sitio)
    return t('Capturado en ', 'Met at ') + traducirNombre(sitio)
  }

  const elegir = (p) => p && (elegido = p)
  const cambiarCaja = (d) => {
    caja = (caja + d + cajas) % cajas
    elegido = lista[caja * HUECOS] || null
  }

  // Flechas para moverse por la rejilla
  const teclas = (e) => {
    const i = enCaja.findIndex((p) => locid(p) === locid(elegido))
    if (i < 0) return
    const mov = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: COLUMNAS, ArrowUp: -COLUMNAS }[e.key]
    if (!mov) return
    e.preventDefault()
    const j = i + mov
    if (j >= 0 && j < enCaja.length) {
      elegido = enCaja[j]
      rejilla?.querySelectorAll('button.lx-hueco')[j]?.focus()
    } else if (e.key === 'ArrowRight' && cajas > 1) cambiarCaja(1)
    else if (e.key === 'ArrowLeft' && cajas > 1) cambiarCaja(-1)
  }

  onMount(() => {
    if (!elegido) elegido = enCaja[0] || null
  })
</script>

<div class="lx-caja">
  <section class="lx-caja-pc">
    <header class="lx-caja-cabecera">
      <button class="lx-caja-flecha" on:click={() => cambiarCaja(-1)} disabled={cajas < 2} title={t('Caja anterior', 'Previous box')}>◀</button>
      <span class="lx-caja-nombre" data-lx-original>
        {t('CAJA', 'BOX')} {caja + 1}
        <small>{lista.length} {lista.length === 1 ? 'Pokémon' : 'Pokémon'}</small>
      </span>
      <button class="lx-caja-flecha" on:click={() => cambiarCaja(1)} disabled={cajas < 2} title={t('Caja siguiente', 'Next box')}>▶</button>
    </header>

    <div class="lx-caja-rejilla" bind:this={rejilla} on:keydown={teclas} role="listbox" aria-label={t('Pokémon de la caja', 'Box Pokémon')}>
      {#each huecos as p, i (p ? locid(p) : 'vacio-' + i)}
        {#if p}
          {@const sel = elegido && locid(elegido) === locid(p)}
          <button
            class="lx-hueco"
            class:lx-sel={sel}
            role="option"
            aria-selected={sel}
            title={traducirNombre(Pokemon[p.pokemon]?.name || p.pokemon) + (p.nickname ? ` · ${p.nickname}` : '')}
            use:drag={{ data: p, effect: 'add', hideImg: true }}
            on:click={() => elegir(p)}
            on:focus={() => elegir(p)}
          >
            <PIcon class="data-drag-img invisible absolute -left-20 -top-20 -z-20" name={p.pokemon} />
            {#if sel}<span class="lx-mano" aria-hidden="true">▼</span>{/if}
            <span class="lx-hueco-encaje" use:encajarIcono={{ nombre: p.pokemon, max: 64, escala: 2 }}><PIcon class="lx-hueco-icono lx-encajar" name={p.pokemon} /></span>
            {#if wedlocke && parejaDe(parejas, p.location)}
              <span class="lx-hueco-pareja" title={t('Pareja de ', 'Partner of ') + nombreDe(parejaDe(parejas, p.location))}>♥</span>
            {/if}
            {#if (equipo || []).includes(locid(p))}
              <span class="lx-hueco-equipo-marca" title={t('En el equipo', 'In your team')}><Icon inline icon={Ball} /></span>
            {/if}
            {#if p.status === 6}<span class="lx-hueco-shiny" title={t('Variocolor', 'Shiny')}>✦</span>{/if}
            {#if cambio && pendienteDeCambio(p, { egglocke: cambio === 'huevo', wonderlocke: cambio === 'prodigioso' })}
              <span class="lx-hueco-huevo lx-pendiente" title={cambio === 'huevo' ? t('Huevo sin abrir: apunta qué salió', 'Unhatched egg: log what hatched') : t('Sin intercambiar', 'Not traded yet')}
                >{#if cambio === 'huevo'}<img src="/lx/iconos/huevo.png" alt="" width="32" height="32" /><b>?</b>{:else}⇄{/if}</span
              >
            {:else if p.cambio?.tipo === 'huevo'}
              <span class="lx-hueco-huevo" title={t('Salió de un huevo', 'Hatched from an egg')}><img src="/lx/iconos/huevo.png" alt="" width="32" height="32" /></span>
            {/if}
          </button>
        {:else}
          <span class="lx-hueco lx-vacio" aria-hidden="true" />
        {/if}
      {/each}
    </div>

    {#if !lista.length}
      <p class="lx-caja-vacia">{t('No hay Pokémon que coincidan.', 'No Pokémon match.')}</p>
    {/if}
  </section>

  <aside class="lx-caja-detalle lx-panel" data-lx-original>
    {#if elegido && datos}
      <div class="lx-det-cabecera lx-lcd">
        <div class="lx-det-sprite">
          {#if evoHecha === `${elegido.id}@${elegido.location}` && Particles}
            <span class="lx-det-particulas">
              <svelte:component this={Particles} amount={25} icons={['ice-stone', 'dawn-stone', 'fire-stone']} on:end={() => despachar('finEvo')} />
            </span>
          {/if}
          {#key `${elegido.id}@${elegido.location}`}
            <!-- Sprite animado de Negro/Blanco; sin internet, el fijo de siempre -->
            <img
              use:recorte
              class="lx-det-img"
              src={urlAnimada(datos, elegido.status === 6) || createImgUrl(datos, { shiny: elegido.status === 6, ext: 'png' })}
              data-fase={urlAnimada(datos, elegido.status === 6) ? 'animado' : 'fijo'}
              alt={datos.name}
              on:load={ajustarGif(124)}
              on:error={alFallarSprite(createImgUrl(datos, { shiny: elegido.status === 6, ext: 'png' }), UNOWN)}
            />
          {/key}
          {#if elegido.status === 6}<Icon inline icon={Shiny} class="lx-det-brillo fill-current" />{/if}
        </div>
        <div class="lx-det-nombres">
          {#if elegido.nickname}
            <h3>{elegido.nickname}</h3>
            <p class="lx-det-especie">{traducirNombre(datos.name)}</p>
          {:else}
            <h3>{traducirNombre(datos.name)}</h3>
          {/if}
          <!-- con tipos aleatorizados, los del juego original no valen -->
          {#if !sinCalculos(leerReglas($activeGame))}
            <div class="lx-det-tipos">
              {#each datos.types || [] as tipo}
                <TypeLogo type={tipo.toLowerCase()} />
              {/each}
            </div>
          {/if}
        </div>
      </div>

      <dl class="lx-det-datos">
        {#if elegido.nature}
          <div><dt>{t('Naturaleza', 'Nature')}</dt><dd>{traducirNombre(elegido.nature)}</dd></div>
        {/if}
        <div><dt>{t('Origen', 'Origin')}</dt><dd>{lugar(elegido)}</dd></div>
        {#if cambio && elegido.cambio}
          <div>
            <dt>{elegido.cambio.tipo === 'huevo' ? t('Huevo', 'Egg') : t('Intercambio', 'Trade')}</dt>
            <dd class="lx-det-cambio">
              {#if !elegido.cambio.de}
                {elegido.cambio.tipo === 'huevo' ? t('Salió de un huevo', 'Hatched from an egg') : t('Llegó por Intercambio Prodigioso', 'Came via Wonder Trade')}
              {:else}
                {elegido.cambio.tipo === 'huevo'
                  ? t(`Salió del huevo · capturaste ${traducirNombre(Pokemon[elegido.cambio.de]?.name || elegido.cambio.de.charAt(0).toUpperCase() + elegido.cambio.de.slice(1))}`, `Hatched · you caught ${elegido.cambio.de}`)
                  : t(`Llegó por Intercambio Prodigioso · mandaste ${traducirNombre(Pokemon[elegido.cambio.de]?.name || elegido.cambio.de.charAt(0).toUpperCase() + elegido.cambio.de.slice(1))}`, `Came via Wonder Trade · you sent ${elegido.cambio.de}`)}
              {/if}
              <button class="lx-det-deshacer" title={t('Deshacer: vuelve el Pokémon capturado', 'Undo: back to the caught Pokémon')} on:click={() => deshacerCambio($activeGame, elegido.location)}>↶</button>
            </dd>
          </div>
        {:else if sePuedeCambiar(elegido, { egglocke: cambio === 'huevo', wonderlocke: cambio === 'prodigioso' })}
          <div class="lx-det-cambio-pend">
            <dt>
              {#if esInicial(elegido, elegido.location)}
                {cambio === 'huevo' ? t('Inicial (si también lo cambias por un huevo)', 'Starter (if it is swapped too)') : t('Inicial (si también lo intercambias)', 'Starter (if traded too)')}
              {:else}
                {cambio === 'huevo' ? t('Huevo sin abrir', 'Unhatched egg') : t('Sin intercambiar', 'Not traded yet')}
              {/if}
            </dt>
            <dd>
              {#if eclosionados.length}
                <div class="lx-det-eclosion">
                  <span>{t('Nacidos en tu partida:', 'Hatched in your save:')}</span>
                  {#each eclosionados as s}
                    {@const especieN = nombreEspecie(s.especie)}
                    <button on:click={() => apuntarEclosionado(s)} title={t(`Ha salido ${especieN}`, `${especieN} hatched`)}>{s.mote && s.mote.toLowerCase() !== especieN.toLowerCase() && s.mote.toLowerCase() !== String(s.especie).toLowerCase() ? `${s.mote} (${especieN})` : especieN}</button>
                  {/each}
                </div>
              {/if}
              <form on:submit|preventDefault={apuntarCambio}>
                <input
                  list="lx-especies-cambio"
                  bind:value={nuevaEspecie}
                  placeholder={cambio === 'huevo' ? t('¿Qué ha salido?', 'What hatched?') : t('¿Qué te ha llegado?', 'What did you get?')}
                />
                <button type="submit" disabled={!elegidaNueva}>{t('Apuntar', 'Log')}</button>
              </form>
              <button
                class="lx-det-yaes"
                on:click={() => marcarCambiado($activeGame, elegido.location)}
                title={cambio === 'huevo' ? t('Lo apuntaste directamente con lo que salió: márcalo como salido de un huevo, sin cambiar la especie', 'You logged what hatched directly: mark it as hatched, keeping the species') : t('Ya es el que te llegó: márcalo, sin cambiar la especie', 'It is already the one you got: mark it, keeping the species')}
              >
                {#if cambio === 'huevo'}<img src="/lx/iconos/huevo.png" alt="" width="16" height="16" />{/if}
                {cambio === 'huevo' ? t(`${nombreDe(elegido.location)} ya salió de un huevo`, `${nombreDe(elegido.location)} already hatched`) : t('Ya es el que me llegó', 'Already the one I got')}
              </button>
              <datalist id="lx-especies-cambio">{#each especiesTodas as x}<option value={x.nombre} />{/each}</datalist>
            </dd>
          </div>
        {/if}
        {#if wedlocke}
          <div>
            <dt>{t('Pareja', 'Partner')}</dt>
            <dd class="lx-det-pareja">
              <span class="lx-det-corazon" class:lx-sin-pareja={!pareja}>♥</span>
              <select value={pareja || ''} on:change={(e) => emparejar($activeGame, elegido.location, e.currentTarget.value || null)}>
                <option value="">{t('Sin pareja', 'No partner')}</option>
                {#each candidatos as c}
                  {@const suya = parejaDe(parejas, c.location)}
                  <option value={c.location}>{c.nickname || traducirNombre(Pokemon[c.pokemon]?.name || c.pokemon)}{suya && suya !== elegido.location ? t(` (con ${nombreDe(suya)})`, ` (with ${nombreDe(suya)})`) : ''}</option>
                {/each}
              </select>
            </dd>
          </div>
        {/if}
        {#if medallas}
          <div>
            <dt>{t('Combates', 'Battles')}</dt>
            <dd class="lx-det-medallas" title={medallas.summary}>
              {#each medallas.icons as icono}<PIcon name={icono} type="b" />{/each}
            </dd>
          </div>
        {/if}
      </dl>

      <div class="lx-det-stats">
        {#each ETIQUETAS as [k, es, en]}
          {@const v = +(datos.baseStats?.[k] || 0)}
          <span class="lx-stat-nombre">{t(es, en)}</span>
          <span class="lx-stat-valor">{v}</span>
          <span class="lx-stat-barra"><i style="width:{Math.min(100, (v / 180) * 100)}%;background:{colorStat(v)}" /></span>
        {/each}
        <span class="lx-stat-nombre lx-stat-total">{t('Total', 'Total')}</span>
        <span class="lx-stat-valor lx-stat-total">{total(datos.baseStats)}</span>
        <span />
      </div>

      <div class="lx-det-acciones">
        {#if puedeEquipo}
          <button class="lx-btn" class:lx-btn-activo={enEquipo} on:click={() => despachar('equipo', elegido)}>
            <Icon inline icon={Ball} class="fill-current" />
            {enEquipo ? t('Quitar del equipo', 'Remove from team') : t('Al equipo', 'Add to team')}
          </button>
        {/if}
        {#if datos.evos?.length}
          <button class="lx-btn" on:click={() => despachar('evolucionar', elegido)}>
            <span class="lx-btn-glifo" aria-hidden="true">▲</span>
            {t('Evolucionar', 'Evolve')}
          </button>
        {/if}
        <button class="lx-btn lx-btn-peligro" on:click={() => despachar('matar', elegido)}>
          <Icon inline icon={Deceased} class="fill-current" />
          {t('Ha caído', 'Fainted')}
        </button>
        {#if !elegido.customName}
          <a class="lx-btn" href={toDb(datos.alias || elegido.pokemon)} target="_blank" rel="noreferrer">
            <Icon inline icon={External} class="fill-current" />
            {t('Ficha en Pokémon DB', 'Pokémon DB')}
          </a>
        {/if}
      </div>
    {:else}
      <p class="lx-caja-vacia">{t('Elige un Pokémon de la caja.', 'Pick a Pokémon from the box.')}</p>
    {/if}
  </aside>
</div>

<style>
  .lx-hueco-encaje {
    display: contents;
  }
  .lx-caja {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(260px, 340px);
    gap: 28px;
    align-items: start;
    margin-top: 18px;
  }
  @media (max-width: 900px) {
    .lx-caja {
      grid-template-columns: minmax(0, 1fr);
    }
  }

  /* Marco de la caja */
  .lx-caja-pc {
    border: 3px solid var(--lx-tinta);
    border-radius: var(--lx-radio);
    background: var(--lx-panel);
    box-shadow: var(--lx-sombra);
    overflow: hidden;
  }
  .lx-caja-cabecera {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    padding: 8px 10px;
    background: linear-gradient(var(--lx-rojo-claro), var(--lx-rojo));
    border-bottom: 3px solid var(--lx-tinta);
    color: #fff;
  }
  .lx-caja-nombre {
    font-family: 'VT323', monospace;
    font-size: 28px;
    line-height: 1;
    letter-spacing: 3px;
    text-shadow: 2px 2px 0 rgba(0, 0, 0, 0.45);
    display: inline-flex;
    align-items: baseline;
    gap: 10px;
  }
  .lx-caja-nombre small {
    font-size: 18px;
    letter-spacing: 1px;
    opacity: 0.85;
  }
  .lx-caja-flecha {
    width: 34px;
    height: 30px;
    border-radius: 8px;
    border: 2px solid var(--lx-tinta);
    background: #fff;
    color: var(--lx-rojo);
    font-size: 14px;
    box-shadow: 2px 2px 0 rgba(0, 0, 0, 0.3);
  }
  .lx-caja-flecha:disabled {
    opacity: 0.35;
    box-shadow: none;
  }
  .lx-caja-flecha:not(:disabled):active {
    transform: translate(2px, 2px);
    box-shadow: none;
  }

  /* Fondo de la caja: cuadrícula suave */
  .lx-caja-rejilla {
    display: grid;
    grid-template-columns: repeat(6, minmax(0, 1fr));
    gap: 8px;
    padding: 18px 16px 16px;
    background-color: #cfe8d8;
    background-image: linear-gradient(45deg, rgba(255, 255, 255, 0.35) 25%, transparent 25%, transparent 75%, rgba(255, 255, 255, 0.35) 75%),
      linear-gradient(45deg, rgba(255, 255, 255, 0.35) 25%, transparent 25%, transparent 75%, rgba(255, 255, 255, 0.35) 75%);
    background-size: 36px 36px;
    background-position: 0 0, 18px 18px;
  }
  :global(html.dark) .lx-caja-rejilla {
    background-color: #183a30;
    background-image: linear-gradient(45deg, rgba(255, 255, 255, 0.04) 25%, transparent 25%, transparent 75%, rgba(255, 255, 255, 0.04) 75%),
      linear-gradient(45deg, rgba(255, 255, 255, 0.04) 25%, transparent 25%, transparent 75%, rgba(255, 255, 255, 0.04) 75%);
  }

  .lx-hueco {
    position: relative;
    aspect-ratio: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 10px;
    background: rgba(255, 255, 255, 0.55);
    border: 2px solid rgba(27, 27, 31, 0.18);
    transition: transform 0.1s, border-color 0.1s, background 0.1s;
    cursor: pointer;
  }
  :global(html.dark) .lx-hueco {
    background: rgba(255, 255, 255, 0.06);
    border-color: rgba(255, 255, 255, 0.1);
  }
  .lx-vacio {
    cursor: default;
    background: rgba(255, 255, 255, 0.22);
    border-style: dashed;
  }
  :global(html.dark) .lx-vacio {
    background: transparent;
  }
  button.lx-hueco:hover {
    border-color: var(--lx-tinta);
    background: rgba(255, 255, 255, 0.85);
  }
  :global(html.dark) button.lx-hueco:hover {
    border-color: #9ca3af;
    background: rgba(255, 255, 255, 0.12);
  }
  button.lx-hueco:focus-visible {
    outline: 3px solid var(--lx-amarillo);
    outline-offset: 1px;
  }
  .lx-sel {
    border-color: var(--lx-rojo) !important;
    background: #fff !important;
    box-shadow: 0 0 0 2px var(--lx-rojo), 3px 3px 0 rgba(0, 0, 0, 0.2);
  }
  :global(html.dark) .lx-sel {
    background: rgba(255, 255, 255, 0.16) !important;
  }
  .lx-hueco :global(.lx-hueco-icono) {
    transform: scale(var(--lx-esc, 2));
    image-rendering: pixelated;
  }
  .lx-sel :global(.lx-hueco-icono) {
    animation: lx-salto 0.6s steps(2) infinite;
  }
  @keyframes lx-salto {
    50% {
      transform: scale(var(--lx-esc, 2)) translateY(-2px);
    }
  }
  .lx-mano {
    position: absolute;
    top: -15px;
    left: 50%;
    transform: translateX(-50%);
    color: var(--lx-rojo);
    font-size: 14px;
    line-height: 1;
    text-shadow: 1px 1px 0 var(--lx-tinta);
    animation: lx-mano 0.8s ease-in-out infinite;
    z-index: 2;
  }
  @keyframes lx-mano {
    50% {
      transform: translate(-50%, -3px);
    }
  }
  .lx-hueco-pareja {
    position: absolute;
    left: 3px;
    bottom: 0;
    font-size: 13px;
    line-height: 14px;
    color: #f05080;
    text-shadow: 0 1px 0 #fff;
  }
  .lx-hueco-huevo {
    position: absolute;
    right: 0;
    top: 0;
    width: 22px;
    height: 22px;
    font-size: 14px;
    line-height: 22px;
    text-align: center;
    color: #3868c0;
    text-shadow: 0 1px 0 #fff;
    pointer-events: none;
  }
  .lx-hueco-huevo img {
    width: 32px;
    height: 32px;
    max-width: none;
    margin: -6px -5px;
    image-rendering: pixelated;
  }
  .lx-det-cambio {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .lx-det-deshacer {
    padding: 0 6px;
    border: 2px solid var(--lx-bisel);
    border-radius: var(--lx-radio-sm);
  }
  .lx-hueco-huevo.lx-pendiente b {
    position: absolute;
    right: -2px;
    bottom: -4px;
    font-size: 11px;
    line-height: 1;
    color: #fff;
    background: #c83848;
    border-radius: 999px;
    padding: 0 3px;
  }
  .lx-det-yaes {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    margin-top: 4px;
    font-size: 0.85em;
    opacity: 0.85;
    text-decoration: underline dotted;
  }
  .lx-det-yaes img {
    image-rendering: pixelated;
  }
  .lx-det-eclosion {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 4px;
    margin-bottom: 4px;
    font-size: 0.85em;
  }
  .lx-det-eclosion button {
    padding: 0 6px;
    border: 1px solid currentColor;
    border-radius: 999px;
  }
  .lx-det-eclosion button:hover {
    background: rgba(224, 80, 96, 0.15);
  }
  .lx-det-cambio-pend form {
    display: flex;
    gap: 4px;
  }
  .lx-det-cambio-pend input {
    flex: 1;
    min-width: 0;
    padding: 2px 6px;
    font-size: 13px;
    border: 2px solid var(--lx-bisel);
    border-radius: var(--lx-radio-sm);
    background: var(--lx-panel);
    color: inherit;
  }
  .lx-det-cambio-pend button {
    padding: 0 8px;
    border: 2px solid var(--lx-bisel);
    border-radius: var(--lx-radio-sm);
  }
  .lx-det-cambio-pend button:disabled {
    opacity: 0.5;
  }
  .lx-det-pareja {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .lx-det-pareja select {
    flex: 1;
    min-width: 0;
    padding: 2px 6px;
    font-size: 13px;
    border: 2px solid var(--lx-bisel);
    border-radius: var(--lx-radio-sm);
    background: var(--lx-fondo-tarjeta, #fff);
    color: inherit;
  }
  .lx-det-corazon {
    color: #f05080;
  }
  .lx-sin-pareja {
    color: var(--lx-texto-suave);
    opacity: 0.5;
  }
  .lx-hueco-equipo-marca {
    position: absolute;
    right: 2px;
    bottom: 1px;
    font-size: 13px;
    color: var(--lx-rojo);
    filter: drop-shadow(0 1px 0 #fff);
  }
  .lx-hueco-shiny {
    position: absolute;
    left: 4px;
    top: 1px;
    font-size: 13px;
    color: #f59e0b;
    text-shadow: 0 1px 0 #fff;
  }
  .lx-caja-vacia {
    padding: 14px;
    text-align: center;
    color: var(--lx-texto-suave);
  }

  /* Panel de detalle */
  .lx-caja-detalle {
    padding: 0 0 14px;
    position: sticky;
    top: 96px;
  }
  .lx-det-cabecera {
    display: flex;
    gap: 12px;
    align-items: center;
    padding: 12px 14px;
    border-bottom: 3px solid var(--lx-tinta);
  }
  .lx-det-sprite {
    position: relative;
    width: 112px;
    height: 112px;
    flex: none;
    border-radius: 12px;
    background: radial-gradient(circle at 50% 60%, rgba(142, 232, 255, 0.25), transparent 70%);
  }
  .lx-det-sprite {
    display: grid;
    place-items: center;
  }
  .lx-det-sprite img {
    width: 100%;
    height: 100%;
    object-fit: contain;
    image-rendering: pixelated;
    filter: drop-shadow(2px 3px 0 rgba(0, 0, 0, 0.45));
  }
  .lx-det-sprite :global(.lx-det-brillo) {
    position: absolute;
    right: 0;
    top: 0;
    color: #fde68a;
    font-size: 22px;
  }
  .lx-det-particulas {
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    z-index: 10;
  }
  .lx-det-nombres h3 {
    font-family: 'VT323', monospace;
    font-size: 30px;
    line-height: 1;
    color: #f7f7f2;
    letter-spacing: 0.5px;
    word-break: break-word;
  }
  .lx-det-especie {
    font-family: 'VT323', monospace;
    font-size: 19px;
    color: var(--lx-lcd-texto);
  }
  .lx-det-tipos {
    display: flex;
    gap: 4px;
    margin-top: 6px;
  }

  .lx-det-datos {
    display: grid;
    gap: 6px;
    padding: 12px 16px 4px;
    font-size: 14px;
  }
  .lx-det-datos div {
    display: grid;
    grid-template-columns: 96px minmax(0, 1fr);
    align-items: center;
    gap: 8px;
  }
  .lx-det-datos dt {
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--lx-texto-suave);
  }
  .lx-det-medallas {
    display: flex;
    flex-wrap: wrap;
    gap: 2px;
  }

  .lx-det-stats {
    display: grid;
    grid-template-columns: 82px 34px minmax(0, 1fr);
    align-items: center;
    gap: 5px 8px;
    padding: 10px 16px 6px;
    font-size: 13px;
  }
  .lx-stat-nombre {
    color: var(--lx-texto-suave);
  }
  .lx-stat-valor {
    text-align: right;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
  }
  .lx-stat-barra {
    height: 10px;
    border-radius: 5px;
    background: var(--lx-panel-2);
    border: 1.5px solid var(--lx-tinta);
    overflow: hidden;
  }
  .lx-stat-barra i {
    display: block;
    height: 100%;
    border-right: 1.5px solid var(--lx-tinta);
  }
  .lx-stat-total {
    margin-top: 4px;
    color: var(--lx-texto);
    font-weight: 700;
  }

  .lx-det-acciones {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    padding: 10px 16px 0;
  }
  .lx-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 10px;
    font-size: 13px;
    font-weight: 600;
    border: 2px solid var(--lx-tinta);
    border-radius: var(--lx-radio-sm);
    background: var(--lx-panel);
    color: var(--lx-texto);
    box-shadow: var(--lx-sombra-sm);
    transition: color 0.12s, background 0.12s;
  }
  :global(html.dark) .lx-btn {
    border-color: #6b7280;
  }
  .lx-btn:hover {
    color: var(--lx-rojo);
  }
  .lx-btn:active {
    transform: translate(2px, 2px);
    box-shadow: none;
  }
  .lx-btn :global(picture),
  .lx-btn :global(img),
  .lx-btn :global(span:has(> img)) {
    width: 22px !important;
    height: 22px !important;
    margin: -4px -2px;
    display: inline-block;
    object-fit: contain;
  }
  .lx-btn-glifo {
    font-size: 11px;
    color: #16a34a;
  }
  .lx-btn-activo {
    background: var(--lx-acento-suave);
    color: var(--lx-rojo);
  }
  .lx-btn-peligro:hover {
    background: var(--lx-rojo);
    color: #fff;
  }
</style>
