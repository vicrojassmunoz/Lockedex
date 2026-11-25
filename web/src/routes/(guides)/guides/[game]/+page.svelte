<script>
  export let data
  const { route, game, links, path, html, attributes } = data

  import '../../../assets/[resource].css/_pokemon.css'
  import '../../../assets/css/items.css'
  import '../../../assets/css/symbols.css'
  import { setContext } from 'svelte'

  import { Hero, Links, Summary, Bosses, Aside } from '$c/Guide'
  import { faq } from '$c/Guide/schemas'

  setContext('game', {
    getLeague: (_, starter) => data.data[starter]
  })
  setContext('simple-modal', {
    open: false
  })

  const gymCount = Object.values(route.gyms).flat().length
  const encounterCount = route.count
  const routeCount = route.routes.length

  const title = `Lockedex | Guía Nuzlocke de Pokémon ${game.title}`
  const description = `This guide shows you all ${encounterCount} Pokémon available across ${routeCount} route encounters in Pokémon ${game.title}, as well as detailed information on all ${gymCount} boss battles!`

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: `A Nuzlocke guide for Pokémon ${game.title}`,
    alternativeHeadline: `A guide and overview to Nuzlocking Pokémon ${game.title}`,
    image: `https://img.nuzlocke.app${game.logo}@2.png`,
    author: 'Lockedex',
    genre: 'Pokémon',
    keywords: `pokemon nuzlocke ${game.title} encounters boss battles fights`,
    url: `https://nuzlocke.app/${path}`,
    datePublished: attributes.created || '2022-01-07',
    dateCreated: attributes.created || '2022-01-07',
    dateModified: attributes.updated || attributes.created || '2022-01-07',
    description: description
  }
  const articleSchema = `<script type="application/ld+json">${JSON.stringify(
    schema
  )}<\/script>`
  const faqSchema = `<script type="application/ld+json">${JSON.stringify(
    faq(game, data.data.fire, route)
  )}<\/script>`
</script>

<svelte:head>
  <title>{title}</title>
  <meta property="og:title" content={title} />
  <meta name="twitter:title" content={title} />

  <meta content={description} name="description" />
  <meta content={description} name="twitter:description" />

  <script>
    document.addEventListener('DOMContentLoaded', function () {
      var lazyBackground = document.querySelector('.pkm')

      if ('IntersectionObserver' in window) {
        let lazyBackgroundObserver = new IntersectionObserver(function (
          entries,
          observer
        ) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              document.body.classList.add('lazy-pkm')
              lazyBackgroundObserver.unobserve(entry.target)
            }
          })
        })

        lazyBackgroundObserver.observe(lazyBackground)
      }
    })
  </script>
</svelte:head>

{#key game.pid}
  <Hero {...game} {...attributes || {}}>
    <Aside {path} {...route} />

    <article class="g-container">
      {#if html}
        <section class="doc">
          {@html html}
        </section>
      {/if}

      <Summary {path} {game} {...route} />

      <Bosses {path} data={data.data} {game} {...route} />
    </article>
  </Hero>

  <Links {links} />

  {@html articleSchema}
  {@html faqSchema}
{/key}

<style lang="postcss">
  :global(body),
  :global(html) {
    overflow-x: hidden;
  }
  :global(button.compare) {
    display: none;
  }
  :global(svg.lines) {
    z-index: -10;
    @apply absolute top-px w-full -translate-y-full;
  }

  /* ---- Guía con el estilo de Lockedex/GBA: títulos en banda de pantalla de datos, cada grupo de
     encuentros en un recuadro de menú y los Pokémon en casillas como las del PC ---- */
  .g-container :global(h2) {
    display: block;
    margin: 2rem 0 0.75rem;
    padding: 4px 10px 6px;
    font-family: 'LX Pixel', 'VT323', monospace;
    font-size: 24px;
    line-height: 26px;
    font-weight: normal;
    text-transform: uppercase;
    color: #f8f8f8;
    text-shadow: 2px 2px 0 #283850;
    background: #4868a0;
    box-shadow: inset 0 -2px 0 #304878, inset 0 2px 0 #6888c0, 3px 3px 0 rgba(0, 0, 0, 0.2);
    clip-path: polygon(3px 0, calc(100% - 3px) 0, 100% 3px, 100% calc(100% - 3px), calc(100% - 3px) 100%, 3px 100%, 0 calc(100% - 3px), 0 3px);
  }
  .g-container :global(h2 a),
  .g-container :global(h2 svg) {
    color: #f8f8f8;
  }
  .g-container :global(section[id^='encounters-']),
  .g-container :global(section[id*='-encounters']) {
    margin: 10px 0;
    padding: 6px 10px 10px;
    background: var(--lx-panel);
    border: 2px solid var(--lx-tinta);
    box-shadow: inset 0 2px 0 rgba(255, 255, 255, 0.4), var(--lx-sombra-sm);
    clip-path: polygon(4px 0, calc(100% - 4px) 0, 100% 4px, 100% calc(100% - 4px), calc(100% - 4px) 100%, 4px 100%, 0 calc(100% - 4px), 0 4px);
  }
  .g-container :global(section h3) {
    font-family: 'LX Pixel', 'VT323', monospace;
    font-weight: normal;
  }
  .g-container :global(section ul li) {
    background: var(--lx-panel-2);
    border: 1px solid var(--lx-bisel);
  }

  section.doc {
    @apply my-6  max-w-prose;
  }

  section.doc :global(*) {
    @apply leading-6 tracking-wide;
  }

  section.doc :global(p) {
    @apply pb-4;
  }

  section.doc :global(hr) {
    @apply my-6 opacity-50;
  }

  section.doc :global(li) {
    @apply mx-8;
  }

  section.doc :global(img) {
    @apply inline-flex items-center justify-center;
  }

  section.doc :global(p:has(img)) {
    @apply inline-flex w-full justify-center;
  }

  section.doc :global(a) {
    @apply underline underline-offset-4;
  }

  section.doc :global(a:hover) {
    @apply text-orange-500;
  }

  section.doc :global(h2),
  section.doc :global(h3),
  section.doc :global(h3) {
    @apply pb-4 pt-6;
  }

  section.doc :global(h2) {
    @apply text-2xl font-bold;
  }
  section.doc :global(h3) {
    @apply text-2xl font-bold;
  }
  section.doc :global(h4) {
    @apply text-lg;
  }
</style>
