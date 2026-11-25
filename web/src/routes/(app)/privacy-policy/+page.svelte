<script context="module">
  export const prerender = true
</script>

<script>
  import { PixelatedContainer } from '$lib/components/containers'
  import { t } from '$lib/lockedex/idioma'

  // Borra las partidas y preferencias. El guardado de escritorio detecta los borrados
  // y actualiza también Documentos\Lockedex\partidas.json.
  const borrarTodo = () => {
    const seguro = confirm(
      t(
        'Se borrarán todas tus partidas, tu perfil y tus preferencias de Lockedex. Las copias de seguridad de Documentos\\Lockedex no se tocan. ¿Seguir?',
        'This deletes all your Lockedex runs, profile and preferences. Backups in Documents\\Lockedex are kept. Continue?'
      )
    )
    if (!seguro) return
    Object.keys(window.localStorage)
      .filter((k) => k.startsWith('nuzlocke') || k.startsWith('lockedex'))
      .forEach((k) => window.localStorage.removeItem(k))
    alert(t('Datos borrados.', 'Data deleted.'))
    location.href = '/'
  }

  const claves = [
    ['nuzlocke.saves', 'Lista de partidas (id, fecha, nombre, juego y ajustes)', 'List of runs (id, date, name, game and settings)'],
    ['nuzlocke', 'Partida activa', 'Active run'],
    ['nuzlocke.<id>', 'Encuentros, equipo y jefes vencidos de cada partida', 'Encounters, team and beaten bosses of each run'],
    ['nuzlocke.theme', 'Tema claro u oscuro', 'Light or dark theme'],
    ['lockedex.reglas.<id>', 'Reglas de cada partida', 'Rules of each run'],
    ['lockedex.sav.<id>', 'Última partida .sav importada', 'Last imported .sav'],
    ['lockedex.perfil', 'Tu perfil (nombre y avatar)', 'Your profile (name and avatar)'],
    ['lockedex.analista.*', 'Equipos guardados en el Analista', 'Teams saved in the Analyst']
  ]
</script>

<svelte:head>
  <title>Lockedex | {t('Privacidad', 'Privacy')}</title>
</svelte:head>

<main class="container mx-auto pb-24 pt-8 sm:pt-0" data-lx-original>
  <div class="mx-4 mx-auto pb-16 sm:pb-12">
    <PixelatedContainer className="my-16 py-6 px-8 overflow-x-hidden mx-auto max-w-prose">
      <h1 class="lx-priv-titulo">{t('Privacidad', 'Privacy')}</h1>
      <p class="lx-priv-fecha">{t('Lockedex para Windows · noviembre de 2026', 'Lockedex for Windows · November 2026')}</p>

      {#if t('es', 'en') === 'es'}
        <p><b>Todo se queda en tu ordenador.</b> Lockedex no tiene cuentas, ni anuncios, ni estadísticas de uso, y no envía tus partidas a ningún sitio.</p>

        <h2>Dónde se guardan tus datos</h2>
        <ul>
          <li><b>Documentos\Lockedex\partidas.json</b>: todas tus partidas. La app lo actualiza cada vez que cambias algo.</li>
          <li><b>Documentos\Lockedex\Copias de seguridad</b>: una copia al día y las que hagas a mano (Ctrl+S).</li>
          <li><b>Documentos\Lockedex\registro-de-errores.txt</b>: errores de la app, por si tienes que avisar de un fallo. Solo lo ves tú.</li>
          <li>La memoria interna de la app (como el <i>localStorage</i> de un navegador), con estas claves:</li>
        </ul>
      {:else}
        <p><b>Everything stays on your computer.</b> Lockedex has no accounts, ads or usage analytics, and it does not send your runs anywhere.</p>

        <h2>Where your data lives</h2>
        <ul>
          <li><b>Documents\Lockedex\partidas.json</b>: all your runs, updated whenever you change something.</li>
          <li><b>Documents\Lockedex\Copias de seguridad</b>: one backup per day plus manual ones (Ctrl+S).</li>
          <li><b>Documents\Lockedex\registro-de-errores.txt</b>: app errors, in case you need to report a bug. Only you can see it.</li>
          <li>The app's internal storage (like a browser's <i>localStorage</i>), with these keys:</li>
        </ul>
      {/if}

      <table class="lx-priv-tabla">
        <tbody>
          {#each claves as [clave, es, en]}
            <tr>
              <td><code>{clave}</code></td>
              <td>{t(es, en)}</td>
            </tr>
          {/each}
        </tbody>
      </table>

      {#if t('es', 'en') === 'es'}
        <h2>Cuándo se conecta a internet</h2>
        <ul>
          <li><b>Actualizaciones:</b> al abrirse, Lockedex mira en GitHub (repositorio <i>vicrojassmunoz/Lockedex</i>) si hay una versión nueva y, si la hay, la descarga de allí.</li>
          <li><b>Imágenes de algunos ROM hacks</b> (fakemon y formas propias) se cargan desde el servidor del proyecto original, <i>img.nuzlocke.app</i>.</li>
          <li><b>Importar con código QR</b> consulta el servicio para compartir del original y el lector de QR se descarga de <i>cdn.jsdelivr.net</i>.</li>
          <li>Los enlaces externos (Pokémon DB, guías, GitHub…) se abren en tu navegador.</li>
        </ul>
        <p>El resto, incluidos los sprites, los datos de los juegos y la calculadora, viene dentro de la app.</p>

        <h2>Borrar tus datos</h2>
        <p>
          Puedes <button class="lx-priv-borrar" on:click={borrarTodo}>borrar todas tus partidas y preferencias</button>.
          Para no dejar rastro, borra después la carpeta <b>Documentos\Lockedex</b> y desinstala la app desde Windows.
        </p>

        <h2>Dudas</h2>
        <p>Abre una incidencia en <a href="https://github.com/vicrojassmunoz/Lockedex/issues" target="_blank" rel="noreferrer">github.com/vicrojassmunoz/Lockedex</a>.</p>
      {:else}
        <h2>When it goes online</h2>
        <ul>
          <li><b>Updates:</b> on launch, Lockedex checks GitHub (<i>vicrojassmunoz/Lockedex</i>) for a new version and downloads it from there.</li>
          <li><b>Some ROM hack images</b> (fakemon and custom forms) load from the original project's server, <i>img.nuzlocke.app</i>.</li>
          <li><b>QR code import</b> queries the original's sharing service, and the QR reader is downloaded from <i>cdn.jsdelivr.net</i>.</li>
          <li>External links (Pokémon DB, guides, GitHub…) open in your browser.</li>
        </ul>
        <p>Everything else, sprites, game data and the calculator included, ships with the app.</p>

        <h2>Deleting your data</h2>
        <p>
          You can <button class="lx-priv-borrar" on:click={borrarTodo}>delete all your runs and preferences</button>. To leave no trace,
          then delete the <b>Documents\Lockedex</b> folder and uninstall the app from Windows.
        </p>

        <h2>Questions</h2>
        <p>Open an issue at <a href="https://github.com/vicrojassmunoz/Lockedex/issues" target="_blank" rel="noreferrer">github.com/vicrojassmunoz/Lockedex</a>.</p>
      {/if}
    </PixelatedContainer>
  </div>
</main>

<style>
  .lx-priv-titulo {
    font-family: 'VT323', monospace;
    font-size: 44px;
    line-height: 1;
    letter-spacing: 2px;
    color: var(--lx-rojo);
  }
  .lx-priv-fecha {
    font-size: 12px;
    color: var(--lx-texto-suave);
    margin-bottom: 16px;
  }
  h2 {
    font-family: 'VT323', monospace;
    font-size: 26px;
    margin: 18px 0 6px;
  }
  p {
    margin-bottom: 12px;
  }
  ul {
    list-style: disc;
    padding-left: 20px;
    margin-bottom: 12px;
    display: grid;
    gap: 4px;
  }
  .lx-priv-tabla {
    width: 100%;
    margin: 4px 0 8px;
    font-size: 13px;
    border-collapse: collapse;
  }
  .lx-priv-tabla td {
    padding: 5px 6px;
    border-bottom: 1px solid var(--lx-bisel);
    vertical-align: top;
  }
  .lx-priv-tabla code {
    font-size: 12px;
    white-space: nowrap;
  }
  a,
  .lx-priv-borrar {
    text-decoration: underline;
    text-underline-offset: 2px;
  }
  a:hover,
  .lx-priv-borrar:hover {
    color: var(--lx-rojo);
  }
</style>
