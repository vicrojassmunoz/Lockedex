<script>
  import { PIcon, Icon } from '$c/core'
  import { encajarIcono } from '$lib/lockedex/encajar.js'
  import { Plus } from '$icons'
  import { t } from '$lib/lockedex/idioma.js'
  import { fade, scale } from 'svelte/transition'
  import { drag } from '$utils/drag'

  import { createEventDispatcher } from 'svelte'
  const dispatch = createEventDispatcher()

  export let mons = [],
    iconKey

  //  Action types
  let action, over

  const getAttr = (target, attr) => {
    return (
      target.getAttribute(attr) ||
      target.querySelector(`[${attr}]`)?.getAttribute(attr) ||
      target.closest(`[${attr}]`)?.getAttribute(attr)
    )
  }

  function dragAdd(evt) {
    dragOver(evt)
    action = getAttr(evt.target, 'data-drag-action')
  }

  function dragReplace(evt) {
    dragOver(evt)
    action = getAttr(evt.target, 'data-drag-action')
  }

  function dragOver(evt) {
    over =
      evt.target.getAttribute('data-drag-id') ||
      evt.target
        .querySelector('[data-drag-id]')
        ?.getAttribute('[data-drag-id]') ||
      evt.target.closest('[data-drag-id]')?.getAttribute('[data-drag-id]')

    return false
  }

  function dragLeave() {
    over = null
    action = null
  }

  function onDrop(evt) {
    evt.stopPropagation()
    const data = JSON.parse(evt.dataTransfer.getData('data'))
    const srcId = +evt.dataTransfer.getData('srcId')
    const act = evt.dataTransfer.getData('effect') === 'move' ? 'swap' : action

    if (!over) return dragLeave()

    dispatch(act, { data, targetId: +over, srcId })
    dragLeave()
  }

</script>

<div
  class="mx-auto inline-flex items-center gap-x-4 md:mt-0.5 md:scale-110 md:transform {$$restProps.class ||
    ''}"
>
  {#each mons as p, i}
    <button
      use:drag={{ data: p, id: i, effect: 'move' }}
      on:click={() => dispatch('abrir', i)}
      title={t('Abrir el menú de equipo', 'Open the party menu')}
      aria-label={t('Abrir el menú de equipo', 'Open the party menu')}
      on:dragenter={dragReplace}
      on:dragleave={dragLeave}
      on:drop={onDrop}
      data-drag-id={i}
      data-drag-action="replace"
      class:opacity-50={over && +over === i}
      ondragover="return false"
      class="lx-hueco-equipo group relative h-10 w-10 cursor-pointer transition"
    >
      <span class="pointer-events-none" in:scale={{ duration: 500 }} use:encajarIcono={{ nombre: p?.[iconKey], max: 46 }}>
        <PIcon
          class="pointer-events-none absolute left-1/2 top-1/2 -mt-0.5 -translate-y-1/2 -translate-x-1/2 opacity-30 dark:opacity-80 dark:contrast-50 lx-silueta"
          name="unknown-pokemon2"
        />

        <PIcon
          class="data-drag-img lx-encajar pointer-events-none absolute left-1/2 top-1/2 -translate-y-1/2 -translate-x-1/2 scale-150 transform"
          name={p?.[iconKey]}
        />
      </span>

    </button>
  {/each}

  {#each Array(6 - mons.length).fill() as _, i}
    <button
      on:click={() => dispatch('abrir', 'meter')}
      title={t('Meter un Pokémon de la caja', 'Add a Pokémon from your box')}
      aria-label={t('Meter un Pokémon de la caja', 'Add a Pokémon from your box')}
    >
      <p
        on:dragenter={dragAdd}
        on:dragleave={dragLeave}
        on:drop={onDrop}
        class:opacity-40={over && +over === i + mons.length}
        data-drag-id={i + mons.length}
        data-drag-action="add"
        ondragover="return false"
        class="lx-hueco-equipo group relative h-10 w-10 cursor-pointer transition"
      >
        <PIcon
          class="pointer-events-none absolute left-1/2 top-1/2 -mt-[2px] -translate-y-1/2 -translate-x-1/2 opacity-40 brightness-200 contrast-200 transition group-hover:opacity-100 dark:contrast-0 lx-silueta"
          name="unknown-pokemon2"
        />

        <Icon
          class="pointer-events-none absolute right-0.5 top-1 rounded-full bg-white opacity-0 transition group-hover:opacity-100 dark:bg-gray-800 dark:text-gray-400"
          inline
          icon={Plus}
        />
      </p>
    </button>
  {/each}
</div>
