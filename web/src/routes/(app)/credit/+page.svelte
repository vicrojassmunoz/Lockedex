<script>
  import { PixelatedContainer } from '$lib/components/containers'
  import { t } from '$lib/lockedex/idioma'

  // Proyectos y datos en los que se apoya Lockedex
  const proyectos = [
    { name: 'Nuzlocke Tracker', autor: 'Domtronn', href: 'https://github.com/domtronn/nuzlocke.app', es: 'La app original: rutas, jefes, guías y casi todo el trabajo de datos.', en: 'The original app: routes, bosses, guides and most of the data work.' },
    { name: 'nuzlocke-redux', autor: 'Bassel', href: 'https://github.com/Bassel-T/nuzlocke.app', es: 'La versión mantenida de la que parte Lockedex.', en: 'The maintained fork Lockedex is based on.' },
    { name: 'PokeAPI', autor: 'PokeAPI', href: 'https://pokeapi.co', es: 'Nombres en español, movimientos, habilidades, objetos y aprendizaje por nivel. Y los sprites de PokeAPI/sprites.', en: 'Spanish names, moves, abilities, items and learnsets. Plus the PokeAPI/sprites images.' },
    { name: '@smogon/calc', autor: 'Smogon', href: 'https://github.com/smogon/damage-calc', es: 'La calculadora de daño del medidor de riesgo y el Analista.', en: 'The damage calculator behind the risk meter and the Analyst.' },
    { name: 'pret', autor: 'pret', href: 'https://github.com/pret', es: 'Los desensamblados de los juegos de GB y GBA, para leer las partidas .sav y sacar los sprites de los personajes del mapa.', en: 'The GB and GBA disassemblies, used to read .sav files and for the overworld character sprites.' },
    { name: 'PokéSprite', autor: 'msikma', href: 'https://github.com/msikma/pokesprite', es: 'Los sprites de objetos de los juegos que usan algunos iconos (Poké Ball, piedras evolutivas…).', en: 'The in-game item sprites used by some icons (Poké Ball, evolution stones…).' },
    { name: 'VT323', autor: 'Peter Hull', href: 'https://fonts.google.com/specimen/VT323', es: 'La tipografía pixel de los títulos (licencia OFL).', en: 'The pixel font used for headings (OFL licence).' },
    { name: 'Fusion Pixel', autor: 'TakWolf', href: 'https://github.com/TakWolf/fusion-pixel-font', es: 'La letra de los menús estilo GBA (licencia OFL).', en: 'The font of the GBA-style menus (OFL licence).' }
  ]
  import { Picture, Icon } from '$lib/components/core'
  import { Heart } from '$icons'

  const credit = [
    {
      name: 'Beliot419',
      href: 'https://www.deviantart.com/beliot419',
      img: '/assets/img/leaders/sm-hala.png'
    },
    {
      name: 'Brumirage',
      href: 'https://www.instagram.com/brumirage',
      img: '/assets/img/leaders/rs-phoebe-oras.png'
    },
    {
      name: 'Drawnamu',
      href: 'https://www.deviantart.com/drawnamu',
      img: '/assets/img/leaders/sm-acerola.png'
    },
    {
      name: 'Gnomowladny',
      href: 'https://www.deviantart.com/gnomowladny',
      img: '/assets/img/leaders/rs-shelly-oras.png'
    },
    {
      name: 'Hyo',
      href: 'https://www.deviantart.com/hyo-oppa',
      img: '/assets/img/leaders/rs-maxie-oras.png'
    },
    {
      name: 'Kyledove',
      href: 'https://www.deviantart.com/kyle-dove',
      img: '/assets/img/leaders/xy-sycamore.png'
    },
    {
      name: 'Muzyun',
      href: 'https://www.deviantart.com/muzyun',
      img: '/assets/img/leaders/xy-mable.png'
    },
    {
      name: 'PKMNTrainerSpriterC',
      href: 'https://www.deviantart.com/PKMNTrainerSpriterC',
      img: '/assets/img/leaders/rs-wattson-oras.png'
    },
    {
      name: 'Poffin Case',
      href: 'https://pokengine.org/trainers/Courtney',
      img: '/assets/img/leaders/rs-tabitha-oras.png'
    },
    {
      name: 'Sugar and Spice',
      href: 'https://chipsncookies.tumblr.com/',
      img: '/assets/img/leaders/xy-lysandre.png'
    },
    {
      name: 'TintjeMadelintje101',
      href: 'https://www.deviantart.com/tintjemadelintje101',
      img: '/assets/img/leaders/xy-serena.png'
    },
    {
      name: 'tebited15',
      href: 'https://www.deviantart.com/tebited15',
      img: '/assets/img/leaders/xy-olympia.png'
    },
    {
      name: 'Unbound Team',
      href: 'https://www.pokecommunity.com/showthread.php?t=382178',
      img: '/assets/img/leaders/unbound-mirskle.png'
    },
    {
      name: 'Struedelmuffin, Wednesday and Rool',
      href: 'https://www.pokecommunity.com/showthread.php?t=412655'
    }
  ]
</script>

<svelte:head>
  <title>Lockedex | {t('Créditos', 'Credits')}</title>
</svelte:head>

<main
  class="container mx-auto px-2 pb-24 pt-8 text-gray-800 dark:text-gray-300 sm:pt-0"
>
  <div class="mx-auto mx-4 pb-16 sm:pb-12">
    <PixelatedContainer
      className="my-16 py-6 px-8 overflow-x-hidden mx-auto text-center max-w-prose"
    >
      <h1 class="lx-cred-titulo">{t('Créditos', 'Credits')}</h1>

      <section class="lx-cred-proyectos" data-lx-original>
        <h2>{t('Lockedex existe gracias a', 'Lockedex exists thanks to')}</h2>
        <ul>
          {#each proyectos as pr}
            <li>
              <a href={pr.href} target="_blank" rel="noreferrer"><b>{pr.name}</b></a>
              <small>· {pr.autor}</small>
              <span>{t(pr.es, pr.en)}</span>
            </li>
          {/each}
        </ul>
        <p class="lx-cred-nota">
          {t(
            'Lockedex es un proyecto de fans sin ánimo de lucro, distribuido bajo la licencia BSD-3 del original. Pokémon y sus nombres son marcas de Nintendo, Creatures Inc. y GAME FREAK inc.',
            'Lockedex is a non-profit fan project distributed under the original BSD-3 licence. Pokémon and its names are trademarks of Nintendo, Creatures Inc. and GAME FREAK inc.'
          )}
        </p>
      </section>

      <h2 class="lx-cred-sub" data-lx-original>{t('Artistas', 'Artists')}</h2>

      <div class="mx-6 my-4 inline-flex sm:mx-24 sm:my-6">
        {#each credit.slice(0, Math.floor(credit.length / 2)) as { name, img }, i (img)}
          {#if img}
            <div
              style="transform: scaleX({i % 2 ? -1 : 1})"
              class="-mx-6 md:-mx-8"
            >
              <Picture
                pixelated
                aspect="192x96"
                src={img}
                alt="Credit to {name}"
                className="gap-x-6 inline-block"
              />
            </div>
          {/if}
        {/each}
      </div>

      <p>
        This application is made infinitely better through the great work of the
        Pokémon community and their generosity in sharing it
      </p>

      <p>
        I want to say a huge thank you to those artists letting me use their
        work, and encourage you all to support them and check out their projects
        or portfolios below
      </p>

      <div class="mx-6 my-2 inline-flex sm:mx-24 md:my-6">
        {#each credit.slice(Math.ceil(credit.length / 2)) as { name, img }, i (img)}
          {#if img}
            <div
              style="transform: scaleX({i % 2 ? -1 : 1})"
              class="-mx-6 md:-mx-8"
            >
              <Picture
                pixelated
                src={img}
                alt={'Credit to ' + name}
                className="gap-x-6 inline-block"
                aspect="192x96"
              />
            </div>
          {/if}
        {/each}
      </div>

      <h2 class="mb-4 inline-flex items-center text-xl font-bold md:text-2xl">
        {t('¡Gracias!', 'Thank you')}
        <Icon
          inline={true}
          height="1.2em"
          class="ml-2 fill-current text-red-500"
          icon={Heart}
        />
      </h2>

      <p class="whitespace-normal">
        {#each credit as { name, href }, i}
          <a
            class="mr-1 underline transition hover:text-indigo-400"
            {href}
            rel="noreferrer"
            target="_blank"
          >
            {name}{i < credit.length - 1 ? ',' : ''}
          </a>
        {/each}
      </p>
    </PixelatedContainer>
  </div>
</main>

<style lang="postcss">
  .lx-cred-titulo {
    font-family: 'VT323', monospace;
    font-size: 44px;
    line-height: 1;
    letter-spacing: 2px;
    color: var(--lx-rojo);
    margin-bottom: 12px;
  }
  .lx-cred-proyectos {
    text-align: left;
    margin: 0 0 22px;
  }
  .lx-cred-proyectos h2,
  .lx-cred-sub {
    font-family: 'VT323', monospace;
    font-size: 26px;
    margin: 8px 0;
  }
  .lx-cred-proyectos ul {
    display: grid;
    gap: 8px;
  }
  .lx-cred-proyectos li {
    padding: 8px 10px;
    border: 2px solid var(--lx-bisel);
    border-radius: var(--lx-radio-sm);
    background: var(--lx-panel-2);
  }
  .lx-cred-proyectos li a {
    text-decoration: underline;
    text-underline-offset: 2px;
  }
  .lx-cred-proyectos li small {
    color: var(--lx-texto-suave);
  }
  .lx-cred-proyectos li span {
    display: block;
    font-size: 14px;
  }
  .lx-cred-nota {
    margin-top: 12px;
    font-size: 13px;
    color: var(--lx-texto-suave);
  }

  p {
    margin-bottom: 16px;
    @apply px-0 text-sm sm:px-12 md:px-16 md:text-base;
  }
</style>
