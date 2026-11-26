<script>
  // Generador de Egglocke: huevos al azar del juego de la run y, en la 3.ª gen, directos al PC del .sav
  import { onMount, getContext } from 'svelte'
  import { leerPartida } from './partida.js'
  import { claveRutaSav } from './equipo.js'
  import { generarHuevos, paraSavGen3, leerHuevosRun, guardarHuevosRun, JUEGOS_GEN3 } from './egglocke.js'
  import { meterHuevos, huecosLibres, juegoDelSav, VERSION_JUEGO } from './sav/huevosGen3.js'
  import { tipos as tiposEs } from './datos.js'
  import { t, idioma, traducirNombre } from './idioma.js'

  export let id = ''

  const { close } = getContext('simple-modal')
  const es = idioma() === 'es'
  const TIPOS = ['normal', 'fire', 'water', 'grass', 'electric', 'ice', 'fighting', 'poison', 'ground', 'flying', 'psychic', 'bug', 'rock', 'ghost', 'dragon', 'dark', 'steel', 'fairy']

  let partida = null
  let tt = {}
  let opciones = { cantidad: 30, basicas: true, sinLegendarios: true, sinRepetir: true, tipo: '', rapida: false }
  let guardado = null // { fecha, lista, sav }
  let lista = []
  let disponibles = 0
  let ver = false
  let aviso = ''
  let error = ''
  let ocupado = false

  // .sav
  let sav = null // { ruta, nombre, fecha, datos, libres }
  let desdeCaja = 0

  $: gen = partida?.info?.gen || 3
  $: escribible = partida && JUEGOS_GEN3.includes(partida.juego)
  $: usados = (guardado?.lista || []).filter((h) => h.usado).length

  onMount(async () => {
    partida = leerPartida(id)
    tt = await tiposEs()
    guardado = leerHuevosRun(id)
    if (guardado?.lista?.length) lista = guardado.lista
    // (escribible es reactivo y aquí aún no está al día)
    if (JUEGOS_GEN3.includes(partida?.juego)) cargarVinculado()
  })

  const generar = async () => {
    error = aviso = ''
    if (guardado?.sav && !confirm(t('Ya metiste huevos en tu partida. Si generas otros, la lista de esos se olvida (los huevos siguen en el juego). ¿Seguir?', 'You already put eggs in your save. Generating new ones forgets that list (the eggs stay in the game). Continue?')))
      return
    ocupado = true
    try {
      const r = await generarHuevos(gen, opciones)
      lista = r.lista
      disponibles = r.disponibles
      guardado = { fecha: Date.now(), lista, sav: null }
      guardarHuevosRun(id, guardado)
      if (lista.length < opciones.cantidad) aviso = t(`Solo hay ${lista.length} especies que cumplan esas opciones.`, `Only ${lista.length} species match those options.`)
    } catch (e) {
      error = String(e?.message || e)
    } finally {
      ocupado = false
    }
  }

  // --- .sav ---
  const prepararSav = (r) => {
    if (!r?.datos) return null
    const buffer = r.datos.buffer.slice(r.datos.byteOffset, r.datos.byteOffset + r.datos.byteLength)
    try {
      return { ...r, buffer, libres: huecosLibres(buffer), juegoSav: juegoDelSav(buffer) }
    } catch {
      return { ...r, buffer, libres: null, juegoSav: null }
    }
  }
  const SAV_DE = { fr: 'rfvh', lg: 'rfvh', r: 'rz', s: 'rz', em: 'esmeralda' }

  const cargarVinculado = async () => {
    const ruta = localStorage.getItem(claveRutaSav(id))
    if (!ruta || !window.lockedex?.leerSav) return
    sav = prepararSav(await window.lockedex.leerSav(ruta))
  }
  const elegirSav = async () => {
    if (!window.lockedex?.elegirSav) return (error = t('Esto solo funciona en la aplicación de escritorio.', 'This only works in the desktop app.'))
    const r = await window.lockedex.elegirSav()
    if (r) sav = prepararSav(r)
  }
  $: savValido = sav && sav.libres && sav.juegoSav === SAV_DE[partida?.juego]
  $: libresDesde = savValido ? sav.libres.filter((h) => h.caja >= desdeCaja).length : 0
  $: pendientesSav = guardado?.sav ? 0 : lista.length

  const meter = async () => {
    error = aviso = ''
    if (!savValido || !lista.length) return
    ocupado = true
    try {
      // Se vuelve a leer justo antes, por si el juego ha guardado desde que se abrió la ventana
      const fresco = prepararSav(await window.lockedex.leerSav(sav.ruta))
      if (!fresco?.libres) throw new Error(t('No se pudo volver a leer la partida.', 'Could not re-read the save.'))
      const datos = await paraSavGen3(lista, partida.info.grupo, { rapida: opciones.rapida })
      const r = meterHuevos(fresco.buffer, datos, { version: VERSION_JUEGO[partida.juego] || 4, desdeCaja })
      const w = await window.lockedex.escribirSav({ ruta: fresco.ruta, datos: new Uint8Array(r.buffer), fechaLeida: fresco.fecha })
      if (!w?.ok)
        throw new Error(
          w?.motivo === 'cambiado'
            ? t('La partida ha cambiado mientras tanto (¿el juego está abierto?). No se ha tocado nada.', 'The save changed meanwhile (is the game open?). Nothing was touched.')
            : t('No se pudo escribir la partida: ', 'Could not write the save: ') + (w?.detalle || w?.motivo || '')
        )
      const cajas = [...new Set(r.colocados.map((c) => c.caja + 1))]
      guardado = { ...guardado, sav: { nombre: fresco.nombre, cajas, fecha: Date.now(), copia: w.nombreCopia } }
      guardarHuevosRun(id, guardado)
      aviso = t(
        `¡Hecho! ${lista.length} huevos en ${cajas.length > 1 ? `las cajas ${cajas[0]}–${cajas[cajas.length - 1]}` : `la caja ${cajas[0]}`}. Copia de seguridad: ${w.nombreCopia}`,
        `Done! ${lista.length} eggs in box${cajas.length > 1 ? `es ${cajas[0]}–${cajas[cajas.length - 1]}` : ` ${cajas[0]}`}. Backup: ${w.nombreCopia}`
      )
      sav = prepararSav(await window.lockedex.leerSav(fresco.ruta))
    } catch (e) {
      error = String(e?.message || e)
    } finally {
      ocupado = false
    }
  }

  const copiarLista = async () => {
    const texto = lista.map((h, i) => `${i + 1}. ${traducirNombre(h.nombre)}`).join('\n')
    try {
      await navigator.clipboard.writeText(texto)
      aviso = t('Lista copiada', 'List copied')
    } catch {
      error = t('No se pudo copiar', 'Could not copy')
    }
  }
  const nombreTipo = (x) => (es ? tt[x] || x : x)
</script>

<section class="lx-gh" data-lx-original>
  <header>
    <h2>{t('Generador de Egglocke', 'Egglocke generator')}</h2>
    <button class="lx-gh-x" on:click={close} aria-label={t('Cerrar', 'Close')}>✕</button>
  </header>

  <div class="lx-gh-cuerpo">
    <div class="lx-gh-opciones">
      <label>{t('Huevos', 'Eggs')} <input type="number" min="1" max="120" bind:value={opciones.cantidad} /></label>
      <label><input type="checkbox" bind:checked={opciones.basicas} /> {t('Solo formas básicas', 'Base forms only')}</label>
      <label><input type="checkbox" bind:checked={opciones.sinLegendarios} /> {t('Sin legendarios', 'No legendaries')}</label>
      <label><input type="checkbox" bind:checked={opciones.sinRepetir} /> {t('Sin repetir línea evolutiva', 'No repeated evolution lines')}</label>
      <label>{t('Tipo', 'Type')}
        <select bind:value={opciones.tipo}>
          <option value="">{t('Cualquiera', 'Any')}</option>
          {#each TIPOS.filter((x) => !(gen < 6 && x === 'fairy') && !(gen < 2 && ['dark', 'steel'].includes(x))) as x}<option value={x}>{nombreTipo(x)}</option>{/each}
        </select>
      </label>
      <button class="lx-gh-generar" disabled={ocupado} on:click={generar}>{lista.length ? t('Generar otros', 'Generate again') : t('Generar huevos', 'Generate eggs')}</button>
    </div>

    {#if lista.length}
      <div class="lx-gh-cab">
        <span>{lista.length} {t('huevos', 'eggs')}{usados ? ` · ${usados} ${t('ya abiertos', 'hatched')}` : ''}{guardado?.fecha ? ` · ${new Date(guardado.fecha).toLocaleDateString(es ? 'es-ES' : 'en-GB')}` : ''}</span>
        <label class="lx-gh-ver"><input type="checkbox" bind:checked={ver} /> {t('Ver qué hay dentro (spoiler)', 'Show what is inside (spoiler)')}</label>
      </div>
      <ol class="lx-gh-huevos">
        {#each lista as h, i}
          <li class:lx-usado={h.usado} title={ver ? traducirNombre(h.nombre) : t(`Huevo ${i + 1}`, `Egg ${i + 1}`)}>
            {#if ver}
              <img src={`/assets/img/pokemon/base-${h.imgId}.png`} alt="" width="48" height="48" />
              <small>{traducirNombre(h.nombre)}</small>
            {:else}
              <img class="lx-gh-huevo" src="/lx/iconos/huevo.png" alt="" width="32" height="32" />
              <small>{i + 1}</small>
            {/if}
          </li>
        {/each}
      </ol>

      {#if escribible}
        <div class="lx-gh-sav">
          <b>{t('METER EN EL PC DE TU PARTIDA', 'PUT THEM IN YOUR SAVE’S PC')}</b>
          {#if guardado?.sav}
            <p class="lx-gh-ok">
              ✓ {t(`Ya están en ${guardado.sav.nombre}, ${guardado.sav.cajas.length > 1 ? 'cajas' : 'caja'} ${guardado.sav.cajas.join(', ')}.`, `Already in ${guardado.sav.nombre}, box${guardado.sav.cajas.length > 1 ? 'es' : ''} ${guardado.sav.cajas.join(', ')}.`)}
              {#if guardado.sav.copia}{t(' Copia de seguridad: ', ' Backup: ')}{guardado.sav.copia}{/if}
            </p>
          {:else}
            {#if !sav}
              <p>{t('No hay un .sav vinculado a esta run.', 'No .sav is linked to this run.')} <button on:click={elegirSav}>{t('Elegir .sav…', 'Choose .sav…')}</button></p>
            {:else if !savValido}
              <p class="lx-gh-error">
                {sav.libres ? t('Esa partida no es del juego de esta run.', 'That save is not from this run’s game.') : t('No parece una partida de GBA válida.', 'It does not look like a valid GBA save.')}
                <button on:click={elegirSav}>{t('Elegir otro…', 'Choose another…')}</button>
              </p>
            {:else}
              <p>
                <b>{sav.nombre}</b> · {sav.libres.length} {t('huecos libres en el PC', 'free PC slots')} ·
                {t('desde la caja', 'from box')}
                <select bind:value={desdeCaja}>{#each Array(14) as _, c}<option value={c}>{c + 1}</option>{/each}</select>
                ({libresDesde} {t('libres', 'free')})
              </p>
              <label><input type="checkbox" bind:checked={opciones.rapida} /> {t('Eclosión rápida (en los próximos 255 pasos)', 'Quick hatch (within the next 255 steps)')}</label>
              <p class="lx-gh-aviso-sav">
                ⚠ {t('Cierra el juego en el emulador antes de meterlos: si está abierto y guardas, los huevos se pierden. Antes de escribir se hace una copia de seguridad de tu partida al lado del archivo.', 'Close the game in your emulator first: if it is open and you save, the eggs are lost. A backup of your save is made next to the file before writing.')}
              </p>
              <button class="lx-gh-meter" disabled={ocupado || libresDesde < pendientesSav} on:click={meter}>
                {t(`Meter ${lista.length} huevos en el PC`, `Put ${lista.length} eggs in the PC`)}
              </button>
            {/if}
          {/if}
        </div>
      {:else}
        <p class="lx-gh-nota">
          {t('En este juego no puedo escribir el .sav (solo RojoFuego, VerdeHoja, Rubí, Zafiro y Esmeralda, sin hacks): copia la lista y repártelos a tu manera.', 'I cannot write this game’s save (only FireRed, LeafGreen, Ruby, Sapphire and Emerald, no hacks): copy the list and hand them out your way.')}
        </p>
      {/if}
    {:else}
      <p class="lx-gh-nota">{t('Elige las opciones y genera los huevos. Cuando captures algo, cámbialo por un huevo; al eclosionar, apunta qué salió en la Caja (detalle del PC).', 'Pick the options and generate the eggs. When you catch something, swap it for an egg; when it hatches, log what came out in the Box (PC detail).')}</p>
    {/if}

    {#if aviso}<p class="lx-gh-ok">{aviso}</p>{/if}
    {#if error}<p class="lx-gh-error">{error}</p>{/if}
  </div>

  <footer>
    <button on:click={copiarLista} disabled={!lista.length}>{t('Copiar lista', 'Copy list')}</button>
    <button on:click={close}>{t('Cerrar', 'Close')}</button>
  </footer>
</section>

<style>
  .lx-gh {
    width: min(720px, calc(100vw - 32px));
    max-height: calc(100vh - 64px);
    overflow-y: auto;
    background: #f8f8f0;
    color: #303840;
    border: 4px solid #283850;
    border-radius: 12px;
    box-shadow: 6px 6px 0 rgba(0, 0, 0, 0.4);
    font-family: 'LX Pixel', 'VT323', monospace;
    font-size: 12px;
  }
  :global(.dark) .lx-gh {
    background: #1c2430;
    color: #e0e6ee;
  }
  header {
    position: sticky;
    top: 0;
    z-index: 1;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 14px;
    background: #78a840;
    color: #fff;
  }
  h2 {
    font-size: 24px;
    line-height: 24px;
    text-shadow: 2px 2px 0 #3c5820;
  }
  .lx-gh-x {
    font-size: 18px;
    padding: 0 6px;
  }
  .lx-gh-cuerpo {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 10px 14px;
  }
  .lx-gh-opciones {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px 14px;
  }
  .lx-gh-opciones input[type='number'] {
    width: 54px;
  }
  input[type='number'],
  select {
    padding: 1px 4px;
    border: 2px solid #283850;
    border-radius: 4px;
    background: #fff;
    color: #303840;
  }
  :global(.dark) .lx-gh input[type='number'],
  :global(.dark) .lx-gh select {
    background: #141c26;
    color: #e0e6ee;
    border-color: #8090a8;
  }
  button {
    padding: 2px 10px;
    border: 2px solid #283850;
    border-radius: 4px;
    background: #fff;
    color: #283850;
  }
  :global(.dark) .lx-gh button {
    background: #24303e;
    color: #e0e6ee;
    border-color: #8090a8;
  }
  button:disabled {
    opacity: 0.5;
  }
  .lx-gh .lx-gh-generar,
  .lx-gh .lx-gh-meter {
    color: #fff;
    background: #78a840;
    border-color: #3c5820;
  }
  .lx-gh-cab {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    gap: 6px;
    color: #707880;
  }
  .lx-gh-huevos {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(64px, 1fr));
    gap: 4px;
    padding: 8px;
    background: repeating-conic-gradient(#e8f0d8 0 25%, #f4f8ec 0 50%) 0 0 / 16px 16px;
    border: 2px solid #c8d8b0;
    border-radius: 6px;
  }
  :global(.dark) .lx-gh-huevos {
    background: #1e2a20;
    border-color: #3a4a3c;
  }
  .lx-gh-huevos li {
    display: flex;
    flex-direction: column;
    align-items: center;
    min-height: 60px;
    justify-content: center;
  }
  .lx-gh-huevos li.lx-usado {
    opacity: 0.35;
  }
  .lx-gh-huevos img {
    image-rendering: pixelated;
  }
  .lx-gh-huevo {
    width: 40px;
    height: 40px;
  }
  .lx-gh-huevos small {
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .lx-gh-sav {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 8px 10px;
    border: 2px solid #c8d0d8;
    border-radius: 6px;
    line-height: 16px;
  }
  .lx-gh-sav b {
    font-weight: normal;
  }
  .lx-gh-aviso-sav {
    color: #a05010;
  }
  .lx-gh-ok {
    color: #2f8040;
    line-height: 16px;
  }
  .lx-gh-error {
    color: #c02828;
    line-height: 16px;
  }
  .lx-gh-nota {
    color: #707880;
    line-height: 16px;
  }
  footer {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    padding: 0 14px 12px;
  }
</style>
