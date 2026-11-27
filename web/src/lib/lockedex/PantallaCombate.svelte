<script>
  // Pantalla de combate contra un jefe, como el principio de un combate de GBA: el jefe arriba a la
  // derecha con sus Poké Balls, tu equipo abajo a la izquierda con sus PS y, abajo a la derecha, el cuadro
  // de órdenes (VENCIDO, DERROTA, ANALISTA, HUIR). Debajo, dos pestañas, con las reglas y el riesgo en la
  // misma barra:
  //   PLAN  → el asistente (consejos y movimientos hasta el nivel máximo)
  //   DUELO → el modo batalla: eliges tu Pokémon y el suyo y ves sus estadísticas, sus tipos y el daño
  // El VS de la tarjeta, el medidor de riesgo y «Comparar con mi equipo» abren esta misma pantalla.
  import { onMount, getContext } from 'svelte'
  import { goto } from '$app/navigation'
  import { PIcon } from '$c/core'
  import Asistente from './Asistente.svelte'
  import ModoBatalla from './ModoBatalla.svelte'
  import Riesgo from './Riesgo.svelte'
  import { equipoActual } from './equipo.js'
  import { alCambiarDatos } from './partida.js'
  import { capDelCombate } from './reglas.js'
  import { aplicarAccion } from './acciones.js'
  import { registrarDerrota, contarCaidos } from './derrotas.js'
  import { encajarIcono } from './encajar.js'
  import { ajustarGif } from './animado.js'
  import { marco, bola } from './gba.js'
  import { t, traducirNombre } from './idioma.js'

  export let boss = {} // { id, name, type, speciality, pokemon, img }
  export let jefe = null // el jefe para la calculadora (null con tipos aleatorizados)
  export let cap = null
  export let ocultarEquipo = false // jefe oculto (modo sin spoilers)
  export let ocultarPokemon = false // equipo del jefe oculto
  export let valor = ''
  export let juego = ''
  export let inicial = 'fire'
  export let pestana = 'plan'
  export let comparar = null
  export let defeated = false

  const { close } = getContext('simple-modal')

  let actual = null
  // Nivel máximo de tus reglas para este combate (el mismo que usa el plan); si no, el que trae la tarjeta
  let capRegla = null
  const cargar = async () => {
    try {
      actual = await equipoActual()
      if (actual) capRegla = (await capDelCombate(actual.partida, actual.resumen, valor).catch(() => null)) || null
    } catch (e) {
      console.error('[combate]', e)
    }
  }
  onMount(() => {
    cargar()
    return alCambiarDatos(() => setTimeout(cargar, 50))
  })
  $: miembros = actual?.eq?.miembros || []
  $: equipoVisible = miembros.slice(0, 6)
  $: deCaja = actual?.eq?.fuente === 'caja'
  $: equiposVencidos = actual?.partida?.datos?.__teams
  $: vencido = Array.isArray(equiposVencidos) ? equiposVencidos.some((x) => String(x?.id) === String(boss.id ?? valor)) : defeated

  // Pestañas: cada una se monta la primera vez que se abre y luego se queda (el plan tarda en calcularse)
  const PESTANAS = [
    ['plan', 'PLAN', 'PLAN'],
    ['duelo', 'DUELO', 'DUEL']
  ]
  if (!PESTANAS.some(([k]) => k === pestana)) pestana = comparar !== null ? 'duelo' : 'plan'
  // el plan se monta siempre: de él salen el riesgo y las reglas de la barra
  let vistas = new Set(['plan', pestana])
  let riesgo = null
  let reglasActivas = []
  const ir = (p) => {
    pestana = p
    vistas = new Set([...vistas, p])
  }

  // Escena
  const BOLA = bola()
  const BOLA_VACIA = bola({ tinta: '#505868', rojo: '#a0a8b8', blanco: '#d0d8e0' })
  $: numJefe = (jefe?.pokemon || boss?.pokemon || []).length
  $: nombreJefe = ocultarEquipo ? '???' : traducirNombre(boss?.name || jefe?.name || '')
  // Las imágenes de los jefes vienen sin extensión (la tarjeta les pone .webp o .png)
  $: imgJefe = !ocultarEquipo && boss?.img?.src ? (/\.(png|gif|webp|jpe?g)$/i.test(boss.img.src) ? boss.img.src : boss.img.src + '.png') : null
  let imgFallo = false
  const MARCOS = {
    caja: marco({ tinta: '#384050', fondo: '#f8f8e8', luz: '#ffffff', sombra: '#d0d0b8', r: 3 }),
    ordenes: marco({ tinta: '#384050', fondo: '#f8f8f8', luz: '#ffffff', sombra: '#c8d0d8', r: 3 }),
    texto: marco({ tinta: '#c84830', fondo: '#283848', luz: '#405870', sombra: '#202838', r: 3 })
  }
  const vida = (m) => (m?.psMax ? { act: Math.max(0, Math.min(m.psMax, m.ps ?? m.psMax)), max: m.psMax } : null)
  const pct = (m) => (vida(m) ? vida(m).act / vida(m).max : 1)
  const colorVida = (m) => (pct(m) > 0.5 ? 'verde' : pct(m) > 0.2 ? 'amarillo' : 'rojo')

  // Órdenes: VENCIDO y DERROTA piden confirmación con un segundo clic
  let confirmar = null
  let mensaje = ''
  let temporizador
  const pedir = (que) => {
    if (confirmar === que) return true
    confirmar = que
    clearTimeout(temporizador)
    temporizador = setTimeout(() => (confirmar = null), 3000)
    return false
  }
  const datosJefe = () => ({ id: boss.id ?? valor, name: boss.name || jefe?.name, group: boss.type, type: boss.speciality })
  const vencer = () => {
    if (!pedir('vencer')) return
    confirmar = null
    if (aplicarAccion({ tipo: 'jefe', jefe: datosJefe() })) {
      mensaje = t(`¡Has vencido a ${nombreJefe}!`, `You defeated ${nombreJefe}!`)
      setTimeout(close, 900)
    }
  }
  const quitarVencido = () => {
    aplicarAccion({ tipo: 'jefe', jefe: datosJefe(), deshacer: true })
    defeated = false
    mensaje = t('Ya no está marcado como vencido.', 'No longer marked as beaten.')
  }
  const perder = () => {
    if (!pedir('perder') || !actual?.partida) return
    confirmar = null
    const p = actual.partida
    const j = datosJefe()
    const r = registrarDerrota({
      id: p.id,
      jefe: { id: j.id, nombre: j.name, tipo: j.group },
      motivo: 'jefe',
      equipo: miembros.map((m) => m.alias || m.especie),
      caidos: contarCaidos(p.datos || {})
    })
    mensaje = r.fin
      ? t('Fin de la partida…', 'Game over…')
      : r.vidas !== null
      ? t(`Derrota apuntada. Te quedan ${r.vidas} vidas.`, `Defeat logged. ${r.vidas} lives left.`)
      : t('Derrota apuntada. Con tus reglas, la run sigue.', 'Defeat logged. With your rules the run goes on.')
    if (r.fin) setTimeout(close, 1200)
  }
  const analista = () => {
    close()
    goto(`/analista?juego=${juego}&jefe=${valor}&inicial=${inicial || 'fire'}&equipo=run`)
  }
  const caido = (e) => {
    if (aplicarAccion({ tipo: 'caido', ubicacion: e.detail.lugar })) mensaje = t(`${e.detail.nombre} se ha debilitado…`, `${e.detail.nombre} fainted…`)
  }
  $: textoOrden =
    mensaje ||
    (confirmar === 'vencer'
      ? t('¿Seguro que lo has vencido? Pulsa otra vez.', 'Sure you won? Click again.')
      : confirmar === 'perder'
      ? t('¿Seguro que has perdido? Pulsa otra vez.', 'Sure you lost? Click again.')
      : equipoVisible[0]
      ? t(`¿Qué debería hacer ${equipoVisible[0].nombre}?`, `What will ${equipoVisible[0].nombre} do?`)
      : t('¿Qué vas a hacer?', 'What will you do?'))
</script>

<div class="lx-pc">
  <!-- Escena del combate -->
  <div class="lx-pc-escena" data-lx-original>
    <button class="lx-pc-cerrar" on:click={close} title={t('Cerrar', 'Close')}>✕</button>

    <div class="lx-pc-jefe-caja" style={MARCOS.caja}>
      <b>{nombreJefe}</b>
      {#if capRegla || cap}<span class="lx-pc-nv" title={t('Nivel máximo de tus reglas para este combate', 'Your level cap for this battle')}><small>{t('Nv. máx.', 'Lv. cap')}</small>{capRegla || cap}</span>{/if}
      <span class="lx-pc-bolas" title={ocultarPokemon ? t('Equipo oculto', 'Team hidden') : t(`${numJefe} Pokémon`, `${numJefe} Pokémon`)}>
        {#each Array(6) as _, i}
          <img src={i < numJefe && !ocultarPokemon ? BOLA : BOLA_VACIA} alt="" />
        {/each}
      </span>
      {#if vencido}<span class="lx-pc-vencido">{t('VENCIDO', 'BEATEN')}</span>{/if}
    </div>
    <div class="lx-pc-jefe">
      <span class="lx-pc-peana lx-pc-peana-jefe" />
      {#if imgJefe && !imgFallo}
        <img class="lx-pc-entrenador" src={imgJefe} alt={nombreJefe} on:load={ajustarGif(160)} on:error={() => (imgFallo = true)} />
      {:else}
        <span class="lx-pc-entrenador lx-pc-silueta">?</span>
      {/if}
    </div>

    <div class="lx-pc-tuyo">
      <span class="lx-pc-peana lx-pc-peana-tuya" />
      <div class="lx-pc-equipo" style={MARCOS.caja}>
        {#if deCaja}<small class="lx-pc-nota">{t('Sin equipo: tu caja', 'No team: your box')}</small>{/if}
        {#each equipoVisible as m (m.lugar || m.nombre)}
          <div class="lx-pc-miembro">
            <span class="lx-pc-encaje" use:encajarIcono={{ nombre: m.alias || m.especie, max: 40 }}><PIcon name={m.alias || m.especie} className="lx-pc-icono lx-encajar" /></span>
            <span class="lx-pc-mnombre">{m.nombre}</span>
            <span class="lx-pc-mnv">{m.nivel ? `${t('Nv', 'Lv')}${m.nivel}` : ''}</span>
            <span class="lx-pc-ps"><i>{t('PS', 'HP')}</i><span class="lx-pc-barra lx-pc-{colorVida(m)}"><span style="width:{pct(m) * 100}%" /></span></span>
            <span class="lx-pc-psnum">{vida(m) ? `${vida(m).act}/${vida(m).max}` : ''}</span>
          </div>
        {:else}
          <small class="lx-pc-nota">{actual ? t('Tu equipo está vacío.', 'Your team is empty.') : t('Cargando tu equipo…', 'Loading your team…')}</small>
        {/each}
      </div>
    </div>

    <div class="lx-pc-ordenes-zona">
      <p class="lx-pc-texto" style={MARCOS.texto}>{textoOrden}</p>
      <div class="lx-pc-ordenes" style={MARCOS.ordenes}>
        {#if vencido}
          <button on:click={quitarVencido} title={t('Quitar la marca de vencido', 'Unmark as beaten')}>↶ {t('QUITAR', 'UNMARK')}</button>
        {:else}
          <button class:lx-pc-confirmar={confirmar === 'vencer'} on:click={vencer}>🏅 {t('VENCIDO', 'BEATEN')}</button>
        {/if}
        <button class:lx-pc-confirmar={confirmar === 'perder'} on:click={perder} disabled={vencido}>✖ {t('DERROTA', 'DEFEAT')}</button>
        <button on:click={analista} disabled={!juego || valor === ''}>{t('ANALISTA', 'ANALYST')}</button>
        <button on:click={close}>{t('HUIR', 'RUN')}</button>
      </div>
    </div>
  </div>

  <!-- Pestañas -->
  <nav class="lx-pc-pestanas" role="tablist" data-lx-original>
    {#each PESTANAS as [clave, es, en]}
      <button role="tab" aria-selected={pestana === clave} class:lx-pc-activa={pestana === clave} on:click={() => ir(clave)}>
        {pestana === clave ? '▶ ' : ''}{t(es, en)}
      </button>
    {/each}
    <span class="lx-pc-barra-extra">
      {#each reglasActivas as r}<span class="lx-pc-regla">{r}</span>{/each}
      {#if riesgo && !vencido}<span class="lx-pc-riesgo"><Riesgo nivel={riesgo.nivel} consejos={riesgo.consejos} modo={riesgo.modo} ocultarConsejos={ocultarEquipo} sinPopover /></span>{/if}
    </span>
  </nav>

  <div class="lx-pc-cuerpo">
    {#if vistas.has('plan')}
      <div class:hidden={pestana !== 'plan'}>
        {#if jefe}
          <Asistente incrustado bind:riesgo bind:reglasActivas {jefe} {cap} ocultarEquipo={ocultarEquipo} {valor} {juego} {inicial} />
        {:else}
          <p class="lx-pc-aviso">{t('Con tipos aleatorizados no se puede calcular el plan.', 'The plan cannot be calculated with randomized types.')}</p>
        {/if}
      </div>
    {/if}
    {#if vistas.has('duelo')}
      <div class:hidden={pestana !== 'duelo'} class="lx-pc-duelo">
        {#if !jefe}
          <p class="lx-pc-aviso">{t('Con tipos aleatorizados no se puede calcular el daño.', 'Damage cannot be calculated with randomized types.')}</p>
        {:else if ocultarPokemon}
          <p class="lx-pc-aviso">{t('Revela el equipo del jefe para usar el duelo.', "Reveal the boss's team to use the duel.")}</p>
        {:else if !actual}
          <p class="lx-pc-aviso">{t('Preparando la calculadora…', 'Setting up the calculator…')}</p>
        {:else if !miembros.length}
          <p class="lx-pc-aviso">{t('Añade Pokémon a tu equipo para usar el duelo.', 'Add Pokémon to your team to use the duel.')}</p>
        {:else}
          <ModoBatalla conStats suInicial={comparar ?? 0} {jefe} equipo={miembros} gen={actual.partida.info.gen} {cap} grupo={actual.partida.info.grupo} on:caido={caido} />
        {/if}
      </div>
    {/if}
  </div>
</div>

<style>
  .lx-pc {
    position: relative;
    left: 50%;
    transform: translateX(-50%);
    width: min(940px, calc(100vw - 32px));
    border: 4px solid #283850;
    border-radius: 10px;
    overflow: hidden;
    background: var(--lx-panel);
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.45);
  }

  /* Escena: cielo claro, suelo de hierba y dos peanas, como el fondo de combate de la 3.ª gen */
  .lx-pc-escena {
    position: relative;
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    grid-template-rows: auto auto;
    gap: 6px 16px;
    min-height: 250px;
    padding: 10px 16px 10px;
    background: linear-gradient(180deg, #f8f8e0 0 42%, #d8eca8 42% 44%, #b8dc88 44%);
    font-family: 'LX Pixel', 'VT323', monospace;
    -webkit-font-smoothing: none;
    color: #303848;
  }
  .lx-pc-cerrar {
    position: absolute;
    top: 6px;
    right: 8px;
    z-index: 2;
    width: 28px;
    height: 28px;
    border-radius: 6px;
    background: rgba(255, 255, 255, 0.7);
    color: #303848;
    font-size: 16px;
  }
  .lx-pc-jefe-caja {
    align-self: start;
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 2px 10px;
    margin-top: 8px;
    padding: 4px 12px 6px;
    background: #f8f8e8;
  }
  .lx-pc-jefe-caja b {
    font-size: 24px;
    line-height: 28px;
    font-weight: normal;
    text-transform: uppercase;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .lx-pc-nv {
    font-size: 24px;
    line-height: 28px;
  }
  .lx-pc-nv small {
    font-size: 12px;
    margin-right: 3px;
  }
  .lx-pc-bolas {
    grid-column: 1 / -1;
    display: flex;
    gap: 4px;
    padding: 3px 6px;
    border-radius: 4px;
    background: #404858;
    width: max-content;
  }
  .lx-pc-bolas img {
    width: 18px;
    height: 18px;
    image-rendering: pixelated;
  }
  .lx-pc-vencido {
    grid-column: 1 / -1;
    justify-self: start;
    padding: 0 6px;
    border-radius: 3px;
    background: #c89820;
    color: #fff;
    font-size: 12px;
    line-height: 16px;
  }
  .lx-pc-jefe {
    position: relative;
    display: flex;
    justify-content: center;
    align-items: flex-end;
    min-height: 110px;
  }
  .lx-pc-peana {
    position: absolute;
    border-radius: 50%;
    background: radial-gradient(ellipse at center, #a8d078 0 55%, #88b860 56% 70%, transparent 71%);
  }
  .lx-pc-peana-jefe {
    bottom: -4px;
    width: 240px;
    height: 54px;
  }
  .lx-pc-entrenador {
    position: relative;
    image-rendering: pixelated;
  }
  .lx-pc-silueta {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 80px;
    height: 110px;
    border-radius: 40px 40px 8px 8px;
    background: rgba(40, 56, 80, 0.75);
    color: #f8f8f8;
    font-size: 48px;
  }
  .lx-pc-tuyo {
    position: relative;
    grid-row: 2;
  }
  .lx-pc-peana-tuya {
    left: -30px;
    bottom: -26px;
    width: 300px;
    height: 70px;
  }
  .lx-pc-equipo {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: 1px;
    padding: 4px 10px;
    background: #f8f8e8;
  }
  .lx-pc-miembro {
    display: grid;
    grid-template-columns: 34px minmax(0, 1fr) 40px auto 54px;
    align-items: center;
    gap: 4px;
    height: 24px;
  }
  .lx-pc-encaje {
    display: contents;
  }
  .lx-pc-miembro :global(.lx-pc-icono) {
    justify-self: center;
    align-self: center;
    max-height: 24px;
    overflow: visible;
    transform: translateY(-9px);
  }
  .lx-pc-mnombre {
    font-size: 18px;
    line-height: 20px;
    text-transform: uppercase;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .lx-pc-mnv,
  .lx-pc-psnum {
    font-size: 18px;
    line-height: 20px;
    text-align: right;
  }
  .lx-pc-ps {
    display: inline-flex;
    align-items: center;
    padding: 2px 3px;
    border-radius: 3px;
    background: #404858;
  }
  .lx-pc-ps i {
    font-style: normal;
    font-size: 12px;
    line-height: 12px;
    color: #f8d030;
    margin-right: 3px;
  }
  .lx-pc-barra {
    display: block;
    width: 72px;
    height: 6px;
    background: #506070;
    border: 1px solid #f8f8f8;
  }
  .lx-pc-barra span {
    display: block;
    height: 100%;
    background: #70f8a8;
    box-shadow: inset 0 -2px 0 #58d080;
  }
  .lx-pc-amarillo span {
    background: #f8e038;
    box-shadow: inset 0 -2px 0 #c8a808;
  }
  .lx-pc-rojo span {
    background: #f85838;
    box-shadow: inset 0 -2px 0 #a84048;
  }
  .lx-pc-nota {
    font-size: 12px;
    line-height: 16px;
    opacity: 0.75;
  }

  /* Cuadro de texto y órdenes (LUCHAR / MOCHILA / POKéMON / HUIR en el juego) */
  .lx-pc-ordenes-zona {
    grid-row: 2;
    align-self: end;
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 6px;
    align-items: stretch;
  }
  .lx-pc-texto {
    display: flex;
    align-items: center;
    padding: 4px 10px;
    background: #283848;
    color: #f8f8f8;
    font-size: 18px;
    line-height: 22px;
  }
  .lx-pc-ordenes {
    display: grid;
    grid-template-columns: auto auto;
    gap: 2px 12px;
    padding: 4px 10px;
    background: #f8f8f8;
  }
  .lx-pc-ordenes button {
    padding: 0 4px;
    text-align: left;
    font-size: 18px;
    line-height: 24px;
    color: #303848;
    white-space: nowrap;
  }
  .lx-pc-ordenes button:hover:not(:disabled) {
    color: #d04020;
  }
  .lx-pc-ordenes button:hover:not(:disabled)::before {
    content: '▶';
    margin-left: -12px;
    margin-right: 2px;
    font-size: 12px;
  }
  .lx-pc-ordenes button:disabled {
    opacity: 0.35;
  }
  .lx-pc-confirmar {
    color: #d04020 !important;
    animation: lx-pc-parpadeo 0.6s steps(2) infinite;
  }
  @keyframes lx-pc-parpadeo {
    50% {
      opacity: 0.4;
    }
  }
  @media (max-width: 760px) {
    .lx-pc-escena {
      grid-template-columns: minmax(0, 1fr);
    }
    .lx-pc-jefe {
      display: none;
    }
    .lx-pc-tuyo,
    .lx-pc-ordenes-zona {
      grid-row: auto;
    }
  }

  /* Pestañas */
  .lx-pc-pestanas {
    display: flex;
    align-items: flex-end;
    gap: 4px;
    padding: 6px 10px 0;
    background: #283850;
    font-family: 'LX Pixel', 'VT323', monospace;
    -webkit-font-smoothing: none;
  }
  .lx-pc-pestanas button {
    padding: 4px 16px 2px;
    border-radius: 6px 6px 0 0;
    background: #3c5070;
    color: #c8d4e8;
    font-size: 24px;
    line-height: 28px;
  }
  .lx-pc-pestanas button:hover {
    color: #fff;
  }
  .lx-pc-pestanas .lx-pc-activa {
    background: var(--lx-panel);
    color: var(--lx-texto);
  }
  .lx-pc-cuerpo {
    max-height: calc(100vh - 420px);
    min-height: 220px;
    overflow-y: auto;
    padding: 12px;
  }
  .lx-pc-aviso {
    padding: 24px;
    text-align: center;
    opacity: 0.8;
  }
  /* El asistente y el análisis heredado traen su propio marco de ventana: aquí van planos */
  .lx-pc-cuerpo :global(.lx-asistente) {
    width: 100%;
    max-width: none;
    margin: 0;
    box-shadow: none;
    border: 0;
  }
  .lx-pc-barra-extra {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: flex-end;
    gap: 6px;
    margin-left: auto;
    padding-bottom: 4px;
    font-family: system-ui, sans-serif;
    -webkit-font-smoothing: auto;
  }
  .lx-pc-regla {
    padding: 1px 8px;
    border-radius: 999px;
    background: #3c5070;
    color: #e8eef8;
    font-size: 11px;
    line-height: 18px;
    white-space: nowrap;
  }
  .lx-pc-riesgo {
    display: inline-flex;
  }
</style>
