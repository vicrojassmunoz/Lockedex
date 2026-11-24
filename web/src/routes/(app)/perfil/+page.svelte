<script>
  // Perfil de entrenador: foto, estadísticas de todas tus runs y logros
  import { onMount } from 'svelte'
  import avatares from '$lib/lockedex/avatares.js'
  import Games from '$lib/data/games.json'
  import { leerPartidas, leerPartida, cargarRutas, resumirPartida } from '$lib/lockedex/partida.js'
  import { idioma } from '$lib/lockedex/idioma.js'

  const es = idioma() === 'es'
  const CLAVE = 'lockedex.perfil'

  let perfil = { nombre: '', avatar: 'rs-may', lema: '' }
  let eligiendo = false
  let runs = []
  let est = null
  let cargando = true

  const guardar = () => localStorage.setItem(CLAVE, JSON.stringify(perfil))
  const img = (id) => `/assets/img/leaders/${id}.png`

  onMount(async () => {
    try {
      perfil = { ...perfil, ...(JSON.parse(localStorage.getItem(CLAVE) || '{}') || {}) }
    } catch {}

    try {
      await calcular()
    } catch (e) {
      console.error('[perfil] no se pudieron calcular las estadísticas', e)
      fallo = true
    } finally {
      cargando = false
    }
  })

  let fallo = false
  const calcular = async () => {
    const lista = leerPartidas()
    // Cada run por separado: si una falla, se salta y el resto se muestra
    const resultados = await Promise.all(
      lista.map(async (p) => {
        try {
          const completa = leerPartida(p.id)
          if (!completa) return null
          const rutas = await cargarRutas(completa?.info?.lid)
          return { ...completa, resumen: resumirPartida(completa, Array.isArray(rutas) ? rutas : []) }
        } catch (e) {
          console.error('[perfil] run ignorada', p.id, e)
          return null
        }
      })
    )
    runs = resultados.filter(Boolean)
    runs.sort((a, b) => b.actualizada - a.actualizada)

    const muertes = runs.flatMap((r) => r.resumen.muertos.map((m) => ({ ...m, run: r })))
    const asesinos = {}
    for (const m of muertes) {
      const d = m.death || {}
      let quien = null
      if (d.tab === 'boss') quien = d.result?.name || d.result?.boss || (typeof d.result === 'string' ? d.result : null)
      else if (d.tab === 'trainer') quien = es ? 'Entrenadores' : 'Trainers'
      else if (d.tab === 'encounter') quien = es ? 'Pokémon salvajes' : 'Wild Pokémon'
      if (quien) asesinos[quien] = (asesinos[quien] || 0) + 1
    }
    const topAsesino = Object.entries(asesinos).sort((a, b) => b[1] - a[1])[0]
    const capturas = runs.reduce((a, r) => a + r.resumen.encuentros.filter((e) => [1, 2, 3, 5, 6].includes(+e.status)).length, 0)
    const muertos = muertes.length
    const completadas = runs.filter((r) => r.resumen.campeon).length
    const medallas = runs.reduce((a, r) => a + r.resumen.medallas, 0)
    const intentos = runs.reduce((a, r) => a + (r.intentos || 1), 0)
    const sinMuertes = runs.some((r) => r.resumen.campeon && !r.resumen.muertos.length)
    const juegos = new Set(runs.map((r) => r.info?.titulo)).size

    est = {
      runs: runs.length,
      completadas,
      capturas,
      muertos,
      supervivencia: capturas ? Math.round(((capturas - muertos) / capturas) * 100) : 0,
      medallas,
      intentos,
      topAsesino,
      juegos,
      logros: [
        { ok: runs.length >= 1, icono: '◓', es: 'Primeros pasos', en: 'First steps', d: es ? 'Empieza tu primera run' : 'Start your first run' },
        { ok: medallas >= 8, icono: '✪', es: 'Coleccionista', en: 'Collector', d: es ? 'Consigue 8 medallas en total' : 'Earn 8 badges in total' },
        { ok: completadas >= 1, icono: '♛', es: 'Campeón', en: 'Champion', d: es ? 'Completa una run' : 'Complete a run' },
        { ok: sinMuertes, icono: '✦', es: 'Intocable', en: 'Untouchable', d: es ? 'Gana una run sin muertes' : 'Win a run with no deaths' },
        { ok: capturas >= 100, icono: '◎', es: 'Pokédex andante', en: 'Walking Pokédex', d: es ? 'Captura 100 Pokémon' : 'Catch 100 Pokémon' },
        { ok: juegos >= 3, icono: '✈', es: 'Trotamundos', en: 'Globetrotter', d: es ? 'Juega en 3 juegos distintos' : 'Play 3 different games' },
        { ok: intentos >= 10, icono: '↻', es: 'Cabezota', en: 'Stubborn', d: es ? 'Suma 10 intentos' : 'Reach 10 attempts' },
        { ok: muertos >= 50, icono: '☠', es: 'Sepulturero', en: 'Gravedigger', d: es ? '50 Pokémon en el cementerio' : '50 Pokémon in the graveyard' }
      ]
    }
  }

  const elegir = (id) => {
    perfil.avatar = id
    guardar()
    eligiendo = false
  }
  const nombreAvatar = (id) => avatares.flatMap((g) => g.avatares).find((a) => a.id === id)?.nombre || ''
</script>

<svelte:head>
  <title>Lockedex | {es ? 'Perfil' : 'Profile'}</title>
</svelte:head>

<main class="lx-perfil" data-lx-original>
  <section class="lx-tarjeta">
    <button class="lx-foto" on:click={() => (eligiendo = !eligiendo)} title={es ? 'Cambiar foto' : 'Change picture'}>
      <img src={img(perfil.avatar)} alt={nombreAvatar(perfil.avatar)} />
      <span>{es ? 'CAMBIAR' : 'CHANGE'}</span>
    </button>
    <div class="lx-datos">
      <small>{es ? 'FICHA DE ENTRENADOR' : 'TRAINER CARD'}</small>
      <input class="lx-nombre" bind:value={perfil.nombre} on:change={guardar} placeholder={es ? 'Tu nombre' : 'Your name'} maxlength="16" />
      <input class="lx-lema" bind:value={perfil.lema} on:change={guardar} placeholder={es ? 'Tu frase de entrenador…' : 'Your trainer motto…'} maxlength="60" />
      {#if est}
        <div class="lx-medallero">
          <span><b>{est.medallas}</b>{es ? 'medallas' : 'badges'}</span>
          <span><b>{est.completadas}</b>{es ? 'ligas ganadas' : 'leagues won'}</span>
          <span><b>{est.runs}</b>runs</span>
        </div>
      {/if}
    </div>
  </section>

  {#if eligiendo}
    <section class="lx-panel">
      <h2>{es ? 'Elige tu foto' : 'Pick your picture'}</h2>
      {#each avatares as g}
        <h3>{g.region}</h3>
        <div class="lx-rejilla">
          {#each g.avatares as a}
            <button class:lx-sel={a.id === perfil.avatar} on:click={() => elegir(a.id)} title={a.nombre}>
              <img src={img(a.id)} alt={a.nombre} loading="lazy" />
              <span>{a.nombre}</span>
            </button>
          {/each}
        </div>
      {/each}
    </section>
  {/if}

  {#if cargando}
    <p class="lx-cargando">{es ? 'Calculando estadísticas…' : 'Crunching stats…'}</p>
  {:else if fallo}
    <p class="lx-cargando">{es ? 'No se pudieron calcular las estadísticas. El detalle queda en Menú → Abrir registro de errores.' : 'Could not compute stats. Details in Menu → Open error log.'}</p>
  {:else if est}
    <section class="lx-stats">
      <div><b>{est.capturas}</b><span>{es ? 'Pokémon capturados' : 'Pokémon caught'}</span></div>
      <div><b>{est.muertos}</b><span>{es ? 'en el cementerio' : 'in the graveyard'}</span></div>
      <div><b>{est.supervivencia}%</b><span>{es ? 'supervivencia' : 'survival rate'}</span></div>
      <div><b>{est.intentos}</b><span>{es ? 'intentos en total' : 'total attempts'}</span></div>
      <div class="lx-asesino">
        <b>{est.topAsesino ? est.topAsesino[0] : '—'}</b>
        <span>{es ? 'tu mayor verdugo' : 'your nemesis'}{est.topAsesino ? ` (${est.topAsesino[1]})` : ''}</span>
      </div>
    </section>

    <section class="lx-panel">
      <h2>{es ? 'Logros' : 'Achievements'}</h2>
      <div class="lx-logros">
        {#each est.logros as l}
          <div class:lx-conseguido={l.ok} title={l.d}>
            <i>{l.icono}</i>
            <b>{es ? l.es : l.en}</b>
            <span>{l.d}</span>
          </div>
        {/each}
      </div>
    </section>

    <section class="lx-panel">
      <h2>{es ? 'Tus runs' : 'Your runs'}</h2>
      {#if !runs.length}
        <p>{es ? 'Todavía no tienes ninguna run. ¡Empieza una desde Inicio!' : 'No runs yet. Start one from Home!'}</p>
      {/if}
      <div class="lx-runs">
        {#each runs as r}
          <div class="lx-run">
            {#if Games[r.juego]?.logo}
              <img class="lx-run-logo" src="/assets/img/logos/{Games[r.juego].logo}-small.png" alt="" />
            {/if}
            <div class="lx-run-info">
              <b>{r.nombre || r.info?.titulo}</b>
              <span>{r.info?.titulo || r.juego} · {es ? 'intento' : 'attempt'} {r.intentos}{r.resumen.campeon ? (es ? ' · ¡Campeón!' : ' · Champion!') : ''}</span>
            </div>
            <div class="lx-run-exp">
              <span class="lx-pista"><i style="width:{Math.round(r.resumen.progreso * 100)}%" /></span>
              <small>EXP {Math.round(r.resumen.progreso * 100)}% · {r.resumen.medallas}/{r.resumen.totalMedallas} {es ? 'medallas' : 'badges'} · ☠ {r.resumen.muertos.length}</small>
            </div>
          </div>
        {/each}
      </div>
    </section>
  {/if}
</main>

<style>
  .lx-perfil {
    max-width: 1000px;
    margin: 0 auto;
    padding: 24px 20px 190px;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  .lx-tarjeta {
    display: flex;
    gap: 22px;
    align-items: center;
    padding: 18px 22px;
    border-radius: 18px;
    border: 4px solid #1b1b1f;
    background: linear-gradient(135deg, #ff3355 0%, #dc0a2d 55%, #a8081f 100%);
    color: #fff;
    box-shadow: 6px 6px 0 rgba(0, 0, 0, 0.25);
    position: relative;
    overflow: hidden;
  }
  .lx-tarjeta::after {
    content: '';
    position: absolute;
    right: -60px;
    top: -60px;
    width: 220px;
    height: 220px;
    border-radius: 50%;
    border: 26px solid rgba(255, 255, 255, 0.08);
  }
  .lx-foto {
    position: relative;
    flex: none;
    width: 150px;
    height: 150px;
    border-radius: 14px;
    background: #cfe9f5;
    background-image: radial-gradient(circle at 50% 120%, #9fd3ea 0 45%, transparent 46%);
    border: 4px solid #1b1b1f;
    box-shadow: inset 0 0 0 4px #fff;
    display: grid;
    place-items: center;
    overflow: hidden;
  }
  .lx-foto img {
    width: 130px;
    height: 130px;
    object-fit: contain;
    image-rendering: pixelated;
  }
  .lx-foto span {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    font-family: 'VT323', monospace;
    font-size: 16px;
    background: rgba(0, 0, 0, 0.6);
    opacity: 0;
    transition: opacity 0.15s;
  }
  .lx-foto:hover span {
    opacity: 1;
  }
  .lx-datos {
    display: flex;
    flex-direction: column;
    gap: 4px;
    flex: 1;
    z-index: 1;
  }
  .lx-datos small {
    font-family: 'VT323', monospace;
    font-size: 18px;
    letter-spacing: 3px;
    opacity: 0.85;
  }
  .lx-nombre,
  .lx-lema {
    background: transparent;
    border: 0;
    color: #fff;
    outline: none;
  }
  .lx-nombre {
    font-family: 'VT323', monospace;
    font-size: 48px;
    line-height: 1;
    text-shadow: 3px 3px 0 #8b0a1e;
  }
  .lx-lema {
    font-size: 15px;
    opacity: 0.9;
  }
  .lx-nombre::placeholder,
  .lx-lema::placeholder {
    color: rgba(255, 255, 255, 0.6);
  }
  .lx-medallero {
    display: flex;
    gap: 10px;
    margin-top: 8px;
  }
  .lx-medallero span {
    background: #1b1b1f;
    border-radius: 8px;
    padding: 4px 12px;
    font-family: 'VT323', monospace;
    font-size: 18px;
    color: #c9c9d1;
  }
  .lx-medallero b {
    color: #ffcb05;
    font-size: 26px;
    margin-right: 6px;
  }
  .lx-panel {
    background: #fff;
    border: 3px solid #1b1b1f;
    border-radius: 14px;
    padding: 16px 18px;
    box-shadow: 4px 4px 0 rgba(0, 0, 0, 0.15);
  }
  :global(.dark) .lx-panel {
    background: #111827;
    border-color: #0b1118;
  }
  h2 {
    font-family: 'VT323', monospace;
    font-size: 30px;
    margin-bottom: 8px;
  }
  h3 {
    font-family: 'VT323', monospace;
    font-size: 20px;
    margin: 10px 0 4px;
    opacity: 0.7;
  }
  .lx-rejilla {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(92px, 1fr));
    gap: 6px;
  }
  .lx-rejilla button {
    display: flex;
    flex-direction: column;
    align-items: center;
    border-radius: 10px;
    border: 2px solid transparent;
    padding: 4px 2px;
  }
  .lx-rejilla button:hover {
    background: rgba(220, 10, 45, 0.08);
  }
  .lx-rejilla .lx-sel {
    border-color: #dc0a2d;
    background: rgba(220, 10, 45, 0.12);
  }
  .lx-rejilla img {
    width: 80px;
    height: 64px;
    object-fit: contain;
    image-rendering: pixelated;
  }
  .lx-rejilla span {
    font-size: 11px;
    text-align: center;
    line-height: 1.1;
  }
  .lx-cargando {
    opacity: 0.6;
  }
  .lx-stats {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 10px;
  }
  .lx-stats div {
    background: #1b1b1f;
    color: #fff;
    border-radius: 12px;
    padding: 12px;
    display: flex;
    flex-direction: column;
    box-shadow: inset 0 0 0 2px #000;
  }
  .lx-stats b {
    font-family: 'VT323', monospace;
    font-size: 40px;
    line-height: 1;
    color: #ffcb05;
  }
  .lx-stats span {
    font-size: 12px;
    opacity: 0.75;
  }
  .lx-asesino b {
    font-size: 26px !important;
    color: #ff5a6e !important;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .lx-logros {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;
  }
  .lx-logros div {
    border: 2px dashed rgba(0, 0, 0, 0.2);
    border-radius: 12px;
    padding: 10px;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    filter: grayscale(1);
    opacity: 0.5;
  }
  .lx-logros .lx-conseguido {
    filter: none;
    opacity: 1;
    border: 2px solid #1b1b1f;
    background: linear-gradient(180deg, #fff7d1, #ffe680);
    color: #1b1b1f;
  }
  .lx-logros i {
    font-style: normal;
    font-size: 30px;
    line-height: 1;
  }
  .lx-logros b {
    font-family: 'VT323', monospace;
    font-size: 20px;
  }
  .lx-logros span {
    font-size: 11px;
    opacity: 0.75;
  }
  .lx-runs {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .lx-run {
    display: flex;
    gap: 14px;
    align-items: center;
    padding: 8px 12px;
    border-radius: 10px;
    background: rgba(0, 0, 0, 0.04);
  }
  .lx-run-logo {
    width: 72px;
    height: 36px;
    object-fit: contain;
  }
  .lx-run-info {
    flex: 1;
    display: flex;
    flex-direction: column;
  }
  .lx-run-info b {
    font-family: 'VT323', monospace;
    font-size: 24px;
    line-height: 1;
  }
  .lx-run-info span {
    font-size: 12px;
    opacity: 0.7;
  }
  .lx-run-exp {
    width: 300px;
    display: flex;
    flex-direction: column;
    gap: 3px;
  }
  .lx-pista {
    height: 10px;
    border-radius: 5px;
    background: #3a3a42;
    border: 2px solid #1b1b1f;
    overflow: hidden;
  }
  .lx-pista i {
    display: block;
    height: 100%;
    background: linear-gradient(180deg, #8ee8ff, #3cc4f0 55%, #1e9ad0);
  }
  .lx-run-exp small {
    font-family: 'VT323', monospace;
    font-size: 16px;
  }
  @media (max-width: 800px) {
    .lx-stats,
    .lx-logros {
      grid-template-columns: repeat(2, 1fr);
    }
    .lx-run-exp {
      width: 160px;
    }
  }
</style>
