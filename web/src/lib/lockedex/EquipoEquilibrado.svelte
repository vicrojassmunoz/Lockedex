<script>
  // Equilibrar equipo: propone los 6 mejores de la Caja y el equipo, con lo que cambia y por qué
  import { onMount, getContext } from 'svelte'
  import { partidaActiva, cargarRutas, resumirPartida } from './partida.js'
  import { prepararCandidatos, buscarEquipo, duelosContraJefe, motivos, resumenEquipo } from './equilibrar.js'
  import { calcularRiesgo } from './riesgo.js'
  import { tipos as tiposEs } from './datos.js'
  import { COLOR_TIPO, RIESGO } from './colores.js'
  import { recorte } from './recorte.js'
  import { t, idioma, traducirNombre } from './idioma.js'

  // aplicar(lugares): pone ese equipo en la run
  export let aplicar = () => {}

  const { close } = getContext('simple-modal')
  const es = idioma() === 'es'

  let estado = 'cargando'
  let datos = null // { candidatos, cap, jefe, reglas, notas, gen, parejas, conSav }
  let partida = null
  let tt = {}
  let modo = 'general'
  let fijos = new Set()
  let propuesta = []
  let chips = []
  let duelos = null
  let riesgoAhora = null
  let riesgoNuevo = null
  let calculando = false

  const sprite = (m) => (m.imgId ? `/assets/img/pokemon/base-${m.imgId}.png` : '/assets/img/pokemon/base-201-question.png')
  const nombreTipo = (x) => (es ? tt[x] || x : x.charAt(0).toUpperCase() + x.slice(1))

  $: actuales = datos ? datos.candidatos.filter((c) => c.enEquipo) : []
  $: entran = propuesta.filter((m) => !m.enEquipo)
  $: salen = actuales.filter((m) => !propuesta.includes(m))
  $: resAhora = datos && actuales.length ? resumenEquipo(actuales, datos.gen) : null
  $: resNuevo = datos && propuesta.length ? resumenEquipo(propuesta, datos.gen) : null

  onMount(async () => {
    try {
      partida = partidaActiva()
      if (!partida?.info) throw new Error('sin run')
      const rutas = await cargarRutas(partida.info.lid)
      const resumen = resumirPartida(partida, rutas)
      ;[datos, tt] = await Promise.all([prepararCandidatos(partida, resumen), tiposEs()])
      if (!datos.candidatos.length) {
        estado = 'vacio'
        return
      }
      fijos = new Set()
      await calcular()
      estado = 'listo'
    } catch (e) {
      console.error('[equilibrar]', e)
      estado = 'error'
    }
  })

  const ctx = () => ({ modo, gen: datos.gen, duelos, parejas: datos.parejas })

  const calcular = async () => {
    calculando = true
    // Deja pintar el «Calculando…» antes de ponerse a ello
    await new Promise((r) => setTimeout(r, 30))
    try {
      if (modo === 'jefe' && datos.jefe && !duelos)
        duelos = await duelosContraJefe(datos.jefe, datos.candidatos, { gen: datos.gen, cap: datos.cap, grupo: partida.info.grupo })
      const r = buscarEquipo(datos.candidatos, ctx(), fijos)
      propuesta = r.equipo
      chips = motivos(propuesta, ctx())
      riesgoAhora = riesgoNuevo = null
      if (modo === 'jefe' && datos.jefe) {
        const comoRiesgo = (eq) =>
          eq.map((c) => ({ nombre: c.nombre, alias: c.alias, especie: c.especie, types: c.types, nivel: c.nivelCalc, movimientos: c.movimientos, naturaleza: c.naturaleza, habilidad: c.habilidad, ivs: c.ivs, evs: c.evs }))
        const args = { jefe: datos.jefe, gen: datos.gen, cap: datos.cap, grupo: partida.info.grupo }
        ;[riesgoAhora, riesgoNuevo] = await Promise.all([
          actuales.length ? calcularRiesgo({ ...args, equipo: comoRiesgo(actuales) }) : null,
          calcularRiesgo({ ...args, equipo: comoRiesgo(propuesta) })
        ])
      }
    } finally {
      calculando = false
    }
  }

  const cambiarModo = (m) => {
    if (m === modo || calculando) return
    modo = m
    calcular()
  }
  const alternarFijo = (m) => {
    if (calculando) return
    const n = new Set(fijos)
    if (n.has(m.lugar)) n.delete(m.lugar)
    else if (n.size < 6) n.add(m.lugar)
    fijos = n
    calcular()
  }
  const usar = () => {
    aplicar(propuesta.map((m) => m.lugar))
    close()
  }

  const textoChip = (c) => {
    switch (c.clave) {
      case 'cubre':
        return t(`Cubre ${c.tipos.map(nombreTipo).join(', ')}`, `Covers ${c.tipos.map(nombreTipo).join(', ')}`)
      case 'resiste':
        return t(`Resiste ${c.tipos.map(nombreTipo).join(', ')}`, `Resists ${c.tipos.map(nombreTipo).join(', ')}`)
      case 'rapido':
        return t('El más rápido', 'Fastest')
      case 'fuerte':
        return t('El más fuerte', 'Strongest')
      case 'gana':
        return t(`Gana a ${c.nombres.map((n) => traducirNombre(n.charAt(0).toUpperCase() + n.slice(1))).join(', ')}`, `Beats ${c.nombres.join(', ')}`)
      case 'sinAtaques':
        return t('Sin ataques todavía', 'No attacks yet')
      default:
        return ''
    }
  }
  const textoNota = (n) => {
    if (n.clave === 'monotipo') return t(`Monotipo ${nombreTipo(n.tipo)}: solo cuentan los de ese tipo (${n.fuera} fuera).`, `Monotype ${n.tipo}: only that type counts (${n.fuera} left out).`)
    if (n.clave === 'nivel') return t(`Nivel máximo ${n.cap}: fuera ${n.nombres.join(', ')}.`, `Level cap ${n.cap}: ${n.nombres.join(', ')} left out.`)
    if (n.clave === 'wedlocke') return t('Wedlocke: nunca los dos de una pareja.', 'Wedlocke: never both partners.')
    return ''
  }
  const nombreRiesgo = (r) => (r ? RIESGO[r.nivel] : null)
</script>

<section class="lx-eq" data-lx-original>
  <header>
    <h2>{t('Equilibrar equipo', 'Balance team')}</h2>
    <button class="lx-eq-x" on:click={close} aria-label={t('Cerrar', 'Close')}>✕</button>
  </header>

  {#if estado === 'cargando'}
    <p class="lx-eq-msg">{t('Mirando tu Caja…', 'Looking at your box…')}</p>
  {:else if estado === 'vacio'}
    <p class="lx-eq-msg">{t('No hay Pokémon vivos que cumplan tus reglas en la Caja ni en el equipo.', 'No living Pokémon that meet your rules in the box or team.')}</p>
  {:else if estado === 'error'}
    <p class="lx-eq-msg">{t('No se pudo calcular el equipo de esta run.', 'Could not work out a team for this run.')}</p>
  {:else}
    <div class="lx-eq-modos" role="tablist">
      <button role="tab" class:lx-sel={modo === 'general'} on:click={() => cambiarModo('general')}>{t('General', 'General')}</button>
      <button role="tab" class:lx-sel={modo === 'jefe'} disabled={!datos.jefe} on:click={() => cambiarModo('jefe')}>
        {datos.jefe ? t(`Contra ${datos.jefe.name}`, `Vs ${datos.jefe.name}`) : t('Sin próximo jefe', 'No next boss')}
      </button>
    </div>
    <p class="lx-eq-notas">
      {t(`${datos.candidatos.length} Pokémon vivos`, `${datos.candidatos.length} living Pokémon`)} ·
      {datos.conSav
        ? t('con los movimientos y niveles de tu .sav', 'with your .sav moves and levels')
        : t(`sin .sav: con lo que aprenden por nivel hasta el Nv. ${datos.cap || 50}`, `no .sav: level-up moves up to Lv. ${datos.cap || 50}`)}
      {#each datos.notas as n}<br />{textoNota(n)}{/each}
    </p>

    {#if actuales.length}
      <div class="lx-eq-ahora">
        <small>{t('Tu equipo ahora (toca para fijarlo):', 'Your team now (tap to lock):')}</small>
        {#each actuales as m}
          <button class="lx-eq-mini" class:lx-fijo={fijos.has(m.lugar)} on:click={() => alternarFijo(m)} title={fijos.has(m.lugar) ? t('Fijo: se queda sí o sí', 'Locked: stays no matter what') : t('Fijar', 'Lock')}>
            <img src={sprite(m)} alt="" use:recorte width="28" height="28" />{m.nombre}
          </button>
        {/each}
      </div>
    {/if}

    <ol class="lx-eq-equipo" class:lx-eq-calculando={calculando}>
      {#each propuesta as m, i (m.lugar)}
        <li class:lx-nuevo={!m.enEquipo}>
          <div class="lx-eq-cab">
            <img src={sprite(m)} alt="" use:recorte width="56" height="56" />
            <div>
              <b>{m.nombre}</b>
              <small>{[m.nivel ? `${t('Nv.', 'Lv.')} ${m.nivel}` : '', !m.enEquipo ? t('NUEVO', 'NEW') : ''].filter(Boolean).join(' · ')}</small>
              <span class="lx-eq-tipos">
                {#each m.types as x}<i style="background: {COLOR_TIPO[x]}">{nombreTipo(x)}</i>{/each}
              </span>
            </div>
          </div>
          <ul class="lx-eq-chips">
            {#each chips[i] || [] as c}<li class="lx-c-{c.clave}">{textoChip(c)}</li>{/each}
          </ul>
          <button class="lx-eq-fijar" class:lx-fijo={fijos.has(m.lugar)} on:click={() => alternarFijo(m)}>
            {fijos.has(m.lugar) ? t('FIJO', 'LOCKED') : t('Fijar', 'Lock')}
          </button>
        </li>
      {/each}
    </ol>
    {#if calculando}<p class="lx-eq-msg lx-eq-msg-mini">{t('Calculando…', 'Calculating…')}</p>{/if}

    {#if resNuevo}
      <table class="lx-eq-tabla">
        <thead>
          <tr><th /><th>{t('Ahora', 'Now')}</th><th>{t('Propuesta', 'Proposal')}</th></tr>
        </thead>
        <tbody>
          {#if modo === 'jefe' && riesgoNuevo}
            <tr>
              <td>{t('Riesgo', 'Risk')}</td>
              <td>{#if riesgoAhora}<span class="lx-eq-riesgo" style="--c: {nombreRiesgo(riesgoAhora).color}">{es ? nombreRiesgo(riesgoAhora).es : nombreRiesgo(riesgoAhora).en}</span>{:else}—{/if}</td>
              <td><span class="lx-eq-riesgo" style="--c: {nombreRiesgo(riesgoNuevo).color}">{es ? nombreRiesgo(riesgoNuevo).es : nombreRiesgo(riesgoNuevo).en}</span></td>
            </tr>
          {/if}
          <tr>
            <td>{t('Tipos a los que pega supereficaz', 'Types hit super effectively')}</td>
            <td>{resAhora ? `${resAhora.cubiertos}/${resAhora.total}` : '—'}</td>
            <td>{resNuevo.cubiertos}/{resNuevo.total}</td>
          </tr>
          <tr>
            <td>{t('Debilidades compartidas', 'Shared weaknesses')}</td>
            <td>{resAhora ? resAhora.compartidas.map((d) => `${nombreTipo(d.tipo)} ×${d.n}`).join(', ') || t('ninguna', 'none') : '—'}</td>
            <td>{resNuevo.compartidas.map((d) => `${nombreTipo(d.tipo)} ×${d.n}`).join(', ') || t('ninguna', 'none')}</td>
          </tr>
          <tr>
            <td>{t('Sin respuesta (nada neutro)', 'No answer (nothing neutral)')}</td>
            <td>{resAhora ? resAhora.sinRespuesta.map(nombreTipo).join(', ') || t('ninguno', 'none') : '—'}</td>
            <td>{resNuevo.sinRespuesta.map(nombreTipo).join(', ') || t('ninguno', 'none')}</td>
          </tr>
          <tr>
            <td>{t('Físicos · especiales', 'Physical · special')}</td>
            <td>{resAhora ? `${resAhora.fisicos} · ${resAhora.especiales}` : '—'}</td>
            <td>{resNuevo.fisicos} · {resNuevo.especiales}</td>
          </tr>
        </tbody>
      </table>
    {/if}

    <footer>
      <p>
        {#if !entran.length}
          {t('Tu equipo ya es el más equilibrado que encuentro.', 'Your team is already the most balanced one I can find.')}
        {:else}
          {#if salen.length}{t('Saca a', 'Out:')} <b>{salen.map((m) => m.nombre).join(', ')}</b>{t(', mete a', '; in:')}{:else}{t('Mete a', 'Add')}{/if}
          <b>{entran.map((m) => m.nombre).join(', ')}</b>.
        {/if}
      </p>
      <button class="lx-eq-aplicar" disabled={!entran.length && propuesta.length === actuales.length} on:click={usar}>{t('Usar este equipo', 'Use this team')}</button>
    </footer>
  {/if}
</section>

<style>
  .lx-eq {
    width: min(760px, calc(100vw - 32px));
    max-height: calc(100vh - 64px);
    overflow-y: auto;
    background: #f8f8f0;
    color: #303840;
    border: 4px solid #283850;
    border-radius: 12px;
    box-shadow: 6px 6px 0 rgba(0, 0, 0, 0.4);
    font-family: 'LX Pixel', 'VT323', monospace;
    font-size: 12px;
  }
  :global(.dark) .lx-eq {
    background: #1c2430;
    color: #e0e6ee;
  }
  header {
    position: sticky;
    top: 0;
    z-index: 1;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 14px;
    background: #d04848;
    color: #fff;
  }
  h2 {
    font-size: 24px;
    line-height: 24px;
    text-shadow: 2px 2px 0 #702020;
  }
  .lx-eq-x {
    font-size: 18px;
    padding: 0 6px;
  }
  .lx-eq-msg {
    padding: 24px 14px;
    text-align: center;
    color: #8890a0;
  }
  .lx-eq-msg-mini {
    padding: 0 14px 6px;
  }
  .lx-eq-modos {
    display: flex;
    gap: 6px;
    padding: 10px 14px 0;
  }
  .lx-eq-modos button,
  .lx-eq-fijar,
  .lx-eq-mini {
    padding: 2px 10px;
    border: 2px solid #283850;
    border-radius: 4px;
    background: #fff;
    color: #283850;
  }
  :global(.dark) .lx-eq-modos button,
  :global(.dark) .lx-eq-fijar,
  :global(.dark) .lx-eq-mini {
    background: #24303e;
    color: #e0e6ee;
    border-color: #8090a8;
  }
  .lx-eq-modos button.lx-sel {
    background: #d04848;
    border-color: #702020;
    color: #fff;
  }
  button:disabled {
    opacity: 0.5;
  }
  .lx-eq-notas {
    padding: 6px 14px 0;
    color: #707880;
    line-height: 16px;
  }
  .lx-eq-ahora {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 4px 6px;
    padding: 8px 14px 0;
  }
  .lx-eq-ahora small {
    color: #707880;
  }
  .lx-eq-mini {
    display: inline-flex;
    align-items: center;
    gap: 2px;
    padding: 0 8px 0 2px;
  }
  .lx-eq-mini img,
  .lx-eq-cab img {
    image-rendering: pixelated;
  }
  .lx-fijo {
    background: #f8d048 !important;
    border-color: #a87818 !important;
    color: #403000 !important;
  }
  .lx-eq-equipo {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: 8px;
    padding: 10px 14px;
    transition: opacity 0.2s;
  }
  .lx-eq-calculando {
    opacity: 0.45;
  }
  .lx-eq-equipo > li {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 6px 8px 8px;
    background: #fff;
    border: 2px solid #c8d0d8;
    border-radius: 6px;
  }
  :global(.dark) .lx-eq-equipo > li {
    background: #24303e;
    border-color: #34404e;
  }
  .lx-eq-equipo > li.lx-nuevo {
    border-color: #48a058;
    box-shadow: inset 0 0 0 1px #48a058;
  }
  .lx-eq-cab {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .lx-eq-cab div {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }
  .lx-eq-cab b {
    font-weight: normal;
    font-size: 16px;
    line-height: 18px;
  }
  .lx-eq-cab small {
    color: #707880;
  }
  .lx-nuevo .lx-eq-cab small {
    color: #2f8040;
  }
  .lx-eq-tipos {
    display: flex;
    gap: 2px;
    margin-top: 2px;
  }
  .lx-eq-tipos i {
    font-style: normal;
    padding: 0 4px;
    color: #fff;
    border-radius: 3px;
    text-shadow: 1px 1px 0 rgba(0, 0, 0, 0.35);
  }
  .lx-eq-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 3px;
  }
  .lx-eq-chips li {
    padding: 0 5px;
    border-radius: 3px;
    background: #e8eef8;
    color: #284878;
  }
  :global(.dark) .lx-eq-chips li {
    background: #2c3a52;
    color: #c8d8f0;
  }
  .lx-eq-chips .lx-c-gana {
    background: #e0f4e4;
    color: #206030;
  }
  .lx-eq-chips .lx-c-sinAtaques {
    background: #fbe4e4;
    color: #902020;
  }
  .lx-eq-fijar {
    position: absolute;
    top: 6px;
    right: 6px;
    padding: 0 6px;
    font-size: 11px;
  }
  .lx-eq-tabla {
    width: calc(100% - 28px);
    margin: 0 14px 8px;
    border-collapse: collapse;
  }
  .lx-eq-tabla th,
  .lx-eq-tabla td {
    padding: 3px 6px;
    text-align: left;
    border-bottom: 1px solid #d8dee6;
    vertical-align: top;
  }
  :global(.dark) .lx-eq-tabla th,
  :global(.dark) .lx-eq-tabla td {
    border-color: #34404e;
  }
  .lx-eq-tabla th {
    color: #707880;
    font-weight: normal;
  }
  .lx-eq-tabla td:first-child {
    color: #707880;
    width: 40%;
  }
  .lx-eq-riesgo {
    padding: 0 6px;
    border-radius: 3px;
    background: var(--c);
    color: #202020;
  }
  footer {
    position: sticky;
    bottom: 0;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 14px 10px;
    background: inherit;
    border-top: 2px solid #d8dee6;
  }
  footer p {
    flex: 1;
    line-height: 16px;
  }
  footer b {
    font-weight: normal;
    color: #d04848;
  }
  .lx-eq-aplicar {
    padding: 4px 14px;
    color: #fff;
    background: #d04848;
    box-shadow: inset 0 -2px 0 #702020;
    clip-path: polygon(2px 0, calc(100% - 2px) 0, 100% 2px, 100% calc(100% - 2px), calc(100% - 2px) 100%, 2px 100%, 0 calc(100% - 2px), 0 2px);
  }
  .lx-eq-aplicar:hover {
    background: #e05858;
  }
</style>
