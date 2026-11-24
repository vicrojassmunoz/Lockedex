<script>
  import '../app.postcss'
  import '$lib/lockedex/lockedex.css'
  import { onMount } from 'svelte'
  import Barra from '$lib/lockedex/Barra.svelte'
  import InfoFlotante from '$lib/lockedex/InfoFlotante.svelte'
  import Sincronizacion from '$lib/lockedex/Sincronizacion.svelte'
  import { iniciarTraduccion } from '$lib/lockedex/idioma.js'

  let escritorio = false
  onMount(() => {
    if (window.lockedex?.compacto) document.documentElement.classList.remove('lx-escritorio')
    escritorio = document.documentElement.classList.contains('lx-escritorio')
    iniciarTraduccion()
  })

  import { page } from '$app/stores'
  import { afterUpdate } from 'svelte'
  import { Footer } from '$c/navs'

  import createErrorModal from '$utils/error-handler'
  import deferStyles from '$lib/utils/defer-styles'

  afterUpdate(async () => {
    deferStyles('/assets/pokemon.css')
    deferStyles('/assets/badges.css')
    window.onunhandledrejection = createErrorModal
  })

  const title = 'Lockedex'
  const subtitle = 'Track encounters, analyse your team, be prepared'
  const description =
    'Best application to track Pokémon encounters and prepare for every boss battle with details on stats, movesets, & abilities - never lose a Nuzlocke run again.'
</script>

<svelte:head>
  {#if $page.status === 200}
    <title>{title} | {subtitle}</title>
    <meta property="og:title" content="{title} | {subtitle}" />
    <meta name="twitter:title" content={title} />

    <meta content={description} name="description" />
    <meta name="twitter:description" content={description} />

    <link rel="dns-prefetch" href="https://img.nuzlocke.app" crossorigin />
  {/if}
</svelte:head>

<Barra />
{#if escritorio}
  <Sincronizacion />
{/if}
<InfoFlotante />

<slot />


<Footer />

<style global lang="postcss">
  :global(:root) {
    --input-bg: theme('colors.white');
  }
  :global(.dark) {
    --input-bg: theme('colors.gray.800');
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
