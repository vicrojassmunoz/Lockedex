<script>
  // Randomizer de Lockedex para las ROM de la 3.ª gen: eliges tu ROM, ves qué ha encontrado, eliges qué
  // cambiar y crea una ROM nueva al lado de la tuya (la original no se toca), con su registro. Los ajustes
  // y el registro se quedan en la run: las rutas, los iniciales y los jefes los usan.
  import { onMount, getContext } from 'svelte'
  import { analizarRom, leerEntrenadores } from './rom.js'
  import { aleatorizar, registroEnTexto, completarAjustes } from './aleatorizar.js'
  import { semillaNueva } from './azar.js'
  import { leerRandom, guardarRandom, borrarRandom, emparejarJefes } from './registro.js'
  import { leerPartida, cargarLiga } from '../partida.js'
  import { leerReglas, guardarReglas } from '../reglas.js'
  import { cargar } from '../datos.js'
  import { t, idioma, traducirNombre } from '../idioma.js'

  export let id = ''

  const { close } = getContext('simple-modal')
  const es = idioma() === 'es'
  const lx = typeof window !== 'undefined' ? window.lockedex : null

  let partida = null
  let previo = null // registro de una ROM ya aleatorizada para esta run
  let rom = null // { ruta, nombre, datos }
  let analisis = null
  let estado = 'inicio' // inicio | analizando | listo | creando | hecho
  let error = ''
  let resultado = null
  let nombres = {}

  const copia = (o) => JSON.parse(JSON.stringify(o))
  let ajustes = { ...completarAjustes(), semilla: semillaNueva() }

  onMount(async () => {
    partida = leerPartida(id)
    previo = leerRandom(id)
    if (previo?.ajustes) ajustes = { ...completarAjustes(copia(previo.ajustes)), semilla: semillaNueva() }
    try {
      const esp = await cargar('especies.json')
      nombres = Object.fromEntries(Object.entries(esp || {}).map(([k, v]) => [k, es ? v.es : v.en]))
    } catch {}
  })
  const nombre = (alias) => nombres[alias] || traducirNombre(String(alias || '').replace(/^./, (c) => c.toUpperCase()))

  const elegirRom = async () => {
    error = ''
    if (!lx?.elegirRom) return (error = t('Esto solo funciona en la aplicación de escritorio.', 'This only works in the desktop app.'))
    const r = await lx.elegirRom()
    if (!r) return
    if (r.error === 'grande') return (error = t('Ese archivo es demasiado grande para ser una ROM de GBA.', 'That file is too big to be a GBA ROM.'))
    rom = r
    estado = 'analizando'
    await new Promise((ok) => setTimeout(ok, 30))
    try {
      analisis = analizarRom(r.datos)
    } catch (e) {
      analisis = { juego: null, problemas: [String(e?.message || e)] }
    }
    estado = 'listo'
  }

  $: juegoRun = partida?.juego
  $: coincide = !!(analisis?.juego?.clave && juegoRun && analisis.juego.clave === juegoRun)
  $: criticos = analisis && analisis.base !== null && analisis.evoluciones !== null && analisis.aprendizaje !== null
  $: sePuede = analisis?.juego?.compatible && criticos && (analisis.salvajes || analisis.entrenadores || analisis.iniciales)
  $: cambiaDatos = ajustes.tipos.modo !== 'mantener' || ajustes.habilidades.modo !== 'mantener' || ajustes.movimientos.modo !== 'mantener'

  const ENCONTRADO = [
    ['salvajes', 'Pokémon salvajes', 'Wild Pokémon', (a) => (a.salvajes ? `${a.salvajes.cabeceras.length} ${t('zonas', 'areas')}` : null)],
    ['iniciales', 'Iniciales', 'Starters', (a) => (a.iniciales ? '✓' : null)],
    ['entrenadores', 'Entrenadores', 'Trainers', (a) => (a.entrenadores ? `${a.entrenadores.n}` : null)],
    ['base', 'Tipos y habilidades', 'Types and abilities', (a) => (a.base !== null ? '✓' : null)],
    ['aprendizaje', 'Movimientos por nivel', 'Level-up moves', (a) => (a.aprendizaje !== null ? '✓' : null)],
    ['evoluciones', 'Evoluciones', 'Evolutions', (a) => (a.evoluciones !== null ? '✓' : null)],
    ['mt', 'MT y MO', 'TMs and HMs', (a) => (a.mt ? '✓' : null)],
    ['compatMT', 'Quién aprende cada MT', 'TM compatibility', (a) => (a.compatMT !== null ? '✓' : null)],
    ['tutores', 'Tutores', 'Move tutors', (a) => (a.tutores ? `${a.tutores.n}` : a.juego?.familia === 'rs' ? 'na' : null)],
    ['objetosSuelo', 'Objetos del suelo', 'Field items', (a) => (a.objetosSuelo ? `${a.objetosSuelo.length}` : null)],
    ['tiendas', 'Tiendas', 'Shops', (a) => (a.tiendas ? `${a.tiendas.length}` : null)],
    ['libre', 'Espacio libre', 'Free space', (a) => (a.libre ? `${Math.round((a.libre.fin - a.libre.inicio) / 1024)} KB` : null)]
  ]
  const marca = (v) => (v === 'na' ? '–' : v ? '✓' : '✗')
  const detalle = (v) => (v === 'na' ? t('no tiene', 'none') : v && v !== '✓' ? v : '')

  const datosMotor = async () => {
    const [g3, esp, movs] = await Promise.all([fetch('/lx/gen3.json').then((r) => r.json()), cargar('especies.json'), cargar('movimientos.json')])
    return {
      especies: g3.especies,
      caracteres: g3.caracteres,
      legendarios: new Set(Object.entries(esp || {}).filter(([, e]) => e.l).map(([k]) => k)),
      movimientos: Object.fromEntries(Object.values(movs || {}).map((m) => [m.id, m]))
    }
  }

  const crear = async () => {
    error = ''
    if (!sePuede) return
    estado = 'creando'
    await new Promise((ok) => setTimeout(ok, 30))
    try {
      const datos = await datosMotor()
      const { rom: nueva, registro } = aleatorizar(rom.datos, analisis, ajustes, datos)
      // Qué entrenador de la ROM es cada jefe de Lockedex, para cada inicial (el rival cambia con él)
      if (analisis.entrenadores && coincide) {
        const alias = (i) => datos.especies[i]?.p
        const originales = leerEntrenadores(rom.datos, analisis.entrenadores.tabla, analisis.entrenadores.n).map((e) => ({
          equipo: (e.miembros || []).map((m) => ({ especie: alias(m.esp), nivel: m.nivel }))
        }))
        const nombresRom = (registro.entrenadores || []).map((e) => e?.nombre || '')
        registro.jefes = {}
        for (const ini of ['grass', 'fire', 'water']) {
          const liga = await cargarLiga(juegoRun, ini).catch(() => ({}))
          registro.jefes[ini] = emparejarJefes(liga, originales, nombresRom)
        }
      }
      // En el registro de texto, cada mapa con el nombre de su zona
      const zonas = await fetch('/lx/zonas-sav.json').then((r) => r.json()).catch(() => ({}))
      const mapas = zonas[{ ruby: 'rz', saph: 'rz', em: 'esmeralda', fr: 'rfvh', lg: 'rfvh' }[analisis.juego.clave]] || {}
      const nombreMapa = (m) => (mapas[m] ? `${traducirNombre(mapas[m])} (${m})` : m)
      const nombreMov = (id) => (es ? datos.movimientos[id]?.es : datos.movimientos[id]?.en) || `#${id}`
      const w = await lx.guardarRomAleatoria({ rutaOriginal: rom.ruta, datos: nueva, sufijo: ajustes.semilla, registroTexto: registroEnTexto(registro, nombre, nombreMapa, nombreMov) })
      if (!w?.ok) throw new Error(t('No se pudo guardar la ROM nueva: ', 'Could not save the new ROM: ') + (w?.detalle || w?.motivo || ''))
      registro.rom = { original: rom.nombre, nombre: w.nombre, ruta: w.ruta, registro: w.registro }
      if (coincide) {
        guardarRandom(id, registro)
        // La run pasa a ser Randomlocke con lo que se ha aleatorizado (el riesgo no se calcula si cambian los datos)
        const reglas = leerReglas(id)
        guardarReglas(id, {
          ...reglas,
          randomlocke: true,
          entrenadoresAleatorios: ajustes.entrenadores.modo !== 'mantener' || ajustes.iniciales.modo !== 'mantener',
          datosAleatorios: cambiaDatos,
          nivelesJefes: ''
        })
      }
      resultado = { ...w, registro, guardadoEnRun: coincide }
      previo = coincide ? registro : previo
      estado = 'hecho'
    } catch (e) {
      console.error('[randomizer]', e)
      error = String(e?.message || e)
      estado = 'listo'
    }
  }

  const quitar = () => {
    if (!confirm(t('¿Quitar de esta run los datos de la ROM aleatoria? (La ROM sigue en tu carpeta.)', 'Remove the random ROM data from this run? (The ROM stays in your folder.)'))) return
    borrarRandom(id)
    previo = null
  }
  const PCT = [0, 10, 20, 30, 50]
</script>

<section class="lx-rnd" data-lx-original>
  <header>
    <h2>{t('RANDOMIZER', 'RANDOMIZER')} <small>3.ª gen</small></h2>
    <button class="lx-rnd-x" on:click={close} aria-label={t('Cerrar', 'Close')}>✕</button>
  </header>

  <div class="lx-rnd-cuerpo">
    {#if previo && estado !== 'hecho'}
      <div class="lx-rnd-previo">
        <b>{t('Esta run ya tiene una ROM aleatoria', 'This run already has a random ROM')}</b>
        <span>{previo.rom?.nombre || '—'} · {t('semilla', 'seed')} {previo.semilla} · {new Date(previo.fecha).toLocaleDateString(es ? 'es-ES' : 'en-GB')}</span>
        <span class="lx-rnd-fila">
          {#if previo.rom?.ruta && lx?.mostrarArchivo}<button on:click={() => lx.mostrarArchivo(previo.rom.ruta)}>{t('Ver en la carpeta', 'Show in folder')}</button>{/if}
          <button on:click={quitar}>{t('Quitar de la run', 'Remove from run')}</button>
        </span>
      </div>
    {/if}

    {#if estado === 'hecho' && resultado}
      <div class="lx-rnd-hecho">
        <b>✓ {t('¡ROM creada!', 'ROM created!')}</b>
        <p>{resultado.nombre}{resultado.registro?.rom?.registro ? ` + ${resultado.registro.rom.registro}` : ''}</p>
        <p>{t('Está en la misma carpeta que tu ROM. La original no se ha tocado.', 'It is in the same folder as your ROM. The original is untouched.')}</p>
        <p>
          {t('Iniciales:', 'Starters:')} <b>{resultado.registro.iniciales.map(nombre).join(' · ')}</b>
        </p>
        {#each resultado.registro.avisos || [] as a}<p class="lx-rnd-aviso">⚠ {a}</p>{/each}
        {#if resultado.guardadoEnRun}
          <p>{t('La run ya sabe qué sale en cada zona, cuáles son los iniciales y qué llevan los jefes.', 'The run now knows what appears in each area, the starters and the boss teams.')}{cambiaDatos ? t(' Como cambian tipos, habilidades o movimientos, el riesgo y el asistente de combate no se calculan.', ' Since types, abilities or moves change, risk and the battle assistant are not calculated.') : ''}</p>
        {:else}
          <p class="lx-rnd-aviso">⚠ {t('La ROM no es del juego de esta run: no se ha guardado nada en la run.', 'The ROM is not this run’s game: nothing was saved in the run.')}</p>
        {/if}
        <span class="lx-rnd-fila">
          {#if lx?.mostrarArchivo}<button on:click={() => lx.mostrarArchivo(resultado.ruta)}>{t('Ver en la carpeta', 'Show in folder')}</button>{/if}
          <button on:click={() => { estado = 'listo'; ajustes = { ...ajustes, semilla: semillaNueva() } }}>{t('Hacer otra', 'Make another')}</button>
          <button class="lx-rnd-principal" on:click={close}>{t('Listo', 'Done')}</button>
        </span>
      </div>
    {:else}
      <div class="lx-rnd-paso">
        <b>1. {t('TU ROM', 'YOUR ROM')}</b>
        <p class="lx-rnd-nota">{t('RojoFuego, VerdeHoja, Rubí, Zafiro o Esmeralda (en cualquier idioma). Lockedex crea una ROM nueva al lado; la tuya no se toca.', 'FireRed, LeafGreen, Ruby, Sapphire or Emerald (any language). Lockedex creates a new ROM next to yours; yours is untouched.')}</p>
        <span class="lx-rnd-fila">
          <button on:click={elegirRom} disabled={estado === 'analizando' || estado === 'creando'}>{rom ? t('Elegir otra…', 'Choose another…') : t('Elegir ROM (.gba)…', 'Choose ROM (.gba)…')}</button>
          {#if rom}<span>{rom.nombre}</span>{/if}
        </span>
        {#if estado === 'analizando'}<p>{t('Leyendo la ROM…', 'Reading the ROM…')}</p>{/if}
        {#if analisis}
          {#if analisis.juego?.compatible}
            <p><b>{analisis.juego.nombre}</b> ({analisis.juego.codigo}, {analisis.juego.idioma}{analisis.juego.revision ? `, rev. ${analisis.juego.revision}` : ''})</p>
            <ul class="lx-rnd-encontrado">
              {#each ENCONTRADO as [k, e, n, f]}
                <li class:lx-rnd-falta={!f(analisis)}>{marca(f(analisis))} {t(e, n)}{detalle(f(analisis)) ? ` (${detalle(f(analisis))})` : ''}</li>
              {/each}
            </ul>
            {#if analisis.problemas?.length}
              <p class="lx-rnd-aviso">⚠ {analisis.problemas.join(' ')} {t('Si es una ROM ya aleatorizada o un hack, usa la original.', 'If it is an already randomized ROM or a hack, use the original.')}</p>
            {/if}
            {#if !coincide && juegoRun}
              <p class="lx-rnd-aviso">⚠ {t(`Esta run es de otro juego: puedes crear la ROM, pero la run no podrá usar su registro.`, `This run is for another game: you can create the ROM, but the run will not use its log.`)}</p>
            {/if}
          {:else}
            <p class="lx-rnd-aviso">⚠ {analisis.problemas?.join(' ')}</p>
          {/if}
        {/if}
      </div>

      {#if sePuede}
        <div class="lx-rnd-paso">
          <b>2. {t('QUÉ CAMBIA', 'WHAT CHANGES')}</b>
          <div class="lx-rnd-grupos">
            <fieldset disabled={!analisis.salvajes}>
              <legend>{t('Pokémon salvajes', 'Wild Pokémon')}</legend>
              <select bind:value={ajustes.salvajes.modo}>
                <option value="mantener">{t('No cambiar', 'Unchanged')}</option>
                <option value="unoAuno">{t('1 a 1 por especie', '1-to-1 per species')}</option>
                <option value="zona">{t('Al azar por zona', 'Random per area')}</option>
                <option value="fuerza">{t('Por fuerza parecida', 'Similar strength')}</option>
              </select>
              <small>{ajustes.salvajes.modo === 'unoAuno' ? t('Cada especie pasa a ser siempre la misma (todos los Zigzagoon, por ejemplo, pasan a ser Ralts).', 'Each species always becomes the same one.') : ajustes.salvajes.modo === 'zona' ? t('Cada zona, sus especies al azar (mismas proporciones).', 'Each area gets its own random species.') : ajustes.salvajes.modo === 'fuerza' ? t('Como el 1 a 1, pero por una de total de estadísticas parecido.', 'Like 1-to-1, but with a similar stat total.') : ''}</small>
              <label class="lx-rnd-casilla"><input type="checkbox" bind:checked={ajustes.salvajes.mismaEtapa} /> {t('Respetar la etapa (básicos por básicos, finales por finales)', 'Keep the stage (basic for basic, final for final)')}</label>
              <label class="lx-rnd-casilla"><input type="checkbox" bind:checked={ajustes.salvajes.sinLegendarios} /> {t('Sin legendarios', 'No legendaries')}</label>
              <label>{t('Subir niveles', 'Raise levels')} <select bind:value={ajustes.salvajes.subirNivel}>{#each PCT as p}<option value={p}>{p ? `+${p} %` : t('No', 'No')}</option>{/each}</select></label>
            </fieldset>

            <fieldset disabled={!analisis.iniciales}>
              <legend>{t('Iniciales', 'Starters')}</legend>
              <select bind:value={ajustes.iniciales.modo}>
                <option value="mantener">{t('No cambiar', 'Unchanged')}</option>
                <option value="azar">{t('Al azar', 'Random')}</option>
                <option value="tresEtapas">{t('Al azar, con 3 etapas', 'Random, 3 stages')}</option>
              </select>
              <label>{t('Tipos', 'Types')}
                <select bind:value={ajustes.iniciales.triangulo} disabled={ajustes.iniciales.modo === 'mantener'}>
                  <option value="no">{t('Cualquiera', 'Any')}</option>
                  <option value="clasico">{t('Planta, Fuego y Agua', 'Grass, Fire and Water')}</option>
                  <option value="cualquiera">{t('Triángulo de tipos (cada uno gana al siguiente)', 'Type triangle (each beats the next)')}</option>
                </select>
              </label>
              <label class="lx-rnd-casilla"><input type="checkbox" bind:checked={ajustes.iniciales.sinLegendarios} /> {t('Sin legendarios', 'No legendaries')}</label>
            </fieldset>

            <fieldset disabled={!analisis.entrenadores}>
              <legend>{t('Entrenadores y jefes', 'Trainers and bosses')}</legend>
              <select bind:value={ajustes.entrenadores.modo}>
                <option value="mantener">{t('No cambiar sus Pokémon', 'Keep their Pokémon')}</option>
                <option value="azar">{t('Al azar', 'Random')}</option>
                <option value="fuerza">{t('Por fuerza parecida', 'Similar strength')}</option>
              </select>
              <label>{t('Líderes y Alto Mando', 'Leaders and Elite Four')}
                <select bind:value={ajustes.entrenadores.jefes}>
                  <option value="original">{t('Con su tipo de siempre', 'Their usual type')}</option>
                  <option value="azar">{t('Con otro tipo al azar', 'Another random type')}</option>
                  <option value="no">{t('Sin tipo', 'No type')}</option>
                </select>
              </label>
              <label>{t('Los demás', 'Everyone else')}
                <select bind:value={ajustes.entrenadores.tema}>
                  <option value="no">{t('Sin tipo', 'No type')}</option>
                  <option value="clase">{t('Por su clase (Nadador: Agua…)', 'By class (Swimmer: Water…)')}</option>
                  <option value="azar">{t('Un tipo al azar cada uno', 'A random type each')}</option>
                </select>
              </label>
              <label class="lx-rnd-casilla"><input type="checkbox" bind:checked={ajustes.entrenadores.mismaEtapa} /> {t('Respetar la etapa (básicos por básicos, finales por finales)', 'Keep the stage (basic for basic, final for final)')}</label>
              <label class="lx-rnd-casilla"><input type="checkbox" bind:checked={ajustes.entrenadores.rivalInicial} /> {t('El rival lleva su inicial', 'Rival carries their starter')}</label>
              <label class="lx-rnd-casilla"><input type="checkbox" bind:checked={ajustes.entrenadores.sinLegendarios} /> {t('Sin legendarios', 'No legendaries')}</label>
              <label class="lx-rnd-casilla"><input type="checkbox" bind:checked={ajustes.entrenadores.nombres} /> {t('Mezclar los nombres de los entrenadores normales', 'Shuffle regular trainer names')}</label>
            </fieldset>

            <fieldset disabled={!analisis.entrenadores}>
              <legend>{t('Dificultad de los combates', 'Battle difficulty')}</legend>
              <label>{t('Subir niveles', 'Raise levels')} <select bind:value={ajustes.entrenadores.subirNivel}>{#each PCT as p}<option value={p}>{p ? `+${p} %` : t('No', 'No')}</option>{/each}</select></label>
              <label>{t('Totalmente evolucionados desde', 'Fully evolved from')}
                <select bind:value={ajustes.entrenadores.evolucionados}>
                  <option value={0}>{t('No', 'No')}</option>
                  {#each [25, 30, 35, 40, 45, 50] as n}<option value={n}>{t('Nv.', 'Lv.')} {n}</option>{/each}
                </select>
              </label>
              <label>{t('Objetos equipados', 'Held items')}
                <select bind:value={ajustes.entrenadores.objetos}>
                  <option value="mantener">{t('Los de siempre', 'Unchanged')}</option>
                  <option value="jefes">{t('Solo los jefes', 'Bosses only')}</option>
                  <option value="importantes">{t('Jefes, rivales y villanos', 'Bosses, rivals and villains')}</option>
                  <option value="todos">{t('Todos', 'Everyone')}</option>
                </select>
              </label>
              <label>{t('Qué objetos', 'Which items')}
                <select bind:value={ajustes.entrenadores.objetosClase} disabled={ajustes.entrenadores.objetos === 'mantener'}>
                  <option value="sensatos">{t('Con sentido (Restos, el de su tipo…)', 'Sensible (Leftovers, type boosters…)')}</option>
                  <option value="bayas">{t('Solo bayas', 'Berries only')}</option>
                </select>
              </label>
              <label>{t('Pokémon de más · jefes y rivales', 'Extra Pokémon · bosses and rivals')}
                <select bind:value={ajustes.entrenadores.extraJefes} disabled={!analisis.libre}>{#each [0, 1, 2, 3] as n}<option value={n}>{n ? `+${n}` : t('No', 'No')}</option>{/each}</select>
              </label>
              <label>{t('Pokémon de más · el resto', 'Extra Pokémon · everyone else')}
                <select bind:value={ajustes.entrenadores.extraResto} disabled={!analisis.libre}>{#each [0, 1, 2] as n}<option value={n}>{n ? `+${n}` : t('No', 'No')}</option>{/each}</select>
              </label>
              <small>{analisis.libre ? t('Hasta 6 por equipo, al nivel del más fuerte.', 'Up to 6 per team, at the level of the strongest.') : t('No hay espacio libre en esta ROM para Pokémon de más.', 'No free space in this ROM for extra Pokémon.')}</small>
            </fieldset>

            <fieldset>
              <legend>{t('Tipos, habilidades y movimientos', 'Types, abilities and moves')}</legend>
              <label>{t('Tipos', 'Types')}
                <select bind:value={ajustes.tipos.modo}>
                  <option value="mantener">{t('No cambiar', 'Unchanged')}</option>
                  <option value="linea">{t('Al azar, igual en toda la línea evolutiva', 'Random, same for the whole line')}</option>
                  <option value="azar">{t('Totalmente al azar', 'Fully random')}</option>
                </select>
              </label>
              <label>{t('Habilidades', 'Abilities')}
                <select bind:value={ajustes.habilidades.modo}>
                  <option value="mantener">{t('No cambiar', 'Unchanged')}</option>
                  <option value="linea">{t('Al azar, igual en toda la línea evolutiva', 'Random, same for the whole line')}</option>
                  <option value="azar">{t('Totalmente al azar', 'Fully random')}</option>
                </select>
              </label>
              <label class="lx-rnd-casilla"><input type="checkbox" bind:checked={ajustes.habilidades.sinSuperguarda} disabled={ajustes.habilidades.modo === 'mantener'} /> {t('Sin Superguarda', 'No Wonder Guard')}</label>
              <label>{t('Movimientos por nivel', 'Level-up moves')}
                <select bind:value={ajustes.movimientos.modo}>
                  <option value="mantener">{t('No cambiar', 'Unchanged')}</option>
                  <option value="azar">{t('Al azar (siempre con un ataque desde el principio)', 'Random (always an attack from the start)')}</option>
                </select>
              </label>
              <label>{t('De su tipo', 'Of its type')}
                <select bind:value={ajustes.movimientos.mismoTipo} disabled={ajustes.movimientos.modo === 'mantener'}>
                  {#each [0, 25, 40, 60, 80] as p}<option value={p}>{p} %</option>{/each}
                </select>
              </label>
              {#if cambiaDatos}<small>{t('Con esto, el riesgo y el asistente de combate dejan de calcularse (los datos de cada especie ya no son los del juego).', 'With this, risk and the battle assistant stop being calculated.')}</small>{/if}
            </fieldset>

            <fieldset disabled={!analisis.mt && !analisis.compatMT}>
              <legend>{t('MT, MO y tutores', 'TMs, HMs and tutors')}</legend>
              <label>{t('Movimientos de las MT', 'TM moves')}
                <select bind:value={ajustes.mt.modo} disabled={!analisis.mt}>
                  <option value="mantener">{t('No cambiar', 'Unchanged')}</option>
                  <option value="azar">{t('Al azar (las MO no cambian)', 'Random (HMs stay)')}</option>
                </select>
              </label>
              <label>{t('Movimientos de los tutores', 'Tutor moves')}
                <select bind:value={ajustes.tutores.modo} disabled={!analisis.tutores}>
                  <option value="mantener">{t('No cambiar', 'Unchanged')}</option>
                  <option value="azar">{t('Al azar', 'Random')}</option>
                </select>
              </label>
              <label>{t('Ataques que hacen daño', 'Damaging moves')}
                <select bind:value={ajustes.mt.danino} disabled={ajustes.mt.modo === 'mantener' && ajustes.tutores.modo === 'mantener'}>
                  {#each [30, 45, 60, 75, 90] as p}<option value={p}>{p} %</option>{/each}
                </select>
              </label>
              <label class="lx-rnd-casilla"><input type="checkbox" bind:checked={ajustes.mt.campo} disabled={ajustes.mt.modo === 'mantener'} /> {t('Dejar Excavar y Daño Secreto (se usan fuera de combate)', 'Keep Dig and Secret Power (field use)')}</label>
              <label>{t('Quién aprende cada MT y tutor', 'Who learns each TM and tutor')}
                <select bind:value={ajustes.compat.modo} disabled={!analisis.compatMT}>
                  <option value="mantener">{t('No cambiar', 'Unchanged')}</option>
                  <option value="tipo">{t('Al azar, mejor si es de su tipo', 'Random, favouring its type')}</option>
                  <option value="azar">{t('Totalmente al azar', 'Fully random')}</option>
                  <option value="total">{t('Todos pueden aprenderlo todo', 'Everyone learns everything')}</option>
                </select>
              </label>
              <label>{t('Las MO', 'HMs')}
                <select bind:value={ajustes.compat.mo} disabled={!analisis.compatMT}>
                  <option value="original">{t('Las aprende quien siempre', 'Usual Pokémon learn them')}</option>
                  <option value="igual">{t('Como las MT', 'Same as TMs')}</option>
                  <option value="todos">{t('Todos pueden aprenderlas', 'Everyone can learn them')}</option>
                </select>
              </label>
              <small>{t('Una evolución siempre puede aprender lo que aprendía su preevolución.', 'An evolution can always learn what its pre-evolution could.')}{!analisis.tutores && analisis.juego?.familia === 'rs' ? t(' Rubí y Zafiro no tienen tutores.', ' Ruby and Sapphire have no tutors.') : ''}</small>
            </fieldset>

            <fieldset disabled={!analisis.objetosSuelo && !analisis.tiendas}>
              <legend>{t('Objetos y tiendas', 'Items and shops')}</legend>
              <label>{t('Objetos del suelo', 'Field items')}
                <select bind:value={ajustes.objetosSuelo.modo} disabled={!analisis.objetosSuelo}>
                  <option value="mantener">{t('No cambiar', 'Unchanged')}</option>
                  <option value="mezclar">{t('Mezclar los que hay', 'Shuffle them')}</option>
                  <option value="azar">{t('Al azar (una MT sigue siendo una MT)', 'Random (a TM stays a TM)')}</option>
                </select>
              </label>
              <label>{t('Tiendas', 'Shops')}
                <select bind:value={ajustes.tiendas.modo} disabled={!analisis.tiendas}>
                  <option value="mantener">{t('No cambiar', 'Unchanged')}</option>
                  <option value="azar">{t('Al azar', 'Random')}</option>
                </select>
              </label>
              <label class="lx-rnd-casilla"><input type="checkbox" bind:checked={ajustes.tiendas.basicos} disabled={ajustes.tiendas.modo === 'mantener'} /> {t('Que sigan vendiendo Poké Balls y Pociones', 'Keep selling Poké Balls and Potions')}</label>
              <small>{t('Los objetos clave y las MO no se tocan nunca. Son las Poké Balls que se ven en el suelo; los objetos ocultos no cambian.', 'Key items and HMs are never touched. These are the visible item balls; hidden items stay.')}</small>
            </fieldset>
          </div>
        </div>

        <div class="lx-rnd-paso">
          <b>3. {t('CREAR', 'CREATE')}</b>
          <span class="lx-rnd-fila">
            <label>{t('Semilla', 'Seed')} <input class="lx-rnd-semilla" bind:value={ajustes.semilla} maxlength="24" /></label>
            <button on:click={() => (ajustes = { ...ajustes, semilla: semillaNueva() })} title={t('Otra semilla', 'New seed')}>🎲</button>
            <small>{t('Misma semilla y mismos ajustes = misma ROM.', 'Same seed and settings = same ROM.')}</small>
          </span>
          <button class="lx-rnd-principal lx-rnd-crear" disabled={estado === 'creando' || !ajustes.semilla} on:click={crear}>
            {estado === 'creando' ? t('Creando…', 'Creating…') : t('Crear ROM aleatoria', 'Create random ROM')}
          </button>
        </div>
      {/if}
    {/if}
    {#if error}<p class="lx-rnd-error">{error}</p>{/if}
  </div>
</section>

<style>
  .lx-rnd {
    width: min(900px, calc(100vw - 32px));
    max-height: calc(100vh - 64px);
    overflow-y: auto;
    background: #f8f8f0;
    color: #303840;
    border: 4px solid #283850;
    border-radius: 12px;
    box-shadow: 6px 6px 0 rgba(0, 0, 0, 0.4);
    font-family: 'LX Pixel', 'VT323', monospace;
    font-size: 18px;
    line-height: 22px;
  }
  :global(.dark) .lx-rnd {
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
    background: #c04870;
    background-image: repeating-linear-gradient(45deg, #c84c78 0 8px, #b84068 8px 16px);
    color: #fff;
  }
  h2 {
    font-size: 24px;
    line-height: 26px;
    text-shadow: 2px 2px 0 #682038;
  }
  h2 small {
    font-size: 12px;
    opacity: 0.85;
  }
  .lx-rnd-x {
    font-size: 18px;
    padding: 0 6px;
    background: transparent;
    border: 0;
    color: #fff;
  }
  .lx-rnd-cuerpo {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 12px 14px 16px;
  }
  .lx-rnd-paso,
  .lx-rnd-previo,
  .lx-rnd-hecho {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 8px 10px;
    border: 2px solid #283850;
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.6);
  }
  :global(.dark) .lx-rnd-paso,
  :global(.dark) .lx-rnd-previo,
  :global(.dark) .lx-rnd-hecho {
    background: rgba(255, 255, 255, 0.04);
    border-color: #8090a8;
  }
  .lx-rnd-previo {
    border-style: dashed;
  }
  .lx-rnd-hecho > b:first-child {
    font-size: 24px;
    color: #2a8a40;
  }
  .lx-rnd-fila {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px 10px;
  }
  .lx-rnd-nota,
  small {
    font-size: 14px;
    line-height: 18px;
    opacity: 0.8;
  }
  .lx-rnd-encontrado {
    display: flex;
    flex-wrap: wrap;
    gap: 2px 16px;
  }
  .lx-rnd-falta {
    color: #c03828;
  }
  .lx-rnd-aviso {
    color: #b05010;
  }
  .lx-rnd-error {
    color: #c03828;
  }
  .lx-rnd-grupos {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: 10px;
  }
  fieldset {
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 6px 10px 8px;
    border: 2px solid #c0c8d0;
    border-radius: 6px;
  }
  fieldset:disabled {
    opacity: 0.45;
  }
  legend {
    padding: 0 4px;
    font-size: 18px;
    color: #c04870;
  }
  label {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 2px 6px;
  }
  label input[type='checkbox'] {
    flex: none;
    margin-top: 4px;
  }
  .lx-rnd-casilla {
    flex-wrap: nowrap;
    align-items: flex-start;
  }
  label select {
    flex: 1 1 180px;
  }
  select,
  input:not([type='checkbox']) {
    max-width: 100%;
    min-width: 0;
    padding: 1px 4px;
    border: 2px solid #283850;
    border-radius: 4px;
    background: #fff;
    color: #303840;
    font: inherit;
    font-size: 16px;
  }
  :global(.dark) .lx-rnd select,
  :global(.dark) .lx-rnd input:not([type='checkbox']) {
    background: #141c26;
    color: #e0e6ee;
    border-color: #8090a8;
  }
  .lx-rnd-semilla {
    width: 220px;
    letter-spacing: 1px;
  }
  button {
    padding: 2px 10px;
    border: 2px solid #283850;
    border-radius: 4px;
    background: #fff;
    color: #283850;
    font: inherit;
  }
  :global(.dark) .lx-rnd button {
    background: #24303e;
    color: #e0e6ee;
    border-color: #8090a8;
  }
  button:disabled {
    opacity: 0.5;
  }
  .lx-rnd-principal {
    background: #c04870 !important;
    color: #fff !important;
    border-color: #682038 !important;
  }
  .lx-rnd-crear {
    align-self: flex-start;
    padding: 4px 18px;
    font-size: 22px;
  }
</style>
