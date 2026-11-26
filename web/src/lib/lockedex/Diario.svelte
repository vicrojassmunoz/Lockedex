<script>
  // Diario de la run: todo lo que ha pasado, por días, con notas propias
  import { onMount, onDestroy, getContext } from 'svelte'
  import { fetchData } from '$utils/fetchers'
  import { createImgUrl } from '$utils/rewrites'
  import { leerPartida, alCambiarDatos } from './partida.js'
  import { leerDiario, anotarNota, borrarEntrada, registrarCambios } from './diario.js'
  import { norm } from './datos.js'
  import { recorte } from './recorte.js'
  import { t, idioma, traducirNombre } from './idioma.js'

  export let id = ''

  const { close } = getContext('simple-modal')
  const es = idioma() === 'es'

  let pk = null
  let entradas = []
  let filtro = 'todo'
  let nota = ''
  let intento = 1
  let aviso = ''

  const FILTROS = [
    ['todo', 'Todo', 'All', null],
    ['capturas', 'Capturas', 'Catches', ['captura', 'regalo', 'intercambio', 'variocolor', 'fallo', 'descarte', 'evolucion']],
    ['caidos', 'Caídos', 'Fainted', ['muerte', 'revivido']],
    ['jefes', 'Jefes', 'Bosses', ['jefe', 'derrota', 'gameover', 'deshecho', 'intento']],
    ['notas', 'Notas', 'Notes', ['nota']]
  ]

  const cargar = () => {
    registrarCambios(id)
    entradas = leerDiario(id).slice().reverse()
    intento = leerPartida(id)?.intentos || 1
  }
  let quitar = () => {}
  onMount(async () => {
    cargar()
    quitar = alCambiarDatos(cargar)
    pk = await fetchData()
  })
  onDestroy(() => quitar())

  const especie = (alias) => pk?.aliasMap?.[norm(alias)] || pk?.nameMap?.[norm(alias)] || null
  const nombrePk = (alias) => traducirNombre(especie(alias)?.name || String(alias || '').replace(/^\w/, (c) => c.toUpperCase()))
  const sprite = (alias) => {
    const e = especie(alias)
    return e ? createImgUrl(e, { ext: 'png' }) : null
  }
  const quien = (e) => (e.mote ? `${e.mote} (${nombrePk(e.pokemon)})` : nombrePk(e.pokemon))
  const lugar = (l) => traducirNombre(String(l || '').replace(/ · (extra|variocolor|estático)$/, ''))
  const causa = (c) =>
    !c ? '' : c === 'wild' ? t(' contra un Pokémon salvaje', ' to a wild Pokémon') : c === 'trainer' ? t(' contra un entrenador', ' to a trainer') : t(` contra ${c}`, ` to ${c}`)

  const frase = (e) => {
    switch (e.tipo) {
      case 'captura':
        return t(`Capturaste a ${quien(e)} en ${lugar(e.lugar)}`, `Caught ${quien(e)} at ${lugar(e.lugar)}`)
      case 'regalo':
        return t(`Recibiste a ${quien(e)} en ${lugar(e.lugar)}`, `Received ${quien(e)} at ${lugar(e.lugar)}`)
      case 'intercambio':
        return t(`Conseguiste a ${quien(e)} por intercambio en ${lugar(e.lugar)}`, `Traded for ${quien(e)} at ${lugar(e.lugar)}`)
      case 'variocolor':
        return t(`¡${quien(e)} variocolor en ${lugar(e.lugar)}!`, `Shiny ${quien(e)} at ${lugar(e.lugar)}!`)
      case 'fallo':
        return t(`Se escapó el encuentro de ${lugar(e.lugar)}${e.pokemon ? ` (${nombrePk(e.pokemon)})` : ''}`, `Missed the encounter at ${lugar(e.lugar)}${e.pokemon ? ` (${nombrePk(e.pokemon)})` : ''}`)
      case 'descarte':
        return t(`Descartaste a ${quien(e)} (${lugar(e.lugar)})`, `Discarded ${quien(e)} (${lugar(e.lugar)})`)
      case 'muerte':
        return t(`${quien(e)} cayó${causa(e.causa)}`, `${quien(e)} fainted${causa(e.causa)}`)
      case 'revivido':
        return t(`${quien(e)} volvió del cementerio`, `${quien(e)} came back from the graveyard`)
      case 'evolucion':
        return t(`${e.mote || nombrePk(e.de)} evolucionó a ${nombrePk(e.pokemon)}`, `${e.mote || nombrePk(e.de)} evolved into ${nombrePk(e.pokemon)}`)
      case 'jefe':
        return t(`Venciste a ${e.nombre}`, `Defeated ${e.nombre}`)
      case 'derrota':
        return e.nombre ? t(`Perdiste contra ${e.nombre}`, `Lost to ${e.nombre}`) : t('Perdiste un combate', 'Lost a battle')
      case 'gameover':
        return e.motivo === 'vidas'
          ? t('Game over: sin vidas', 'Game over: out of lives')
          : e.motivo === 'equipo'
          ? t('Game over: cayó todo el equipo', 'Game over: your whole team fainted')
          : e.nombre
          ? t(`Game over contra ${e.nombre}`, `Game over against ${e.nombre}`)
          : 'Game over'
      case 'deshecho':
        return t('Deshiciste el game over', 'Undid the game over')
      case 'intento':
        return t(`Empieza el intento ${e.intento}`, `Attempt ${e.intento} begins`)
      case 'nota':
        return e.texto
      default:
        return e.tipo
    }
  }
  const MARCA = { captura: '◓', regalo: '✉', intercambio: '⇄', variocolor: '✦', fallo: '✕', descarte: '–', muerte: '✝', revivido: '♥', evolucion: '↑', jefe: '★', derrota: '!', gameover: '☗', deshecho: '↺', intento: '▶', nota: '✎' }

  $: lista = (FILTROS.find((f) => f[0] === filtro)?.[3] || null) ? entradas.filter((e) => FILTROS.find((f) => f[0] === filtro)[3].includes(e.tipo)) : entradas
  const dia = (ms) => {
    const d = new Date(ms).toLocaleDateString(es ? 'es-ES' : 'en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    return d.charAt(0).toUpperCase() + d.slice(1)
  }
  const hora = (ms) => new Date(ms).toLocaleTimeString(es ? 'es-ES' : 'en-GB', { hour: '2-digit', minute: '2-digit' })
  // Grupos por intento y día (lo más nuevo arriba)
  $: grupos = lista.reduce((g, e) => {
    const k = `${e.intento || 1}|${dia(e.t)}`
    const ultimo = g[g.length - 1]
    if (ultimo?.k === k) ultimo.entradas.push(e)
    else g.push({ k, intento: e.intento || 1, dia: dia(e.t), entradas: [e] })
    return g
  }, [])

  const guardarNota = () => {
    anotarNota(id, nota, intento)
    nota = ''
    cargar()
  }
  const borrar = (e) => {
    borrarEntrada(id, e.t)
    cargar()
  }
  const copiarTexto = async () => {
    const texto = grupos
      .slice()
      .reverse()
      .map((g) => `${t('Intento', 'Attempt')} ${g.intento} · ${g.dia}\n` + g.entradas.slice().reverse().map((e) => `  ${hora(e.t)}  ${frase(e)}`).join('\n'))
      .join('\n\n')
    try {
      await navigator.clipboard.writeText(texto)
      aviso = t('Diario copiado como texto', 'Diary copied as text')
    } catch {
      aviso = t('No se pudo copiar', 'Could not copy')
    }
    setTimeout(() => (aviso = ''), 2500)
  }
</script>

<section class="lx-diario" data-lx-original>
  <header>
    <h2>{t('Diario de la run', 'Run diary')}</h2>
    <button class="lx-diario-x" on:click={close} aria-label={t('Cerrar', 'Close')}>✕</button>
  </header>

  <div class="lx-diario-barra">
    <div class="lx-diario-filtros">
      {#each FILTROS as [k, fes, fen]}
        <button class:lx-sel={filtro === k} on:click={() => (filtro = k)}>{es ? fes : fen}</button>
      {/each}
    </div>
    <button class="lx-diario-copiar" on:click={copiarTexto} disabled={!entradas.length}>{t('Copiar texto', 'Copy text')}</button>
  </div>

  <form class="lx-diario-nota" on:submit|preventDefault={guardarNota}>
    <input bind:value={nota} maxlength="280" placeholder={t('Escribe una nota: «Brock casi me barre con Onix»…', 'Write a note: «Brock nearly swept me with Onix»…')} />
    <button type="submit" disabled={!nota.trim()}>{t('Anotar', 'Add')}</button>
  </form>

  <div class="lx-diario-hojas">
    {#each grupos as g}
      <h3><span>{t('Intento', 'Attempt')} {g.intento}</span>{g.dia}</h3>
      <ol>
        {#each g.entradas as e}
          <li class="lx-d-{e.tipo}">
            <time>{hora(e.t)}</time>
            <span class="lx-diario-marca" aria-hidden="true">{MARCA[e.tipo] || '·'}</span>
            {#if e.pokemon && sprite(e.pokemon)}
              <img src={sprite(e.pokemon)} alt="" use:recorte width="28" height="28" />
            {/if}
            <p>{frase(e)}</p>
            {#if e.tipo === 'jefe' && e.equipo?.length}
              <span class="lx-diario-equipo">
                {#each e.equipo.slice(0, 6) as m}{#if sprite(m)}<img src={sprite(m)} alt="" use:recorte width="22" height="22" />{/if}{/each}
              </span>
            {/if}
            {#if e.tipo === 'nota'}<button class="lx-diario-borrar" on:click={() => borrar(e)} title={t('Borrar nota', 'Delete note')}>✕</button>{/if}
          </li>
        {/each}
      </ol>
    {:else}
      <p class="lx-diario-vacio">
        {entradas.length ? t('Nada con este filtro.', 'Nothing with this filter.') : t('Todavía no hay nada. Captura, combate o escribe una nota y aparecerá aquí.', 'Nothing yet. Catch, battle or write a note and it will show up here.')}
      </p>
    {/each}
  </div>

  <footer>
    <span>{aviso || t('El diario apunta desde la versión 1.18.0: lo anterior no aparece.', 'The diary records from version 1.18.0 on: earlier events are not listed.')}</span>
  </footer>
</section>

<style>
  .lx-diario {
    width: min(680px, calc(100vw - 32px));
    max-height: calc(100vh - 64px);
    display: flex;
    flex-direction: column;
    background: #f8f8f0;
    color: #303840;
    border: 4px solid #283850;
    border-radius: 12px;
    box-shadow: 6px 6px 0 rgba(0, 0, 0, 0.4);
    font-family: 'LX Pixel', 'VT323', monospace;
    font-size: 12px;
  }
  :global(.dark) .lx-diario {
    background: #1c2430;
    color: #e0e6ee;
  }
  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 14px;
    background: #48a058;
    color: #fff;
    border-radius: 7px 7px 0 0;
  }
  h2 {
    font-size: 24px;
    line-height: 24px;
    text-shadow: 2px 2px 0 #205830;
  }
  .lx-diario-x {
    font-size: 18px;
    padding: 0 6px;
  }
  .lx-diario-barra {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 14px 0;
  }
  .lx-diario-filtros {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }
  .lx-diario-filtros button,
  .lx-diario-copiar,
  .lx-diario-nota button {
    padding: 2px 10px;
    border: 2px solid #283850;
    border-radius: 4px;
    background: #fff;
    color: #283850;
  }
  :global(.dark) .lx-diario-filtros button,
  :global(.dark) .lx-diario-copiar,
  :global(.dark) .lx-diario-nota button {
    background: #24303e;
    color: #e0e6ee;
    border-color: #8090a8;
  }
  .lx-diario-filtros button.lx-sel {
    background: #48a058;
    color: #fff;
  }
  .lx-diario-copiar {
    margin-left: auto;
  }
  button:disabled {
    opacity: 0.5;
  }
  .lx-diario-nota {
    display: flex;
    gap: 6px;
    padding: 8px 14px 0;
  }
  .lx-diario-nota input {
    flex: 1;
    min-width: 0;
    padding: 3px 8px;
    border: 2px solid #283850;
    border-radius: 4px;
    background: #fff;
    color: #303840;
    font-size: 12px;
  }
  :global(.dark) .lx-diario-nota input {
    background: #141c26;
    color: #e0e6ee;
    border-color: #8090a8;
  }
  /* Hojas de libreta: renglones cada 24 px */
  .lx-diario-hojas {
    flex: 1;
    overflow-y: auto;
    margin: 10px 14px;
    padding: 0 10px 8px;
    min-height: 160px;
    background: repeating-linear-gradient(180deg, transparent 0 23px, rgba(72, 120, 200, 0.18) 23px 24px), #fffff8;
    border: 2px solid #c8d0d8;
    border-radius: 4px;
  }
  :global(.dark) .lx-diario-hojas {
    background: repeating-linear-gradient(180deg, transparent 0 23px, rgba(140, 170, 220, 0.12) 23px 24px), #161e28;
    border-color: #34404e;
  }
  h3 {
    display: flex;
    align-items: baseline;
    gap: 8px;
    margin-top: 8px;
    line-height: 24px;
    color: #3868c0;
  }
  h3 span {
    padding: 0 6px;
    line-height: 16px;
    color: #fff;
    background: #3868c0;
    border-radius: 3px;
  }
  ol li {
    display: flex;
    align-items: center;
    gap: 6px;
    min-height: 24px;
  }
  time {
    flex: none;
    width: 38px;
    color: #8890a0;
  }
  .lx-diario-marca {
    flex: none;
    width: 14px;
    text-align: center;
    color: #3868c0;
  }
  li img {
    flex: none;
    image-rendering: pixelated;
  }
  li p {
    flex: 1;
    min-width: 0;
    line-height: 16px;
  }
  .lx-d-muerte .lx-diario-marca,
  .lx-d-derrota .lx-diario-marca,
  .lx-d-gameover .lx-diario-marca,
  .lx-d-gameover p {
    color: #d03838;
  }
  .lx-d-jefe .lx-diario-marca,
  .lx-d-variocolor .lx-diario-marca {
    color: #d8a020;
  }
  .lx-d-jefe p,
  .lx-d-intento p {
    color: #3868c0;
  }
  .lx-d-nota p {
    font-style: italic;
  }
  .lx-d-fallo p,
  .lx-d-descarte p {
    color: #8890a0;
  }
  .lx-diario-equipo {
    display: inline-flex;
    flex: none;
  }
  .lx-diario-borrar {
    flex: none;
    color: #a0a8b0;
    padding: 0 4px;
  }
  .lx-diario-borrar:hover {
    color: #d03838;
  }
  .lx-diario-vacio {
    padding: 24px 0;
    text-align: center;
    color: #8890a0;
    line-height: 24px;
  }
  footer {
    padding: 0 14px 10px;
    color: #8890a0;
  }
</style>
