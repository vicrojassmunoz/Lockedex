<script>
  // «PC del juego»: las cajas de la partida del emulador tal cual (con sus nombres y huecos), los huevos sin
  // abrir y, al elegir uno, su ficha del .sav y si está en la run. Los que en la run están muertos no salen
  // (mucha gente los deja en la última caja), salvo que se marque «Ver los caídos»
  import { onMount } from 'svelte'
  import { PIcon } from '$c/core'
  import { activeGame } from '$lib/store'
  import { createImgUrl, UNOWN } from '$utils/rewrites'
  import FichaSav from './FichaSav.svelte'
  import { leerSavGuardado, emparejar as emparejarSav } from './equipo.js'
  import { leerPartida, alCambiarDatos, partidaActiva } from './partida.js'
  import { norm } from './datos.js'
  import { fetchData } from '$utils/fetchers'
  import { t, traducirNombre } from './idioma.js'

  export let Pokemon = {}

  let sav = null
  let version = 0
  let pkdx = null
  onMount(() => {
    fetchData().then((d) => (pkdx = d)).catch(() => {})
    sav = leerSavGuardado($activeGame)
    return alCambiarDatos(() => ((sav = leerSavGuardado($activeGame)), version++))
  })
  let caja = 0
  let verCaidos = false
  let elegido = null
  $: gen = ($activeGame, partidaActiva()?.info?.gen) || 3
  $: datos = (version, $activeGame && leerPartida($activeGame)?.datos) || {}

  $: pk = (alias) => Pokemon[alias] || pkdx?.aliasMap?.[norm(alias)] || pkdx?.nameMap?.[norm(alias)] || null
  $: linea = (x) => pk(x)?.evoline || null
  const misma = (a, b) => (linea(a) && linea(a) === linea(b)) || norm(a) === norm(b)
  $: nombreEsp = (alias) => traducirNombre(pk(alias)?.name || String(alias || '').charAt(0).toUpperCase() + String(alias || '').slice(1))
  const NOMBRE_ESTADO = { 1: ['Capturado', 'Caught'], 2: ['Regalo', 'Gift'], 3: ['Intercambio', 'Trade'], 4: ['Fallido', 'Missed'], 5: ['Caído', 'Dead'], 6: ['Variocolor', 'Shiny'], 7: ['Descartado', 'Discarded'] }

  // Qué es en la run cada Pokémon del .sav: los vivos con el emparejado de siempre; los muertos por mote o
  // lugar de captura y línea evolutiva (el emparejado normal no los mira)
  const calcular = (sv, d) => {
    const m = new Map()
    if (!sv) return m
    const todos = [...(sv.equipo || []), ...(sv.cajas || [])]
    const usados = new Set()
    const entradas = Object.entries(d).filter(([k, e]) => !k.startsWith('__') && e?.pokemon).map(([k, e]) => ({ ...e, lugar: k }))
    for (const e of entradas.filter((e) => ![4, 5, 7].includes(+e.status)).sort((a, b) => (b.nickname ? 1 : 0) - (a.nickname ? 1 : 0))) {
      const x = emparejarSav(e, todos, usados, linea)
      if (x) {
        usados.add(x)
        m.set(x, { e, muerto: false })
      }
    }
    for (const e of entradas.filter((e) => +e.status === 5)) {
      const libres = todos.filter((x) => !usados.has(x) && misma(x.especie, e.pokemon))
      const x =
        libres.find((x) => e.nickname && norm(x.mote) === norm(e.nickname)) ||
        libres.find((x) => norm(x.lugarCaptura) === norm(e.lugar)) ||
        libres.find((x) => norm(x.especie) === norm(e.pokemon)) ||
        null
      if (x) {
        usados.add(x)
        m.set(x, { e, muerto: true })
      }
    }
    return m
  }
  $: enRun = (pkdx, calcular(sav, datos))

  // Huecos de la caja: cada uno en su sitio (las copias de antes de la 1.23.0 no traían el hueco: seguidos)
  $: nCajas = 14
  $: huecos = (() => {
    const h = Array(30).fill(null)
    if (!sav) return h
    const deCaja = (sav.cajas || []).filter((x) => x.caja === caja + 1)
    let sig = 0
    for (const x of deCaja) {
      const i = x.hueco ? x.hueco - 1 : sig++
      if (i >= 0 && i < 30) h[i] = x
    }
    for (const hv of sav.huevos || []) if (hv.caja === caja + 1 && !h[hv.hueco - 1]) h[hv.hueco - 1] = { huevo: true, ...hv }
    return h
  })()
  $: muertoEn = (x) => !!x && !x.huevo && enRun.get(x)?.muerto
  $: cuenta = huecos.filter((x) => x && !x.huevo && (verCaidos || !muertoEn(x))).length
  $: huevosCaja = huecos.filter((x) => x?.huevo).length
  $: nombreCaja = sav?.nombresCajas?.[caja] || `${t('CAJA', 'BOX')} ${caja + 1}`
  const cambiar = (d) => {
    caja = (caja + d + nCajas) % nCajas
    elegido = null
  }
  $: infoRun = elegido && !elegido.huevo ? enRun.get(elegido) : null
  const sprite = (x) => {
    const p = pk(x.especie)
    return p ? createImgUrl(p, { shiny: x.variocolor, ext: 'png' }) : UNOWN
  }
</script>

{#if !sav}
  <section class="lx-panel lx-cj-sin" data-lx-original>
    <p>{t('Vincula la partida del emulador para ver aquí su PC, caja por caja.', 'Link your emulator save to see its PC here, box by box.')}</p>
    <a class="lx-btn" href="/importar">{t('Ir a Importar', 'Go to Import')}</a>
  </section>
{:else}
  <div class="lx-cj" data-lx-original>
    <section>
      {#if sav.equipo?.length}
        <div class="lx-cj-equipo" aria-label={t('Equipo en la partida', 'Party in your save')}>
          <span class="lx-cj-etq">{t('EQUIPO', 'PARTY')}</span>
          {#each sav.equipo as x}
            <button class="lx-cj-hueco" class:lx-sel={elegido === x} class:lx-cj-caido={muertoEn(x)} on:click={() => (elegido = x)} title={`${x.mote} · ${nombreEsp(x.especie)} ${t('Nv.', 'Lv.')} ${x.nivel}`}>
              <PIcon name={x.especie} />
            </button>
          {/each}
        </div>
      {/if}
      <div class="lx-cj-pc">
        <header class="lx-cj-cab">
          <button on:click={() => cambiar(-1)} title={t('Caja anterior', 'Previous box')}>◀</button>
          <span class="lx-cj-nombre">{nombreCaja} <small>{cuenta} Pokémon{huevosCaja ? ` · ${huevosCaja} ${huevosCaja > 1 ? t('huevos', 'eggs') : t('huevo', 'egg')}` : ''}</small></span>
          <button on:click={() => cambiar(1)} title={t('Caja siguiente', 'Next box')}>▶</button>
        </header>
        <div class="lx-cj-rejilla">
          {#each huecos as x, i (i)}
            {#if x && (x.huevo || verCaidos || !muertoEn(x))}
              <button class="lx-cj-hueco" class:lx-sel={elegido === x} class:lx-cj-caido={muertoEn(x)} on:click={() => (elegido = x)} title={x.huevo ? t('Huevo sin abrir', 'Unhatched egg') : `${x.mote} · ${nombreEsp(x.especie)} ${t('Nv.', 'Lv.')} ${x.nivel}`}>
                {#if x.huevo}<img class="lx-cj-huevo" src="/lx/iconos/huevo.png" alt="" />{:else}<PIcon name={x.especie} />{/if}
                {#if !x.huevo && !enRun.get(x)}<span class="lx-cj-nuevo" title={t('No está apuntado en la run', 'Not logged in your run')}>•</span>{/if}
              </button>
            {:else}
              <span class="lx-cj-hueco lx-cj-vacio" />
            {/if}
          {/each}
        </div>
      </div>
      <label class="lx-cj-ver"><input type="checkbox" bind:checked={verCaidos} /> {t('Ver los caídos', 'Show the dead ones')}</label>
    </section>

    <aside class="lx-panel lx-cj-det">
      {#if elegido?.huevo}
        <img class="lx-cj-det-img lx-cj-huevo" src="/lx/iconos/huevo.png" alt="" />
        <h3>{t('Huevo sin abrir', 'Unhatched egg')}</h3>
        <p class="lx-cj-nota">{t(`${nombreCaja}, hueco ${elegido.hueco}. Sácalo al equipo y anda para que eclosione.`, `${nombreCaja}, slot ${elegido.hueco}. Put it in your party and walk to hatch it.`)}</p>
      {:else if elegido}
        <img class="lx-cj-det-img" src={sprite(elegido)} alt="" />
        <h3>{elegido.mote}</h3>
        <p class="lx-cj-esp">{nombreEsp(elegido.especie)}{elegido.variocolor ? ' ✦' : ''}{elegido.naturaleza ? ` · ${traducirNombre(elegido.naturaleza.charAt(0).toUpperCase() + elegido.naturaleza.slice(1))}` : ''}</p>
        <p class="lx-cj-run">
          {#if infoRun}
            {infoRun.muerto ? '✝ ' : ''}{t('En la run', 'In your run')}: {traducirNombre(infoRun.e.lugar === 'Starter' ? t('Inicial', 'Starter') : infoRun.e.lugar)} · {infoRun.e.cambio && !infoRun.muerto ? (infoRun.e.cambio.tipo === 'huevo' ? t('Salió de un huevo', 'Hatched from an egg') : t('Intercambio Prodigioso', 'Wonder Trade')) : t(...(NOMBRE_ESTADO[+infoRun.e.status] || ['—']))}
          {:else}
            {t('No está apuntado en la run', 'Not logged in your run')}{elegido.lugarCaptura ? ` (${+elegido.nivelCaptura === 0 ? t('nació en', 'hatched at') : t('capturado en', 'caught at')} ${traducirNombre(elegido.lugarCaptura)})` : ''}
          {/if}
        </p>
        <FichaSav s={elegido} {gen} />
      {:else}
        <p class="lx-cj-nota">{t('Elige un Pokémon de tu partida.', 'Pick a Pokémon from your save.')}</p>
      {/if}
    </aside>
  </div>
{/if}

<style>
  .lx-cj {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(260px, 340px);
    gap: 28px;
    align-items: start;
    margin-top: 18px;
  }
  @media (max-width: 900px) {
    .lx-cj {
      grid-template-columns: minmax(0, 1fr);
    }
  }
  .lx-cj-sin {
    margin-top: 18px;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 12px;
  }
  .lx-cj-equipo {
    display: flex;
    align-items: center;
    gap: 4px;
    margin-bottom: 10px;
  }
  .lx-cj-etq {
    margin-right: 6px;
    font-family: 'VT323', monospace;
    font-size: 20px;
    letter-spacing: 2px;
  }
  .lx-cj-pc {
    border: 3px solid var(--lx-tinta);
    border-radius: var(--lx-radio);
    background: var(--lx-panel);
    box-shadow: var(--lx-sombra);
    overflow: hidden;
  }
  .lx-cj-cab {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    padding: 8px 10px;
    background: linear-gradient(#5aa0e8, #2f6fc0);
    border-bottom: 3px solid var(--lx-tinta);
    color: #fff;
  }
  .lx-cj-cab button {
    width: 34px;
    height: 30px;
    border: 2px solid var(--lx-tinta);
    border-radius: 6px;
    background: rgba(255, 255, 255, 0.2);
  }
  .lx-cj-nombre {
    font-family: 'VT323', monospace;
    font-size: 28px;
    line-height: 1;
    letter-spacing: 3px;
    text-shadow: 2px 2px 0 rgba(0, 0, 0, 0.45);
  }
  .lx-cj-nombre small {
    font-size: 18px;
    letter-spacing: 1px;
  }
  .lx-cj-rejilla {
    display: grid;
    grid-template-columns: repeat(6, minmax(0, 1fr));
    gap: 6px;
    padding: 12px;
    background: repeating-linear-gradient(45deg, rgba(90, 160, 232, 0.12) 0 10px, rgba(90, 160, 232, 0.05) 10px 20px);
  }
  .lx-cj-hueco {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    aspect-ratio: 1;
    min-height: 48px;
    border: 2px solid transparent;
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.55);
  }
  :global(html.dark) .lx-cj-hueco {
    background: rgba(255, 255, 255, 0.06);
  }
  .lx-cj-vacio {
    background: rgba(0, 0, 0, 0.04);
  }
  button.lx-cj-hueco:hover,
  .lx-sel {
    border-color: var(--lx-rojo, #dc0a2d);
  }
  .lx-cj-caido {
    filter: grayscale(1);
    opacity: 0.45;
  }
  .lx-cj-huevo {
    width: 32px;
    height: 32px;
    image-rendering: pixelated;
  }
  .lx-cj-nuevo {
    position: absolute;
    top: 0;
    right: 4px;
    color: #e0a000;
    font-size: 18px;
    line-height: 1;
  }
  .lx-cj-ver {
    display: inline-flex;
    gap: 6px;
    align-items: center;
    margin-top: 8px;
    font-size: 0.9em;
    opacity: 0.85;
  }
  .lx-cj-det h3 {
    font-family: 'VT323', monospace;
    font-size: 28px;
    line-height: 1;
  }
  .lx-cj-det-img {
    width: 96px;
    height: 96px;
    image-rendering: pixelated;
  }
  .lx-cj-esp,
  .lx-cj-run,
  .lx-cj-nota {
    font-size: 0.9em;
    opacity: 0.85;
  }
  .lx-cj-run {
    margin-top: 4px;
  }
</style>
