<script>
  import { t } from '$lib/lockedex/idioma.js'
  export let sprite,
    fallback,
    name,
    types,
    tera,
    level = '',
    moves,
    maxStat,
    held = '',
    ability = '',
    stats,
    nature = undefined,
    minimal = false

  import { capitalise, regionise } from '$lib/utils/string'
  import { isEmpty } from '$lib/utils/obj'

  import { PIcon, Icon, Tooltip } from '$c/core'

  import { Hand } from '$icons'

  import { color } from '$lib/data/colors.ts'
  import { Wrapper as SettingWrapper } from '$lib/components/Settings'

  import TypeBadge from '$lib/components/type-badge.svelte'
  import MoveCard from '$lib/components/move-card.svelte'
  import { claseVista } from '$lib/lockedex/genVista.js'
  import StatBlock from '$lib/components/stat-block.svelte'

  import { UNOWN } from '$utils/rewrites'
  import { Stars as Pattern } from '$utils/pattern'
  import { recorte } from '$lib/lockedex/recorte.js'

  const canonname = name.replace(/-(Alola|Galar)/, '')

  const anim = ['bob'][Math.floor(Math.random() * 1)]
  const animDur = Math.floor(Math.random() * 4) + 4
  const animDelay = Math.floor(Math.random() * 10) / 10
</script>

<SettingWrapper id="theme" let:setting={themeId}>
  {@const color1 = color(types[0], themeId)}
  {@const color2 = color(types[1] || types[0], themeId)}
  {@const pattern = Pattern(color2)}
  <div
    class="card relative flex flex-col bg-white dark:bg-gray-900 {$$restProps.class ||
      ''}"
  >
    <div
      style={`--t-col: ${color1}; background-image: url("${pattern}");`}
      class:rounded-b-lg={minimal}
      class:minimal
      class="card__header relative z-0 flex justify-between pl-4 pt-4 pb-3"
    >
      <div class="pointer-events-none flex flex-row items-end gap-x-2">
        {#if level}
          <div class="pointer-events-auto flex flex-col items-center">
            <span class="lx-pc-nvtxt -mb-2 text-xs">{t('Nv', 'Lv')}</span>
            <span class="lx-pc-nv text-3xl font-bold">{level}</span>
            {#if level.startsWith('+') || level.startsWith('-')}
              <Tooltip>
                {t(`Calculado como el nivel máximo de tu equipo ${level}`, `Calculated as your party's Max Level ${level}`)}
              </Tooltip>
            {/if}
          </div>
        {/if}
        <span
          class="mb-0.25 relative z-40 pr-2 text-xl sm:bg-transparent dark:sm:bg-transparent"
        >
          <p
            class="pointer-events-auto relative z-40 -mb-1 h-4 w-auto text-xs sm:bg-transparent dark:sm:bg-transparent"
          >
            {#if ability}
              <span class="cursor-help" data-lx-hab={ability.name}>{ability.name}</span>
            {/if}
          </p>

          <b class="lx-pc-nombre">{regionise(capitalise(name))}</b>

          {#if held}
            <div
              class="pointer-events-auto absolute right-0 -bottom-0.5 z-20 mb-1 flex translate-x-full cursor-help flex-col items-center p-1"
              data-lx-obj={held.name}
            >
              <span>
                <PIcon type="item" name={held.sprite} />
              </span>
              <Icon
                inline={true}
                icon={Hand}
                class="-mt-3.5 fill-current dark:text-white"
              />
            </div>
          {/if}
        </span>
      </div>

      <!-- El Pokémon en un hueco fijo a la derecha, recortado a su dibujo y apoyado en el borde de abajo
           de la cabecera (como en la pantalla de datos), en vez del sprite de 160 px desplazado -->
      <div class="lx-ficha-sprite" class:lx-ficha-sprite-min={minimal}>
        <slot name="img" />
        {#if sprite}
          <img
            width="96"
            height="96"
            use:recorte={'suelo'}
            style="--v-anim-dur: {animDur}s; --v-anim-delay: {animDelay}s"
            class="{anim} img__pkm pointer-events-none"
            src={sprite}
            onerror="this.onerror=null;this.src='{fallback}'"
            alt={name}
          />
        {:else}
          <img
            width="96"
            height="96"
            src={UNOWN}
            style="--v-anim-dur: {animDur}s; --v-anim-delay: {animDelay}s"
            class="{anim} img__pkm pointer-events-none"
            alt="Unknown sprite for {name}"
          />
        {/if}
      </div>

      <div
        class:gap-1={minimal}
        class:scale-75={minimal}
        class:origin-left={minimal}
        class="type-badges absolute top-0 flex -translate-y-1/2 -translate-x-1 transform gap-x-1"
      >
        {#each types as t}
          <TypeBadge type={t} />
        {/each}
        {#if tera}
          <TypeBadge tera type={tera} />
        {/if}

        <div class="badges cursor-help" class:bottom-0={minimal}>
          <slot name="badges" />
        </div>
      </div>
    </div>

    {#if !minimal}
      <div
        style="border-color: {color(types[0], themeId)}"
        class="lx-tarjeta-pie relative z-10 flex flex-col-reverse bg-white dark:bg-gray-900 sm:items-center md:inline-flex md:flex-row"
      >
        {#if moves && moves.length}
          <div
            class="my-3 ml-4 grid flex-2 grid-cols-2 gap-x-4 gap-y-0 lg:gap-y-3"
          >
            {#each moves.filter((m) => !isEmpty(m)) as m}
              <MoveCard {...m} damage_class={claseVista(m.damage_class, m.type)} stab={types.includes(m.type)} />
            {/each}
          </div>
        {/if}

        {#if $$slots.stats}
          <slot name="stats" />
        {:else}
          <StatBlock
            class="mx-4 mt-4 w-auto flex-1 grow grid-cols-20 md:mt-3"
            col={color(types[0], themeId)}
            {nature}
            max={maxStat}
            {...stats}
          />
        {/if}
      </div>

      <slot name="footer" id={canonname} />
    {/if}
  </div>
</SettingWrapper>

<style lang="postcss">
  /* Estética de la pantalla de datos de GBA: cabecera con el color del tipo y líneas de barrido (en vez
     del patrón), nombre y nivel con la letra pixelada y sombra, y el Pokémon salta al pasar por encima */
  .card__header {
    background-color: var(--t-col);
    background-image: repeating-linear-gradient(0deg, rgba(255, 255, 255, 0.16) 0 2px, transparent 2px 4px) !important;
    box-shadow: inset 0 -3px 0 rgba(0, 0, 0, 0.25), inset 0 2px 0 rgba(255, 255, 255, 0.3);
  }
  .lx-pc-nombre,
  .lx-pc-nv,
  .lx-pc-nvtxt {
    font-family: 'LX Pixel', 'VT323', monospace;
    font-weight: normal;
    color: #f8f8f8;
    text-shadow: 2px 2px 0 rgba(30, 30, 50, 0.65);
  }
  .lx-pc-nombre {
    font-size: 24px;
    line-height: 24px;
    text-transform: uppercase;
  }
  .lx-pc-nv {
    font-size: 24px !important;
    line-height: 24px;
  }
  .lx-pc-nvtxt {
    font-size: 12px !important;
  }
  /* sin el velo blanco del original: color del tipo entero para que el nombre se lea */
  .card__header::before {
    display: none !important;
  }
  .card:hover :global(.img__pkm) {
    animation: lx-ficha-salto 0.5s steps(1, end) infinite !important;
  }
  @keyframes lx-ficha-salto {
    50% {
      translate: 0 -6px;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .card:hover :global(.img__pkm) {
      animation: none !important;
    }
  }

  img {
    image-rendering: pixelated;
  }

  .badge-grid::before {
    content: '';
    width: calc(100% + 4px);
    height: calc(50% + 4px);
    left: -2px;
    @apply absolute top-1/2 -z-10 bg-gray-900;
  }

  .badge-grid > :global(*) {
    @apply w-6 scale-125;
  }
  .badge-grid > :global(*:first-child) {
    @apply ml-1;
  }
  .badge-grid > :global(*:last-child) {
    @apply !mr-1;
  }

  .badge-grid > :global(*:nth-child(2n)) {
    @apply -mx-2 translate-y-1;
  }
  .badge-grid > :global(*:nth-child(2n + 1)) {
    @apply -translate-y-1;
  }

  /* Ficha Lockedex: contorno de tinta y sombra plana */
  .card {
    border: 3px solid var(--lx-tinta);
    border-radius: var(--lx-radio);
    box-shadow: var(--lx-sombra);
  }
  .card__header {
    border-radius: 11px 11px 0 0;
  }
  .lx-tarjeta-pie {
    border-top: 3px solid var(--lx-tinta);
    border-radius: 0 0 11px 11px;
  }

  .card__header::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    bottom: 0;
    right: 0;
    border-radius: 11px 11px 0 0;
  }

  .card__header.minimal::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    bottom: 0;
    right: 0;
    border-radius: 11px;
  }

  .card__header {
    z-index: 0;
    background-color: var(--t-col);
  }

  .card__header::before {
    z-index: -1;
    background: linear-gradient(130deg, white 40%, transparent);
  }

  :global(.dark) .card__header::before {
    background: linear-gradient(
      130deg,
      theme('colors.gray.900') 40%,
      transparent
    );
  }

  .lx-ficha-sprite {
    position: absolute;
    right: 6px;
    bottom: 3px;
    width: 80px;
    height: 80px;
    z-index: 0;
    pointer-events: none;
  }
  .lx-ficha-sprite-min {
    width: 64px;
    height: 64px;
  }
  .lx-ficha-sprite .img__pkm {
    width: 100%;
    height: 100%;
    transform-origin: 50% 100%;
  }

  img {
    animation-delay: var(--v-anim-delay);
  }
  img.bob {
    -webkit-animation: bob var(--v-anim-dur) ease infinite;
    animation: bob var(--v-anim-dur) ease infinite;
  }

  @keyframes bob {
    0%,
    100% {
      transform: translate(var(--tw-translate-x), var(--tw-translate-y))
        scaleX(1) scaleY(1);
    }
    25%,
    75% {
      transform: translate(var(--tw-translate-x), var(--tw-translate-y))
        scaleX(1.02) scaleY(0.95);
    }
    50% {
      transform: translate(var(--tw-translate-x), var(--tw-translate-y))
        scaleX(0.95) scaleY(1.03);
    }
  }

  .badges {
    @apply ml-5 -mt-1 h-4 scale-150 md:ml-2 md:scale-110;
  }

  :global(.box) .type-badges {
    @apply origin-left scale-[0.8];
  }

  .minimal .badges {
    @apply absolute -bottom-16 origin-left translate-y-2 scale-100 max-md:-left-2;
  }

  .badges > :global(*:nth-child(even) i) {
    @apply z-50 -mx-1 translate-y-1.5;
  }
  .badges > :global(*:nth-child(odd) i) {
    @apply z-10 -mx-1 -translate-y-1;
  }
</style>
