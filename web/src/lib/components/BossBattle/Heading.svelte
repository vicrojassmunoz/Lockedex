<script>
  import { FormalInvitation as Pattern } from '$lib/utils/pattern'
  import { bossToImage } from '$lib/utils/rewrites.js'
  import { Wrapper as SettingWrapper } from '$lib/components/Settings'
  import { color } from '$lib/data/colors.ts'

  export let atkType = null,
    boss = null

  export let atkStats
  export let defStats

  const rColDefault = '#cd4184',
    lColDefault = '#2f78df'

  const lCol = (tid) => (atkType ? color(atkType, tid) : lColDefault)
  const rCol = (tid) =>
    boss?.speciality ? color(boss?.speciality, tid) : rColDefault

  const center = 50

  let img = bossToImage(boss);
</script>

{#if boss?.img}
  <img
    alt='Boss image for {boss.name}'
    class="absolute right-4 -top-5 -z-10 scale-150 md:-top-7 md:right-8 md:scale-200"
    src="{img.src}.png"
  />
{/if}

<SettingWrapper id="theme" let:setting={themeId}>
  <!-- Presentación de combate como en los juegos: dos mitades con el color de cada lado, corte en
       diagonal, líneas de barrido de la GBA y un canto oscuro abajo -->
  <div
    class="bbheading lx-vs-fondo"
    style="--izq: {lCol(themeId)}; --der: {rCol(themeId)}"
  />
  <!-- Base stat totals -->

  <div style="--b-col: {lCol(themeId)}" class="bst lx-vs-pb" title="Puntos base del equipo"><small>PB</small><b>{atkStats}</b></div>
  <div style="--b-col: {rCol(themeId)}" class="bst lx-vs-pb" title="Puntos base del equipo"><small>PB</small><b>{defStats}</b></div>
</SettingWrapper>

<style>
  .lx-vs-fondo {
    background:
      repeating-linear-gradient(0deg, rgba(255, 255, 255, 0.14) 0 2px, transparent 2px 4px),
      linear-gradient(105deg, var(--izq) 0 48.6%, #f8f8f8 48.6% 50%, #283850 50% 51.4%, var(--der) 51.4%);
    box-shadow: inset 0 -4px 0 rgba(0, 0, 0, 0.35), inset 0 2px 0 rgba(255, 255, 255, 0.25);
    image-rendering: pixelated;
  }
  /* Recuadros de puntos base como los de PS de la consola: blanco, contorno oscuro, letra pixelada */
  .lx-vs-pb {
    display: flex !important;
    align-items: baseline;
    gap: 4px;
    padding: 0 8px !important;
    border-radius: 0 !important;
    border: 2px solid #283850 !important;
    box-shadow: inset 0 -3px 0 #c8d0d8, 3px 3px 0 rgba(0, 0, 0, 0.25);
    background: #f8f8f8 !important;
    color: #404850;
    font-family: 'LX Pixel', 'VT323', monospace;
    clip-path: polygon(2px 0, calc(100% - 2px) 0, 100% 2px, 100% calc(100% - 2px), calc(100% - 2px) 100%, 2px 100%, 0 calc(100% - 2px), 0 2px);
  }
  .lx-vs-pb small {
    font-size: 12px;
    color: var(--b-col);
  }
  .lx-vs-pb b {
    font-size: 24px;
    line-height: 26px;
    font-weight: normal;
  }
  .lx-vs-pb b::before {
    display: none;
  }
  img {
    image-rendering: pixelated;
  }

  .desk-only {
    @apply flex;
  }

  .bst,
  .bst b::before {
    @apply z-50 bg-white;
  }

  :global(.dark) .bst,
  :global(.dark) .bst b::before {
    @apply bg-gray-900;
  }

  .bst {
    border-color: var(--b-col);
    @apply absolute top-20 left-2 z-50 translate-y-1 scale-90 rounded-lg border-2 px-2 md:left-5;
  }

  .bst b {
    @apply z-50;
  }

  .bst b::before {
    content: '';
    z-index: -10;
    width: calc(100% + 4px);
    left: -2px;
    bottom: -2px;
    height: 14px;
    @apply absolute;
  }

  .bst {
    @apply max-md:top-16;
  }

  .bst ~ .bst {
    @apply left-auto right-2 md:right-5;
  }

  :root {
    --bbbgcol: white;
  }

  :global(.dark) {
    --bbbgcol: theme('colors.gray.900');
  }

  .bbheading {
    @apply absolute inset-0 top-6 h-20 w-full translate-y-2 overflow-hidden rounded-t-lg;
  }

  @media (min-width: theme('screens.md')) {
    .bbheading {
      @apply inset-0 top-6 h-20;
    }
  }

  .bbanim {
    animation: animVsPulse 6s ease infinite forwards;
  }

  @keyframes animVsPulse {
    0%,
    100% {
      opacity: 90%;
    }
    50% {
      opacity: 50%;
    }
  }
</style>
