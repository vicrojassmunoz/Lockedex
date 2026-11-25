<script>
  // Modo compacto: ventanita siempre encima para tener a mano tu run mientras juegas
  import { onMount } from 'svelte'
  import { partidaActiva, cargarRutas, cargarLiga, resumirPartida, nivelMaximo, alCambiarDatos } from '$lib/lockedex/partida.js'
  import { equipoCompleto } from '$lib/lockedex/equipo.js'
  import { calcularRiesgo } from '$lib/lockedex/riesgo.js'
  import Riesgo from '$lib/lockedex/Riesgo.svelte'
  import { leerReglas } from '$lib/lockedex/reglas.js'
  import { leerEquiposJefes, comoJefe } from '$lib/lockedex/jefes.js'
  import { cargarCalc } from '$lib/lockedex/analista.js'
  import { idioma, iniciarTraduccion, traducirNombre } from '$lib/lockedex/idioma.js'
  import { COLOR_TIPO } from '$lib/lockedex/colores.js'
  import { nombreJuego } from '$lib/lockedex/juegos.js'

  const es = idioma() === 'es'
  let partida = null
  let resumen = null
  let miembros = []
  let jefe = null
  let jefeVisto = null // value del jefe elegido con las flechas; null = seguir al próximo
  let ligaActual = null
  let equipoActual = []
  let datosJefe = null
  let cap = null
  let aleatorio = false
  let capGimnasio = null // jefe del que sale el nivel máximo (el próximo líder de gimnasio)
  let riesgo = null
  let spoilers = 0

  const sprite = (m) => (m.imgId ? `/assets/img/pokemon/base-${m.imgId}.png` : '/assets/img/pokemon/base-201-question.png')

  const actualizar = async () => {
    // Relee siempre lo último guardado por la ventana principal
    partida = partidaActiva()
    if (!partida?.info) return
    spoilers = +((partida.ajustes || '')[8] || 0) || 0
    const rutas = await cargarRutas(partida.info.lid)
    resumen = resumirPartida(partida, rutas)
    const eq = await equipoCompleto(partida, resumen)
    miembros = eq.miembros.slice(0, 6)
    equipoActual = eq.miembros
    ligaActual = await cargarLiga(partida.juego, partida.datos.__starter || 'fire')
    await mostrarJefe()
  }

  // Jefe que se enseña: el próximo, o el elegido con ◀ ▶
  const mostrarJefe = async () => {
    const lista = resumen?.jefes || []
    jefe = (jefeVisto !== null && lista.find((j) => String(j.value) === String(jefeVisto))) || resumen?.siguienteJefe || lista[lista.length - 1] || null
    datosJefe = null
    cap = null
    riesgo = null
    if (!jefe) return
    const visto = jefe.value
    const datos = ligaActual?.[jefe.value] || null
    // El nivel máximo de un Nuzlocke lo marca el próximo líder de gimnasio (o el Alto Mando al final),
    // aunque el jefe que se vea sea un rival o un equipo malvado
    const desde = lista.findIndex((j) => String(j.value) === String(jefe.value))
    const resto = lista.slice(Math.max(0, desde))
    const gimnasio = resto.find((j) => j.group === 'gym-leader') || resto.find((j) => j.group === 'elite-four') || jefe
    const nivel = nivelMaximo(ligaActual?.[gimnasio.value]) ?? nivelMaximo(datos)
    // Randomlocke con entrenadores aleatorios: el equipo de la liga no vale. El riesgo sale solo si se ha
    // apuntado el equipo real del jefe; si no, se enseña el jefe y su nivel máximo, sin equipo
    const reglas = leerReglas(partida.id) || {}
    aleatorio = !!(reglas.randomlocke && reglas.entrenadoresAleatorios)
    let paraRiesgo = datos
    if (aleatorio) {
      const real = leerEquiposJefes(partida.id)[jefe.value]
      paraRiesgo = real?.length ? comoJefe(jefe.boss || jefe.name, real, await cargarCalc(partida.info.gen || 9)) : null
    }
    const r = paraRiesgo ? await calcularRiesgo({ jefe: paraRiesgo, equipo: equipoActual, gen: partida.info.gen, cap: nivel }) : null
    if (jefe?.value !== visto) return // se cambió de jefe mientras se calculaba
    datosJefe = datos
    cap = nivel
    capGimnasio = gimnasio
    riesgo = r
  }
  $: listaJefes = resumen?.jefes || []
  $: posJefe = jefe ? listaJefes.findIndex((j) => String(j.value) === String(jefe.value)) : -1
  $: esProximo = jefe && resumen?.siguienteJefe && String(jefe.value) === String(resumen.siguienteJefe.value)
  const moverJefe = (d) => {
    const i = posJefe + d
    if (i < 0 || i >= listaJefes.length) return
    jefeVisto = listaJefes[i].value
    confirmarJefe = false
    mostrarJefe()
  }
  const volverAlProximo = () => {
    jefeVisto = null
    mostrarJefe()
  }

  onMount(() => {
    document.documentElement.classList.add('lx-compacto')
    iniciarTraduccion().then(actualizar)
    const quitar = alCambiarDatos(actualizar)
    const reloj = setInterval(actualizar, 20000)
    return () => {
      quitar()
      clearInterval(reloj)
    }
  })

  const abrirPrincipal = () => window.lockedex?.accion('principal')

  // --- Acciones rápidas -------------------------------------------------------
  // Se envían a la ventana principal, que es la que guarda; al guardar, esta ventana se refresca sola.
  const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[^a-z0-9]/g, '')
  const capitalizar = (s) => String(s || '').replace(/(^|[-\s])([a-z])/g, (m, a, b) => a + b.toUpperCase())
  let zonaSel = ''
  let especieTexto = ''
  let aviso = ''
  let confirmar = null
  let temporizador

  $: ocultas = partida?.datos?.__hidden || []
  $: pendientes = (resumen?.lugares || []).filter((l) => !l.encuentro?.pokemon && !l.encuentro?.status && !ocultas.includes(l.name))
  $: if (pendientes.length && !pendientes.some((z) => z.name === zonaSel)) zonaSel = pendientes[0].name
  $: zona = pendientes.find((z) => z.name === zonaSel)
  $: opciones = (zona?.encounters || []).map((slug) => ({ slug, nombre: traducirNombre(capitalizar(slug)) }))
  $: especie = opciones.find((o) => norm(o.nombre) === norm(especieTexto) || norm(o.slug) === norm(especieTexto))

  const avisar = (texto) => {
    aviso = texto
    clearTimeout(temporizador)
    temporizador = setTimeout(() => (aviso = ''), 3500)
  }
  const enviar = async (accion) => {
    const r = await window.lockedex?.accionPartida?.({ partida: partida.id, ...accion })
    if (!r?.ok) avisar(es ? 'Abre la ventana principal de Lockedex para guardar.' : 'Open the main Lockedex window to save.')
    return r?.ok
  }
  const apuntar = async (estado) => {
    if (!zona) return
    if (!especie) return avisar(es ? 'Elige un Pokémon de la lista de esta zona.' : 'Pick a Pokémon from this area.')
    const ok = await enviar({ tipo: 'encuentro', ubicacion: zona.name, idRuta: zona.indice, pokemon: especie.slug, estado })
    if (ok) {
      avisar(`${estado === 4 ? '✕' : '◓'} ${especie.nombre} · ${traducirNombre(zona.name)}`)
      especieTexto = ''
    }
  }
  // Jefe vencido (con confirmación) y deshacer el último
  // Marcar como vencido (con confirmación) o quitar la marca del jefe que se está viendo
  let confirmarJefe = false
  const datosMarca = () => ({ id: jefe.value, name: datosJefe?.name || jefe.boss || jefe.name, group: jefe.group, type: datosJefe?.speciality })
  const vencer = async () => {
    if (!jefe) return
    if (!confirmarJefe) {
      confirmarJefe = true
      setTimeout(() => (confirmarJefe = false), 3000)
      return
    }
    confirmarJefe = false
    const j = datosMarca()
    if (await enviar({ tipo: 'jefe', jefe: j })) avisar(`🏅 ${j.name}`)
  }
  const deshacerJefe = async () => {
    if (!jefe?.derrotado) return
    const j = datosMarca()
    if (await enviar({ tipo: 'jefe', jefe: j, deshacer: true })) avisar(es ? `Ya no está vencido: ${j.name}` : `Unmarked: ${j.name}`)
  }

  const caido = async (m) => {
    if (confirmar !== m.lugar) {
      confirmar = m.lugar
      setTimeout(() => confirmar === m.lugar && (confirmar = null), 3000)
      return
    }
    confirmar = null
    if (await enviar({ tipo: 'caido', ubicacion: m.lugar })) avisar(`☠ ${m.nombre}`)
  }
  $: porcentaje = Math.round((resumen?.progreso || 0) * 100)
  $: ocultoJefe = spoilers >= 2
  $: srcJefe = typeof datosJefe?.img === 'string' ? datosJefe.img : datosJefe?.img?.src
  $: imgJefe = srcJefe?.startsWith('/leaders/') ? `/assets/img${srcJefe}.png` : srcJefe?.startsWith('http') ? srcJefe : null
</script>

<svelte:head><title>Lockedex · compacto</title></svelte:head>

<div class="lx-mini" data-lx-original>
  <header>
    <img class="lx-mini-icono" src="/lx/icono.svg" alt="" width="22" height="22" />
    <b>LOCKEDEX</b>
  </header>

  {#if !partida}
    <p class="lx-mini-vacio">{es ? 'Abre o crea una partida en Lockedex.' : 'Open or create a run in Lockedex.'}</p>
  {:else if resumen}
    <section class="lx-mini-run">
      <div class="lx-mini-titulo">
        <span>{partida.nombre || partida.info.titulo}</span>
        <small>{nombreJuego(partida.juego, { title: partida.info.titulo })}</small>
      </div>
      <div class="lx-mini-exp">
        <span class="lx-med">{resumen.medallas}<small>/{resumen.totalMedallas}</small></span>
        <span class="lx-pista"><i style="width:{porcentaje}%" /></span>
        <span class="lx-pct">{porcentaje}%</span>
      </div>
      <div class="lx-mini-cont">
        <span>◓ {resumen.vivos.length} {es ? 'vivos' : 'alive'}</span>
        <span>☠ {resumen.muertos.length}</span>
        <span>✕ {resumen.fallidos.length} {es ? 'fallidos' : 'missed'}</span>
      </div>
    </section>

    {#if pendientes.length}
      <section class="lx-mini-apuntar">
        <small>{es ? 'APUNTAR ENCUENTRO' : 'LOG ENCOUNTER'}</small>
        <select bind:value={zonaSel} aria-label={es ? 'Zona' : 'Area'}>
          {#each pendientes.slice(0, 15) as z}
            <option value={z.name}>{traducirNombre(z.name)}</option>
          {/each}
        </select>
        <input
          list="lx-mini-especies"
          bind:value={especieTexto}
          placeholder={es ? 'Pokémon que ha salido…' : 'Pokémon you found…'}
          on:keydown={(e) => e.key === 'Enter' && apuntar(1)}
        />
        <datalist id="lx-mini-especies">
          {#each opciones as o}<option value={o.nombre} />{/each}
        </datalist>
        <div class="lx-mini-botones">
          <button class="lx-mini-ok" on:click={() => apuntar(1)} disabled={!especie}>◓ {es ? 'Capturado' : 'Caught'}</button>
          <button class="lx-mini-ko" on:click={() => apuntar(4)} disabled={!especie}>✕ {es ? 'Fallido' : 'Missed'}</button>
        </div>
      </section>
    {/if}
    {#if aviso}<p class="lx-mini-aviso" role="status">{aviso}</p>{/if}

    {#if jefe}
      <section class="lx-mini-jefe">
        <div class="lx-mini-jefe-nav">
          <button on:click={() => moverJefe(-1)} disabled={posJefe <= 0} title={es ? 'Jefe anterior' : 'Previous boss'}>◀</button>
          <small>
            {#if esProximo}{es ? 'PRÓXIMO JEFE' : 'NEXT BOSS'}{:else if jefe?.derrotado}{es ? 'VENCIDO' : 'BEATEN'}{:else if jefe?.pasado}{es ? 'YA PASADO' : 'PASSED'}{:else}{es ? 'MÁS ADELANTE' : 'LATER'}{/if}
            · {posJefe + 1}/{listaJefes.length}
          </small>
          <button on:click={() => moverJefe(1)} disabled={posJefe >= listaJefes.length - 1} title={es ? 'Jefe siguiente' : 'Next boss'}>▶</button>
          {#if !esProximo}
            <button class="lx-mini-volver" on:click={volverAlProximo} title={es ? 'Volver al próximo jefe' : 'Back to next boss'}>⟲</button>
          {/if}
        </div>
        <div class="lx-mini-jefe-fila">
          {#if imgJefe}
            <img
              src={imgJefe}
              alt=""
              class:lx-silueta={ocultoJefe}
            />
          {/if}
          <div>
            <b>{ocultoJefe ? '???' : jefe.boss}</b>
            <span>{traducirNombre(jefe.name)}</span>
          </div>
          {#if cap}
            <span
              class="lx-mini-cap"
              title={capGimnasio && capGimnasio.value !== jefe.value
                ? (es ? 'Nivel máximo del próximo gimnasio: ' : 'Level cap of the next gym: ') + traducirNombre(capGimnasio.name)
                : es ? 'Nivel máximo' : 'Level cap'}
            ><small>{es ? 'NV. MÁX' : 'LV. CAP'}</small>{cap}</span>
          {/if}
        </div>
        {#if aleatorio && !riesgo}
          <p class="lx-mini-aleatorio">{es ? 'Randomlocke: equipo aleatorio. Apúntalo en la app cuando lo veas para ver el riesgo.' : 'Randomlocke: random team. Log it in the app when you see it to get the risk.'}</p>
        {/if}
        {#if riesgo}
          <div class="lx-mini-riesgo"><Riesgo nivel={riesgo.nivel} consejos={riesgo.consejos} modo={riesgo.modo} ocultarConsejos={spoilers >= 1} sinPopover /></div>
          {#if riesgo.consejos?.length && spoilers < 1}
            <details class="lx-mini-consejos">
              <summary>{es ? 'Consejos' : 'Tips'} ({riesgo.consejos.length})</summary>
              {#each riesgo.consejos as c}
                <p class="lx-mini-consejo lx-mc-{c.tipo}">{c.texto}</p>
              {/each}
            </details>
          {/if}
        {/if}
        <div class="lx-mini-botones lx-mini-botones-jefe">
          {#if jefe.derrotado}
            <span class="lx-mini-vencido">🏅 {es ? 'Vencido' : 'Beaten'}</span>
            <button class="lx-mini-ko" on:click={deshacerJefe} title={es ? 'Quitar la marca de vencido' : 'Unmark as beaten'}>
              ↶ {es ? 'Quitar' : 'Unmark'}
            </button>
          {:else}
            <button class="lx-mini-ok" class:lx-confirmar-jefe={confirmarJefe} on:click={vencer}>
              {confirmarJefe ? (es ? '¿Seguro? 🏅' : 'Sure? 🏅') : es ? '🏅 Vencido' : '🏅 Beaten'}
            </button>
            <button class="lx-mini-ko" on:click={() => moverJefe(1)} disabled={posJefe >= listaJefes.length - 1}>
              {es ? 'Siguiente ▶' : 'Next ▶'}
            </button>
          {/if}
        </div>
      </section>
    {/if}

    <section class="lx-mini-equipo">
      <small>{es ? 'EQUIPO' : 'TEAM'}</small>
      {#each miembros as m}
        <div class="lx-mini-p">
          <img src={sprite(m)} alt="" />
          <div>
            <b>{m.nombre}</b>
            <span class="lx-mini-tipos">{#each m.types as t}<i style="background:{COLOR_TIPO[t]}" />{/each}</span>
          </div>
          <span class="lx-mini-derecha">
            {#if m.nivel}<span class="lx-mini-nv">{es ? 'Nv' : 'Lv'} {m.nivel}</span>{/if}
            {#if m.lugar}
              <button
                class="lx-mini-caido"
                class:lx-confirmar={confirmar === m.lugar}
                title={es ? 'Marcar como caído' : 'Mark as fainted'}
                on:click={() => caido(m)}
              >{confirmar === m.lugar ? (es ? '¿Seguro? ☠' : 'Sure? ☠') : '☠'}</button>
            {/if}
          </span>
          {#if m.psMax}<span class="lx-mini-ps"><i style="width:{Math.round((m.ps / m.psMax) * 100)}%" /></span>{/if}
        </div>
      {:else}
        <p class="lx-mini-vacio">{es ? 'Sin equipo todavía.' : 'No team yet.'}</p>
      {/each}
    </section>

    <button class="lx-mini-abrir" on:click={abrirPrincipal}>{es ? 'Abrir Lockedex' : 'Open Lockedex'} ↗</button>
  {/if}
</div>

<style>
  :global(html.lx-compacto) {
    background: #dc0a2d !important;
  }
  :global(html.lx-compacto body) {
    margin: 0 !important;
    min-height: 100vh;
    background: #dc0a2d !important;
    border-radius: 0 !important;
  }
  :global(html.lx-compacto footer) {
    display: none !important;
  }
  .lx-mini {
    font-family: Inter, system-ui, sans-serif;
    color: #1b1b1f;
    padding: 0 8px 10px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  header {
    height: 34px;
    display: flex;
    align-items: center;
    gap: 8px;
    color: #fff;
    -webkit-app-region: drag;
    padding-right: calc(100vw - env(titlebar-area-x, 0px) - env(titlebar-area-width, 100vw));
  }
  header b {
    font-family: 'VT323', monospace;
    font-size: 22px;
    letter-spacing: 2px;
    text-shadow: 2px 2px 0 #8b0a1e;
  }
  .lx-mini-lente {
    width: 18px;
    height: 18px;
    border-radius: 50%;
    border: 2px solid #fff;
    background: radial-gradient(circle at 34% 30%, #e0f7ff 0 12%, #5fd0ff 30%, #29b6f6 50%, #0a6aa8);
    box-shadow: 0 0 0 1px #1b1b1f;
  }
  .lx-mini-icono {
    width: 22px;
    height: 22px;
    filter: drop-shadow(1px 1px 0 rgba(0, 0, 0, 0.4));
  }
  section {
    background: #f3f4ee;
    border: 3px solid #1b1b1f;
    border-radius: 10px;
    padding: 8px 10px;
  }
  small {
    font-family: 'VT323', monospace;
    font-size: 14px;
    letter-spacing: 1px;
    opacity: 0.7;
  }
  .lx-mini-titulo span {
    display: block;
    font-family: 'VT323', monospace;
    font-size: 22px;
    line-height: 1;
  }
  .lx-mini-exp {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-top: 6px;
    background: #1b1b1f;
    border-radius: 7px;
    padding: 3px 7px;
    color: #fff;
  }
  .lx-med {
    font-family: 'VT323', monospace;
    font-size: 20px;
    color: #ffcb05;
  }
  .lx-med small {
    color: #a1a1aa;
    opacity: 1;
  }
  .lx-pista {
    flex: 1;
    height: 8px;
    border-radius: 4px;
    background: #3a3a42;
    overflow: hidden;
  }
  .lx-pista i {
    display: block;
    height: 100%;
    background: linear-gradient(180deg, #8ee8ff, #3cc4f0 55%, #1e9ad0);
    transition: width 0.6s;
  }
  .lx-pct {
    font-family: 'VT323', monospace;
    font-size: 18px;
  }
  .lx-mini-cont {
    display: flex;
    gap: 10px;
    font-size: 12px;
    margin-top: 5px;
  }
  .lx-mini-jefe-fila {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .lx-mini-jefe-fila img {
    width: 64px;
    height: 48px;
    object-fit: contain;
    image-rendering: pixelated;
  }
  .lx-silueta {
    filter: brightness(0);
  }
  .lx-mini-jefe-fila div {
    flex: 1;
  }
  .lx-mini-jefe-fila b {
    display: block;
    font-family: 'VT323', monospace;
    font-size: 24px;
    line-height: 1;
  }
  .lx-mini-jefe-fila span {
    font-size: 12px;
    opacity: 0.75;
  }
  .lx-mini-cap {
    display: flex;
    flex-direction: column;
    align-items: center;
    font-family: 'VT323', monospace;
    font-size: 28px !important;
    line-height: 0.9;
    background: #1b1b1f;
    color: #ffcb05;
    border-radius: 7px;
    padding: 3px 7px;
    opacity: 1 !important;
  }
  .lx-mini-cap small {
    color: #a1a1aa;
    font-size: 11px;
  }
  .lx-mini-aleatorio {
    margin: 4px 0 0;
    font-size: 11px;
    line-height: 1.3;
    color: var(--lx-texto-suave);
  }
  .lx-mini-riesgo {
    margin-top: 6px;
  }
  /* Consejos del riesgo: desplegable a todo el ancho (la ventana es estrecha para una ventana flotante) */
  .lx-mini-consejos {
    margin-top: 6px;
    font-size: 12.5px;
    line-height: 1.35;
  }
  .lx-mini-consejos summary {
    cursor: pointer;
    font-family: 'VT323', monospace;
    font-size: 17px;
    color: #1b1b1f;
  }
  .lx-mini-consejo {
    position: relative;
    margin-top: 5px;
    padding: 5px 7px 5px 20px;
    border-radius: 6px;
    background: #fff;
    border: 1.5px solid #d4d4cf;
    color: #1b1b1f;
  }
  .lx-mini-consejo::before {
    position: absolute;
    left: 7px;
    top: 5px;
    font-weight: 700;
  }
  .lx-mc-bien::before {
    content: '✓';
    color: #16a34a;
  }
  .lx-mc-mal::before {
    content: '✕';
    color: #dc2626;
  }
  .lx-mc-aviso::before {
    content: '!';
    color: #d97706;
    left: 9px;
  }
  .lx-mini-equipo {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .lx-mini-p {
    display: grid;
    grid-template-columns: 44px 1fr auto;
    grid-template-rows: auto auto;
    align-items: center;
    column-gap: 6px;
  }
  .lx-mini-p img {
    grid-row: span 2;
    width: 44px;
    height: 44px;
    image-rendering: pixelated;
  }
  .lx-mini-p b {
    font-family: 'VT323', monospace;
    font-size: 20px;
    line-height: 1;
  }
  .lx-mini-tipos i {
    display: inline-block;
    width: 18px;
    height: 6px;
    border-radius: 3px;
    margin-right: 2px;
  }
  .lx-mini-nv {
    font-family: 'VT323', monospace;
    font-size: 18px;
  }
  .lx-mini-ps {
    grid-column: 2 / span 2;
    height: 5px;
    border-radius: 3px;
    background: #3a3a42;
    overflow: hidden;
  }
  .lx-mini-ps i {
    display: block;
    height: 100%;
    background: #3ddc84;
  }
  .lx-mini-vacio {
    font-size: 13px;
    opacity: 0.7;
    color: #fff;
  }
  section .lx-mini-vacio {
    color: inherit;
  }
  .lx-mini-apuntar {
    display: grid;
    gap: 5px;
  }
  .lx-mini-apuntar select,
  .lx-mini-apuntar input {
    width: 100%;
    font-size: 13px;
    padding: 4px 6px;
    border-radius: 6px;
    border: 2px solid #1b1b1f;
    background: #fff;
    color: #1b1b1f;
  }
  .lx-mini-botones {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 5px;
  }
  .lx-mini-botones button {
    font-family: 'VT323', monospace;
    font-size: 18px;
    line-height: 1;
    padding: 4px;
    border-radius: 6px;
    border: 2px solid #1b1b1f;
    box-shadow: 2px 2px 0 rgba(0, 0, 0, 0.3);
  }
  .lx-mini-botones button:disabled {
    opacity: 0.4;
    box-shadow: none;
  }
  .lx-mini-botones button:not(:disabled):active {
    transform: translate(2px, 2px);
    box-shadow: none;
  }
  .lx-mini-ok {
    background: #3ddc84;
    color: #10331f;
  }
  .lx-mini-ko {
    background: #e5e7eb;
    color: #1b1b1f;
  }
  .lx-mini-botones-jefe {
    margin-top: 6px;
  }
  .lx-mini-jefe-nav {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 4px;
  }
  .lx-mini-jefe-nav small {
    flex: 1;
    text-align: center;
  }
  .lx-mini-jefe-nav button {
    width: 24px;
    height: 22px;
    border-radius: 6px;
    border: 2px solid #1b1b1f;
    background: #fff;
    color: #dc0a2d;
    font-size: 11px;
    line-height: 1;
    box-shadow: 1px 1px 0 rgba(0, 0, 0, 0.3);
  }
  .lx-mini-jefe-nav button:disabled {
    opacity: 0.35;
    box-shadow: none;
  }
  .lx-mini-jefe-nav button:not(:disabled):active {
    transform: translate(1px, 1px);
    box-shadow: none;
  }
  .lx-mini-jefe-nav .lx-mini-volver {
    color: #1b1b1f;
    font-size: 13px;
  }
  .lx-mini-vencido {
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: 'VT323', monospace;
    font-size: 18px;
    border-radius: 6px;
    background: #ffd23f;
    color: #1b1b1f;
    border: 2px solid #1b1b1f;
  }
  .lx-confirmar-jefe {
    background: #ffd23f !important;
    color: #1b1b1f !important;
  }
  .lx-mini-aviso {
    font-family: 'VT323', monospace;
    font-size: 17px;
    text-align: center;
    color: #fff;
    background: rgba(0, 0, 0, 0.3);
    border-radius: 6px;
    padding: 2px 6px;
  }
  .lx-mini-derecha {
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }
  .lx-mini-caido {
    font-size: 12px;
    line-height: 1;
    padding: 3px 5px;
    border-radius: 5px;
    opacity: 0.35;
    transition: opacity 0.12s, background 0.12s;
  }
  .lx-mini-p:hover .lx-mini-caido,
  .lx-mini-caido:focus-visible {
    opacity: 1;
  }
  .lx-mini-caido.lx-confirmar {
    opacity: 1;
    background: #dc0a2d;
    color: #fff;
    font-family: 'VT323', monospace;
    font-size: 15px;
  }
  .lx-mini-abrir {
    font-family: 'VT323', monospace;
    font-size: 18px;
    color: #fff;
    background: rgba(0, 0, 0, 0.25);
    border-radius: 8px;
    padding: 4px;
  }
</style>
