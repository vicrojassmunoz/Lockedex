<script>
  // Salón de la Fama en la vista de partida: sale al vencer al Campeón, con el equipo que lo venció
  import { onMount, getContext } from 'svelte'
  import { leerPartida, cargarRutas, resumirPartida } from './partida.js'
  import { leerReglas, PLANTILLAS } from './reglas.js'
  import { leerSavGuardado } from './equipo.js'
  import { contarCaidos } from './derrotas.js'
  import { valorCampeon, leerSalon, registrarSalon, salonVisto, marcarSalonVisto, miembrosConSprite } from './salon.js'
  import { recorte } from './recorte.js'
  import { createImgUrl } from '$utils/rewrites'
  import { t, traducirNombre } from './idioma.js'
  import TarjetaEntrenador from './TarjetaEntrenador.svelte'

  export let id = ''
  export let datos = {}

  const { open } = getContext('simple-modal')
  let campeon = null
  let rutas = []
  let entrada = null
  let visible = false

  onMount(async () => {
    const partida = leerPartida(id)
    if (!partida?.info) return
    rutas = await cargarRutas(partida.info.lid)
    const resumen = resumirPartida(partida, rutas)
    campeon = valorCampeon(resumen.jefes || [])
  })

  const mayus = (x) => String(x || '').charAt(0).toUpperCase() + String(x || '').slice(1)

  // Cuando el Campeón aparece entre los vencidos, se registra y se enseña (una vez por intento)
  $: vencido = campeon && (Array.isArray(datos?.__teams) ? datos.__teams : []).find((e) => String(e?.id) === campeon)
  $: if (vencido && id) prepararEntrada(vencido)

  let preparada = null
  const prepararEntrada = async (v) => {
    const p = leerPartida(id)
    const intento = +(p?.intentos || 1)
    const clave = `${id}#${intento}`
    // se rehace si cambia el equipo que venció (p. ej. lo corriges en el progreso)
    const firma = `${clave}|${(v.team || []).map((m) => m.id).join(',')}`
    if (preparada === firma) return
    preparada = firma
    const sav = leerSavGuardado(id)
    const equipo = await miembrosConSprite((v.team || []).map((m) => ({ lugar: m.id, sprite: m.sprite })), datos, sav)
    const reglas = leerReglas(id)
    const resumen = resumirPartida({ datos }, rutas)
    const previa = leerSalon().find((e) => e.clave === clave)
    entrada = registrarSalon({
      clave,
      id,
      nombre: p?.nombre || '',
      juego: p?.juego || '',
      // la fecha de la primera vez que se registró se conserva
      fecha: previa?.fecha || Date.now(),
      intento,
      equipo,
      medallas: resumen.medallas,
      totalMedallas: resumen.totalMedallas,
      caidos: contarCaidos(datos || {}),
      capturas: Object.entries(datos || {}).filter(([k, x]) => !k.startsWith('__') && [1, 2, 3, 5, 6].includes(+x?.status)).length,
      tiempo: sav?.entrenador?.horas != null
        ? { horas: sav.entrenador.horas, minutos: sav.entrenador.minutos }
        : { dias: Math.max(1, Math.round((Date.now() - (p?.creada || Date.now())) / 86400000)) },
      plantilla: reglas.plantilla && PLANTILLAS[reglas.plantilla] ? reglas.plantilla : ''
    })
    visible = !salonVisto(clave)
  }

  const cerrar = () => {
    marcarSalonVisto(entrada.clave)
    visible = false
  }
  const abrirFicha = () => open(TarjetaEntrenador, { id })
  const tiempoTexto = (tm) =>
    !tm ? '' : tm.horas != null ? `${tm.horas} h ${String(tm.minutos || 0).padStart(2, '0')} min` : t(`${tm.dias} día${tm.dias > 1 ? 's' : ''}`, `${tm.dias} day${tm.dias > 1 ? 's' : ''}`)
</script>

{#if visible && entrada}
  <section class="lx-salon" data-lx-original>
    <header>
      <span class="lx-salon-estrella">★</span>
      {t('¡BIENVENIDO AL SALÓN DE LA FAMA!', 'WELCOME TO THE HALL OF FAME!')}
      <span class="lx-salon-estrella">★</span>
    </header>
    <div class="lx-salon-podio">
      {#each entrada.equipo as m, i}
        <figure style="--retraso: {i * 0.15}s">
          <img
            src={createImgUrl({ imgId: m.imgId }, { ext: 'png' })}
            alt=""
            width="96"
            height="96"
            use:recorte={'suelo'}
            on:error={(e) => (e.currentTarget.style.visibility = 'hidden')}
          />
          <figcaption>
            <b>{m.mote || traducirNombre(m.nombre || mayus(m.alias))}</b>
            {#if m.nivel}<small>{t('Nv.', 'Lv.')}{m.nivel}</small>{/if}
          </figcaption>
        </figure>
      {/each}
    </div>
    <ul class="lx-salon-datos">
      <li><b>{entrada.medallas}</b>{t('medallas', 'badges')}</li>
      <li><b>{entrada.capturas}</b>{t('capturas', 'catches')}</li>
      <li><b>{entrada.caidos}</b>{t('caídos', 'fainted')}</li>
      <li><b>{tiempoTexto(entrada.tiempo)}</b>{t('de partida', 'played')}</li>
      <li><b>{entrada.intento}</b>{t('intento', 'attempt')}</li>
    </ul>
    <div class="lx-salon-botones">
      <button on:click={abrirFicha}>{t('Ficha de entrenador', 'Trainer card')}</button>
      <button on:click={cerrar}>{t('Cerrar', 'Close')}</button>
    </div>
  </section>
{/if}

<style>
  /* Como la pantalla del Salón de la Fama de RojoFuego: fondo oscuro con focos, letras doradas */
  .lx-salon {
    position: relative;
    overflow: hidden;
    padding: 10px 14px 12px;
    color: #f8f0c8;
    background: radial-gradient(ellipse at 50% 110%, rgba(255, 220, 120, 0.35), transparent 60%),
      repeating-linear-gradient(0deg, rgba(255, 255, 255, 0.04) 0 2px, transparent 2px 4px), #182040;
    border: 3px solid #f8c830;
    box-shadow: inset 0 0 0 3px #182040, inset 0 0 0 5px #a87818;
    font-family: 'LX Pixel', 'VT323', monospace;
  }
  .lx-salon header {
    text-align: center;
    font-size: 24px;
    line-height: 28px;
    color: #f8d048;
    text-shadow: 2px 2px 0 #604000;
  }
  .lx-salon-estrella {
    display: inline-block;
    animation: lx-salon-brillo 1s steps(1, end) infinite;
  }
  @keyframes lx-salon-brillo {
    50% {
      opacity: 0.3;
    }
  }
  .lx-salon-podio {
    display: flex;
    justify-content: center;
    flex-wrap: wrap;
    gap: 4px 10px;
    margin: 8px 0 4px;
  }
  .lx-salon-podio figure {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 96px;
    animation: lx-salon-entrada 0.6s ease-out var(--retraso) both;
  }
  .lx-salon-podio img {
    width: 80px;
    height: 80px;
    image-rendering: pixelated;
    filter: drop-shadow(0 4px 0 rgba(0, 0, 0, 0.35));
  }
  .lx-salon-podio figcaption {
    display: flex;
    flex-direction: column;
    align-items: center;
    font-size: 12px;
    line-height: 14px;
    text-transform: uppercase;
  }
  .lx-salon-podio figcaption b {
    font-weight: normal;
    color: #f8f8f8;
  }
  .lx-salon-podio small {
    color: #f8d048;
  }
  @keyframes lx-salon-entrada {
    from {
      opacity: 0;
      transform: translateY(12px);
    }
  }
  .lx-salon-datos {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 4px 18px;
    font-size: 12px;
    color: #c8c0a0;
  }
  .lx-salon-datos li {
    display: flex;
    align-items: baseline;
    gap: 4px;
  }
  .lx-salon-datos b {
    font-weight: normal;
    font-size: 24px;
    color: #f8d048;
  }
  .lx-salon-botones {
    display: flex;
    justify-content: center;
    gap: 10px;
    margin-top: 8px;
  }
  .lx-salon-botones button {
    padding: 2px 12px;
    font-size: 12px;
    color: #182040;
    background: #f8d048;
    box-shadow: inset 0 -2px 0 #a87818;
    clip-path: polygon(2px 0, calc(100% - 2px) 0, 100% 2px, 100% calc(100% - 2px), calc(100% - 2px) 100%, 2px 100%, 0 calc(100% - 2px), 0 2px);
  }
  .lx-salon-botones button:hover {
    background: #fff0a0;
  }
  @media (prefers-reduced-motion: reduce) {
    .lx-salon-podio figure,
    .lx-salon-estrella {
      animation: none;
    }
  }
</style>
