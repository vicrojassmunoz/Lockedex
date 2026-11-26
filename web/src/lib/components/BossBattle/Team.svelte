<script>
  // Equipos de la presentación del VS: cada Pokémon en un hueco cuadrado recortado a su dibujo y apoyado
  // en la línea de abajo de la cabecera. El tamaño del hueco depende de cuántos haya (para que quepan
  // sin escalar a 1,25 ni amontonarse) y el primero queda junto a la insignia VS.
  export let type = 'attack',
    team = []

  import { fade } from 'svelte/transition'
  import { flip } from 'svelte/animate'

  import { createImgUrl } from '$utils/rewrites'
  import { recorte } from '$lib/lockedex/recorte.js'

  const sprite = (p, status) => {
    return createImgUrl(
      { imgId: p?.original?.sprite || p?.imgId, imgUrl: p.imgUrl },
      { ext: 'png', shiny: status === 6 }
    )
  }

  const LADOS = [88, 88, 80, 72, 64, 56, 52]
  $: lado = LADOS[Math.min(team.length, 6)]
</script>

<div
  class="lx-vs-equipo"
  class:lx-vs-izq={type === 'attack'}
  style="--lado: {lado}px"
>
  {#each team as p, i (p?.original?.customId || p?.original?.location || i)}
    <span class="lx-vs-hueco" style="z-index: {20 - i}" animate:flip={{ duration: 250 }}>
      <img
        in:fade={{ duration: 200 }}
        width="96"
        height="96"
        use:recorte={'suelo'}
        style="--bob-delay: {(2 * i) / 10}s"
        alt={p.name}
        src={sprite(p, p?.original?.status)}
      />
    </span>
  {/each}
</div>

<style>
  .lx-vs-equipo {
    display: flex;
    align-items: flex-end;
    height: 80px;
    padding: 0 6px 8px;
  }
  .lx-vs-izq {
    flex-direction: row-reverse;
  }
  .lx-vs-hueco {
    position: relative;
    flex: none;
    width: var(--lado);
    height: var(--lado);
    margin-inline: calc(var(--lado) * -0.1);
  }
  img {
    width: 100%;
    height: 100%;
    image-rendering: pixelated;
    transform-origin: 50% 100%;
    animation: lx-vs-bob 5.5s ease var(--bob-delay) infinite;
  }
  /* los tuyos miran hacia el rival */
  .lx-vs-izq img {
    transform: scaleX(-1);
  }
  @keyframes lx-vs-bob {
    0%,
    100% {
      scale: 1 1;
    }
    25%,
    75% {
      scale: 1.03 0.97;
    }
    50% {
      scale: 0.98 1.03;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    img {
      animation: none;
    }
  }
</style>
