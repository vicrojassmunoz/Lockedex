<script>
  // Importar la partida del emulador (.sav de GBA) y vincularla con la run
  import { onMount } from 'svelte'
  import { leerPartidaGen3 } from '$lib/lockedex/sav/gen3.js'
  import { cargar, movimientos, naturalezas, habilidades, norm } from '$lib/lockedex/datos.js'
  import { partidaActiva, cargarRutas, resumirPartida } from '$lib/lockedex/partida.js'
  import { claveSav, claveRutaSav, leerSavGuardado } from '$lib/lockedex/equipo.js'
  import { calcularCambiosSav, parcheCambiosSav } from '$lib/lockedex/sincronizar.js'
  import { idioma, iniciarTraduccion, traducirNombre } from '$lib/lockedex/idioma.js'
  import { getGameStore, patch } from '$lib/store'
  import { fetchData } from '$utils/fetchers'
  import { COLOR_TIPO } from '$lib/lockedex/colores.js'

  const es = idioma() === 'es'
  const lx = typeof window !== 'undefined' ? window.lockedex : null

  let partida = null
  let resumen = null
  let sav = null
  let error = ''
  let rutaSav = ''
  // La última partida elegida (en cualquier run), para no tener que volver a buscarla
  const CLAVE_ULTIMA = 'lockedex.ultimaRutaSav'
  let ultima = ''
  const nombreArchivo = (r = '') => r.split(/[\\/]/).pop()
  let movs = {}, nats = {}, habs = {}
  let pkdx = null
  let cambios = []
  let eclosiones = []
  let aplicado = false
  let vigilando = false
  let entrada

  const JUEGOS = { esmeralda: 'Esmeralda', rz: 'Rubí / Zafiro', rfvh: 'RojoFuego / VerdeHoja' }

  onMount(async () => {
    partida = partidaActiva()
    await iniciarTraduccion()
    ;[movs, nats, habs, pkdx] = await Promise.all([movimientos(), naturalezas(), habilidades(), fetchData()])
    if (partida) {
      resumen = resumirPartida(partida, await cargarRutas(partida.info?.lid))
      sav = leerSavGuardado(partida.id)
      rutaSav = localStorage.getItem(claveRutaSav(partida.id)) || ''
      vigilando = !!rutaSav
      ultima = rutaSav ? '' : localStorage.getItem(CLAVE_ULTIMA) || ''
      if (sav) calcularCambios()
    }
  })

  const nombreMov = (id) => {
    const m = Object.values(movs).find((x) => x.id === id)
    return m ? { nombre: es ? m.es : m.en, en: m.en, tipo: m.tipo } : { nombre: '#' + id, tipo: 'normal' }
  }
  const nombreNat = (n) => {
    const d = nats[norm(n)]
    return d ? (es ? d.es : d.en) : n
  }
  const nombreHab = (h) => {
    const d = habs[norm(h)]
    return d ? { nombre: es ? d.es : d.en, en: d.en } : { nombre: h, en: h }
  }
  const info = (especie) => pkdx?.aliasMap?.[norm(especie)] || pkdx?.nameMap?.[norm(especie)]
  const sprite = (p) => {
    const i = info(p.especie)
    return i?.imgId ? `/assets/img/pokemon/${p.variocolor ? 'shiny' : 'base'}-${i.imgId}.png` : `/assets/img/pokemon/base-${p.numero}.png`
  }

  const procesar = async (bytes, nombre, ruta, fecha) => {
    error = ''
    aplicado = false
    try {
      const tablas = await cargar('gen3.json')
      const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
      const r = leerPartidaGen3(buffer, tablas)
      sav = { ...r, nombre, ruta: ruta || '', fecha: fecha || Date.now(), importado: Date.now() }
      if (partida) {
        localStorage.setItem(claveSav(partida.id), JSON.stringify(sav))
        calcularCambios()
      }
    } catch (e) {
      error = e.message || String(e)
    }
  }

  const elegir = async () => {
    if (lx?.elegirSav) {
      const r = await lx.elegirSav()
      if (!r) return
      rutaSav = r.ruta
      await procesar(r.datos, r.nombre, r.ruta, r.fecha)
      await vincular(r.ruta)
    } else entrada.click()
  }

  // Al elegir una partida en el escritorio queda vinculada a la run (se puede desvincular abajo)
  const vincular = async (ruta) => {
    if (!ruta) return
    localStorage.setItem(CLAVE_ULTIMA, ruta)
    ultima = ''
    if (!partida || error) return
    localStorage.setItem(claveRutaSav(partida.id), ruta)
    vigilando = true
    await lx?.vigilarSav?.(ruta)
  }
  // Volver a leer la vinculada (o la última que usaste) sin abrir el diálogo
  const recargar = async (ruta = rutaSav) => {
    if (!lx?.leerSav || !ruta) return
    const r = await lx.leerSav(ruta).catch(() => null)
    if (!r) return (error = es ? `No se pudo leer ${nombreArchivo(ruta)}. ¿Lo has movido o borrado?` : `Could not read ${nombreArchivo(ruta)}. Was it moved or deleted?`)
    rutaSav = ruta
    await procesar(r.datos, r.nombre || nombreArchivo(ruta), ruta, r.fecha)
    await vincular(ruta)
  }

  const desdeInput = async (e) => {
    const f = e.target.files?.[0]
    if (!f) return
    await procesar(new Uint8Array(await f.arrayBuffer()), f.name, '', f.lastModified)
  }

  const alternarVigilancia = async () => {
    if (!partida || !rutaSav) return
    vigilando = !vigilando
    if (vigilando) {
      localStorage.setItem(claveRutaSav(partida.id), rutaSav)
      await lx?.vigilarSav(rutaSav)
    } else {
      localStorage.removeItem(claveRutaSav(partida.id))
      await lx?.vigilarSav(null)
    }
  }

  // Qué se puede actualizar en la run con los datos de la partida (lib/lockedex/sincronizar.js)
  const linea = (especie) => info(especie)?.evoline || null
  const calcularCambios = () => {
    const todos = calcularCambiosSav({ partida, resumen, sav, pkdx })
    // Los nacidos de un huevo no son capturas de la zona donde nacieron: se apuntan en la Caja
    eclosiones = todos.filter((c) => c.tipo === 'eclosion')
    cambios = todos.filter((c) => c.tipo !== 'eclosion').map((c) => ({ ...c, marcado: true }))
  }

  const aplicar = () => {
    const store = getGameStore(partida.id)
    const datos = parcheCambiosSav({ partida, resumen, sav, cambios: cambios.filter((c) => c.marcado), linea })
    store.update(patch(datos))
    aplicado = true
    cambios = []
  }
</script>

<svelte:head>
  <title>Lockedex | {es ? 'Importar partida' : 'Import save'}</title>
</svelte:head>

<main class="lx-importar" data-lx-original>
  <section class="lx-panel lx-cabecera-imp">
    <div>
      <h1>{es ? 'Partida del emulador' : 'Emulator save'}</h1>
      <p>
        {es
          ? 'Importa el archivo .sav de tu emulador para traer tu equipo y tus cajas con niveles, movimientos, naturalezas e IVs. Funciona con Rubí, Zafiro, Esmeralda, RojoFuego y VerdeHoja (y los ROM hacks que mantienen su formato).'
          : 'Import your emulator .sav to bring in your team and boxes with levels, moves, natures and IVs. Works with Ruby, Sapphire, Emerald, FireRed and LeafGreen (and ROM hacks that keep their format).'}
      </p>
      {#if !partida}
        <p class="lx-error">{es ? 'Primero carga o crea una partida en Lockedex.' : 'Load or create a run in Lockedex first.'}</p>
      {/if}
    </div>
    <div class="lx-acciones-imp">
      {#if lx && rutaSav}
        <button class="lx-btn" on:click={() => recargar()} title={rutaSav}>{es ? 'Recargar' : 'Reload'} {nombreArchivo(rutaSav)}</button>
      {:else if lx && ultima && partida}
        <button class="lx-btn" on:click={() => recargar(ultima)} title={ultima}>{es ? 'Usar la última:' : 'Use the last one:'} {nombreArchivo(ultima)}</button>
      {/if}
      <button class="lx-btn" on:click={elegir}>{rutaSav ? (es ? 'Elegir otro .sav' : 'Choose another .sav') : sav ? (es ? 'Importar de nuevo' : 'Import again') : es ? 'Elegir archivo .sav' : 'Choose .sav file'}</button>
      <input bind:this={entrada} type="file" accept=".sav,.srm,.sa1,.sa2" hidden on:change={desdeInput} />
      {#if lx && rutaSav && partida}
        <label class="lx-vigilar">
          <input type="checkbox" checked={vigilando} on:change={alternarVigilancia} />
          {es ? 'Actualizar solo cada vez que guardes en el emulador' : 'Update automatically whenever you save in the emulator'}
        </label>
      {/if}
    </div>
  </section>

  {#if error}
    <section class="lx-panel lx-error">{error}</section>
  {/if}

  {#if sav}
    <section class="lx-panel">
      <div class="lx-entrenador">
        <span class="lx-chip-juego">{JUEGOS[sav.juego] || sav.juego}</span>
        <b>{sav.entrenador.nombre}</b>
        <span>ID {String(sav.entrenador.id).padStart(5, '0')}</span>
        <span>{sav.entrenador.horas} h {sav.entrenador.minutos} min</span>
        <small>{sav.nombre} · {new Date(sav.fecha).toLocaleString(es ? 'es-ES' : 'en-GB')}</small>
      </div>

      <h2>{es ? 'Equipo' : 'Team'}</h2>
      <div class="lx-equipo-imp">
        {#each sav.equipo as p}
          <article class:lx-debilitado={p.debilitado}>
            <div class="lx-p-cab">
              <img src={sprite(p)} alt="" />
              <div>
                <b>{p.mote}</b>
                <span>{info(p.especie)?.name || p.especie} · {es ? 'Nv.' : 'Lv.'} {p.nivel}{p.variocolor ? ' ✨' : ''}</span>
                {#if p.psMax}
                  <span class="lx-ps"><i style="width:{Math.round((p.ps / p.psMax) * 100)}%" /></span>
                {/if}
              </div>
            </div>
            <div class="lx-p-datos">
              <span>{es ? 'Naturaleza' : 'Nature'}: <b>{nombreNat(p.naturaleza)}</b></span>
              <span data-lx-hab={nombreHab(p.habilidad).en}>{es ? 'Habilidad' : 'Ability'}: <b>{nombreHab(p.habilidad).nombre}</b></span>
              {#if p.lugarCaptura}<span>{es ? 'Capturado en' : 'Met at'}: <b>{traducirNombre(p.lugarCaptura)}</b> ({es ? 'Nv.' : 'Lv.'} {p.nivelCaptura})</span>{/if}
            </div>
            <div class="lx-movs">
              {#each p.movimientos as id}
                {@const m = nombreMov(id)}
                <span data-lx-mov={m.en} style="--c:{COLOR_TIPO[m.tipo]}">{m.nombre}</span>
              {/each}
            </div>
            <div class="lx-ivs">
              {#each Object.entries(p.ivs) as [k, v]}
                <span title="IV {k}"><small>{k.toUpperCase()}</small>{v}</span>
              {/each}
            </div>
          </article>
        {/each}
      </div>

      {#if sav.cajas?.length}
        <h2>{es ? `Cajas (${sav.cajas.length})` : `Boxes (${sav.cajas.length})`}</h2>
        <div class="lx-cajas">
          {#each sav.cajas as p}
            <span title="{p.mote} · {es ? 'Nv.' : 'Lv.'} {p.nivel} · {es ? 'Caja' : 'Box'} {p.caja}">
              <img src={sprite(p)} alt="" />
              <small>{p.nivel}</small>
            </span>
          {/each}
        </div>
      {/if}
    </section>

    {#if partida}
      <section class="lx-panel">
        <h2>{es ? `Sincronizar con «${partida.nombre}»` : `Sync with “${partida.nombre}”`}</h2>
        {#if aplicado}
          <p class="lx-ok">{es ? '¡Hecho! Tu run está al día con la partida del emulador.' : 'Done! Your run is in sync with your emulator save.'}</p>
        {:else if !cambios.length}
          <p>{es ? 'Todo coincide: no hay nada que actualizar. El asistente de combate ya usa estos datos.' : 'Everything matches: nothing to update. The battle assistant already uses this data.'}</p>
        {:else}
          <p>{es ? 'Esto es lo que se puede actualizar en tu run (desmarca lo que no quieras):' : 'This is what can be updated in your run (untick anything you don’t want):'}</p>
          <ul class="lx-cambios">
            {#each cambios as c}
              <li>
                <label>
                  <input type="checkbox" bind:checked={c.marcado} />
                  <b>{traducirNombre(c.lugar)}</b>:
                  {#if c.tipo === 'nuevo'}
                    {es ? 'añadir' : 'add'} {info(c.s.especie)?.name || c.s.especie}{c.parche.nickname ? ` «${c.parche.nickname}»` : ''}
                  {:else if c.tipo === 'caido'}
                    <span class="lx-caido-txt">{c.s.mote || c.antes.nickname || c.antes.pokemon} {es ? 'está debilitado (0 PS) en tu partida: marcarlo como caído' : 'has fainted (0 HP) in your save: mark as dead'}</span>
                  {:else}
                    {#if c.parche.pokemon}{es ? 'evoluciona a' : 'evolves into'} {info(c.s.especie)?.name} ·{/if}
                    {#if c.parche.nickname}{es ? 'mote' : 'nickname'} «{c.parche.nickname}» ·{/if}
                    {#if c.parche.nature}{es ? 'naturaleza' : 'nature'} {nombreNat(c.parche.nature)}{/if}
                  {/if}
                </label>
              </li>
            {/each}
          </ul>
          <button class="lx-btn" on:click={aplicar}>{es ? 'Aplicar a mi run' : 'Apply to my run'}</button>
        {/if}
        {#if eclosiones.length}
          <p class="lx-nota">
            {es
              ? `${eclosiones.map((c) => c.s.mote || info(c.s.especie)?.name || c.s.especie).join(', ')} ${eclosiones.length > 1 ? 'han nacido' : 'ha nacido'} de un huevo. No ${eclosiones.length > 1 ? 'son capturas' : 'es una captura'} de la zona donde ${eclosiones.length > 1 ? 'nacieron' : 'nació'}: en Egglocke, apunta qué salió de cada huevo en la Caja (sale para elegir con un clic).`
              : `${eclosiones.map((c) => c.s.mote || c.s.especie).join(', ')} hatched from an egg: not a catch from where it hatched. In Egglocke, log what hatched in the Box (one click).`}
          </p>
        {/if}
      </section>
    {/if}
  {/if}
</main>

<style>
  .lx-importar {
    max-width: 1100px;
    margin: 0 auto;
    padding: 24px 20px 190px;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  .lx-panel {
    background: #fff;
    border: 3px solid #1b1b1f;
    border-radius: 14px;
    padding: 16px 18px;
    box-shadow: 4px 4px 0 rgba(0, 0, 0, 0.15);
  }
  :global(.dark) .lx-panel {
    background: #111827;
    border-color: #0b1118;
  }
  .lx-cabecera-imp {
    display: flex;
    gap: 20px;
    align-items: center;
    justify-content: space-between;
  }
  h1 {
    font-family: 'VT323', monospace;
    font-size: 42px;
    line-height: 1;
    color: #dc0a2d;
  }
  h2 {
    font-family: 'VT323', monospace;
    font-size: 28px;
    margin: 14px 0 8px;
  }
  .lx-cabecera-imp p {
    max-width: 640px;
    opacity: 0.8;
    margin-top: 6px;
  }
  .lx-acciones-imp {
    display: flex;
    flex-direction: column;
    gap: 10px;
    align-items: flex-end;
    min-width: 230px;
  }
  .lx-btn {
    font-family: 'VT323', monospace;
    font-size: 22px;
    padding: 6px 16px 4px;
    border-radius: 10px;
    background: #dc0a2d;
    color: #fff;
    border: 3px solid #1b1b1f;
    box-shadow: 3px 3px 0 #1b1b1f;
  }
  .lx-btn:active {
    transform: translate(2px, 2px);
    box-shadow: 1px 1px 0 #1b1b1f;
  }
  .lx-vigilar {
    font-size: 13px;
    display: flex;
    gap: 6px;
    align-items: center;
    text-align: right;
  }
  .lx-error {
    color: #dc2626;
    font-weight: 500;
  }
  .lx-ok {
    color: #16a34a;
    font-weight: 600;
  }
  .lx-entrenador {
    display: flex;
    gap: 12px;
    align-items: center;
    flex-wrap: wrap;
    font-family: 'VT323', monospace;
    font-size: 20px;
  }
  .lx-entrenador b {
    font-size: 28px;
  }
  .lx-entrenador small {
    font-family: Inter, system-ui, sans-serif;
    font-size: 12px;
    opacity: 0.6;
  }
  .lx-chip-juego {
    background: #1b1b1f;
    color: #ffcb05;
    padding: 2px 10px;
    border-radius: 6px;
  }
  .lx-equipo-imp {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 12px;
  }
  .lx-equipo-imp article {
    border: 3px solid #1b1b1f;
    border-radius: 12px;
    padding: 8px 12px 12px;
    background: #f7f7f2;
  }
  :global(.dark) .lx-equipo-imp article {
    background: #1f2937;
  }
  .lx-debilitado {
    opacity: 0.6;
    filter: grayscale(0.7);
  }
  .lx-p-cab {
    display: flex;
    gap: 8px;
    align-items: center;
  }
  .lx-p-cab img {
    width: 64px;
    height: 64px;
    image-rendering: pixelated;
    margin: -6px 0;
  }
  .lx-p-cab b {
    display: block;
    font-family: 'VT323', monospace;
    font-size: 26px;
    line-height: 1;
  }
  .lx-p-cab span {
    display: block;
    font-size: 13px;
    opacity: 0.8;
  }
  .lx-ps {
    width: 140px;
    height: 7px;
    border-radius: 4px;
    background: #3a3a42;
    margin-top: 4px;
    overflow: hidden;
  }
  .lx-ps i {
    display: block;
    height: 100%;
    background: #3ddc84;
  }
  .lx-p-datos {
    display: flex;
    flex-direction: column;
    font-size: 13px;
    margin: 6px 0;
  }
  .lx-movs {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }
  .lx-movs span {
    font-size: 12px;
    padding: 2px 8px;
    border-radius: 6px;
    background: var(--c, #888);
    color: #fff;
    text-shadow: 1px 1px 0 rgba(0, 0, 0, 0.35);
  }
  .lx-ivs {
    display: flex;
    gap: 4px;
    margin-top: 8px;
  }
  .lx-ivs span {
    flex: 1;
    text-align: center;
    font-family: 'VT323', monospace;
    font-size: 18px;
    background: rgba(0, 0, 0, 0.06);
    border-radius: 5px;
    line-height: 1.1;
  }
  .lx-ivs small {
    display: block;
    font-size: 11px;
    opacity: 0.6;
  }
  .lx-cajas {
    display: flex;
    flex-wrap: wrap;
    gap: 2px;
  }
  .lx-cajas span {
    position: relative;
  }
  .lx-cajas img {
    width: 48px;
    height: 48px;
    image-rendering: pixelated;
  }
  .lx-cajas small {
    position: absolute;
    right: 2px;
    bottom: 0;
    font-family: 'VT323', monospace;
    font-size: 14px;
  }
  .lx-caido-txt {
    color: #c02828;
  }
  :global(.dark) .lx-caido-txt {
    color: #f87171;
  }
  .lx-nota {
    margin-top: 10px;
    font-size: 0.9em;
    opacity: 0.85;
  }
  .lx-cambios {
    display: flex;
    flex-direction: column;
    gap: 4px;
    margin: 10px 0 14px;
    font-size: 14px;
  }
  .lx-cambios label {
    display: flex;
    gap: 6px;
    align-items: center;
  }
</style>
