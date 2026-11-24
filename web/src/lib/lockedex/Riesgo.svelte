<script>
  // Medidor de riesgo de un combate (estilo barra de PS de 5 tramos)
  import { RIESGO } from './colores.js'
  import { idioma } from './idioma.js'

  export let nivel = null
  export let grande = false
  export let consejos = []
  export let ocultarConsejos = false
  export let modo = ''

  const es = idioma() === 'es'
  let abierto = false

  $: r = nivel === null ? null : RIESGO[nivel]
</script>

{#if r}
  <span
    class="lx-riesgo"
    class:lx-grande={grande}
    class:lx-mortal={nivel === 4}
    style="--c:{r.color}"
    on:mouseenter={() => (abierto = !grande)}
    on:mouseleave={() => (abierto = false)}
    data-lx-original
  >
    <span class="lx-riesgo-etq">{es ? 'RIESGO' : 'RISK'}</span>
    <span class="lx-riesgo-tramos">
      {#each RIESGO as t, i}
        <i class:lx-on={i <= nivel} style={i <= nivel ? `background:${r.color}` : ''} />
      {/each}
    </span>
    <span class="lx-riesgo-nombre">
      {#if nivel === 4}<span class="lx-calavera">☠</span>{/if}{es ? r.es : r.en}
    </span>

    {#if abierto && consejos.length}
      <span class="lx-riesgo-pop">
        {#if ocultarConsejos}
          <em>{es ? 'Revela el equipo para ver los consejos.' : 'Reveal the team to see tips.'}</em>
        {:else}
          {#each consejos.slice(0, 4) as c}
            <span class="lx-consejo lx-{c.tipo}">{c.texto}</span>
          {/each}
          <small>
            {modo === 'calculadora'
              ? es ? 'Calculado con tu partida del emulador' : 'Calculated from your emulator save'
              : es ? 'Estimación por tipos · importa tu .sav para afinarla' : 'Type-based estimate · import your .sav to refine'}
          </small>
        {/if}
      </span>
    {/if}
  </span>
{/if}

<style>
  .lx-riesgo {
    position: relative;
    display: inline-flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 2px;
    font-family: 'VT323', monospace;
    line-height: 1;
    padding: 4px 7px 3px;
    border-radius: 8px;
    background: #1b1b1f;
    color: #fff;
    box-shadow: inset 0 0 0 2px #000;
    cursor: help;
  }
  .lx-riesgo-etq {
    font-size: 11px;
    letter-spacing: 1px;
    color: #a1a1aa;
  }
  .lx-riesgo-tramos {
    display: flex;
    gap: 2px;
  }
  .lx-riesgo-tramos i {
    width: 9px;
    height: 7px;
    border-radius: 2px;
    background: #3a3a42;
  }
  .lx-riesgo-tramos i.lx-on {
    box-shadow: 0 0 5px var(--c);
  }
  .lx-riesgo-nombre {
    font-size: 15px;
    color: var(--c);
    white-space: nowrap;
  }
  .lx-grande {
    padding: 8px 12px 6px;
    gap: 4px;
  }
  .lx-grande .lx-riesgo-etq {
    font-size: 14px;
  }
  .lx-grande .lx-riesgo-tramos i {
    width: 22px;
    height: 12px;
    border-radius: 3px;
  }
  .lx-grande .lx-riesgo-nombre {
    font-size: 26px;
  }
  .lx-mortal {
    animation: temblor 2.6s ease-in-out infinite;
  }
  .lx-calavera {
    display: inline-block;
    margin-right: 3px;
    animation: latido 1s ease-in-out infinite;
  }
  @keyframes latido {
    50% {
      transform: scale(1.25);
    }
  }
  @keyframes temblor {
    0%,
    86%,
    100% {
      transform: translateX(0);
    }
    88% {
      transform: translateX(-2px) rotate(-1deg);
    }
    92% {
      transform: translateX(2px) rotate(1deg);
    }
    96% {
      transform: translateX(-1px);
    }
  }
  .lx-riesgo-pop {
    position: absolute;
    z-index: 60;
    right: 0;
    top: calc(100% + 8px);
    width: 320px;
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 10px;
    background: #fbfbf7;
    color: #1b1b1f;
    border: 3px solid #1b1b1f;
    border-radius: 10px;
    box-shadow: 4px 4px 0 rgba(0, 0, 0, 0.35);
    font-family: Inter, system-ui, sans-serif;
    font-size: 13px;
    line-height: 1.35;
    cursor: default;
  }
  :global(.dark) .lx-riesgo-pop {
    background: #16202c;
    color: #e8eef5;
  }
  .lx-consejo {
    padding-left: 18px;
    position: relative;
  }
  .lx-consejo::before {
    position: absolute;
    left: 0;
    top: 0;
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
    left: 4px;
  }
  .lx-riesgo-pop small {
    opacity: 0.6;
    font-size: 11px;
  }
</style>
