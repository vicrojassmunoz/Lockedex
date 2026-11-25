<script>
  import '../app.postcss'
  import '$lib/lockedex/lockedex.css'
  import { onMount } from 'svelte'
  import Barra from '$lib/lockedex/Barra.svelte'
  import InfoFlotante from '$lib/lockedex/InfoFlotante.svelte'
  import Sincronizacion from '$lib/lockedex/Sincronizacion.svelte'
  import { iniciarTraduccion } from '$lib/lockedex/idioma.js'
  import { escucharAcciones } from '$lib/lockedex/acciones.js'

  let escritorio = false
  onMount(() => {
    if (window.lockedex?.compacto) document.documentElement.classList.remove('lx-escritorio')
    escritorio = document.documentElement.classList.contains('lx-escritorio')
    iniciarTraduccion()
    // Solo la ventana principal aplica las acciones rápidas del modo compacto
    vigilarScroll()
    if (!window.lockedex?.compacto) return escucharAcciones()
  })

  import { page } from '$app/stores'
  import { afterUpdate } from 'svelte'
  import { beforeNavigate } from '$app/navigation'

  // Al pasar entre la zona de la app y la de Guías (layouts distintos), Svelte 3 dejaba
  // en pantalla la página anterior y la nueva quedaba debajo: parecía que la pestaña
  // no cambiaba. Entre zonas se carga la página entera, que es instantáneo en local.
  const zona = (destino) => {
    const id = destino?.route?.id || ''
    const ruta = destino?.url?.pathname || ''
    return id.startsWith('/(guides)') || ruta === '/guides' || ruta.startsWith('/guides/') ? 'guias' : 'app'
  }
  // svelte-simple-modal bloquea el scroll del body al abrir una ventana (position: fixed) y al cerrarla
  // restaura lo que había antes. Si se abre dos veces seguidas (doble clic en VS, una ventana que abre
  // otra…), lo que «había antes» ya era el bloqueo, y al cerrar la página se queda sin poder bajar.
  // Vigilante: si el body sigue bloqueado y no hay ninguna ventana abierta, se desbloquea.
  const vigilarScroll = () => {
    let espera
    const desbloquear = () => {
      const b = document.body
      if (b.style.position !== 'fixed' && b.style.overflow !== 'hidden') return
      if (document.querySelector('[role="dialog"][aria-modal="true"]')) return
      const arriba = -parseInt(b.style.top || '0', 10) || 0
      b.style.position = ''
      b.style.top = ''
      b.style.overflow = ''
      b.style.width = ''
      if (arriba) window.scrollTo({ top: arriba, left: 0, behavior: 'instant' })
    }
    new MutationObserver(() => {
      // se mira un poco después, cuando ya ha terminado la animación de cierre de la ventana
      if (!espera)
        espera = setTimeout(() => {
          espera = null
          desbloquear()
        }, 600)
    }).observe(document.body, { attributes: true, attributeFilter: ['style'], childList: true, subtree: true })
    desbloquear()
  }

  beforeNavigate((nav) => {
    if (!nav.from || !nav.to || nav.type === 'leave') return
    if (nav.to.url.origin !== location.origin) return
    if (zona(nav.from) !== zona(nav.to)) {
      nav.cancel()
      location.href = nav.to.url.href
    }
  })
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

  /* Letra de los menús estilo GBA: Fusion Pixel 12px (OFL), recortada a latín */
  @font-face {
    font-family: 'LX Pixel';
    font-style: normal;
    font-weight: 400;
    font-display: block;
    src: url(/fonts/fusion-pixel-12-latin.woff2) format('woff2');
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
