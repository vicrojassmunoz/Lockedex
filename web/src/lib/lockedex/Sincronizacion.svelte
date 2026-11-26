<script>
  // Vigila la partida del emulador vinculada a la run activa y la reimporta al guardar. Además lleva a la
  // run lo que no admite dudas (evoluciones, y mote o naturaleza si estaban vacíos) y pregunta por los
  // Pokémon del equipo que estén debilitados en la partida (en un Nuzlocke, caídos)
  import { onMount } from 'svelte'
  import { leerPartidaGen3 } from './sav/gen3.js'
  import { cargar, norm } from './datos.js'
  import { claveSav, claveRutaSav } from './equipo.js'
  import { idioma, traducirNombre } from './idioma.js'
  import { partidaActiva, cargarRutas, resumirPartida } from './partida.js'
  import { calcularCambiosSav, parcheCambiosSav } from './sincronizar.js'
  import { getGameStore, patch } from '$lib/store'
  import { fetchData } from '$utils/fetchers'

  const es = idioma() === 'es'
  let aviso = null
  let temporizador

  const mostrar = (texto, error = false, extra = {}) => {
    aviso = { texto, error, ...extra }
    clearTimeout(temporizador)
    // con una pregunta pendiente (caídos) el aviso se queda hasta que se conteste
    if (!extra.caidos?.length) temporizador = setTimeout(() => (aviso = null), extra.nuevos ? 8000 : 4500)
  }

  // Calcula los cambios con la run y aplica los seguros; devuelve lo que hay que preguntar o avisar
  let contexto = null
  const sincronizar = async (sav) => {
    const partida = partidaActiva()
    if (!partida?.info) return {}
    const [rutas, pkdx] = await Promise.all([cargarRutas(partida.info.lid), fetchData()])
    const resumen = resumirPartida(partida, rutas)
    const linea = (e) => (pkdx?.aliasMap?.[norm(e)] || pkdx?.nameMap?.[norm(e)])?.evoline || null
    const cambios = calcularCambiosSav({ partida, resumen, sav, pkdx })
    const seguros = cambios.filter((c) => c.tipo === 'actualizar')
    const caidos = cambios.filter((c) => c.tipo === 'caido')
    const nuevos = cambios.filter((c) => c.tipo === 'nuevo')
    contexto = { partida, resumen, sav, linea, rutas }
    if (seguros.length) getGameStore(partida.id).update(patch(parcheCambiosSav({ ...contexto, cambios: seguros })))
    const nombre = (e) => (pkdx?.aliasMap?.[norm(e)] || pkdx?.nameMap?.[norm(e)])?.name || e
    const evoluciones = seguros.filter((c) => c.parche.pokemon).map((c) => `${c.antes.nickname || nombre(c.antes.pokemon)} → ${nombre(c.s.especie)}`)
    return { caidos, nuevos, evoluciones }
  }

  const marcarCaidos = () => {
    const caidos = aviso?.caidos || []
    // con los datos de ahora (ya con las evoluciones aplicadas), no con los de cuando llegó el .sav
    const partida = partidaActiva()
    if (contexto && partida && caidos.length) {
      const resumen = resumirPartida(partida, contexto.rutas)
      getGameStore(partida.id).update(patch(parcheCambiosSav({ ...contexto, partida, resumen, cambios: caidos })))
    }
    mostrar(es ? `Marcado${caidos.length > 1 ? 's' : ''} como caído${caidos.length > 1 ? 's' : ''}. Descansa${caidos.length > 1 ? 'n' : ''} en el cementerio.` : 'Marked as dead. Resting in the graveyard.')
  }

  onMount(() => {
    const lx = window.lockedex
    if (!lx?.vigilarSav) return
    const id = localStorage.getItem('nuzlocke')
    const ruta = id && localStorage.getItem(claveRutaSav(id))
    if (ruta) lx.vigilarSav(ruta)

    return lx.alCambiarSav(async (r) => {
      const idActual = localStorage.getItem('nuzlocke')
      if (!idActual || localStorage.getItem(claveRutaSav(idActual)) !== r) return
      try {
        const archivo = await lx.leerSav(r)
        if (!archivo) return
        const tablas = await cargar('gen3.json')
        const b = archivo.datos
        const res = leerPartidaGen3(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength), tablas)
        const sav = { ...res, nombre: archivo.nombre, ruta: r, fecha: archivo.fecha, importado: Date.now() }
        localStorage.setItem(claveSav(idActual), JSON.stringify(sav))
        const equipo = res.equipo.map((p) => `${p.mote} ${es ? 'Nv.' : 'Lv.'}${p.nivel}`).join(' · ')
        let hecho = {}
        try {
          hecho = await sincronizar(sav)
        } catch (e) {
          console.error('[sincronizar]', e)
        }
        const partes = [(es ? 'Partida del emulador actualizada — ' : 'Emulator save updated — ') + equipo]
        if (hecho.evoluciones?.length) partes.push((es ? 'Evolución: ' : 'Evolved: ') + hecho.evoluciones.join(', '))
        mostrar(partes.join('. '), false, { caidos: hecho.caidos || [], nuevos: hecho.nuevos?.length || 0 })
      } catch (e) {
        mostrar((es ? 'No se pudo leer la partida: ' : 'Could not read the save: ') + e.message, true)
      }
    })
  })
</script>

{#if aviso}
  <div class="lx-aviso" class:lx-aviso-error={aviso.error} class:lx-aviso-pregunta={aviso.caidos?.length} data-lx-original>
    <span class="lx-aviso-luz" />
    <div class="lx-aviso-texto">
      {aviso.texto}
      {#if aviso.caidos?.length}
        <p class="lx-aviso-caidos">
          {es
            ? `${aviso.caidos.map((c) => c.s.mote || c.antes.pokemon).join(', ')} ${aviso.caidos.length > 1 ? 'están debilitados' : 'está debilitado'} (0 PS) en tu partida. ¿Marcar como caído${aviso.caidos.length > 1 ? 's' : ''}?`
            : `${aviso.caidos.map((c) => c.s.mote || c.antes.pokemon).join(', ')} fainted (0 HP) in your save. Mark as dead?`}
        </p>
        <span class="lx-aviso-botones">
          <button class="lx-aviso-si" on:click={marcarCaidos}>{es ? 'Sí, han caído' : 'Yes, they died'}</button>
          <button on:click={() => (aviso = null)}>{es ? 'Ahora no' : 'Not now'}</button>
        </span>
      {:else if aviso.nuevos}
        <p class="lx-aviso-caidos">
          <a href="/importar">{es ? `${aviso.nuevos} captura${aviso.nuevos > 1 ? 's' : ''} nueva${aviso.nuevos > 1 ? 's' : ''} sin apuntar: revísalas en Importar` : `${aviso.nuevos} new catch${aviso.nuevos > 1 ? 'es' : ''} not logged: review in Import`}</a>
        </p>
      {/if}
    </div>
  </div>
{/if}

<style>
  .lx-aviso {
    position: fixed;
    right: 24px;
    bottom: 24px;
    z-index: 9600;
    max-width: 440px;
    display: flex;
    gap: 10px;
    align-items: center;
    padding: 10px 14px;
    background: #1b1b1f;
    color: #fff;
    border: 3px solid #000;
    border-radius: 12px;
    box-shadow: 4px 4px 0 rgba(0, 0, 0, 0.35);
    font-size: 13px;
    animation: entrar 0.25s ease-out;
  }
  .lx-aviso-texto {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .lx-aviso-caidos {
    color: #ffd0d0;
  }
  .lx-aviso-caidos a {
    color: #a8e8ff;
    text-decoration: underline;
  }
  .lx-aviso-pregunta .lx-aviso-luz {
    background: #ffb020;
    box-shadow: 0 0 10px #ffb020;
  }
  .lx-aviso-botones {
    display: flex;
    gap: 8px;
  }
  .lx-aviso-botones button {
    padding: 3px 10px;
    border: 2px solid #f8f8f8;
    border-radius: 6px;
    font-size: 12px;
  }
  .lx-aviso-si {
    background: #dc0a2d;
  }
  .lx-aviso-luz {
    flex: none;
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: #3ddc84;
    box-shadow: 0 0 10px #3ddc84;
  }
  .lx-aviso-error .lx-aviso-luz {
    background: #ff1f3d;
    box-shadow: 0 0 10px #ff1f3d;
  }
  @keyframes entrar {
    from {
      transform: translateY(16px);
      opacity: 0;
    }
  }
</style>
