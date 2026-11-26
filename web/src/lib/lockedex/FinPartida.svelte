<script>
  // Vidas, «He perdido» y la pantalla de fin de la partida (game over) en la vista de partida
  import { get } from 'svelte/store'
  import { savedGames, parse } from '$lib/store'
  import { leerReglas } from './reglas.js'
  import { estadoRun, vidasRestantes, registrarDerrota, deshacerFin, finPorVidas, nuevoIntento, contarCaidos, recordarEquipo, equipoCaido, descartarWipe } from './derrotas.js'
  import { marco } from './gba.js'
  import { t, traducirNombre } from './idioma.js'

  export let id = ''
  export let datos = {}
  export let terminada = false

  const MARCO = marco({ tinta: '#283850', fondo: '#f8f8f8', luz: '#ffffff', sombra: '#c8d0d8', r: 3 })
  const BOTON = marco({ tinta: '#283850', fondo: '#f8f8f8', luz: '#ffffff', sombra: '#c8d0d8', r: 2 })

  $: tienda = estadoRun(id)
  $: estado = $tienda
  $: reglas = leerReglas(id)
  $: caidos = contarCaidos(datos || {})
  $: vidas = vidasRestantes(reglas, estado, caidos)
  $: totalVidas = +reglas.vidas || 0
  $: terminada = !!estado?.fin
  // Sin vidas: la app propone el game over sola
  $: if (id && vidas !== null && vidas <= 0 && !estado?.fin) finPorVidas(id)

  // Sin vidas y con la regla normal de game over (o una run sin reglas guardadas): si cae todo el equipo,
  // la app propone terminar la run, igual que hace con las vidas
  $: if (id && datos) recordarEquipo(id, datos)
  $: conGameover = !!reglas.gameover || !Object.keys(reglas || {}).length
  $: caidoEntero = id && vidas === null && conGameover && !estado?.fin ? equipoCaido(id, datos || {}) : null
  const aceptarWipe = () => registrarDerrota({ id, motivo: 'equipo', equipo: caidoEntero || [], caidos })
  const noEraWipe = () => {
    descartarWipe(id, caidoEntero)
    caidoEntero = null
  }

  $: equipos = Array.isArray(datos?.__teams) ? datos.__teams : []
  $: medallas = equipos.filter((e) => e?.group === 'gym-leader').length
  $: capturas = Object.entries(datos || {}).filter(([k, v]) => !k.startsWith('__') && [1, 2, 3, 5, 6].includes(+v?.status)).length
  $: intento = (() => {
    let p = null
    parse((g) => (p = g[id]))(get(savedGames))
    return +(p?.attempts || 1)
  })()

  const mayuscula = (x) => String(x).charAt(0).toUpperCase() + String(x).slice(1)
  const fecha = (ms) => new Date(ms).toLocaleDateString(t('es-ES', 'en-GB'), { day: 'numeric', month: 'long' })

  const hePerdido = () => {
    if (!window.confirm(t('¿Has perdido esta run? Se marcará como game over (se puede deshacer).', 'Did you lose this run? It will be marked as game over (can be undone).'))) return
    registrarDerrota({ id, motivo: 'general', equipo: datos?.__team || [], caidos })
  }
  const otroIntento = () => {
    if (!window.confirm(t('Empezar un nuevo intento vacía la run (encuentros, equipo y caja). Lo que has conseguido queda en tu historial. ¿Seguir?', 'A new attempt empties the run (encounters, team and box). What you achieved stays in your history. Continue?'))) return
    nuevoIntento(id, { medallas, caidos, capturas })
  }
</script>

{#if vidas !== null || !estado?.fin}
  <div class="lx-fin-barra">
    {#if vidas !== null}
      <span class="lx-vidas" class:lx-pocas={vidas <= Math.ceil(totalVidas / 4)} title={t('Vidas: cada caído, derrota o revivido gasta una', 'Lives: each faint, defeat or revive costs one')}>
        <i>♥</i>{vidas}<small>/{totalVidas}</small>
      </span>
    {/if}
    {#if !estado?.fin}
      <button class="lx-he-perdido" on:click={hePerdido} title={t('Marcar la run como perdida', 'Mark the run as lost')}>{t('He perdido', 'I lost')}</button>
    {/if}
  </div>
{/if}

{#if caidoEntero && !estado?.fin}
  <section class="lx-fin lx-wipe" style={MARCO}>
    <header>{t('¡TU EQUIPO HA CAÍDO!', 'YOUR TEAM FAINTED!')}</header>
    <p class="lx-fin-motivo">
      {t('No te queda nadie en pie en el equipo. En un Nuzlocke eso es game over.', 'Nobody is left standing in your team. In a Nuzlocke that is game over.')}
      <small>· {caidoEntero.map((l) => datos?.[l]?.nickname || traducirNombre(mayuscula(datos?.[l]?.pokemon || l))).join(', ')}</small>
    </p>
    <div class="lx-fin-botones">
      <button style={BOTON} on:click={aceptarWipe}>{t('Game over', 'Game over')}</button>
      <button style={BOTON} class="lx-fin-deshacer" on:click={noEraWipe}>{t('Sigo jugando', 'Keep playing')}</button>
    </div>
  </section>
{/if}

{#if estado?.fin}
  <section class="lx-fin" style={MARCO}>
    <header>{t('FIN DE LA PARTIDA', 'GAME OVER')}</header>
    <p class="lx-fin-motivo">
      {#if estado.fin.motivo === 'jefe' && estado.fin.jefe}
        {t('Perdiste contra', 'You lost to')} <b>{traducirNombre(estado.fin.jefe.nombre)}</b>
      {:else if estado.fin.motivo === 'vidas'}
        {t('Te has quedado sin vidas', 'You ran out of lives')}
      {:else if estado.fin.motivo === 'equipo'}
        {t('Cayó todo tu equipo', 'Your whole team fainted')}
      {:else}
        {t('Has dado la run por perdida', 'You marked the run as lost')}
      {/if}
      <small>· {fecha(estado.fin.fecha)} · {t('intento', 'attempt')} {intento}</small>
    </p>
    <ul class="lx-fin-datos">
      <li><b>{medallas}</b>{t('medallas', 'badges')}</li>
      <li><b>{capturas}</b>{t('capturas', 'catches')}</li>
      <li><b>{caidos}</b>{t('caídos', 'fainted')}</li>
      <li><b>{estado.derrotas.length}</b>{t('derrotas', 'defeats')}</li>
    </ul>
    <div class="lx-fin-botones">
      <button style={BOTON} on:click={otroIntento}>{t('Nuevo intento', 'New attempt')}</button>
      <button style={BOTON} class="lx-fin-deshacer" on:click={() => deshacerFin(id)}>{t('Deshacer', 'Undo')}</button>
    </div>
  </section>
{/if}

<style>
  .lx-fin-barra {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .lx-vidas {
    display: inline-flex;
    align-items: baseline;
    gap: 3px;
    padding: 2px 10px;
    font-family: 'LX Pixel', 'VT323', monospace;
    font-size: 24px;
    line-height: 24px;
    color: var(--lx-lcd-texto);
    background: var(--lx-lcd);
    border: 2px solid var(--lx-tinta);
    border-radius: var(--lx-radio-sm);
  }
  .lx-vidas i {
    font-style: normal;
    color: #ff5a6e;
  }
  .lx-vidas small {
    font-size: 12px;
    opacity: 0.7;
  }
  .lx-pocas i {
    animation: lx-latido 0.8s steps(1, end) infinite;
  }
  @keyframes lx-latido {
    50% {
      opacity: 0.3;
    }
  }
  .lx-he-perdido {
    margin-left: auto;
    padding: 3px 10px;
    font-size: 12px;
    color: var(--lx-texto-suave);
    border: 2px dashed var(--lx-bisel);
    border-radius: var(--lx-radio-sm);
  }
  .lx-he-perdido:hover {
    color: var(--lx-rojo);
    border-color: var(--lx-rojo);
  }

  /* Pantalla de fin: recuadro de diálogo de la consola */
  .lx-fin {
    font-family: 'LX Pixel', 'VT323', monospace;
    color: #404850;
    text-shadow: 2px 2px 0 #d0d8e0;
    padding: 4px 10px 8px;
  }
  .lx-fin header {
    margin: -4px -10px 8px;
    padding: 4px 10px 6px;
    font-size: 24px;
    line-height: 24px;
    color: #f8f8f8;
    text-shadow: 2px 2px 0 #581018;
    background: #c02838;
    box-shadow: inset 0 -2px 0 #801020, inset 0 2px 0 #e05060;
  }
  .lx-fin-motivo {
    font-size: 24px;
    line-height: 26px;
  }
  .lx-fin-motivo b {
    font-weight: normal;
    color: #c02838;
  }
  .lx-fin-motivo small {
    font-size: 12px;
    color: #6880b0;
    text-shadow: none;
  }
  .lx-fin-datos {
    display: flex;
    flex-wrap: wrap;
    gap: 6px 18px;
    margin: 6px 0 10px;
    font-size: 12px;
    color: #6880b0;
    text-shadow: none;
  }
  .lx-fin-datos li {
    display: flex;
    align-items: baseline;
    gap: 4px;
  }
  .lx-fin-datos b {
    font-size: 24px;
    font-weight: normal;
    color: #404850;
    text-shadow: 2px 2px 0 #d0d8e0;
  }
  .lx-fin-botones {
    display: flex;
    gap: 10px;
    justify-content: flex-end;
  }
  .lx-fin-botones button {
    padding: 0 10px;
    font-size: 24px;
    line-height: 26px;
    color: #404850;
  }
  .lx-fin-botones button:hover {
    filter: brightness(0.95);
  }
  .lx-wipe {
    margin-bottom: 8px;
  }
  .lx-fin-deshacer {
    color: #6880b0 !important;
  }
</style>
