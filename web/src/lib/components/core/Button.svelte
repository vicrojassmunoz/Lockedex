<script>
  import { createEventDispatcher } from 'svelte'

  export let className = '', rounded = false, disabled = false, tabIndex = 1, solid = false

  const dispatch = createEventDispatcher()
  const onclick = _ => !disabled && dispatch('click')
</script>

<button
  {tabIndex}
  {disabled}
  on:click={onclick}
  class:disabled={disabled}
  class:rounded-lg={rounded}
  class:solid={solid}
  class='border-2 ring-2 ring-transparent px-4 transition-colors h-10 {className} {$$restProps.class || ''}'
>
  <slot />
</button>

<style lang="postcss">
  /* Botón Lockedex: contorno de tinta, esquinas redondeadas y sombra que se hunde al pulsar */
  :root {
    --b-fg: var(--lx-texto);
    --b-borde: var(--lx-tinta);
    --b-bg: var(--lx-panel);
    --b-light-1: var(--lx-acento-suave);
    --b-light-2: transparent;
    --b-highlight-1: var(--lx-rojo);
    --b-highlight-2: var(--lx-rojo-claro);
  }

  :global(.dark) {
    --b-borde: #6b7280;
  }

  .solid {
    --b-fg: #fff;
    --b-bg: var(--lx-rojo);
    --b-borde: var(--lx-tinta);
  }

  :global(.dark) .solid {
    --b-fg: #fff;
    --b-bg: var(--lx-rojo);
    --b-borde: var(--lx-tinta);
  }

  button {
    color: var(--b-fg);
    border-color: var(--b-borde);
    background-color: var(--b-bg);
    border-radius: var(--lx-radio-sm);
    box-shadow: var(--lx-sombra-sm);
    transition: color 0.12s, background-color 0.12s, border-color 0.12s, transform 0.06s, box-shadow 0.06s;
  }

  button.solid {
    font-weight: bold;
  }

  button:hover {
    color: var(--b-highlight-1);
    border-color: var(--b-highlight-1);
  }

  button.solid:hover {
    color: #fff;
    border-color: var(--lx-tinta);
    background-color: var(--b-highlight-2);
  }

  button:hover:active {
    color: var(--b-highlight-1);
    background-color: var(--b-light-1);
    transform: translate(2px, 2px);
    box-shadow: none;
    --tw-ring-color: var(--b-light-2);
  }

  button.solid:hover:active {
    color: #fff;
    background-color: var(--lx-rojo-oscuro);
  }

  button.disabled,
  button.disabled:hover,
  button.disabled:hover:active
  {
    color: var(--b-fg);
    border-color: var(--b-borde);
    background-color: var(--b-bg);
    cursor: initial;
    opacity: 0.3;
    transform: none;
    box-shadow: none;
  }
</style>
