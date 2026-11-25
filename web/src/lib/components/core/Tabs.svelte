<script>
  export let name,
    selected,
    tabs = [],
    className = '',
    labelClassName = '',
    select = (i) => i.val,
    active = 0

  $: selected = select(tabs[active]) || active
</script>

<div
  class="sm:w-initial flex w-full flex-row gap-x-4 overflow-x-auto {className}"
>
  {#each tabs as tab, i}
    <label
      class:active={active === i}
      class="cursor-pointer text-base transition-colors {labelClassName}"
    >
      <input type="radio" bind:group={active} {name} value={i} />
      <span>{typeof tab === 'string' ? tab : tab.label}</span>
    </label>
  {/each}
</div>

<style lang="postcss">
  /* Pestañas Lockedex: fichas con contorno de tinta; la activa en rojo */
  div {
    width: calc(100% - theme('spacing.8'));
    column-gap: 6px !important;
    padding: 2px 4px 4px 2px;
  }
  @media (min-width: theme('screens.sm')) {
    div {
      width: auto;
    }
  }
  input {
    display: none;
  }
  span {
    white-space: pre;
  }
  label {
    padding: 3px 12px 2px;
    font-family: 'VT323', monospace;
    font-size: 19px !important;
    line-height: 1.1;
    letter-spacing: 0.3px;
    color: var(--lx-texto-suave);
    background: var(--lx-panel);
    border: 2px solid var(--lx-bisel);
    border-radius: var(--lx-radio-sm);
  }
  label:hover {
    color: var(--lx-texto);
    border-color: var(--lx-tinta);
  }
  label.active {
    color: #fff;
    background: var(--lx-rojo);
    border-color: var(--lx-tinta);
    box-shadow: var(--lx-sombra-sm);
  }
  :global(.dark) label:hover {
    border-color: #6b7280;
  }
</style>
