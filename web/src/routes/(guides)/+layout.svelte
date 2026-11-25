<script>
  import { Footer } from '$c/navs'
  import { afterUpdate } from 'svelte'
  import { page } from '$app/stores'

  import deferStyles from '$lib/utils/defer-styles'

  afterUpdate(() => {
    const path = $page.url.pathname

    if (path.includes('blazing-emerald'))
      deferStyles('/assets/pokemon-blazingem.css')
    if (path.includes('radical-red'))
      deferStyles('/assets/pokemon-radicalred.css')
  })
</script>

<svelte:head>
  <meta name="robots" content="follow, index" />
</svelte:head>

<slot />

<style global lang="postcss">
  :global(:root) {
    --input-bg: theme('colors.white');
  }
  :global(.dark) {
    --input-bg: var(--lx-panel-2, #24213e);
  }

  /* latin */
  @font-face {
    font-family: 'VT323';
    font-style: normal;
    font-weight: 400;
    font-display: swap;
    src: url(/fonts/vt323-latin.woff2)
      format('woff2');
    unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA,
      U+02DC, U+2000-206F, U+2074, U+20AC, U+2122, U+2191, U+2193, U+2212,
      U+2215, U+FEFF, U+FFFD;
  }
</style>
