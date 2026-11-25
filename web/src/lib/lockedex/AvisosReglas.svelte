<script>
  // Avisos de reglas en la página de la partida (y recordatorio de las reglas activas)
  import { onMount } from 'svelte'
  import { equipoActual } from './equipo.js'
  import { cargarLiga, alCambiarDatos } from './partida.js'
  import { cargarPokedex } from './analista.js'
  import { comprobarReglas, leerReglas, REGLAS, PLANTILLAS } from './reglas.js'
  import { idioma, traducirNombre } from './idioma.js'

  const es = idioma() === 'es'
  let avisos = []
  let activas = []
  let plantilla = ''
  let plegado = false

  const actualizar = async () => {
    try {
      const actual = await equipoActual()
      if (!actual) return
      const reglas = leerReglas(actual.partida.id)
      plantilla = reglas.plantilla && PLANTILLAS[reglas.plantilla] ? (es ? PLANTILLAS[reglas.plantilla].es : PLANTILLAS[reglas.plantilla].en) : ''
      activas = REGLAS.filter((r) => reglas[r.id]).map((r) =>
        r.tipo === 'tipo' ? `${es ? r.es : r.en}: ${traducirNombre(reglas[r.id].charAt(0).toUpperCase() + reglas[r.id].slice(1))}` : es ? r.es : r.en
      )
      const [liga, pokedex] = await Promise.all([
        cargarLiga(actual.partida.juego, actual.partida.datos?.__starter || 'fire'),
        cargarPokedex(actual.partida.juego)
      ])
      avisos = await comprobarReglas({ partida: actual.partida, resumen: actual.resumen, liga, pokedex })
      window.dispatchEvent(new CustomEvent('lx:avisos', { detail: avisos.filter((a) => a.nivel !== 'info').length }))
    } catch (e) {
      console.error('[reglas]', e)
    }
  }

  onMount(() => {
    actualizar()
    return alCambiarDatos(() => setTimeout(actualizar, 300))
  })
</script>

{#if activas.length || avisos.length}
  <section class="lx-avisos" class:lx-con-error={avisos.some((a) => a.nivel === 'error')} data-lx-original>
    <div class="lx-av-cab">
      <b>{plantilla || (es ? 'Reglas' : 'Rules')}</b>
      <span class="lx-av-chips">{#each activas as a}<i>{a}</i>{/each}</span>
      {#if avisos.length}
        <button on:click={() => (plegado = !plegado)}>{plegado ? '▾' : '▴'} {avisos.length} {es ? (avisos.length === 1 ? 'aviso' : 'avisos') : avisos.length === 1 ? 'warning' : 'warnings'}</button>
      {/if}
    </div>
    {#if avisos.length && !plegado}
      <ul>
        {#each avisos as a}<li class="lx-av-{a.nivel}">{a.texto}</li>{/each}
      </ul>
    {/if}
  </section>
{/if}

<style>
  .lx-avisos {
    width: 100%;
    max-width: min(100%, 600px);
    border: 3px solid #1b1b1f;
    border-radius: 12px;
    padding: 8px 12px;
    background: #fff;
    box-shadow: 3px 3px 0 rgba(0, 0, 0, 0.12);
    font-size: 13px;
  }
  :global(.dark) .lx-avisos {
    background: #1e1c33;
  }
  .lx-con-error {
    border-color: #dc0a2d;
  }
  .lx-av-cab {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }
  .lx-av-cab b {
    font-family: 'VT323', monospace;
    font-size: 20px;
  }
  .lx-av-chips {
    display: flex;
    gap: 4px;
    flex-wrap: wrap;
    flex: 1;
  }
  .lx-av-chips i {
    font-style: normal;
    font-size: 11px;
    padding: 2px 7px;
    border-radius: 6px;
    background: rgba(0, 0, 0, 0.06);
  }
  .lx-av-cab button {
    font-size: 12px;
    font-weight: 600;
    color: #dc0a2d;
  }
  ul {
    margin-top: 6px;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  li {
    padding: 4px 8px 4px 24px;
    position: relative;
    border-radius: 6px;
  }
  li::before {
    position: absolute;
    left: 8px;
    font-weight: 700;
  }
  .lx-av-error {
    background: #fee2e2;
    color: #7f1d1d;
  }
  .lx-av-error::before {
    content: '✕';
  }
  .lx-av-aviso {
    background: #fef9c3;
    color: #713f12;
  }
  .lx-av-aviso::before {
    content: '!';
  }
  .lx-av-info {
    background: rgba(0, 0, 0, 0.04);
  }
  .lx-av-info::before {
    content: 'i';
  }
  :global(.dark) .lx-av-error {
    background: #7f1d1d;
    color: #fee2e2;
  }
  :global(.dark) .lx-av-aviso {
    background: #713f12;
    color: #fef9c3;
  }
</style>
