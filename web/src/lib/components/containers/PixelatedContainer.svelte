<script>
  // Antes era el marco pixelado del original; ahora es el panel Lockedex (franja roja con luces).
  // `width` y `border` se mantienen por compatibilidad con quien los pase.
  export let className = '', width = undefined, border = undefined
</script>

<div class="lx-panel {className}">
  <slot />
</div>

<style lang="postcss">
  @media (min-width: theme('screens.sm')) {
    div {
      min-width: theme('maxWidth.lg');
    }
  }
</style>
