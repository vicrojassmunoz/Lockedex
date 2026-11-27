<script>
  // Menú de equipo de la run, como el de los juegos de GBA: el primero en grande y el resto en barras, con el
  // nivel y los PS de la partida del emulador si está vinculada. Cada uno tiene FICHA, CAMBIAR y SACAR; un
  // hueco libre abre la caja (como el PC en «Sacar Pokémon») para meter uno. Se abre al pulsar la barra del
  // equipo y se maneja también con el teclado: flechas, Intro y Esc.
  import { getContext, onMount, onDestroy } from 'svelte'
  import { PIcon } from '$c/core'
  import { encajarIcono } from './encajar.js'
  import { recorte } from './recorte.js'
  import { urlAnimada, alFallarSprite, ajustarGif } from './animado.js'
  import { createImgUrl, UNOWN } from '$utils/rewrites'
  import { getGameStore, readdata, readBox, readTeam, read, patch } from '$lib/store'
  import { locid } from '$utils/pokemon'
  import { fetchData } from '$utils/fetchers'
  import { leerSavGuardado, emparejarRun } from './equipo.js'
  import { leerPartida, alCambiarDatos, partidaActiva } from './partida.js'
  import { norm, habilidades as cargarHabs } from './datos.js'
  import { cargarHabilidadesEspecie, habilidadesDe } from './tiposHabilidad.js'
  import { leerReglas, sinCalculos } from './reglas.js'
  import { origenDe } from './origen.js'
  import FichaSav from './FichaSav.svelte'
  import { marco, bola, TIPO_GBA } from './gba.js'
  import { t, traducirNombre, idioma } from './idioma.js'

  // Hueco elegido al abrir (número) o 'meter' para abrir directamente la caja
  export let inicial = null

  const { close } = getContext('simple-modal')
  const [, , id] = readdata()
  const tienda = getGameStore(id)
  const es = idioma() === 'es'

  let equipo = []
  let caja = []
  onDestroy(
    tienda.subscribe(
      read((d) => {
        equipo = readTeam(d)
        caja = readBox(d)
      })
    )
  )
  $: porId = Object.fromEntries(caja.map((p) => [locid(p), p]))
  $: mons = equipo.map((k) => porId[k]).filter(Boolean)
  $: libres = caja.filter((p) => !equipo.includes(locid(p)))
  const ids = () => mons.map(locid)
  const guardar = (l) => tienda.update(patch({ __team: l.slice(0, 6) }))

  // Datos de la Pokédex, habilidades y lo que dice el .sav de cada uno
  let pkdx = null
  let sav = null
  let tablaHab = null
  let habs = {}
  let version = 0
  onMount(() => {
    fetchData().then((d) => (pkdx = d)).catch(() => {})
    cargarHabilidadesEspecie().then((x) => (tablaHab = x)).catch(() => {})
    cargarHabs().then((x) => (habs = x || {})).catch(() => {})
    sav = leerSavGuardado(id)
    return alCambiarDatos(() => ((sav = leerSavGuardado(id)), version++))
  })
  $: gen = partidaActiva()?.info?.gen || 3
  $: conTipos = !sinCalculos(leerReglas(id))
  $: pk = (alias) => pkdx?.aliasMap?.[norm(alias)] || pkdx?.nameMap?.[norm(alias)] || null
  $: linea = (x) => pk(x)?.evoline || null
  $: delSav = (version, emparejarRun(sav, leerPartida(id)?.datos || {}, linea))
  $: deSav = (p) => (p ? delSav.get(p.location) || null : null)

  const mayus = (s) => String(s || '').replace(/(^|[-\s])([a-z])/g, (m, a, b) => a + b.toUpperCase())
  $: especie = (p) => traducirNombre(pk(p?.pokemon)?.name || mayus(p?.pokemon))
  $: nombre = (p) => (p ? p.nickname || especie(p) : '')
  $: nivel = (p) => deSav(p)?.nivel ?? null
  // PS de la partida: los del equipo traen los actuales; los de las cajas, solo los máximos (o ninguno)
  $: vida = (p) => {
    const s = deSav(p)
    if (!s?.psMax) return null
    const act = Math.max(0, Math.min(s.psMax, s.ps ?? s.psMax))
    return { act, max: s.psMax, pct: act / s.psMax }
  }
  const colorVida = (v) => (!v || v.pct > 0.5 ? 'verde' : v.pct > 0.2 ? 'amarillo' : 'rojo')
  const colorTipo = (tipo) => TIPO_GBA[String(tipo || '').toLowerCase()] || '#a8a878'
  const habDe = (k) => habs[k] || habs[String(k).replace(/[^a-z0-9]/gi, '').toLowerCase()]
  const nombreHab = (k) => (habDe(k) ? (es ? habDe(k).es : habDe(k).en) : traducirNombre(mayus(k)))

  // Estado del menú: 'menu' (eligiendo), 'acciones' (cuadro FICHA/CAMBIAR/SACAR), 'cambiar' (con cuál),
  // 'ficha', 'caja' (meter uno) y 'reemplazar' (cambiarlo por uno de la caja)
  let sel = typeof inicial === 'number' ? inicial : 0
  let modo = inicial === 'meter' ? 'caja' : typeof inicial === 'number' ? 'acciones' : 'menu'
  let desde = null
  let acc = 0
  $: if (mons.length && sel > mons.length - 1) sel = mons.length - 1
  $: if (!mons.length && ['acciones', 'cambiar', 'ficha'].includes(modo)) modo = 'menu'
  $: elegido = mons[sel] || null

  $: ACCIONES = [
    ['ficha', t('FICHA', 'SUMMARY')],
    ['cambiar', t('CAMBIAR', 'SWITCH')],
    ['sacar', t('SACAR', 'REMOVE')],
    ['salir', t('SALIR', 'CANCEL')]
  ]

  const sacar = (i) => {
    guardar(ids().filter((_, j) => j !== i))
    sel = Math.max(0, Math.min(i, mons.length - 1))
    modo = 'menu'
  }
  const intercambiar = (a, b) => {
    const l = ids()
    ;[l[a], l[b]] = [l[b], l[a]]
    guardar(l)
    sel = b
    modo = 'menu'
  }
  const meter = (p) => {
    const l = ids()
    if (modo === 'reemplazar' && l[sel]) l[sel] = locid(p)
    else if (l.length < 6) {
      l.push(locid(p))
      sel = l.length - 1
    }
    guardar(l)
    desde = null
    modo = 'menu'
  }
  const hacer = (a) => {
    acc = 0
    if (a === 'ficha') modo = 'ficha'
    else if (a === 'cambiar') {
      desde = sel
      modo = 'cambiar'
    } else if (a === 'sacar') sacar(sel)
    else modo = 'menu'
  }
  const pulsar = (i) => {
    if (modo === 'cambiar') {
      if (i !== desde) intercambiar(desde, i)
      else modo = 'menu'
      desde = null
      return
    }
    sel = i
    acc = 0
    modo = 'acciones'
  }
  const deLaCaja = () => {
    sel = desde
    modo = 'reemplazar'
  }
  const atras = () => {
    if (modo === 'reemplazar') modo = 'cambiar'
    else if (modo === 'menu') close()
    else {
      modo = 'menu'
      desde = null
    }
  }

  $: mensaje =
    modo === 'acciones' && elegido
      ? t(`¿Qué hacer con ${nombre(elegido)}?`, `Do what with ${nombre(elegido)}?`)
      : modo === 'cambiar' && mons[desde]
      ? t(`¿Por cuál cambias a ${nombre(mons[desde])}?`, `Switch ${nombre(mons[desde])} with which one?`)
      : mons.length
      ? t('Elige un Pokémon.', 'Choose a Pokémon.')
      : t('Tu equipo está vacío. Pulsa un hueco para meter uno de la caja.', 'Your team is empty. Click a slot to add one from your box.')

  // Teclado: flechas para moverse, Intro para elegir y Esc para volver (la ventana no se cierra sola con Esc)
  const teclas = (e) => {
    const k = e.key
    const n = mons.length
    let hecho = true
    if (modo === 'ficha') {
      if ((k === 'ArrowLeft' || k === 'ArrowUp') && n) sel = (sel - 1 + n) % n
      else if ((k === 'ArrowRight' || k === 'ArrowDown') && n) sel = (sel + 1) % n
      else if (k === 'Escape') atras()
      else hecho = false
    } else if (modo === 'acciones') {
      if (k === 'ArrowUp') acc = (acc + ACCIONES.length - 1) % ACCIONES.length
      else if (k === 'ArrowDown') acc = (acc + 1) % ACCIONES.length
      else if (k === 'Enter') hacer(ACCIONES[acc][0])
      else if (k === 'Escape') atras()
      else hecho = false
    } else if (modo === 'caja' || modo === 'reemplazar') {
      if (k === 'Escape') atras()
      else hecho = false
    } else {
      if ((k === 'ArrowUp' || k === 'ArrowLeft') && n) sel = (sel - 1 + n) % n
      else if ((k === 'ArrowDown' || k === 'ArrowRight') && n) sel = (sel + 1) % n
      else if (k === 'Enter') n ? pulsar(sel) : (modo = 'caja')
      else if (k === 'Escape') atras()
      else hecho = false
    }
    if (hecho) {
      e.preventDefault()
      e.stopImmediatePropagation()
    }
  }
  onMount(() => {
    window.addEventListener('keydown', teclas, true)
    return () => window.removeEventListener('keydown', teclas, true)
  })

  // Paleta de la consola (la misma que el menú de equipo de los jefes)
  const MARCOS = {
    fondo: marco({ tinta: '#183c38', fondo: '#2b766d', luz: '#3c9488', sombra: '#215c55', r: 3, relleno: false }),
    hueco: marco({ tinta: '#283850', fondo: '#4890e8', luz: '#88c8f8', sombra: '#3070c8', r: 3 }),
    elegido: marco({ tinta: '#e85020', fondo: '#98d8f8', luz: '#d8f4ff', sombra: '#68b8e8', r: 3 }),
    moviendo: marco({ tinta: '#283850', fondo: '#f8b050', luz: '#f8d898', sombra: '#d08830', r: 3 }),
    vacio: marco({ tinta: '#1d5650', fondo: '#2f7f76', luz: '#3a8c82', sombra: '#2f7f76', r: 3 }),
    texto: marco({ tinta: '#283850', fondo: '#f8f8f8', luz: '#ffffff', sombra: '#d0d8e0', r: 2 }),
    ficha: marco({ tinta: '#283850', fondo: '#e0e8f0', luz: '#f8fcff', sombra: '#b0c0d0', r: 3, relleno: false }),
    panel: marco({ tinta: '#687890', fondo: '#f8f8f8', luz: '#ffffff', sombra: '#d8e0e8', r: 2 }),
    ventana: marco({ tinta: '#283850', fondo: '#c8e8f8', luz: '#e8f8ff', sombra: '#98c8e8', r: 2, relleno: false }),
    mini: marco({ tinta: '#283850', fondo: '#f8f8f8', luz: '#ffffff', sombra: '#c8d0d8', r: 1 })
  }
  const BOLA = bola()
  const estilo = (i) => (modo === 'cambiar' && i === desde ? MARCOS.moviendo : i === sel && modo !== 'caja' ? MARCOS.elegido : MARCOS.hueco)

  $: datosFicha = elegido ? pk(elegido.pokemon) : null
  $: savFicha = deSav(elegido)
  $: habsPosibles = elegido && !savFicha && tablaHab ? habilidadesDe(tablaHab, elegido.pokemon, gen) : null
  $: fijo = (p, d) => createImgUrl(d || { name: p?.pokemon }, { shiny: p?.status === 6, ext: 'png' })
</script>

<div class="lx-eg" style={MARCOS.fondo} data-lx-original>
  {#if modo === 'ficha' && elegido}
    <!-- Ficha del Pokémon, como la pantalla de datos del juego -->
    <section class="lx-eg-ficha" style={MARCOS.ficha}>
      <header class="lx-eg-fcab">
        <span class="lx-eg-ftitulo">{t('INFO. POKéMON', 'POKéMON INFO')}</span>
        {#if mons.length > 1}
          <span class="lx-eg-fnav">
            <button style={MARCOS.mini} on:click={() => (sel = (sel - 1 + mons.length) % mons.length)} title={t('Anterior', 'Previous')}>◀</button>
            <span>{sel + 1}/{mons.length}</span>
            <button style={MARCOS.mini} on:click={() => (sel = (sel + 1) % mons.length)} title={t('Siguiente', 'Next')}>▶</button>
          </span>
        {/if}
        <button class="lx-eg-fcerrar" style={MARCOS.mini} on:click={atras} title={t('Volver al equipo', 'Back to the team')}>×</button>
      </header>
      <div class="lx-eg-fcuerpo">
        <div class="lx-eg-fizq">
          <div class="lx-eg-ventana" style={MARCOS.ventana}>
            {#key locid(elegido)}
              <img
                use:recorte
                src={urlAnimada(datosFicha, elegido.status === 6) || fijo(elegido, datosFicha)}
                data-fase={urlAnimada(datosFicha, elegido.status === 6) ? 'animado' : 'fijo'}
                alt=""
                on:load={ajustarGif(124)}
                on:error={alFallarSprite(fijo(elegido, datosFicha), UNOWN)}
              />
            {/key}
          </div>
          <div class="lx-eg-placa">
            <img src={BOLA} alt="" aria-hidden="true" />
            <b>{nombre(elegido)}</b>
            {#if nivel(elegido) != null}<span class="lx-eg-nv"><small>{t('Nv', 'Lv')}</small>{nivel(elegido)}</span>{/if}
          </div>
          {#if elegido.nickname}<p class="lx-eg-fespecie">{especie(elegido)}</p>{/if}
          {#if conTipos}
            <div class="lx-eg-tipos">
              {#each datosFicha?.types || [] as tipo}
                <span class="lx-eg-tipo" style="--c:{colorTipo(tipo)}">{traducirNombre(mayus(tipo))}</span>
              {/each}
            </div>
          {/if}
        </div>
        <div class="lx-eg-fder">
          <dl class="lx-eg-panel" style={MARCOS.panel}>
            {#if elegido.nature}
              <dt>{t('NATURALEZA', 'NATURE')}</dt>
              <dd>{traducirNombre(mayus(elegido.nature))}</dd>
            {/if}
            <dt>{t('ORIGEN', 'ORIGIN')}</dt>
            <dd>{origenDe(elegido)}</dd>
            {#if habsPosibles && (habsPosibles.normales?.length || habsPosibles.oculta)}
              <dt>{t('HABILIDAD', 'ABILITY')}</dt>
              <dd>
                {#each habsPosibles.normales || [] as h, i}{#if i}{' / '}{/if}<span class="cursor-help" data-lx-hab={habDe(h)?.en || h}>{nombreHab(h)}</span>{/each}
                {#if habsPosibles.oculta}<small> · {t('oculta', 'hidden')}: <span class="cursor-help" data-lx-hab={habDe(habsPosibles.oculta)?.en || habsPosibles.oculta}>{nombreHab(habsPosibles.oculta)}</span></small>{/if}
              </dd>
            {/if}
            {#if vida(elegido)}
              <dt>{t('PS', 'HP')}</dt>
              <dd>{vida(elegido).act}/{vida(elegido).max}</dd>
            {/if}
          </dl>
          {#if savFicha}
            <FichaSav s={savFicha} {gen} />
          {:else}
            <p class="lx-eg-aviso">
              {sav
                ? t('No lo encuentro en la partida del emulador.', 'Not found in your emulator save.')
                : t('Vincula el .sav para ver su nivel, sus movimientos y sus IVs.', 'Link your .sav to see its level, moves and IVs.')}
            </p>
          {/if}
        </div>
      </div>
    </section>
  {:else if modo === 'caja' || modo === 'reemplazar'}
    <!-- La caja, como el PC en «Sacar Pokémon»: se elige uno y entra en el equipo -->
    <section class="lx-eg-caja" style={MARCOS.ficha}>
      <header class="lx-eg-fcab">
        <span class="lx-eg-ftitulo">
          {modo === 'reemplazar' && mons[sel]
            ? t(`¿Quién entra por ${nombre(mons[sel])}?`, `Who replaces ${nombre(mons[sel])}?`)
            : t('¿A quién metes en el equipo?', 'Who joins the team?')}
        </span>
        <button class="lx-eg-fcerrar" style={MARCOS.mini} on:click={atras} title={t('Volver al equipo', 'Back to the team')}>×</button>
      </header>
      {#if libres.length}
        <div class="lx-eg-rejilla">
          {#each libres as p (locid(p))}
            <button class="lx-eg-cajahueco" on:click={() => meter(p)} title={nombre(p) + (p.nickname ? ` · ${especie(p)}` : '') + ' · ' + origenDe(p)}>
              <span class="lx-eg-encaje" use:encajarIcono={{ nombre: p.pokemon, max: 64, escala: 2 }}><PIcon name={p.pokemon} className="lx-eg-icono lx-encajar" /></span>
              <span class="lx-eg-cajanombre">{nombre(p)}</span>
              {#if nivel(p) != null}<small class="lx-eg-cajanv">{t('Nv', 'Lv')}{nivel(p)}</small>{/if}
            </button>
          {/each}
        </div>
      {:else}
        <p class="lx-eg-aviso">{t('No queda nadie en la caja: todos los vivos ya van en el equipo.', 'Nobody left in the box: every Pokémon alive is already in your team.')}</p>
      {/if}
    </section>
  {:else}
    <div class="lx-eg-huecos">
      <div class="lx-eg-izq">
        {#if mons[0]}
          <button class="lx-eg-slot lx-eg-grande" class:lx-eg-sel={sel === 0} style={estilo(0)} on:click={() => pulsar(0)}>
            <img class="lx-eg-ball" src={BOLA} alt="" aria-hidden="true" />
            <span class="lx-eg-encaje" use:encajarIcono={{ nombre: mons[0].pokemon, max: 64, escala: 2 }}><PIcon name={mons[0].pokemon} className="lx-eg-icono lx-encajar" /></span>
            <span class="lx-eg-datos">
              <b>{nombre(mons[0])}</b>
              {#if nivel(mons[0]) != null}<span class="lx-eg-nv"><small>{t('Nv', 'Lv')}</small>{nivel(mons[0])}</span>{:else}<small class="lx-eg-sitio">{origenDe(mons[0])}</small>{/if}
            </span>
            <span class="lx-eg-vida">
              <span class="lx-eg-ps"><i>{t('PS', 'HP')}</i><span class="lx-eg-barra lx-eg-{colorVida(vida(mons[0]))}"><span style="width:{(vida(mons[0])?.pct ?? 1) * 100}%" /></span></span>
              {#if vida(mons[0])}<span class="lx-eg-num">{vida(mons[0]).act}/{vida(mons[0]).max}</span>{/if}
            </span>
            {#if mons[0].status === 6}<span class="lx-eg-shiny" title={t('Variocolor', 'Shiny')}>✦</span>{/if}
          </button>
        {:else}
          <button class="lx-eg-slot lx-eg-grande lx-eg-libre" style={MARCOS.vacio} on:click={() => (modo = 'caja')} title={t('Meter uno de la caja', 'Add one from your box')}>
            <span class="lx-eg-mas">+</span>
          </button>
        {/if}
      </div>
      <div class="lx-eg-der">
        {#each [1, 2, 3, 4, 5] as i}
          {#if mons[i]}
            <button class="lx-eg-slot" class:lx-eg-sel={sel === i} style={estilo(i)} on:click={() => pulsar(i)}>
              <span class="lx-eg-encaje" use:encajarIcono={{ nombre: mons[i].pokemon, max: 64, escala: 2 }}><PIcon name={mons[i].pokemon} className="lx-eg-icono lx-encajar" /></span>
              <span class="lx-eg-datos">
                <b>{nombre(mons[i])}</b>
                {#if nivel(mons[i]) != null}<span class="lx-eg-nv"><small>{t('Nv', 'Lv')}</small>{nivel(mons[i])}</span>{:else}<small class="lx-eg-sitio">{origenDe(mons[i])}</small>{/if}
              </span>
              <span class="lx-eg-vida">
                <span class="lx-eg-ps"><i>{t('PS', 'HP')}</i><span class="lx-eg-barra lx-eg-{colorVida(vida(mons[i]))}"><span style="width:{(vida(mons[i])?.pct ?? 1) * 100}%" /></span></span>
                {#if vida(mons[i])}<span class="lx-eg-num">{vida(mons[i]).act}/{vida(mons[i]).max}</span>{/if}
              </span>
              {#if mons[i].status === 6}<span class="lx-eg-shiny" title={t('Variocolor', 'Shiny')}>✦</span>{/if}
            </button>
          {:else}
            <button
              class="lx-eg-slot lx-eg-libre"
              style={MARCOS.vacio}
              on:click={() => (modo = 'caja')}
              disabled={modo === 'cambiar' || !libres.length}
              title={libres.length ? t('Meter uno de la caja', 'Add one from your box') : t('No queda nadie en la caja', 'Nobody left in the box')}
            >
              {#if i === mons.length && libres.length && modo !== 'cambiar'}<span class="lx-eg-mas">+</span>{/if}
            </button>
          {/if}
        {/each}
      </div>
    </div>

    <footer class="lx-eg-pie">
      <p class="lx-eg-mensaje" style={MARCOS.texto}>
        {mensaje}
        {#if modo === 'cambiar' && libres.length}
          <button class="lx-eg-enlace" on:click={deLaCaja}>{t('…o por uno de la caja', '…or with one from your box')}</button>
        {/if}
      </p>
      {#if modo === 'acciones' && elegido}
        <ul class="lx-eg-acciones" style={MARCOS.texto} role="menu">
          {#each ACCIONES as [clave, texto], i}
            <li>
              <button role="menuitem" class:lx-eg-acc={acc === i} on:mouseenter={() => (acc = i)} on:click={() => hacer(clave)}>
                <span class="lx-eg-cursor" aria-hidden="true">{acc === i ? '▶' : ''}</span>{texto}
              </button>
            </li>
          {/each}
        </ul>
      {:else}
        <button class="lx-eg-salir" style={MARCOS.texto} on:click={atras}>{modo === 'cambiar' ? t('VOLVER', 'BACK') : t('SALIR', 'CANCEL')}</button>
      {/if}
    </footer>
  {/if}
</div>

<style>
  .lx-eg {
    width: min(660px, calc(100vw - 32px));
    margin: 0 auto;
    padding: 8px 6px;
    background-color: #2b766d;
    background-image: repeating-linear-gradient(0deg, #317f75 0 2px, #2b766d 2px 6px);
    font-family: 'LX Pixel', 'VT323', monospace;
    -webkit-font-smoothing: none;
    color: #f8f8f8;
  }

  .lx-eg-huecos {
    display: grid;
    grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.4fr);
    gap: 8px 12px;
  }
  @media (max-width: 560px) {
    .lx-eg-huecos {
      grid-template-columns: minmax(0, 1fr);
    }
  }
  .lx-eg-izq {
    padding: 10px 0 0 4px;
  }
  .lx-eg-der {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .lx-eg-slot {
    position: relative;
    display: grid;
    grid-template-columns: 64px minmax(0, 1fr) auto;
    align-items: center;
    column-gap: 4px;
    width: 100%;
    min-height: 56px;
    padding: 0 4px 0 0;
    text-align: left;
    color: #f8f8f8;
  }
  button.lx-eg-slot:hover:not(.lx-eg-sel):not(:disabled) {
    filter: brightness(1.08);
  }
  .lx-eg-sel {
    filter: drop-shadow(2px 0 0 #f8a848) drop-shadow(-2px 0 0 #f8a848) drop-shadow(0 2px 0 #f8a848) drop-shadow(0 -2px 0 #f8a848);
  }
  .lx-eg-grande {
    grid-template-columns: 1fr;
    grid-template-rows: auto auto auto;
    justify-items: start;
    min-height: 150px;
    padding: 18px 8px 8px;
  }
  .lx-eg-grande .lx-eg-datos {
    width: 100%;
  }
  .lx-eg-grande .lx-eg-vida {
    width: 100%;
    margin-top: 6px;
  }
  .lx-eg-ball {
    position: absolute;
    top: -10px;
    left: -6px;
    width: 24px;
    height: 24px;
    image-rendering: pixelated;
  }
  .lx-eg-libre {
    min-height: 40px;
    justify-items: center;
    grid-template-columns: 1fr;
  }
  .lx-eg-libre:disabled {
    cursor: default;
  }
  .lx-eg-mas {
    font-size: 24px;
    line-height: 20px;
    color: #a8e0d8;
  }
  .lx-eg-encaje {
    display: contents;
  }
  .lx-eg :global(.lx-eg-icono) {
    justify-self: center;
    transform: scale(var(--lx-esc, 2));
    image-rendering: pixelated;
  }
  .lx-eg-sel :global(.lx-eg-icono) {
    animation: lx-eg-salto 0.5s steps(1, end) infinite;
  }
  @keyframes lx-eg-salto {
    0% {
      transform: scale(var(--lx-esc, 2)) translateY(0);
    }
    50% {
      transform: scale(var(--lx-esc, 2)) translateY(-2px);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .lx-eg-sel :global(.lx-eg-icono) {
      animation: none;
    }
  }
  .lx-eg-grande :global(.lx-eg-icono) {
    justify-self: start;
    margin: 4px 0 6px 16px;
  }

  .lx-eg-datos {
    display: flex;
    flex-direction: column;
    min-width: 0;
    gap: 2px;
  }
  .lx-eg-datos b,
  .lx-eg-placa b {
    font-size: 24px;
    line-height: 26px;
    font-weight: normal;
    text-transform: uppercase;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .lx-eg-datos b,
  .lx-eg-nv,
  .lx-eg-num {
    text-shadow: 2px 2px 0 #283850;
  }
  .lx-eg-sel .lx-eg-datos b,
  .lx-eg-sel .lx-eg-nv,
  .lx-eg-sel .lx-eg-num {
    text-shadow: 2px 2px 0 #305890;
  }
  .lx-eg-nv {
    font-size: 24px;
    line-height: 20px;
    padding-left: 12px;
  }
  .lx-eg-nv small {
    font-size: 12px;
    margin-right: 2px;
  }
  .lx-eg-sitio {
    font-size: 12px;
    line-height: 14px;
    opacity: 0.85;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .lx-eg-vida {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 2px;
  }
  .lx-eg-ps {
    display: inline-flex;
    align-items: center;
    padding: 2px 3px;
    border-radius: 3px;
    background: #404858;
  }
  .lx-eg-ps i {
    font-style: normal;
    font-size: 12px;
    line-height: 12px;
    color: #f8d030;
    margin-right: 3px;
  }
  .lx-eg-barra {
    display: block;
    width: 96px;
    height: 6px;
    background: #506070;
    border: 1px solid #f8f8f8;
  }
  .lx-eg-grande .lx-eg-barra {
    width: 120px;
  }
  .lx-eg-barra span {
    display: block;
    height: 100%;
    background: #70f8a8;
    box-shadow: inset 0 -2px 0 #58d080;
  }
  .lx-eg-amarillo span {
    background: #f8e038;
    box-shadow: inset 0 -2px 0 #c8a808;
  }
  .lx-eg-rojo span {
    background: #f85838;
    box-shadow: inset 0 -2px 0 #a84048;
  }
  .lx-eg-num {
    font-size: 24px;
    line-height: 20px;
  }
  .lx-eg-shiny {
    position: absolute;
    top: 2px;
    right: 6px;
    color: #f8d030;
    font-size: 16px;
    text-shadow: 1px 1px 0 #283850;
  }

  /* Pie: cuadro de texto y SALIR / acciones, como en la consola */
  .lx-eg-pie {
    display: flex;
    align-items: flex-end;
    gap: 8px;
    margin-top: 10px;
  }
  .lx-eg-mensaje {
    flex: 1;
    min-height: 44px;
    padding: 4px 8px;
    color: #303040;
    font-size: 24px;
    line-height: 26px;
  }
  .lx-eg-enlace {
    display: block;
    font-size: 18px;
    line-height: 22px;
    color: #3070c8;
    text-decoration: underline;
  }
  .lx-eg-salir {
    padding: 4px 12px;
    color: #303040;
    font-size: 24px;
    line-height: 26px;
  }
  .lx-eg-salir:hover {
    filter: brightness(0.95);
  }
  .lx-eg-acciones {
    display: flex;
    flex-direction: column;
    min-width: 150px;
    padding: 2px 6px;
  }
  .lx-eg-acciones button {
    display: flex;
    width: 100%;
    color: #303040;
    font-size: 24px;
    line-height: 28px;
    text-align: left;
  }
  .lx-eg-cursor {
    display: inline-block;
    width: 18px;
    font-size: 16px;
    color: #303040;
  }

  /* Ficha y caja: panel claro con letra oscura en los dos temas */
  .lx-eg-ficha,
  .lx-eg-caja {
    padding: 6px 8px 10px;
    background: #e0e8f0;
    color: #283850;
  }
  .lx-eg-fcab {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
  }
  .lx-eg-ftitulo {
    flex: 1;
    font-size: 24px;
    line-height: 26px;
  }
  .lx-eg-fnav {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 24px;
    line-height: 20px;
  }
  .lx-eg-fnav button,
  .lx-eg-fcerrar {
    min-width: 28px;
    color: #283850;
    font-size: 18px;
    line-height: 18px;
  }
  .lx-eg-fcuerpo {
    display: grid;
    grid-template-columns: 170px minmax(0, 1fr);
    gap: 10px;
  }
  @media (max-width: 560px) {
    .lx-eg-fcuerpo {
      grid-template-columns: minmax(0, 1fr);
    }
  }
  .lx-eg-ventana {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 140px;
    background: #c8e8f8;
  }
  .lx-eg-ventana img {
    max-height: 124px;
    image-rendering: pixelated;
  }
  .lx-eg-placa {
    display: flex;
    align-items: center;
    gap: 4px;
    margin-top: 6px;
  }
  .lx-eg-placa img {
    width: 24px;
    height: 24px;
    image-rendering: pixelated;
  }
  .lx-eg-placa b {
    flex: 1;
    min-width: 0;
  }
  .lx-eg-placa .lx-eg-nv {
    text-shadow: none;
    padding-left: 0;
  }
  .lx-eg-fespecie {
    font-size: 18px;
    line-height: 20px;
    opacity: 0.75;
  }
  .lx-eg-tipos {
    display: flex;
    gap: 4px;
    margin-top: 4px;
  }
  .lx-eg-tipo {
    padding: 0 6px;
    border-radius: 3px;
    background: var(--c, #888);
    color: #fff;
    font-size: 18px;
    line-height: 20px;
    text-shadow: 1px 1px 0 rgba(0, 0, 0, 0.45);
    text-transform: uppercase;
  }
  .lx-eg-panel {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    gap: 2px 10px;
    padding: 4px 8px;
    font-size: 18px;
    line-height: 22px;
  }
  .lx-eg-panel dt {
    color: #687890;
  }
  .lx-eg-aviso {
    margin-top: 8px;
    font-size: 18px;
    line-height: 22px;
    opacity: 0.8;
  }
  /* La ficha del .sav, con los colores del panel claro aunque la app vaya en modo oscuro */
  .lx-eg .lx-eg-ficha :global(.lx-fs) {
    --lx-tinta: #687890;
    background: rgba(255, 255, 255, 0.6);
    font-family: inherit;
    font-size: 18px;
    line-height: 20px;
  }
  .lx-eg .lx-eg-ficha :global(.lx-fs-special) {
    color: #3868c0;
  }
  .lx-eg .lx-eg-ficha :global(.lx-fs-physical) {
    color: #c03028;
  }

  .lx-eg-rejilla {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(96px, 1fr));
    gap: 6px;
    max-height: 60vh;
    overflow-y: auto;
    padding: 4px;
    border-radius: 4px;
    background: #98c8a8;
    background-image: repeating-linear-gradient(45deg, #a8d4b4 0 6px, #98c8a8 6px 12px);
  }
  .lx-eg-cajahueco {
    position: relative;
    display: grid;
    grid-template-rows: 56px auto;
    justify-items: center;
    padding: 2px 2px 4px;
    border-radius: 4px;
    color: #283850;
  }
  .lx-eg-cajahueco:hover {
    background: rgba(255, 255, 255, 0.55);
  }
  .lx-eg-cajahueco :global(.lx-eg-icono) {
    align-self: center;
  }
  .lx-eg-cajanombre {
    max-width: 100%;
    font-size: 18px;
    line-height: 18px;
    text-transform: uppercase;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .lx-eg-cajanv {
    font-size: 12px;
    line-height: 12px;
  }
</style>
