<script>
  // Modo Analista: prepara cualquier combate sin necesidad de tener una partida
  import { onMount } from 'svelte'
  import { page } from '$app/stores'
  import Games from '$lib/data/games.json'
  import { coincideJuego, nombreJuego } from '$lib/lockedex/juegos.js'
  import { infoJuego, movimientos as cargarMovs, habilidades as cargarHabs, norm } from '$lib/lockedex/datos.js'
  import { cargarRutas, cargarLiga, nivelMaximo, partidaActiva } from '$lib/lockedex/partida.js'
  import { calcularRiesgo } from '$lib/lockedex/riesgo.js'
  import { equipoActual, leerSavGuardado } from '$lib/lockedex/equipo.js'
  import { idioma, traducirNombre } from '$lib/lockedex/idioma.js'
  import * as A from '$lib/lockedex/analista.js'
  import Riesgo from '$lib/lockedex/Riesgo.svelte'
  import { COLOR_TIPO, RIESGO } from '$lib/lockedex/colores.js'

  const es = idioma() === 'es'
  const t = (a, b) => (es ? a : b)

  // --- Estado
  let clave = ''
  let inicial = 'fire'
  let jefeValor = ''
  let equipo = Array.from({ length: 6 }, () => A.miembroVacio())
  let delta = 0
  let comparar = ''

  let busquedaJuego = ''
  let listaAbierta = false
  let datosCalc = null
  let pokedex = {}
  let rutas = []
  let liga = {}
  let movs = {}
  let habs = {}
  let nats = []
  let sugerencias = Array(6).fill(null)
  let riesgo = null
  let riesgoComparado = null
  let calculando = false
  let listo = false
  let guardados = []
  let panel = '' // 'aleatorio' | 'importar' | 'exportar' | 'guardar'
  let textoShowdown = ''
  let nombreGuardado = ''
  let aviso = ''
  let aleatorio = { tipo: '', sinLegendarios: true, soloCapturables: false }

  const JUEGOS = Object.entries(Games).filter(([, g]) => g.logo)
  const GRUPOS = {
    'gym-leader': t('Líderes de gimnasio', 'Gym leaders'),
    'elite-four': t('Alto Mando y Campeón', 'Elite Four & Champion'),
    rival: t('Rival', 'Rival'),
    'evil-team': t('Equipo malvado', 'Evil team')
  }
  const TIPOS = Object.keys(COLOR_TIPO)

  $: info = clave ? infoJuego(clave) : null
  $: juegoActual = clave ? Games[clave] : null
  $: resultadosJuego = busquedaJuego ? JUEGOS.filter(([k, g]) => coincideJuego(k, g, busquedaJuego)).slice(0, 8) : JUEGOS.slice(0, 8)
  $: jefes = rutas
    .map((r, indice) => ({ ...r, indice }))
    .filter((r) => r.type === 'gym' && liga[r.value])
    .map((r) => ({ valor: '' + r.value, nombre: liga[r.value].name, lugar: r.name, grupo: r.group, indice: r.indice, cap: nivelMaximo(liga[r.value]) }))
  $: gruposJefes = Object.entries(
    jefes.reduce((a, j) => {
      const g = GRUPOS[j.grupo] || t('Otros', 'Others')
      ;(a[g] ||= []).push(j)
      return a
    }, {})
  )
  $: jefe = jefeValor ? liga[jefeValor] : null
  $: jefeInfo = jefes.find((j) => j.valor === jefeValor)
  $: cap = jefe ? nivelMaximo(jefe) : null
  $: srcJefe = typeof jefe?.img === 'string' ? jefe.img : jefe?.img?.src
  $: imgJefe = srcJefe?.startsWith('/leaders/') ? `/assets/img${srcJefe}.png` : srcJefe?.startsWith('http') ? srcJefe : null

  const sprite = (nombre) => A.urlSprite(pokedex, nombre) || '/assets/img/pokemon/base-201-question.png'
  const especieDe = (nombre) => A.buscarEspecie(datosCalc, nombre)
  const movEs = (nombre) => {
    const m = movs[norm(nombre)]
    return m ? (es ? m.es : m.en) : nombre
  }
  const colorMov = (nombre) => COLOR_TIPO[movs[norm(nombre)]?.tipo] || '#888'
  const pct = (x) => Math.round(Math.min(x, 9.99) * 100)

  // --- Carga de datos al cambiar de juego o de inicial
  const cargarJuego = async () => {
    if (!info) return
    ;[datosCalc, pokedex, rutas] = await Promise.all([A.cargarCalc(info.gen), A.cargarPokedex(clave), cargarRutas(info.lid)])
    liga = await cargarLiga(clave, inicial)
    if (jefeValor && !liga[jefeValor]) jefeValor = ''
  }
  $: if (listo && clave) (inicial, cargarJuego())

  const elegirJuego = (k) => {
    clave = k
    busquedaJuego = ''
    listaAbierta = false
    jefeValor = ''
  }

  // --- Sugerencias de movimientos por miembro
  const actualizarSugerencias = async (i) => {
    const m = equipo[i]
    if (!m.especie || !clave) return (sugerencias[i] = null)
    sugerencias[i] = await A.movimientosSugeridos(clave, m.especie, +m.nivel || 100)
  }

  const alCambiarEspecie = async (i) => {
    const m = equipo[i]
    const sp = especieDe(m.especie)
    if (!sp) return
    m.especie = sp.nombre
    if (!sp.habilidades.includes(m.habilidad)) m.habilidad = sp.habilidades[0] || ''
    if (!m.nivel || m.nivel === 50) m.nivel = cap || m.nivel || 50
    if (!m.movimientos.some(Boolean)) m.movimientos = [...(await A.movimientosPorDefecto(clave, sp.nombre, +m.nivel)), '', '', '', ''].slice(0, 4)
    equipo = equipo
    actualizarSugerencias(i)
  }

  const rellenarMovimientos = async (i) => {
    const m = equipo[i]
    if (!m.especie) return
    m.movimientos = [...(await A.movimientosPorDefecto(clave, m.especie, +m.nivel)), '', '', '', ''].slice(0, 4)
    equipo = equipo
  }

  const quitar = (i) => {
    equipo[i] = A.miembroVacio(cap || 50)
    sugerencias[i] = null
  }
  const vaciar = () => {
    equipo = Array.from({ length: 6 }, () => A.miembroVacio(cap || 50))
    sugerencias = Array(6).fill(null)
  }
  const ponerTodosAlCap = () => {
    if (!cap) return
    equipo = equipo.map((m) => (m.especie ? { ...m, nivel: cap } : m))
    equipo.forEach((_, i) => actualizarSugerencias(i))
  }

  const avisar = (texto) => {
    aviso = texto
    setTimeout(() => (aviso = ''), 4000)
  }

  // --- Atajos para rellenar el equipo
  const presetIvs = (ivs) => {
    const v = Object.values(ivs || {})
    if (!v.length) return 'medio'
    return 'exacto'
  }
  const deFicha = (f) => {
    const sp = especieDe(f.especie || f.alias)
    const movimientosEn = (f.movimientos || []).map((id) => Object.values(movs).find((x) => x.id === id)?.en).filter(Boolean)
    return {
      ...A.miembroVacio(f.nivel || cap || 50),
      especie: sp?.nombre || f.especie || '',
      mote: f.nombre && sp && norm(f.nombre) !== norm(sp.nombre) ? f.nombre : f.mote || '',
      nivel: f.nivel || cap || 50,
      naturaleza: f.naturaleza || 'hardy',
      habilidad: habs[f.habilidad]?.en || sp?.habilidades?.[0] || '',
      iv: f.ivs ? presetIvs(f.ivs) : 'medio',
      ivExacto: f.ivs || null,
      ev: f.evs ? 'exacto' : 'cero',
      evExacto: f.evs || null,
      movimientos: [...movimientosEn, '', '', '', ''].slice(0, 4)
    }
  }

  const copiarDeRun = async () => {
    const actual = await equipoActual()
    if (!actual?.eq?.miembros?.length) return avisar(t('Tu run activa no tiene equipo todavía.', 'Your active run has no team yet.'))
    if (!clave || clave !== actual.partida.juego) {
      clave = Games[actual.partida.juego] ? actual.partida.juego : clave
      inicial = actual.partida.datos?.__starter || inicial
      await cargarJuego()
    }
    const fichas = actual.eq.miembros.slice(0, 6).map(deFicha)
    equipo = [...fichas, ...Array.from({ length: 6 }, () => A.miembroVacio(cap || 50))].slice(0, 6)
    for (let i = 0; i < 6; i++) {
      if (equipo[i].especie && !equipo[i].movimientos.some(Boolean)) await rellenarMovimientos(i)
      actualizarSugerencias(i)
    }
    avisar(t('Equipo copiado de tu run.', 'Team copied from your run.'))
  }

  const copiarDeSav = async () => {
    const p = partidaActiva()
    const sav = p && leerSavGuardado(p.id)
    if (!sav?.equipo?.length) return avisar(t('No hay ninguna partida .sav importada en tu run activa.', 'No .sav imported in your active run.'))
    if (!clave && p) {
      clave = p.juego
      await cargarJuego()
    }
    equipo = [...sav.equipo.map((s) => deFicha({ ...s, nombre: s.mote })), ...Array.from({ length: 6 }, () => A.miembroVacio(cap || 50))].slice(0, 6)
    equipo.forEach((_, i) => actualizarSugerencias(i))
    avisar(t('Equipo copiado de tu partida del emulador (con IVs y EVs reales).', 'Team copied from your emulator save (with real IVs and EVs).'))
  }

  const generarAleatorio = async () => {
    if (!datosCalc) return
    let capturables = null
    if (aleatorio.soloCapturables && jefeInfo) {
      capturables = new Set(
        rutas.slice(0, jefeInfo.indice).flatMap((r) => (r.encounters || []).map((x) => norm(x)))
      )
    }
    const nuevos = await A.equipoAleatorio({
      datosCalc,
      clave,
      nivel: cap || 50,
      tipo: aleatorio.tipo,
      sinLegendarios: aleatorio.sinLegendarios,
      soloCapturables: capturables
    })
    if (!nuevos.length) return avisar(t('No hay Pokémon que cumplan esas condiciones.', 'No Pokémon match those conditions.'))
    equipo = [...nuevos, ...Array.from({ length: 6 }, () => A.miembroVacio(cap || 50))].slice(0, 6)
    equipo.forEach((_, i) => actualizarSugerencias(i))
    panel = ''
  }

  const exportar = () => {
    textoShowdown = A.aShowdown(equipo, datosCalc)
    panel = 'exportar'
  }
  const copiarTexto = async () => {
    try {
      await navigator.clipboard.writeText(textoShowdown)
      avisar(t('Copiado al portapapeles.', 'Copied to clipboard.'))
    } catch {}
  }
  const importar = () => {
    const nuevos = A.deShowdown(textoShowdown, cap || 50).map((m) => ({ ...m, especie: especieDe(m.especie)?.nombre || m.especie }))
    if (!nuevos.length) return avisar(t('No se ha reconocido ningún Pokémon en el texto.', 'No Pokémon recognised in the text.'))
    equipo = [...nuevos, ...Array.from({ length: 6 }, () => A.miembroVacio(cap || 50))].slice(0, 6)
    equipo.forEach((_, i) => actualizarSugerencias(i))
    panel = ''
  }

  const guardarEquipo = () => {
    const nombre = nombreGuardado.trim() || `${t('Equipo', 'Team')} ${guardados.length + 1}`
    guardados = [{ id: Date.now().toString(36), nombre, juego: clave, equipo: JSON.parse(JSON.stringify(equipo)) }, ...guardados]
    A.guardarEquipos(guardados)
    nombreGuardado = ''
    panel = ''
    avisar(t(`Guardado como «${nombre}».`, `Saved as “${nombre}”.`))
  }
  const cargarGuardado = async (g) => {
    if (g.juego && g.juego !== clave) {
      clave = g.juego
      await cargarJuego()
    }
    equipo = JSON.parse(JSON.stringify(g.equipo))
    equipo.forEach((_, i) => actualizarSugerencias(i))
    panel = ''
  }
  const borrarGuardado = (g) => {
    guardados = guardados.filter((x) => x.id !== g.id)
    A.guardarEquipos(guardados)
    if (comparar === g.id) comparar = ''
  }

  // --- Cálculo (con pausa para no recalcular a cada tecla)
  let temporizador
  const recalcular = () => {
    clearTimeout(temporizador)
    temporizador = setTimeout(async () => {
      if (!jefe || !datosCalc) return (riesgo = null)
      calculando = true
      const miembros = await A.paraCalculo(equipo, datosCalc, delta)
      riesgo = miembros.length ? await calcularRiesgo({ jefe, equipo: miembros, gen: info.gen, cap }) : null
      const otro = guardados.find((g) => g.id === comparar)
      if (otro) {
        const mOtro = await A.paraCalculo(otro.equipo, datosCalc, delta)
        riesgoComparado = mOtro.length ? await calcularRiesgo({ jefe, equipo: mOtro, gen: info.gen, cap }) : null
      } else riesgoComparado = null
      calculando = false
      A.guardarActual({ clave, inicial, jefeValor, equipo, delta })
    }, 350)
  }
  $: if (listo) (jefe, datosCalc, equipo, delta, comparar, recalcular())

  onMount(async () => {
    ;[movs, habs, nats] = await Promise.all([cargarMovs(), cargarHabs(), A.naturalezasLista()])
    guardados = A.leerEquipos()
    const q = $page.url.searchParams
    const previo = A.leerActual()
    if (q.get('juego')) {
      clave = q.get('juego')
      inicial = q.get('inicial') || 'fire'
      jefeValor = q.get('jefe') || ''
    } else if (previo) {
      ;({ clave = '', inicial = 'fire', jefeValor = '', equipo = equipo, delta = 0 } = previo)
      equipo = (equipo || []).map((m) => ({ ...A.miembroVacio(), ...m }))
    } else {
      const p = partidaActiva()
      if (p && Games[p.juego]) {
        clave = p.juego
        inicial = p.datos?.__starter || 'fire'
      }
    }
    listo = true
    if (clave) await cargarJuego()
    if (q.get('equipo') === 'run') await copiarDeRun()
    else equipo.forEach((_, i) => actualizarSugerencias(i))
  })

  // Celda de la tabla: verde si lo tumbas sin peligro, rojo si te tumba
  const claseCelda = (f) => {
    if (f.ganas && f.margen >= 1) return 'lx-c-bien'
    if (f.ganas) return 'lx-c-regular'
    if (f.recibe >= 1) return 'lx-c-mal'
    return 'lx-c-flojo'
  }
  const mejorDeFila = (fila) => {
    let mejor = null
    let puntos = -999
    fila.filas.forEach((f, i) => {
      const p = (f.ganas ? 100 : 0) + f.margen * 3 + Math.min(f.hace, 1)
      if (p > puntos) {
        puntos = p
        mejor = i
      }
    })
    return mejor
  }
  const golpes = (n) => (n >= 99 ? '∞' : n)
</script>

<svelte:head>
  <title>Lockedex | {t('Analista', 'Analyst')}</title>
</svelte:head>

<main class="lx-analista" data-lx-original>
  <header class="lx-a-cab">
    <div>
      <h1>{t('Analista', 'Analyst')}</h1>
      <p>{t('Prepara cualquier combate sin necesidad de partida: elige juego, jefe y monta tu equipo a mano.', 'Prepare any battle without a run: pick a game, a boss and build your team by hand.')}</p>
    </div>
    {#if aviso}<span class="lx-a-aviso">{aviso}</span>{/if}
  </header>

  <!-- 1 · Juego y jefe -->
  <section class="lx-a-panel lx-a-pasos">
    <div class="lx-a-paso">
      <span class="lx-a-num">1</span>
      <div class="lx-a-juego">
        <label for="lx-juego">{t('Juego', 'Game')}</label>
        <div class="lx-a-selector">
          {#if juegoActual}
            <img src="/assets/img/logos/{juegoActual.logo}-small.png" alt="" class="lx-a-logo" />
          {/if}
          <input
            id="lx-juego"
            type="search"
            placeholder={juegoActual ? nombreJuego(clave, juegoActual) : t('Busca un juego…', 'Search a game…')}
            bind:value={busquedaJuego}
            on:focus={() => (listaAbierta = true)}
            on:blur={() => setTimeout(() => (listaAbierta = false), 150)}
            on:keydown={(e) => e.key === 'Enter' && resultadosJuego[0] && elegirJuego(resultadosJuego[0][0])}
          />
          {#if listaAbierta}
            <ul class="lx-a-lista">
              {#each resultadosJuego as [k, g]}
                <li><button on:mousedown|preventDefault={() => elegirJuego(k)}>
                  <img src="/assets/img/logos/{g.logo}-small.png" alt="" />{nombreJuego(k, g)}
                </button></li>
              {:else}
                <li class="lx-a-vacio">{t('Sin resultados', 'No results')}</li>
              {/each}
            </ul>
          {/if}
        </div>
      </div>
      <div class="lx-a-inicial">
        <label>{t('Inicial', 'Starter')}</label>
        <div>
          {#each [['grass', t('Planta', 'Grass')], ['fire', t('Fuego', 'Fire')], ['water', t('Agua', 'Water')]] as [k, n]}
            <button class:lx-sel={inicial === k} style="--c:{COLOR_TIPO[k]}" on:click={() => (inicial = k)}>{n}</button>
          {/each}
        </div>
      </div>
    </div>

    <div class="lx-a-paso">
      <span class="lx-a-num">2</span>
      <div class="lx-a-jefe-sel">
        <label for="lx-jefe">{t('Jefe', 'Boss')}</label>
        <select id="lx-jefe" bind:value={jefeValor} disabled={!jefes.length}>
          <option value="">{clave ? t('Elige un jefe…', 'Pick a boss…') : t('Primero elige un juego', 'Pick a game first')}</option>
          {#each gruposJefes as [grupo, lista]}
            <optgroup label={grupo}>
              {#each lista as j}
                <option value={j.valor}>{j.nombre} · {traducirNombre(j.lugar)}{j.cap ? ` · ${t('Nv.', 'Lv.')} ${j.cap}` : ''}</option>
              {/each}
            </optgroup>
          {/each}
        </select>
        <small>{t('Aquí se ven los equipos completos aunque tengas activado el modo sin spoilers.', 'Full teams are shown here even if spoiler-free mode is on.')}</small>
      </div>
    </div>
  </section>

  {#if jefe}
    <section class="lx-a-panel lx-a-rival">
      <div class="lx-a-rival-cab">
        {#if imgJefe}<img src={imgJefe} alt="" class="lx-a-rival-img" />{/if}
        <div>
          <h2>{jefe.name}</h2>
          <span>{traducirNombre(jefeInfo?.lugar || '')}</span>
        </div>
        {#if cap}<span class="lx-a-cap"><small>{t('NV. MÁX', 'LV. CAP')}</small>{cap}</span>{/if}
      </div>
      <div class="lx-a-rival-equipo">
        {#each jefe.pokemon as p}
          <article>
            <div class="lx-a-p-cab">
              <img src={sprite(p.name)} alt="" />
              <div>
                <b>{p.name.replace(/-/g, ' ')}</b>
                <span>{t('Nv.', 'Lv.')} {p.level}</span>
              </div>
            </div>
            {#if p.ability?.name}<span class="lx-a-hab" data-lx-hab={p.ability.name}>{traducirNombre(p.ability.name)}</span>{/if}
            {#if p.held?.name}<span class="lx-a-hab" data-lx-obj={p.held.name}>@ {traducirNombre(p.held.name)}</span>{/if}
            <div class="lx-a-movs">
              {#each (p.moves || []).filter(Boolean) as mv}
                <span data-lx-mov={mv.name} style="--c:{COLOR_TIPO[mv.type] || '#888'}">{movEs(mv.name)}</span>
              {/each}
            </div>
          </article>
        {/each}
      </div>
    </section>
  {/if}

  <!-- 3 · Tu equipo -->
  <section class="lx-a-panel">
    <div class="lx-a-titulo">
      <span class="lx-a-num">3</span>
      <h2>{t('Tu equipo', 'Your team')}</h2>
      <div class="lx-a-herramientas">
        <button on:click={copiarDeRun}>{t('Copiar de mi run', 'Copy from my run')}</button>
        <button on:click={copiarDeSav}>{t('Copiar de mi .sav', 'Copy from my .sav')}</button>
        <button class:lx-sel={panel === 'aleatorio'} on:click={() => (panel = panel === 'aleatorio' ? '' : 'aleatorio')}>{t('Aleatorio…', 'Random…')}</button>
        <button class:lx-sel={panel === 'importar'} on:click={() => ((textoShowdown = ''), (panel = panel === 'importar' ? '' : 'importar'))}>{t('Importar', 'Import')}</button>
        <button on:click={exportar}>{t('Exportar', 'Export')}</button>
        <button class:lx-sel={panel === 'guardar'} on:click={() => (panel = panel === 'guardar' ? '' : 'guardar')}>{t('Guardados', 'Saved')} ({guardados.length})</button>
        {#if cap}<button on:click={ponerTodosAlCap}>{t(`Todos al Nv. ${cap}`, `All to Lv. ${cap}`)}</button>{/if}
        <button on:click={vaciar}>{t('Vaciar', 'Clear')}</button>
      </div>
    </div>

    {#if panel === 'aleatorio'}
      <div class="lx-a-subpanel">
        <label>{t('Tipo', 'Type')}
          <select bind:value={aleatorio.tipo}>
            <option value="">{t('Cualquiera', 'Any')}</option>
            {#each TIPOS as tp}<option value={tp}>{traducirNombre(tp.charAt(0).toUpperCase() + tp.slice(1))}</option>{/each}
          </select>
        </label>
        <label class="lx-a-check"><input type="checkbox" bind:checked={aleatorio.sinLegendarios} /> {t('Sin legendarios ni singulares', 'No legendaries or mythicals')}</label>
        <label class="lx-a-check" class:lx-desactivado={!jefeInfo}><input type="checkbox" bind:checked={aleatorio.soloCapturables} disabled={!jefeInfo} /> {t('Solo capturables antes de este jefe', 'Only catchable before this boss')}</label>
        <button class="lx-a-principal" on:click={generarAleatorio} disabled={!datosCalc}>{t('Generar equipo', 'Generate team')}</button>
      </div>
    {:else if panel === 'importar'}
      <div class="lx-a-subpanel lx-a-columna">
        <small>{t('Pega un equipo en formato Showdown (el estándar de la comunidad).', 'Paste a team in Showdown format (the community standard).')}</small>
        <textarea rows="8" bind:value={textoShowdown} placeholder="Combusken @ Charcoal&#10;Ability: Blaze&#10;Level: 16&#10;Adamant Nature&#10;- Double Kick&#10;- Ember" />
        <button class="lx-a-principal" on:click={importar}>{t('Importar equipo', 'Import team')}</button>
      </div>
    {:else if panel === 'exportar'}
      <div class="lx-a-subpanel lx-a-columna">
        <textarea rows="8" readonly value={textoShowdown} />
        <div><button class="lx-a-principal" on:click={copiarTexto}>{t('Copiar', 'Copy')}</button> <button on:click={() => (panel = '')}>{t('Cerrar', 'Close')}</button></div>
      </div>
    {:else if panel === 'guardar'}
      <div class="lx-a-subpanel lx-a-columna">
        <div class="lx-a-fila">
          <input bind:value={nombreGuardado} placeholder={t('Nombre del equipo', 'Team name')} on:keydown={(e) => e.key === 'Enter' && guardarEquipo()} />
          <button class="lx-a-principal" on:click={guardarEquipo}>{t('Guardar el actual', 'Save current')}</button>
        </div>
        {#each guardados as g}
          <div class="lx-a-guardado">
            <b>{g.nombre}</b>
            <span>{g.juego && Games[g.juego] ? nombreJuego(g.juego, Games[g.juego]) : ''} · {g.equipo.filter((m) => m.especie).map((m) => m.especie).join(', ')}</span>
            <button on:click={() => cargarGuardado(g)}>{t('Cargar', 'Load')}</button>
            <button on:click={() => (comparar = comparar === g.id ? '' : g.id)} class:lx-sel={comparar === g.id}>{t('Comparar', 'Compare')}</button>
            <button on:click={() => borrarGuardado(g)} title={t('Borrar', 'Delete')}>✕</button>
          </div>
        {:else}
          <small>{t('Todavía no has guardado ningún equipo.', 'No saved teams yet.')}</small>
        {/each}
      </div>
    {/if}

    <datalist id="lx-esp-list">
      {#each datosCalc?.especies || [] as sp}<option value={sp.nombre} />{/each}
    </datalist>
    <datalist id="lx-obj-list">
      {#each datosCalc?.objetos || [] as o}<option value={o} />{/each}
    </datalist>

    <div class="lx-a-equipo">
      {#each equipo as m, i}
        {@const sp = especieDe(m.especie)}
        <article class:lx-a-vacio-slot={!sp}>
          <div class="lx-a-m-cab">
            <img src={sp ? sprite(sp.nombre) : '/assets/img/pokemon/base-201-question.png'} alt="" class:lx-a-gris={!sp} />
            <div class="lx-a-m-nombre">
              <input list="lx-esp-list" bind:value={m.especie} on:change={() => alCambiarEspecie(i)} placeholder={t(`Pokémon ${i + 1}`, `Pokémon ${i + 1}`)} />
              {#if sp}
                <span class="lx-a-tipos">{#each sp.tipos as tp}<i style="background:{COLOR_TIPO[tp]}">{traducirNombre(tp.charAt(0).toUpperCase() + tp.slice(1))}</i>{/each}</span>
              {/if}
            </div>
            {#if m.especie}<button class="lx-a-x" on:click={() => quitar(i)} title={t('Quitar', 'Remove')}>✕</button>{/if}
          </div>
          {#if sp}
            <div class="lx-a-campos">
              <label>{t('Nivel', 'Level')}<input type="number" min="1" max="100" bind:value={m.nivel} on:change={() => actualizarSugerencias(i)} /></label>
              <label>{t('Naturaleza', 'Nature')}
                <select bind:value={m.naturaleza}>
                  {#each nats as n}<option value={n.id}>{n.nombre}</option>{/each}
                </select>
              </label>
              <label>{t('Habilidad', 'Ability')}
                <select bind:value={m.habilidad}>
                  {#each sp.habilidades as h}<option value={h}>{traducirNombre(h)}</option>{/each}
                </select>
              </label>
              <label>{t('Objeto', 'Item')}<input list="lx-obj-list" bind:value={m.objeto} placeholder={t('Ninguno', 'None')} /></label>
              <label>IVs
                <select bind:value={m.iv}>
                  {#each Object.entries(A.PRESETS_IV) as [k, v]}<option value={k}>{es ? v.es : v.en}</option>{/each}
                  {#if m.ivExacto}<option value="exacto">{t('De tu partida', 'From your save')}</option>{/if}
                </select>
              </label>
              <label>EVs
                <select bind:value={m.ev}>
                  {#each Object.entries(A.PRESETS_EV) as [k, v]}<option value={k}>{es ? v.es : v.en}</option>{/each}
                  {#if m.evExacto}<option value="exacto">{t('De tu partida', 'From your save')}</option>{/if}
                </select>
              </label>
            </div>
            <datalist id="lx-movs-{i}">
              {#each sugerencias[i]?.porNivel || [] as x}<option value={x.m.en} label="{t('Nv.', 'Lv.')} {x.nv} · {es ? x.m.es : x.m.en}" />{/each}
              {#each sugerencias[i]?.mt || [] as mt}<option value={mt.en} label="{t('MT', 'TM')} · {es ? mt.es : mt.en}" />{/each}
              {#each datosCalc?.movimientos || [] as mv}<option value={mv} />{/each}
            </datalist>
            <div class="lx-a-movs-edit">
              {#each [0, 1, 2, 3] as j}
                <input
                  list="lx-movs-{i}"
                  bind:value={m.movimientos[j]}
                  placeholder={t(`Movimiento ${j + 1}`, `Move ${j + 1}`)}
                  style="--c:{m.movimientos[j] ? colorMov(m.movimientos[j]) : 'transparent'}"
                  data-lx-mov={m.movimientos[j] || undefined}
                />
              {/each}
            </div>
            <button class="lx-a-link" on:click={() => rellenarMovimientos(i)}>{t('↻ Los que aprende por nivel', '↻ Level-up moves')}</button>
          {/if}
        </article>
      {/each}
    </div>
  </section>

  <!-- Resultado -->
  {#if jefe}
    <section class="lx-a-panel lx-a-resultado">
      <div class="lx-a-titulo">
        <h2>{t('Resultado', 'Result')}</h2>
        {#if calculando}<span class="lx-a-calc">{t('calculando…', 'calculating…')}</span>{/if}
        <label class="lx-a-delta">
          {t('¿Y si tu equipo estuviera…', 'What if your team were…')}
          <input type="range" min="-10" max="10" step="1" bind:value={delta} />
          <b>{delta === 0 ? t('al nivel puesto', 'at set level') : `${delta > 0 ? '+' : ''}${delta} ${t('niveles', 'levels')}`}</b>
        </label>
      </div>

      {#if !riesgo}
        <p class="lx-a-nota">{t('Añade al menos un Pokémon a tu equipo para ver el análisis.', 'Add at least one Pokémon to see the analysis.')}</p>
      {:else}
        <div class="lx-a-medidores">
          <div>
            <small>{t('Este equipo', 'This team')}</small>
            <Riesgo nivel={riesgo.nivel} grande />
          </div>
          {#if riesgoComparado}
            <div>
              <small>{guardados.find((g) => g.id === comparar)?.nombre}</small>
              <Riesgo nivel={riesgoComparado.nivel} grande />
            </div>
            <p class="lx-a-veredicto">
              {riesgo.nivel < riesgoComparado.nivel
                ? t('El equipo actual lo tiene más fácil.', 'The current team has it easier.')
                : riesgo.nivel > riesgoComparado.nivel
                ? t('El equipo guardado lo tiene más fácil.', 'The saved team has it easier.')
                : t('Los dos equipos están parejos.', 'Both teams are even.')}
            </p>
          {/if}
        </div>

        <ul class="lx-a-consejos">
          {#each riesgo.todosLosConsejos || riesgo.consejos as c}
            <li class="lx-{c.tipo}">{c.texto}</li>
          {/each}
        </ul>

        {#if riesgo.matriz?.length}
          <div class="lx-a-tabla-envoltorio">
            <table class="lx-a-tabla">
              <thead>
                <tr>
                  <th>{t('Su Pokémon', 'Their Pokémon')}</th>
                  {#each riesgo.matriz[0]?.filas || [] as f}
                    <th><img src={sprite(f.y.especie)} alt="" /><span>{f.y.nombre}</span></th>
                  {/each}
                </tr>
              </thead>
              <tbody>
                {#each riesgo.matriz as fila}
                  {@const mejor = mejorDeFila(fila)}
                  <tr>
                    <th>
                      <img src={sprite(fila.jefe.name)} alt="" />
                      <span>{fila.jefe.name.replace(/-/g, ' ')}<small>{t('Nv.', 'Lv.')} {fila.jefe.level} · {t('Vel.', 'Spe')} {fila.velocidad || '?'}</small></span>
                    </th>
                    {#each fila.filas as f, k}
                      <td class={claseCelda(f)} class:lx-a-mejor={k === mejor}>
                        <span class="lx-a-hace" title={f.mejor ? movEs(f.mejor) : ''}>▲ {pct(f.hace)}–{pct(f.haceMax)}%</span>
                        <small>{f.mejor ? movEs(f.mejor) : t('sin ataques', 'no attacks')}</small>
                        <span class="lx-a-recibe" title={f.peligro ? movEs(f.peligro) : ''}>▼ {pct(f.recibeMin)}–{pct(f.recibe)}%</span>
                        <small>{f.peligro ? movEs(f.peligro) : '—'}{f.rapido ? ' · ⚡' : f.empate ? ' · =' : ''}</small>
                        <em class="lx-a-duelo">{t(`KO en ${golpes(f.tu)} · aguantas ${golpes(f.el)}`, `KO in ${golpes(f.tu)} · survive ${golpes(f.el)}`)}</em>
                      </td>
                    {/each}
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
          <p class="lx-a-nota">
            {t('▲ daño que haces (mín–máx, con tu mejor ataque) · ▼ daño que recibes (con su ataque más peligroso) · ⚡ eres más rápido · «KO en / aguantas» cuenta golpes en un 1 contra 1 · verde: lo ganas con margen · amarillo: lo ganas justo · rojo: te debilita de un golpe · el borde marca la mejor respuesta. Los jefes se calculan con IVs 31, en el peor caso.', '▲ damage you deal (min–max, best move) · ▼ damage you take (their most dangerous move) · ⚡ you outspeed · “KO in / survive” counts hits in a 1v1 · green: comfortable win · yellow: narrow win · red: you get OHKOd · border marks the best answer. Bosses use 31 IVs, worst case.')}
          </p>
        {:else}
          <p class="lx-a-nota">{t('Rellena el nivel y los movimientos de todo tu equipo para ver la tabla de daño exacta (ahora es una estimación por tipos).', 'Fill in level and moves for your whole team to see the exact damage table (currently a type-based estimate).')}</p>
        {/if}
      {/if}
    </section>
  {/if}
</main>

<style>
  .lx-analista {
    max-width: 1180px;
    margin: 0 auto;
    padding: 24px 20px 200px;
    display: flex;
    flex-direction: column;
    gap: 14px;
    font-size: 14px;
  }
  .lx-a-cab {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 16px;
  }
  .lx-a-cab h1 {
    font-family: 'VT323', monospace;
    font-size: 48px;
    line-height: 1;
    color: var(--lx-rojo);
  }
  .lx-a-cab p {
    opacity: 0.75;
  }
  .lx-a-aviso {
    background: #1b1b1f;
    color: #fff;
    padding: 6px 12px;
    border-radius: 8px;
    font-size: 13px;
  }
  .lx-a-panel {
    background: #fff;
    border: 3px solid #1b1b1f;
    border-radius: 14px;
    padding: 14px 16px;
    box-shadow: 4px 4px 0 rgba(0, 0, 0, 0.15);
  }
  :global(.dark) .lx-a-panel {
    background: #111827;
    border-color: #0b1118;
  }
  .lx-a-pasos {
    display: grid;
    grid-template-columns: 1.3fr 1fr;
    gap: 18px;
  }
  .lx-a-paso {
    display: flex;
    gap: 12px;
    align-items: flex-start;
    flex-wrap: wrap;
  }
  .lx-a-num {
    flex: none;
    width: 30px;
    height: 30px;
    display: grid;
    place-items: center;
    border-radius: 50%;
    background: var(--lx-rojo);
    color: #fff;
    font-family: 'VT323', monospace;
    font-size: 22px;
    box-shadow: 0 0 0 3px #1b1b1f;
  }
  label {
    display: flex;
    flex-direction: column;
    gap: 3px;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    opacity: 0.9;
  }
  input,
  select,
  textarea {
    font-size: 14px;
    text-transform: none;
    letter-spacing: normal;
    border: 2px solid #d4d4d8;
    border-radius: 8px;
    padding: 5px 8px;
    background: #fff;
    color: inherit;
    min-width: 0;
  }
  :global(.dark) .lx-analista input,
  :global(.dark) .lx-analista select,
  :global(.dark) .lx-analista textarea {
    background: #1f2937;
    border-color: #374151;
  }
  input:focus,
  select:focus,
  textarea:focus {
    outline: none;
    border-color: var(--lx-rojo);
  }
  .lx-a-juego {
    flex: 1;
    min-width: 220px;
    display: flex;
    flex-direction: column;
    gap: 3px;
  }
  .lx-a-juego > label {
    font-size: 11px;
  }
  .lx-a-selector {
    position: relative;
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .lx-a-selector input {
    flex: 1;
  }
  .lx-a-logo {
    height: 34px;
    width: 68px;
    object-fit: contain;
  }
  .lx-a-lista {
    position: absolute;
    z-index: 40;
    top: calc(100% + 4px);
    left: 0;
    right: 0;
    background: #fff;
    border: 3px solid #1b1b1f;
    border-radius: 10px;
    box-shadow: 4px 4px 0 rgba(0, 0, 0, 0.25);
    padding: 4px;
    max-height: 320px;
    overflow: auto;
  }
  :global(.dark) .lx-a-lista {
    background: #16202c;
  }
  .lx-a-lista button {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    padding: 4px 8px;
    border-radius: 6px;
    text-align: left;
  }
  .lx-a-lista button:hover {
    background: rgba(220, 10, 45, 0.1);
  }
  .lx-a-lista img {
    width: 56px;
    height: 28px;
    object-fit: contain;
  }
  .lx-a-vacio {
    padding: 8px;
    opacity: 0.6;
  }
  .lx-a-inicial div {
    display: flex;
    gap: 4px;
  }
  .lx-a-inicial button {
    padding: 4px 10px;
    border-radius: 8px;
    border: 2px solid var(--c);
    color: var(--c);
    font-weight: 600;
  }
  .lx-a-inicial button.lx-sel {
    background: var(--c);
    color: #fff;
  }
  .lx-a-jefe-sel {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 3px;
    min-width: 220px;
  }
  .lx-a-jefe-sel small {
    font-size: 11px;
    opacity: 0.6;
  }
  .lx-a-rival-cab {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .lx-a-rival-img {
    width: 80px;
    height: 64px;
    object-fit: contain;
    image-rendering: pixelated;
  }
  .lx-a-rival-cab div {
    flex: 1;
  }
  .lx-a-rival-cab h2,
  .lx-a-titulo h2 {
    font-family: 'VT323', monospace;
    font-size: 30px;
    line-height: 1;
  }
  .lx-a-cap {
    display: flex;
    flex-direction: column;
    align-items: center;
    font-family: 'VT323', monospace;
    font-size: 34px;
    line-height: 0.9;
    background: #1b1b1f;
    color: var(--lx-amarillo);
    border-radius: 8px;
    padding: 4px 10px;
  }
  .lx-a-cap small {
    font-size: 13px;
    color: #a1a1aa;
  }
  .lx-a-rival-equipo {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
    gap: 8px;
    margin-top: 10px;
  }
  .lx-a-rival-equipo article {
    border: 2px solid #1b1b1f;
    border-radius: 10px;
    padding: 6px 8px;
    display: flex;
    flex-direction: column;
    gap: 3px;
  }
  .lx-a-p-cab {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .lx-a-p-cab img {
    width: 44px;
    height: 44px;
    image-rendering: pixelated;
    margin: -4px 0;
  }
  .lx-a-p-cab b {
    display: block;
    font-family: 'VT323', monospace;
    font-size: 20px;
    line-height: 1;
    text-transform: capitalize;
  }
  .lx-a-p-cab span {
    font-size: 12px;
    opacity: 0.7;
  }
  .lx-a-hab {
    font-size: 12px;
    opacity: 0.8;
  }
  .lx-a-movs {
    display: flex;
    flex-wrap: wrap;
    gap: 3px;
  }
  .lx-a-movs span {
    font-size: 11px;
    padding: 1px 6px;
    border-radius: 5px;
    background: var(--c);
    color: #fff;
    text-shadow: 1px 1px 0 rgba(0, 0, 0, 0.35);
  }
  .lx-a-titulo {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
    margin-bottom: 10px;
  }
  .lx-a-herramientas {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    margin-left: auto;
  }
  .lx-a-herramientas button,
  .lx-a-subpanel button,
  .lx-a-guardado button {
    font-size: 13px;
    padding: 4px 9px;
    border: 2px solid #1b1b1f;
    border-radius: 8px;
    background: #fff;
  }
  :global(.dark) .lx-a-herramientas button,
  :global(.dark) .lx-a-subpanel button,
  :global(.dark) .lx-a-guardado button {
    background: #1f2937;
    border-color: #4b5563;
  }
  .lx-a-herramientas button:hover {
    background: #fff1f2;
  }
  .lx-a-herramientas button.lx-sel,
  .lx-a-guardado button.lx-sel {
    background: #1b1b1f;
    color: var(--lx-amarillo);
  }
  .lx-a-subpanel {
    display: flex;
    gap: 12px;
    align-items: flex-end;
    flex-wrap: wrap;
    padding: 10px 12px;
    margin-bottom: 10px;
    border-radius: 10px;
    background: rgba(0, 0, 0, 0.04);
  }
  .lx-a-columna {
    flex-direction: column;
    align-items: stretch;
  }
  .lx-a-columna textarea {
    font-family: ui-monospace, monospace;
    font-size: 13px;
  }
  .lx-a-check {
    flex-direction: row;
    align-items: center;
    gap: 6px;
    text-transform: none;
    font-size: 13px;
  }
  .lx-desactivado {
    opacity: 0.45;
  }
  .lx-a-principal {
    background: var(--lx-rojo) !important;
    color: #fff;
    font-weight: 600;
  }
  .lx-a-fila {
    display: flex;
    gap: 6px;
  }
  .lx-a-fila input {
    flex: 1;
  }
  .lx-a-guardado {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 8px;
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.6);
  }
  .lx-a-guardado span {
    flex: 1;
    font-size: 12px;
    opacity: 0.7;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .lx-a-equipo {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
    gap: 10px;
  }
  .lx-a-equipo article {
    border: 3px solid #1b1b1f;
    border-radius: 12px;
    padding: 8px 10px 10px;
    background: #f7f7f2;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  :global(.dark) .lx-a-equipo article {
    background: #1f2937;
    border-color: #0b1118;
  }
  .lx-a-vacio-slot {
    border-style: dashed !important;
    opacity: 0.85;
  }
  .lx-a-m-cab {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .lx-a-m-cab img {
    width: 56px;
    height: 56px;
    image-rendering: pixelated;
    margin: -6px 0;
  }
  .lx-a-gris {
    filter: grayscale(1);
    opacity: 0.35;
  }
  .lx-a-m-nombre {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 3px;
    min-width: 0;
  }
  .lx-a-m-nombre input {
    font-family: 'VT323', monospace;
    font-size: 22px;
    padding: 2px 8px;
  }
  .lx-a-tipos {
    display: flex;
    gap: 3px;
  }
  .lx-a-tipos i {
    font-style: normal;
    font-size: 10px;
    color: #fff;
    padding: 1px 6px;
    border-radius: 4px;
    text-transform: uppercase;
    text-shadow: 1px 1px 0 rgba(0, 0, 0, 0.35);
  }
  .lx-a-x {
    align-self: flex-start;
    opacity: 0.5;
    padding: 2px 4px;
  }
  .lx-a-x:hover {
    opacity: 1;
    color: var(--lx-rojo);
  }
  .lx-a-campos {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 6px;
  }
  .lx-a-campos > label,
  .lx-a-movs-edit > input {
    min-width: 0;
  }
  .lx-a-campos input,
  .lx-a-campos select {
    width: 100%;
  }
  .lx-a-duelo {
    display: block;
    font-style: normal;
    font-size: 11px;
    font-weight: 600;
    opacity: 0.8;
  }
  .lx-a-movs-edit {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 5px;
  }
  .lx-a-movs-edit input {
    border-left: 6px solid var(--c);
  }
  .lx-a-link {
    align-self: flex-start;
    font-size: 12px;
    color: var(--lx-rojo);
    opacity: 0.85;
  }
  .lx-a-link:hover {
    text-decoration: underline;
  }
  .lx-a-calc {
    font-family: 'VT323', monospace;
    font-size: 18px;
    opacity: 0.6;
  }
  .lx-a-delta {
    flex-direction: row;
    align-items: center;
    gap: 8px;
    margin-left: auto;
    text-transform: none;
    font-size: 13px;
  }
  .lx-a-delta b {
    min-width: 110px;
    font-family: 'VT323', monospace;
    font-size: 18px;
  }
  .lx-a-medidores {
    display: flex;
    gap: 18px;
    align-items: center;
    flex-wrap: wrap;
  }
  .lx-a-medidores > div {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .lx-a-medidores small {
    font-size: 11px;
    text-transform: uppercase;
    opacity: 0.7;
  }
  .lx-a-veredicto {
    font-family: 'VT323', monospace;
    font-size: 22px;
  }
  .lx-a-consejos {
    display: flex;
    flex-direction: column;
    gap: 5px;
    margin: 12px 0;
  }
  .lx-a-consejos li {
    padding: 6px 10px 6px 30px;
    border-radius: 8px;
    position: relative;
    background: rgba(0, 0, 0, 0.04);
  }
  .lx-a-consejos li::before {
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
  .lx-a-tabla-envoltorio {
    overflow-x: auto;
  }
  .lx-a-tabla {
    border-collapse: separate;
    border-spacing: 4px;
    min-width: 100%;
  }
  .lx-a-tabla th {
    font-weight: normal;
    text-align: left;
    vertical-align: middle;
  }
  .lx-a-tabla thead th {
    text-align: center;
  }
  .lx-a-tabla th img {
    width: 40px;
    height: 40px;
    image-rendering: pixelated;
    display: inline-block;
  }
  .lx-a-tabla thead th span {
    display: block;
    font-family: 'VT323', monospace;
    font-size: 17px;
    line-height: 1;
  }
  .lx-a-tabla tbody th {
    display: flex;
    align-items: center;
    gap: 6px;
    min-width: 150px;
  }
  .lx-a-tabla tbody th span {
    font-family: 'VT323', monospace;
    font-size: 19px;
    line-height: 1;
    text-transform: capitalize;
  }
  .lx-a-tabla tbody th small {
    display: block;
    font-family: Inter, system-ui, sans-serif;
    font-size: 11px;
    opacity: 0.7;
    text-transform: none;
  }
  .lx-a-tabla td {
    min-width: 118px;
    padding: 6px 8px;
    border-radius: 8px;
    border: 3px solid transparent;
    vertical-align: top;
  }
  .lx-a-tabla td span {
    display: block;
    font-family: 'VT323', monospace;
    font-size: 19px;
    line-height: 1;
  }
  .lx-a-tabla td small {
    display: block;
    font-size: 11px;
    opacity: 0.75;
    margin-bottom: 3px;
  }
  .lx-c-bien {
    background: #dcfce7;
  }
  .lx-c-regular {
    background: #fef9c3;
  }
  .lx-c-flojo {
    background: #f4f4f5;
  }
  .lx-c-mal {
    background: #fee2e2;
  }
  :global(.dark) .lx-c-bien {
    background: #14532d;
  }
  :global(.dark) .lx-c-regular {
    background: #713f12;
  }
  :global(.dark) .lx-c-flojo {
    background: #27272a;
  }
  :global(.dark) .lx-c-mal {
    background: #7f1d1d;
  }
  .lx-a-mejor {
    border-color: #1b1b1f !important;
    box-shadow: 2px 2px 0 rgba(0, 0, 0, 0.3);
  }
  .lx-a-hace {
    color: #15803d;
  }
  .lx-a-recibe {
    color: #b91c1c;
  }
  :global(.dark) .lx-a-hace {
    color: #86efac;
  }
  :global(.dark) .lx-a-recibe {
    color: #fca5a5;
  }
  .lx-a-nota {
    font-size: 12px;
    opacity: 0.65;
    margin-top: 6px;
  }
  @media (max-width: 900px) {
    .lx-a-pasos {
      grid-template-columns: 1fr;
    }
    .lx-a-herramientas {
      margin-left: 0;
    }
    .lx-a-delta {
      margin-left: 0;
    }
  }
  @media (max-width: 520px) {
    .lx-a-campos {
      grid-template-columns: 1fr 1fr;
    }
    .lx-a-equipo {
      grid-template-columns: 1fr;
    }
  }
</style>
