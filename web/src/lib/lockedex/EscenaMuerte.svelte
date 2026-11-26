<script>
  // Escena de «se ha debilitado»: el sprite parpadea y se hunde como en los juegos de GBA (un segundo, se
  // salta con un clic o Intro) y luego una lápida donde se elige la causa, con lo más probable ya puesto
  // (el próximo jefe, la zona donde estás según el .sav), y el epitafio. Guarda lo mismo que el formulario
  // heredado: { type: 'boss' | 'encounter' | 'trainer', trainer, opponent, attack, location, epitaph, time }
  import { onMount, onDestroy, getContext } from 'svelte'
  import { createImgUrl } from '$utils/rewrites'
  import { fetchData } from '$utils/fetchers'
  import { format, randomTemplate, ELossType } from '$lib/components/DeathModal/prose'
  import { equipoActual } from './equipo.js'
  import { cargarLiga } from './partida.js'
  import { zonaDelSav } from './zonas.js'
  import { norm } from './datos.js'
  import { marco } from './gba.js'
  import { t, traducirNombre, idioma } from './idioma.js'

  export let submit = (_) => _
  export let pokemon = {}
  export let nickname = ''
  export let death = {}
  export let mode = 'new'

  const { close } = getContext('simple-modal')
  const es = idioma() === 'es'
  const CAJA = marco({ tinta: '#283850', fondo: '#f8f8f8', luz: '#ffffff', sombra: '#c8d0d8', r: 3 })
  const BOTON = marco({ tinta: '#283850', fondo: '#f8f8f8', luz: '#ffffff', sombra: '#c8d0d8', r: 2 })
  const ACCION = marco({ tinta: '#3a1018', fondo: '#c83848', luz: '#e86070', sombra: '#901828', r: 2 })

  const nombre = traducirNombre(pokemon?.name || '')
  const quien = nickname || nombre

  // Escena: 'cae' (animación) → 'lapida' (formulario). Al editar desde el cementerio, directo a la lápida
  let fase = mode === 'new' ? 'cae' : 'lapida'
  let temporizador
  const aLapida = () => {
    clearTimeout(temporizador)
    fase = 'lapida'
  }
  onMount(() => {
    if (fase === 'cae') temporizador = setTimeout(aLapida, 1300)
  })
  onDestroy(() => clearTimeout(temporizador))
  const tecla = (e) => {
    if (fase === 'cae' && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault()
      aLapida()
    }
  }

  // Datos de la run para adivinar la causa
  let jefes = []
  let siguiente = null
  let liga = {}
  let zona = null
  let pokedex = null
  onMount(async () => {
    try {
      const actual = await equipoActual()
      if (!actual) return
      jefes = (actual.resumen?.jefes || []).filter((j) => j.boss || j.name)
      siguiente = actual.resumen?.siguienteJefe || null
      const p = actual.partida
      ;[liga, zona, pokedex] = await Promise.all([
        cargarLiga(p.juego, p.datos?.__starter || 'fire').catch(() => ({})),
        zonaDelSav(p).then((z) => z?.zona || null).catch(() => null),
        fetchData().catch(() => null)
      ])
      if (mode === 'new' && !tipo) elegir(siguiente ? 'boss' : 'encounter')
    } catch (e) {
      console.error('[escena muerte]', e)
    }
  })

  // Lo elegido (al editar, lo que ya tenía)
  let tipo = death?.type || ''
  let jefeValor = death?.trainer?.id != null ? String(death.trainer.id) : ''
  let rivalAlias = death?.opponent?.id || ''
  let rivalTexto = death?.opponent?.name || ''
  let movimiento = death?.attack?.name || ''
  let entrenador = death?.type === 'trainer' ? death?.trainer?.name || '' : ''
  let lugar = death?.location?.name || ''

  const elegir = (t2) => {
    tipo = t2
    if (t2 === 'boss' && !jefeValor && siguiente) jefeValor = String(siguiente.value)
    if (t2 !== 'boss' && !lugar && zona) lugar = zona
  }
  $: if (zona && tipo && tipo !== 'boss' && !lugar) lugar = zona

  $: jefe = jefes.find((j) => String(j.value) === String(jefeValor)) || null
  $: equipoJefe = (jefe && liga?.[jefe.value]?.pokemon) || []
  $: rivalJefe = equipoJefe.find((m) => m.name === rivalAlias) || null
  $: movimientos = rivalJefe?.moves || []

  const deLaPokedex = (texto, _pk) => {
    const n = norm(texto)
    if (!n || !_pk) return null
    return _pk.aliasMap?.[n] || _pk.nameMap?.[n] || Object.values(_pk.aliasMap || {}).find((p) => norm(traducirNombre(p.name)) === n) || null
  }
  $: nombres = pokedex ? [...new Set(Object.values(pokedex.aliasMap || {}).map((p) => traducirNombre(p.name)))].sort() : []

  // El objeto que se guarda, con los mismos campos que el formulario heredado
  $: rivalPk = tipo === 'boss' ? (rivalJefe ? deLaPokedex(rivalJefe.name, pokedex) || { name: rivalJefe.name, types: rivalJefe.types, alias: rivalJefe.name } : null) : deLaPokedex(rivalTexto, pokedex)
  $: datos = {
    type: tipo || 'encounter',
    ...(tipo === 'boss' && jefe
      ? {
          trainer: { name: jefe.boss || jefe.name, id: jefe.value, speciality: liga?.[jefe.value]?.speciality || null, type: jefe.group },
          location: { name: jefe.name }
        }
      : {}),
    ...(tipo === 'trainer' && entrenador ? { trainer: { name: entrenador } } : {}),
    ...(tipo !== 'boss' && lugar ? { location: { name: lugar } } : {}),
    ...(rivalPk || (tipo !== 'boss' && rivalTexto) ? { opponent: { name: rivalPk?.name || rivalTexto, types: rivalPk?.types, id: rivalPk?.alias || null } } : {}),
    ...(tipo === 'boss' && movimiento ? { attack: { name: movimiento, type: movimientos.find((m) => m.name === movimiento)?.type } } : {})
  }

  // Epitafio: una plantilla al azar con los datos de arriba; si lo escribes tú, se queda el tuyo
  let plantilla = death?.epitaph || randomTemplate(ELossType.Random)
  let propio = !!death?.custom
  let epitafio = death?.epitaph || ''
  $: if (!propio) epitafio = format(plantilla, { ...datos, nickname, pokemon: { ...pokemon, name: nombre } }) || ''
  const otro = () => {
    propio = false
    let nueva = plantilla
    for (let i = 0; i < 5 && nueva === plantilla; i++) nueva = randomTemplate(ELossType.Random)
    plantilla = nueva
  }

  const guardar = () => {
    submit({ ...datos, time: death?.time || Date.now(), epitaph: epitafio, custom: propio, category: ELossType.Random })
    close()
  }
  const saltar = () => {
    submit(mode === 'new' ? { time: Date.now() } : { ...death })
    close()
  }

  const sprite = createImgUrl(pokemon, { ext: 'png' })
  const nombreJefe = (j) => traducirNombre(j.boss || j.name)
  const LUGAR_ES = (n) => traducirNombre(n || '')
</script>

<svelte:window on:keydown={tecla} />

<section class="lx-muerte" data-lx-original>
  <button class="lx-m-x" on:click={close} aria-label={t('Cerrar (no ha caído)', 'Close (not dead)')} title={t('Cerrar (no ha caído)', 'Close (not dead)')}>✕</button>

  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <div class="lx-m-pantalla" class:lx-m-noche={fase === 'lapida'} on:click={() => fase === 'cae' && aLapida()}>
    {#if fase === 'cae'}
      <img class="lx-m-sprite lx-m-cae" src={sprite} alt="" />
    {:else}
      <img class="lx-m-sprite lx-m-gris" src={sprite} alt="" />
      <img class="lx-m-lapida" src="/lx/objetos/lapida.png" alt="" />
    {/if}
  </div>

  <div class="lx-m-texto" style={CAJA}>
    {#if fase === 'cae'}
      <p class="lx-m-escribe">{t(`¡${quien} se ha debilitado!`, `${quien} fainted!`)}</p>
    {:else}
      <p>{t(`Aquí yace ${quien}`, `Here lies ${quien}`)}{nickname && nombre ? ` (${nombre})` : ''}.</p>
    {/if}
  </div>

  {#if fase === 'lapida'}
    <div class="lx-m-form">
      <span class="lx-m-etq">{t('¿Quién fue?', 'Who did it?')}</span>
      <div class="lx-m-fichas" role="radiogroup">
        <button class:lx-on={tipo === 'boss'} on:click={() => elegir('boss')} style={BOTON}>{t('Un jefe', 'A boss')}</button>
        <button class:lx-on={tipo === 'encounter'} on:click={() => elegir('encounter')} style={BOTON}>{t('Pokémon salvaje', 'Wild Pokémon')}</button>
        <button class:lx-on={tipo === 'trainer'} on:click={() => elegir('trainer')} style={BOTON}>{t('Entrenador', 'Trainer')}</button>
      </div>

      {#if tipo === 'boss'}
        <label class="lx-m-campo">
          <span>{t('Jefe', 'Boss')}</span>
          <select bind:value={jefeValor} on:change={() => ((rivalAlias = ''), (movimiento = ''))}>
            <option value="">{t('Elige…', 'Choose…')}</option>
            {#each jefes as j}
              <option value={String(j.value)}>{nombreJefe(j)}{siguiente && String(siguiente.value) === String(j.value) ? t(' (el próximo)', ' (next)') : ''}</option>
            {/each}
          </select>
        </label>
        {#if equipoJefe.length}
          <span class="lx-m-etq">{t('¿Con qué Pokémon?', 'Which Pokémon?')}</span>
          <div class="lx-m-rivales">
            {#each equipoJefe as m}
              <button class:lx-on={rivalAlias === m.name} on:click={() => ((rivalAlias = rivalAlias === m.name ? '' : m.name), (movimiento = ''))} title={traducirNombre(deLaPokedex(m.name, pokedex)?.name || m.name)}>
                <img src={createImgUrl(m, { ext: 'png' })} alt={m.name} />
                <small>{t('Nv.', 'Lv.')} {m.level}</small>
              </button>
            {/each}
          </div>
          {#if movimientos.length}
            <label class="lx-m-campo">
              <span>{t('Ataque', 'Move')}</span>
              <select bind:value={movimiento}>
                <option value="">{t('No lo sé', 'Not sure')}</option>
                {#each movimientos as mv}<option value={mv.name}>{traducirNombre(mv.name)}</option>{/each}
              </select>
            </label>
          {/if}
        {/if}
      {:else}
        {#if tipo === 'trainer'}
          <label class="lx-m-campo">
            <span>{t('Entrenador', 'Trainer')}</span>
            <input bind:value={entrenador} placeholder={t('Montañero Pepe…', 'Hiker Joe…')} />
          </label>
        {/if}
        <label class="lx-m-campo">
          <span>{t('Pokémon', 'Pokémon')}</span>
          <input bind:value={rivalTexto} list="lx-m-nombres" placeholder={t('¿Cuál fue? (opcional)', 'Which one? (optional)')} />
        </label>
        <label class="lx-m-campo">
          <span>{t('Dónde', 'Where')}</span>
          <input value={LUGAR_ES(lugar)} on:input={(e) => (lugar = e.currentTarget.value)} placeholder={t('Ruta 3…', 'Route 3…')} />
        </label>
        <datalist id="lx-m-nombres">{#each nombres as n}<option value={n} />{/each}</datalist>
      {/if}

      <span class="lx-m-etq">{t('Epitafio', 'Epitaph')} <button class="lx-m-dado" on:click={otro} title={t('Otro al azar', 'Another one')}>🎲</button></span>
      <textarea rows="3" value={epitafio} on:input={(e) => ((propio = true), (epitafio = e.currentTarget.value))} />

      <div class="lx-m-botones">
        <button on:click={saltar} style={BOTON}>{mode === 'new' ? t('Sin detalles', 'Skip details') : t('Cancelar', 'Cancel')}</button>
        <button class="lx-m-ok" on:click={guardar} style={ACCION}>{t('Al cementerio', 'To the graveyard')}</button>
      </div>
    </div>
  {/if}
</section>

<style>
  .lx-muerte {
    position: relative;
    width: min(420px, 92vw);
    margin: 0 auto;
    padding: 12px;
    color: #283850;
    background: #e8e8f0;
    border: 3px solid #283850;
    border-radius: 10px;
    font-family: 'LX Pixel', 'VT323', monospace;
  }
  :global(html.dark) .lx-muerte {
    background: #2c2948;
    color: #f4f0e4;
  }
  .lx-m-x {
    position: absolute;
    top: 6px;
    right: 8px;
    z-index: 2;
    font-size: 14px;
    opacity: 0.7;
  }
  .lx-m-pantalla {
    position: relative;
    height: 150px;
    display: flex;
    align-items: flex-end;
    justify-content: center;
    gap: 24px;
    overflow: hidden;
    border: 2px solid #283850;
    border-radius: 6px;
    background: linear-gradient(#a8d8f0, #d8f0f8 60%, #88c070 60%, #70a858);
    cursor: pointer;
  }
  .lx-m-noche {
    background: linear-gradient(#303050, #505078 60%, #5a6a48 60%, #46563a);
    cursor: default;
  }
  .lx-m-sprite {
    width: 96px;
    height: 96px;
    image-rendering: pixelated;
    margin-bottom: 10px;
  }
  /* Parpadeo y se hunde en el suelo, como al debilitarse en la 3.ª gen */
  .lx-m-cae {
    animation: lx-m-cae 1.1s steps(22, end) forwards;
  }
  @keyframes lx-m-cae {
    0%, 14%, 28% { opacity: 1; transform: translateY(0); clip-path: inset(0 0 0 0); }
    7%, 21% { opacity: 0.15; }
    35% { opacity: 1; transform: translateY(0); clip-path: inset(0 0 0 0); }
    100% { opacity: 1; transform: translateY(96px); clip-path: inset(0 0 100% 0); }
  }
  .lx-m-gris {
    filter: grayscale(1) brightness(0.8);
    opacity: 0.55;
    animation: lx-m-sube 0.5s ease-out;
  }
  .lx-m-lapida {
    width: 64px;
    height: 64px;
    image-rendering: pixelated;
    margin-bottom: 14px;
    animation: lx-m-sube 0.4s steps(6, end);
  }
  @keyframes lx-m-sube {
    from { transform: translateY(20px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
  }
  .lx-m-texto {
    margin-top: 8px;
    padding: 4px 8px;
    min-height: 40px;
    color: #283850;
    font-size: 16px;
    line-height: 20px;
  }
  .lx-m-escribe {
    overflow: hidden;
    white-space: nowrap;
    animation: lx-m-escribe 0.6s steps(24, end);
  }
  @keyframes lx-m-escribe {
    from { max-width: 0; }
    to { max-width: 100%; }
  }
  .lx-m-form {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin-top: 8px;
    font-size: 14px;
  }
  .lx-m-etq {
    font-size: 13px;
    opacity: 0.8;
  }
  .lx-m-fichas,
  .lx-m-botones {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
  }
  .lx-m-fichas button,
  .lx-m-botones button {
    padding: 0 6px;
    color: #283850;
    font-size: 14px;
  }
  .lx-m-fichas button.lx-on {
    outline: 2px solid #e05060;
    outline-offset: -2px;
  }
  .lx-m-campo {
    display: grid;
    grid-template-columns: 70px 1fr;
    align-items: center;
    gap: 6px;
  }
  .lx-m-campo input,
  .lx-m-campo select,
  textarea {
    min-width: 0;
    padding: 2px 6px;
    color: #283850;
    background: #f8f8f8;
    border: 2px solid #283850;
    border-radius: 4px;
    font-family: inherit;
    font-size: 14px;
  }
  textarea {
    resize: vertical;
    line-height: 17px;
  }
  .lx-m-rivales {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }
  .lx-m-rivales button {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 58px;
    padding: 2px;
    border: 2px solid transparent;
    border-radius: 6px;
  }
  .lx-m-rivales button.lx-on {
    border-color: #e05060;
    background: rgba(224, 80, 96, 0.15);
  }
  .lx-m-rivales img {
    width: 48px;
    height: 48px;
    image-rendering: pixelated;
  }
  .lx-m-rivales small {
    font-size: 11px;
  }
  .lx-m-dado {
    font-size: 14px;
    line-height: 1;
  }
  .lx-m-botones {
    justify-content: flex-end;
    margin-top: 4px;
  }
  .lx-m-botones .lx-m-ok {
    color: #fff;
  }
</style>
