<script>
  import { afterUpdate, tick } from 'svelte'
  import Games from '$lib/data/games.json'
  import { resumirPartida, leerPartida } from '$lib/lockedex/partida.js'
  import { t, traducirNombre } from '$lib/lockedex/idioma.js'
  import { fade } from 'svelte/transition'
  import {
    patch,
    addlocation,
    removelocation,
    hidelocation,
    read
  } from '$lib/store'

  import { toDbLocation } from '$utils/link'
  import { insertList } from '$utils/arr'
  import { shortuuid } from '$utils/uuid'
  import { slugify } from '$utils/string'

  import { Tooltip } from '$lib/components/core'
  import CustomLocation from './CustomLocation.svelte'
  import StarterType from '$lib/components/starter-type.svelte'
  import { get } from 'svelte/store'
  import { activeGame } from '$lib/store'
  import { tipoInicial } from '$lib/lockedex/inicial'
  import { leerReglas } from '$lib/lockedex/reglas'
  import GymCard from '$lib/components/gym-card.svelte'
  import PokemonSelector from '$lib/components/pokemon-selector.svelte'

  import {
    hideRouteF,
    isRoute,
    isGym,
    isStarter,
    isCustom,

    showStarterRoute,
    showRoute,
    showGym,
    showCustom
  } from './_predicates'
  import { filterEntry } from './_filters'

  export let route,
    game,
    filters,
    search,
    progress = '',
    className = ''
  const { store, key, data } = game

  let starter = data.__starter || 'fire'
  let element

  // El tipo del inicial se deduce del Pokémon apuntado en «Inicial» (el rival depende de él):
  // al cambiarlo aquí, o al abrir una partida en la que nunca se eligió el tipo a mano.
  // En Randomlocke no, porque el Pokémon no dice qué Poké Ball elegiste.
  let inicialVisto = data.Starter?.pokemon
  const deducirInicial = async (especie, alAbrir) => {
    if (!especie || leerReglas(get(activeGame))?.randomlocke) return
    if (alAbrir && data.__starter) return
    const tipo = await tipoInicial(especie, key)
    if (tipo && tipo !== starter) {
      starter = tipo
      store.update(patch({ __starter: tipo }))
    }
  }
  deducirInicial(inicialVisto, true)

  /** Custom route handlers & Empty routes */
  let datosRun = data
  let custom = [],
    hidden = [],
    bossTeamIds = [],
    hideRoute = (_) => false
  store.subscribe(
    read((d) => {
      if (!custom.length && d.__custom?.length) custom = d.__custom
      if (!hidden.length && d.__hidden?.length) hidden = d.__hidden

      datosRun = d
      bossTeamIds = (d.__teams || []).map((i) => i.id)
      hideRoute = hideRouteF(d)

      if (d.Starter?.pokemon !== inicialVisto) {
        inicialVisto = d.Starter?.pokemon
        deducirInicial(inicialVisto, false)
      }
    })
  )

  const onnewlocation = (e) => {
    const index = e.detail.id + 1
    const loc = { type: 'custom', name: e.detail.name || '', id: shortuuid(), index }
    custom = custom.concat(loc)
    store.update(addlocation(loc))
  }

  const ondeletelocation = (e) => {
    const id = e.detail.id
    custom = custom.filter((i) => i.id !== id)
    store.update(removelocation(id))
  }

  const onhidelocation = (e) => {
    const id = e.detail.id
    store.update(hidelocation(id))
  }

  /** Event Handlers */
  const setstarter = (e) => {
    starter = e.detail.value
    game.store.update(patch({ __starter: starter }))
  }

  export const setnav = (e) =>
    setloc(`boss-${e.detail.value}`, e.detail.value + 20)

  export const setroute =
    ({ name, id }) =>
    () =>
      setloc(`route-${name}`, id + 10)

  let scroll, ulRef
  const scrollToItem = (id) => {
    document.getElementById(id).scrollIntoView({
      behavior: 'smooth',
      block: 'center'
    })
  }

  // Antes de ir a una zona, se abre su tramo si estaba plegado
  const indiceDe = (idEl) => {
    if (idEl.startsWith('route-')) return routeList.findIndex((p) => isRoute(p) && `route-${p.name}` === idEl)
    if (idEl.startsWith('boss-')) return +idEl.slice(5)
    if (idEl.startsWith('custom-')) return routeList.findIndex((p) => isCustom(p) && `custom-${p.index}` === idEl)
    return -1
  }
  const setloc = async (id, i) => {
    const n = indiceDe(id)
    if (tramos && n >= 0 && tramoDe[n] != null && !abiertos.has(tramoDe[n])) {
      abrirTramo(tramoDe[n])
      await tick()
    }
    document.getElementById(id) ? scrollToItem(id) : (scroll = id)
  }

  const locid = (p, i) => {
    return p.type === 'custom'
      ? slugify(`${p.type}-${p.name}-${p.id}`)
      : slugify(`${p.type}-${p.name}-${p.origPos}`)
  }

  afterUpdate(() => {
    if (!scroll) return
    setTimeout(scrollToItem.bind({}, scroll))
    scroll = null
  })

  $: routeList = insertList(route, custom)

  /** Tramos: la lista se parte entre gimnasios («Hasta Brock», «Hasta Misty»…), luego la Liga y lo de
   *  después. El tramo actual va abierto y el resto, plegado con su resumen. Lo que abras o pliegues a
   *  mano se recuerda por run hasta que cambie el tramo actual. Con el buscador se ve todo. */
  const esLider = (p) => p.type === 'gym' && p.group === 'gym-leader'
  const esLiga = (p) => p?.type === 'gym' && p.group === 'elite-four'
  const calcularTramos = (lista) => {
    if (!lista.some(esLider)) return null
    const out = []
    let desde = 0
    for (let i = 0; i < lista.length; i++) {
      const p = lista[i]
      if (esLider(p)) {
        out.push({ desde, hasta: i, jefe: p, tipo: 'gimnasio' })
        desde = i + 1
      } else if (esLiga(p)) {
        // La Liga se cierra en el último del Alto Mando seguido (el Campeón). En Oro/Plata/Cristal y
        // HeartGold/SoulSilver después vienen los gimnasios de Kanto, cada uno con su tramo
        let j = i + 1
        while (j < lista.length && !esLider(lista[j]) && !esLiga(lista[j])) j++
        if (j >= lista.length || !esLiga(lista[j])) {
          out.push({ desde, hasta: i, jefe: p, tipo: 'liga' })
          desde = i + 1
        }
      }
    }
    if (desde < lista.length) out.push({ desde, hasta: lista.length - 1, jefe: null, tipo: out.some((tr) => tr.tipo === 'liga') ? 'despues' : 'final' })
    return out
  }
  $: tramos = calcularTramos(routeList)
  $: tramoDe = (() => {
    const a = []
    ;(tramos || []).forEach((tr, k) => {
      for (let i = tr.desde; i <= tr.hasta; i++) a[i] = k
    })
    return a
  })()

  // ¿Qué jefes están pasados? Lo mismo que usa el resto de Lockedex (marcados o con su medalla en el .sav)
  $: resumen = (() => {
    try {
      const id = get(activeGame)
      return resumirPartida({ ...(leerPartida(id) || { id, juego: key }), datos: datosRun || {} }, route)
    } catch {
      return null
    }
  })()
  $: pasado = (p) => !!p && !!resumen?.jefes?.find((j) => j.indice === p.origPos)?.pasado
  $: actual = tramos ? Math.max(0, tramos.findIndex((tr) => !tr.jefe || !pasado(tr.jefe))) : 0

  const claveTramos = () => `lockedex.tramos.${get(activeGame)}`
  let guardado = (() => {
    try {
      return JSON.parse(localStorage.getItem(claveTramos()) || 'null')
    } catch {
      return null
    }
  })()
  const guardarTramos = (g) => {
    guardado = g
    try {
      localStorage.setItem(claveTramos(), JSON.stringify(g))
    } catch {}
  }
  $: if (tramos && (!guardado || guardado.actual !== actual)) guardarTramos({ actual, abiertos: [actual] })
  $: abiertos = new Set(guardado?.abiertos || [actual])
  const abrirTramo = (k) => guardarTramos({ actual, abiertos: [...new Set([...(guardado?.abiertos || []), k])] })
  const alternarTramo = (k) => {
    const l = guardado?.abiertos || [actual]
    guardarTramos({ actual, abiertos: l.includes(k) ? l.filter((x) => x !== k) : [...l, k] })
  }
  $: buscando = !!(search && String(search).trim())
  $: plegado = (i) => !!tramos && !buscando && tramoDe[i] != null && !abiertos.has(tramoDe[i])

  // Resumen de cada tramo: zonas apuntadas, capturas, caídos y fallidos
  const VIVOS = [1, 2, 3, 6]
  $: resumenTramo = (tr) => {
    let zonas = 0,
      apuntadas = 0,
      capturas = 0,
      caidos = 0,
      fallidos = 0
    for (let i = tr.desde; i <= tr.hasta; i++) {
      const p = routeList[i]
      if (!p || !(isRoute(p) || isCustom(p))) continue
      if ((datosRun?.__hidden || []).includes(p.name)) continue
      zonas++
      const e = datosRun?.[isCustom(p) ? p.id : p.name]
      if (e?.pokemon || e?.status) apuntadas++
      const st = +e?.status
      if (VIVOS.includes(st)) capturas++
      else if (st === 5) caidos++
      else if (st === 4 || st === 7) fallidos++
    }
    return { zonas, apuntadas, capturas, caidos, fallidos }
  }
  const HOJAS = { kanto: '/lx/medallas/kanto-color.png', johto: '/lx/medallas/johto-color.png', hoenn: '/lx/medallas/hoenn-color.png' }
  // Medalla de cada gimnasio en la hoja de su región (los de Kanto en Johto van como k1…k8)
  $: medallaDe = (jefe) => {
    const v = String(jefe?.value || '')
    if (/^[1-8]$/.test(v) && HOJAS[Games[key]?.region]) return { hoja: HOJAS[Games[key].region], n: +v }
    if (/^k[1-8]$/.test(v)) return { hoja: HOJAS.kanto, n: +v.slice(1) }
    return null
  }
  const tituloTramo = (tr) =>
    tr.tipo === 'gimnasio'
      ? t(`Hasta ${traducirNombre(tr.jefe.boss || tr.jefe.name)}`, `Up to ${tr.jefe.boss || tr.jefe.name}`)
      : tr.tipo === 'liga'
      ? t('Hasta la Liga', 'Up to the League')
      : tr.tipo === 'despues'
      ? t('Después de la Liga', 'After the League')
      : t('Hasta el final', 'Up to the end')
</script>

<ul bind:this={ulRef} class="flex flex-col gap-y-0 lg:gap-y-2 {className}">
  {#each routeList as p, id (locid(p, id))}
    {@const hidden = !filterEntry(filters, search, game.data, progress - 1)(p) || plegado(id)}

    {#if tramos && !buscando && tramos[tramoDe[id]]?.desde === id}
      <li class="lx-tramo" class:lx-tramo-abierto={abiertos.has(tramoDe[id])} class:lx-tramo-actual={tramoDe[id] === actual} data-lx-original>
        <button class="lx-tramo-cab" on:click={() => alternarTramo(tramoDe[id])} aria-expanded={abiertos.has(tramoDe[id])}>
          <span class="lx-tramo-flecha" aria-hidden="true">{abiertos.has(tramoDe[id]) ? '▼' : '▶'}</span>
          {#if tramos[tramoDe[id]].tipo === 'gimnasio'}
            {#if medallaDe(tramos[tramoDe[id]].jefe)}
              <span
                class="lx-tramo-medalla"
                class:lx-tramo-sin={!pasado(tramos[tramoDe[id]].jefe)}
                style="background-image:url({medallaDe(tramos[tramoDe[id]].jefe).hoja});background-position:-{(medallaDe(tramos[tramoDe[id]].jefe).n - 1) * 24}px 0"
                title={pasado(tramos[tramoDe[id]].jefe) ? t('Medalla conseguida', 'Badge earned') : t('Medalla pendiente', 'Badge pending')}
              />
            {:else}
              <span class="lx-tramo-medalla lx-tramo-generica" class:lx-tramo-sin={!pasado(tramos[tramoDe[id]].jefe)} />
            {/if}
          {/if}
          <span class="lx-tramo-titulo">{tituloTramo(tramos[tramoDe[id]])}</span>
          {#if tramoDe[id] === actual}<span class="lx-tramo-ahora">{t('AHORA', 'NOW')}</span>
          {:else if tramos[tramoDe[id]].jefe && pasado(tramos[tramoDe[id]].jefe)}<span class="lx-tramo-hecho">✓</span>{/if}
          <span class="lx-tramo-resumen">
            <span title={t('Zonas apuntadas', 'Areas logged')}>{resumenTramo(tramos[tramoDe[id]]).apuntadas}/{resumenTramo(tramos[tramoDe[id]]).zonas} {t('zonas', 'areas')}</span>
            {#if resumenTramo(tramos[tramoDe[id]]).capturas}<span title={t('Capturas vivas', 'Alive catches')}>◓ {resumenTramo(tramos[tramoDe[id]]).capturas}</span>{/if}
            {#if resumenTramo(tramos[tramoDe[id]]).caidos}<span class="lx-tramo-caidos" title={t('Caídos', 'Fallen')}>✝ {resumenTramo(tramos[tramoDe[id]]).caidos}</span>{/if}
            {#if resumenTramo(tramos[tramoDe[id]]).fallidos}<span class="lx-tramo-fallidos" title={t('Fallidos', 'Missed')}>✗ {resumenTramo(tramos[tramoDe[id]]).fallidos}</span>{/if}
          </span>
        </button>
      </li>
    {/if}

  {#if isStarter(p)}
      <li
        class="flex items-center gap-x-2"
        id="route-{p.name}"
        in:fade
        out:fade|local={{ duration: 100 }}
        class:hidden={hidden || !showStarterRoute(p, filters, hideRoute)}
      >
        <PokemonSelector
          {id}
          {store}
          encounters={p.encounters}
          type="starter"
          location="Starter"
          locationName="Starter"
          on:new={onnewlocation}
        >
          <div
            slot="location"
            class="flex shrink-0 flex-row-reverse items-center gap-x-2 lg:flex-col-reverse lg:items-start lg:gap-y-1 2xl:flex-row 2xl:items-center"
          >
            <!-- Las piedras van juntas en una fila; con la ventana mediana bajan debajo de «Inicial» para no salirse -->
            <div class="flex shrink-0 gap-x-1">
              <StarterType {key} on:select={setstarter} bind:starter />
            </div>
            <p>
              Starter* <Tooltip
                >Selecting a starter type modifies Rival encounters.</Tooltip
              >
            </p>
          </div>
        </PokemonSelector>
      </li>
    {:else if isRoute(p)}
      <li
        class="location"
        id="route-{p.name}"
        in:fade
        out:fade|local={{ duration: 100 }}
        class:hidden={hidden || !showRoute(p, filters, hideRoute)}
      >
        <PokemonSelector
          {id}
          {store}
          infolink={toDbLocation(key, p.name)}
          location={p.name}
          encounters={p.encounters}
          on:hide={onhidelocation}
          on:new={onnewlocation}
        />
      </li>
    {:else if isCustom(p)}
      <li
        class="location flex items-center gap-x-2"
        id="custom-{p.index}"
        in:fade
        out:fade|local={{ duration: 100 }}
        class:hidden={hidden || !showCustom(p, filters, hideRoute)}
      >
        <PokemonSelector
          type="custom"
          locationName={p.name}
          location={p.id}
          {id}
          {store}
          on:new={onnewlocation}
          on:delete={ondeletelocation}
        >
          <svelte:fragment slot="location">
            <CustomLocation {store} id={p.id} />
          </svelte:fragment>
        </PokemonSelector>
      </li>
    {:else if isGym(p)}
      <li
        class="boss -mb-4 md:my-2"
        class:hidden={hidden || !showGym(p, filters)}
        id="boss-{id}"
        in:fade
        out:fade|local={{ duration: 100 }}
      >
        <GymCard
          forceVs
          {starter}
          game={key}
          id={p.value}
          defeated={bossTeamIds.includes(p.value)}
          location={p.name}
          type={p.group}
        />
      </li>
    {/if}
  {/each}
</ul>

<style>
  .lx-tramo {
    margin: 10px 0 2px;
  }
  .lx-tramo:first-child {
    margin-top: 0;
  }
  .lx-tramo-cab {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 4px 10px;
    width: 100%;
    padding: 4px 12px 4px 10px;
    border: 2px solid var(--lx-tinta);
    border-radius: var(--lx-radio-sm);
    background: var(--lx-lcd);
    color: var(--lx-lcd-texto);
    box-shadow: var(--lx-sombra-sm);
    text-align: left;
    font-family: 'LX Pixel', 'VT323', monospace;
    -webkit-font-smoothing: none;
  }
  .lx-tramo-cab:hover {
    filter: brightness(1.12);
  }
  .lx-tramo-cab:active {
    transform: translate(2px, 2px);
    box-shadow: none;
  }
  .lx-tramo-flecha {
    width: 14px;
    font-size: 12px;
    color: var(--lx-amarillo);
  }
  .lx-tramo-titulo {
    font-size: 24px;
    line-height: 28px;
    color: #fff;
  }
  .lx-tramo-actual .lx-tramo-cab {
    border-color: var(--lx-amarillo);
  }
  .lx-tramo-ahora {
    padding: 0 6px;
    border-radius: 3px;
    background: var(--lx-amarillo);
    color: #202020;
    font-size: 12px;
    line-height: 16px;
  }
  .lx-tramo-hecho {
    color: #78e088;
    font-size: 18px;
  }
  .lx-tramo-resumen {
    display: inline-flex;
    gap: 12px;
    margin-left: auto;
    font-size: 18px;
    line-height: 20px;
  }
  .lx-tramo-caidos {
    color: #f08878;
  }
  .lx-tramo-fallidos {
    opacity: 0.75;
  }
  .lx-tramo-medalla {
    display: inline-block;
    width: 24px;
    height: 24px;
    background-size: 192px 24px;
    background-repeat: no-repeat;
    image-rendering: pixelated;
  }
  .lx-tramo-generica {
    clip-path: polygon(30% 0, 70% 0, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0 70%, 0 30%);
    background: linear-gradient(#f8e070 50%, #d8a830 50%);
    transform: scale(0.75);
  }
  .lx-tramo-sin {
    filter: brightness(0) invert(1);
    opacity: 0.22;
  }

  li {
    scroll-margin-top: 28px;
    @apply snap-start;
  }

  @media (min-width: theme('screens.md')) {
    li.location {
      scroll-margin-top: 32px;
    }
  }
</style>
