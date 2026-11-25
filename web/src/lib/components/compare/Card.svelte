<script>
  export let pokemon = [],
    className = ''

  import { fade } from 'svelte/transition'

  import { Icon, PIcon, Tooltip } from '$c/core'
  import { Hand } from '$icons'
  import Vs from '$lib/components/BossBattle/Vs.svelte'

  import { Wrapper as SettingWrapper } from '$lib/components/Settings'
  import { color } from '$lib/data/colors.ts'

  import { createImgUrl } from '$utils/rewrites'

  $: atk = pokemon[0]
  $: def = pokemon[1]

  const sprite = (p, status) =>
    createImgUrl(
      { imgId: p?.original?.sprite ?? p.imgId, imgUrl: p.imgUrl },
      { ext: 'png', shiny: status === 6 }
    )
</script>

<SettingWrapper id="theme" let:setting={themeId}>
  <section
    in:fade|local
    class="relative shadow-lg dark:text-gray-50 {className}"
  >
    <!-- Pokemon face off -->
    <div
      class="relative -mt-8 flex h-24 flex-row justify-around overflow-hidden"
    >
      <!-- Colouring for types -->
      {#key `atk__${atk.name}`}
        <div
          in:fade={{ duration: 400, delay: 100 }}
          class="absolute bottom-0 top-0 left-0 mt-8 overflow-hidden rounded-tl-lg"
          style="width: 50%; background: {color(atk.types, themeId)};"
        >
          <div
            class="absolute inset-0"
            style="background-image: repeating-linear-gradient(0deg, rgba(255, 255, 255, 0.14) 0 2px, transparent 2px 4px)"
          />
        </div>
      {/key}

      {#key `def__${def.name}`}
        <div
          in:fade={{ duration: 400, delay: 100 }}
          class="absolute bottom-0 top-0 left-1/2 mt-8 overflow-hidden rounded-tr-lg"
          style="width: 50%; background: {color(def.types, themeId)};"
        >
          <div
            class="absolute inset-0"
            style="background-image: repeating-linear-gradient(0deg, rgba(255, 255, 255, 0.14) 0 2px, transparent 2px 4px)"
          />
        </div>
      {/key}
      <div
        class="divider absolute bottom-0 top-0 left-0 mt-8 rounded-t-lg"
        style="width: 100%;"
      />

      <!-- Images -->
      {#key `atk__${atk.name}`}
        <img
          alt={atk.name}
          in:fade={{ duration: 500 }}
          class="flip z-20 -mx-6 flex h-32 w-32"
          style="transform: scaleX(-1); "
          src={sprite(atk, atk.status)}
        />
      {/key}
      {#key `def__${def.name}`}
        <img
          alt={def.name}
          in:fade={{ duration: 500 }}
          class="z-20 -mx-6 flex h-32 w-32"
          src={sprite(def)}
        />
      {/key}

      {#if def?.original?.held}
        {#key def.original.held.name}
          <div
            style="transform: translate(var(--tw-translate-x),var(--tw-translate-y)) scaleX(-1)"
            class="absolute right-0 top-1/2 z-20 mb-1 flex -translate-y-3 -translate-x-5 cursor-help flex-col items-center p-1"
          >
            <Tooltip>
              {def.original.held.name}: {def.original.held.effect.replace(
                /^Held: +/g,
                ''
              )}
            </Tooltip>
            <span>
              <PIcon type="item" name={def.original.held.sprite} />
            </span>
            <Icon
              inline={true}
              icon={Hand}
              class="-mt-3.5 fill-current dark:text-white"
            />
          </div>
        {/key}
      {/if}

      <!-- Insignia VS a píxeles -->
      <div class="absolute left-1/2 bottom-2 z-30 -translate-x-1/2">
        <Vs />
      </div>
    </div>

    <div
      class="separator w-full"
      style="background: linear-gradient(90deg, {color(
        atk.types,
        themeId
      )} 35%, {color(def.types, themeId)} 65%, {color(def.types, themeId)});"
    />

    <slot />
  </section>
</SettingWrapper>

<style lang="postcss">
  img.flip {
    animation: bob-left 4.5s ease 0.3s infinite;
  }
  img {
    animation: bob 5.5s ease 0.3s infinite;
    image-rendering: pixelated;
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
        scaleX(1.03) scaleY(0.97);
    }
    50% {
      transform: translate(var(--tw-translate-x), var(--tw-translate-y))
        scaleX(0.99) scaleY(1.03);
    }
  }

  @keyframes bob-left {
    0%,
    100% {
      transform: translate(var(--tw-translate-x), var(--tw-translate-y))
        scaleX(-1) scaleY(1);
    }
    25%,
    75% {
      transform: translate(var(--tw-translate-x), var(--tw-translate-y))
        scaleX(-1.02) scaleY(0.97);
    }
    50% {
      transform: translate(var(--tw-translate-x), var(--tw-translate-y))
        scaleX(-0.96) scaleY(1.01);
    }
  }

  .separator {
    height: theme('borderWidth.2');
  }
  :global(.dark) .divider {
    background: linear-gradient(
      30deg,
      transparent,
      theme('colors.gray.900') 40%,
      theme('colors.gray.900') 60%,
      transparent
    );
  }
  .divider {
    background: linear-gradient(
      30deg,
      transparent,
      theme('colors.white') 40%,
      theme('colors.white') 60%,
      transparent
    );
  }
</style>
