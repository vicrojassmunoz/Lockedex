<script>
  import { onMount } from 'svelte'
  import { Icon } from '$c/core'
  import { GitHub } from '$icons'
  import { t } from '$lib/lockedex/idioma'

  let version = ''
  onMount(() => (version = window.lockedex?.version || ''))
</script>

<!-- Créditos del original: obligatorios por la licencia BSD-3 (también en Acerca de y en /credit) -->
<footer class="{$$restProps.class || ''}" data-lx-original>
  <p class="lx-pie-marca">
    <img src="/lx/icono.svg" alt="" width="18" height="18" />
    <strong>Lockedex</strong>{#if version}<span class="lx-pie-version">v{version}</span>{/if}
    <span class="lx-pie-sep">·</span>
    <a href="https://github.com/vicrojassmunoz/Lockedex/issues" rel="noreferrer" target="_blank" title={t('Avisar de un fallo', 'Report a bug')}>
      <Icon inline={true} class="fill-current" icon={GitHub} />
      {t('Avisar de un fallo', 'Report a bug')}
    </a>
    <span class="lx-pie-sep">·</span>
    <a href="/credit">{t('Créditos', 'Credits')}</a>
    <span class="lx-pie-sep">·</span>
    <a href="/privacy-policy">{t('Privacidad', 'Privacy')}</a>
  </p>
  <p>
    {t('Basado en Nuzlocke Tracker de Domtronn y Bassel (licencia BSD-3).', 'Based on Nuzlocke Tracker by Domtronn and Bassel (BSD-3 licence).')}
    {t('Imágenes y nombres de Pokémon', 'Pokémon images and names')} © 1995-{new Date().getFullYear()} Nintendo/Creatures Inc./GAME FREAK inc.
  </p>
</footer>

<style lang="postcss">
  footer {
    @apply absolute bottom-3 z-20 h-max w-full px-4 text-center text-tiny leading-4 md:text-xs;
    color: var(--lx-texto-suave);
  }
  .lx-pie-marca {
    @apply mb-1 inline-flex flex-wrap items-center justify-center gap-x-1.5;
  }
  .lx-pie-marca img {
    filter: drop-shadow(1px 1px 0 rgba(0, 0, 0, 0.2));
  }
  .lx-pie-marca strong {
    font-family: 'VT323', monospace;
    font-size: 17px;
    letter-spacing: 1px;
    color: var(--lx-texto);
  }
  .lx-pie-version {
    font-family: 'VT323', monospace;
    font-size: 15px;
  }
  .lx-pie-sep {
    opacity: 0.5;
  }
  footer a {
    @apply inline-flex items-center gap-x-1 underline-offset-2 transition-colors;
  }
  footer a:hover {
    color: var(--lx-rojo);
    text-decoration: underline;
  }
</style>
