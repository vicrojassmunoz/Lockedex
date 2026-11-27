<script>
  // Vigila la partida del emulador vinculada a la run activa y la reimporta al guardar. Además lleva a la
  // run lo que no admite dudas (evoluciones, y mote o naturaleza si estaban vacíos) y pregunta por los
  // Pokémon del equipo que estén debilitados en la partida (en un Nuzlocke, caídos)
  import { onMount } from 'svelte'
  import { goto } from '$app/navigation'
  import { leerReglas } from './reglas.js'
  import { marcarHuevoUsado } from './egglocke.js'
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
    if (!extra.caidos?.length && !extra.nuevos?.length) temporizador = setTimeout(() => (aviso = null), 4500)
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
    const eclosiones = cambios.filter((c) => c.tipo === 'eclosion')
    contexto = { partida, resumen, sav, linea, rutas }
    if (seguros.length) getGameStore(partida.id).update(patch(parcheCambiosSav({ ...contexto, cambios: seguros })))
    // Egglocke: los que se marcaron como salidos de un huevo, abiertos también en la lista del generador
    seguros.filter((c) => c.parche.cambio).forEach((c) => marcarHuevoUsado(partida.id, c.parche.pokemon || c.antes.pokemon))
    const nombre = (e) => (pkdx?.aliasMap?.[norm(e)] || pkdx?.nameMap?.[norm(e)])?.name || e
    nombrePk = (e) => traducirNombre(nombre(e))
    const evoluciones = seguros.filter((c) => c.parche.pokemon).map((c) => `${c.antes.nickname || nombre(c.antes.pokemon)} → ${nombre(c.s.especie)}`)
    // La escena de evolución de cada una (la abre EscenasSav.svelte, dentro de la app, al volver a la ventana)
    const escenas = seguros.filter((c) => c.parche.pokemon && c.parche.pokemon !== c.antes.pokemon).map((c) => ({ base: c.antes.pokemon, evo: c.parche.pokemon, mote: c.antes.nickname || '' }))
    if (escenas.length) window.dispatchEvent(new CustomEvent('lx:evoluciones-sav', { detail: escenas }))
    return { caidos, nuevos, eclosiones, evoluciones }
  }

  // Capturas nuevas del .sav: se añaden desde el propio aviso, sin ir a Importar
  const anadirNuevos = () => {
    const elegidos = (aviso?.nuevos || []).filter((c) => c.marcado)
    const partida = partidaActiva()
    if (contexto && partida && elegidos.length) {
      const resumen = resumirPartida(partida, contexto.rutas)
      getGameStore(partida.id).update(patch(parcheCambiosSav({ ...contexto, partida, resumen, cambios: elegidos })))
    }
    mostrar(es ? `Añadid${elegidos.length > 1 ? 'as' : 'a'} a la run: ${elegidos.map((c) => c.parche.nickname || nombrePk(c.s.especie)).join(', ')}.` : `Added to your run: ${elegidos.map((c) => c.parche.nickname || c.s.especie).join(', ')}.`)
  }
  let nombrePk = (e) => e

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

    // La copia guardada por versiones anteriores a la 1.20.2 no trae las medallas: se relee una vez
    // en silencio, sin tocar la run
    if (ruta && lx.leerSav) {
      let guardado = null
      try {
        guardado = JSON.parse(localStorage.getItem(claveSav(id)) || 'null')
      } catch {}
      if (guardado && !Array.isArray(guardado.medallas)) {
        ;(async () => {
          try {
            const archivo = await lx.leerSav(ruta)
            if (!archivo) return
            const b = archivo.datos
            const res = leerPartidaGen3(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength), await cargar('gen3.json'))
            if (localStorage.getItem('nuzlocke') !== id) return
            localStorage.setItem(claveSav(id), JSON.stringify({ ...guardado, medallas: res.medallas, campeon: res.campeon }))
          } catch {}
        })()
      }
    }

    // «Recargar .sav» (botón de la partida): lo mismo que cuando el emulador guarda, con la partida vinculada
    const recargar = () => {
      const idActual = localStorage.getItem('nuzlocke')
      const r = idActual && localStorage.getItem(claveRutaSav(idActual))
      if (!r) return goto('/importar')
      llega(r, true)
    }
    window.addEventListener('lx:recargar-sav', recargar)
    const quitar = lx.alCambiarSav((r) => llega(r))
    return () => {
      window.removeEventListener('lx:recargar-sav', recargar)
      quitar?.()
    }
  })

  const llega = async (r, aMano = false) => {
      const lx = window.lockedex
      const idActual = localStorage.getItem('nuzlocke')
      if (!idActual || localStorage.getItem(claveRutaSav(idActual)) !== r) return
      try {
        const archivo = await lx.leerSav(r)
        if (!archivo) {
          if (aMano) mostrar(es ? 'No se encuentra la partida vinculada. ¿La has movido? Vuelve a elegirla en Importar.' : 'The linked save is missing. Was it moved? Choose it again in Import.', true)
          return
        }
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
        if (hecho.eclosiones?.length && leerReglas(idActual)?.egglocke)
          partes.push(es ? `${hecho.eclosiones.length} sin apuntar de qué huevo ${hecho.eclosiones.length > 1 ? 'salieron' : 'salió'}: elígelo en la Caja` : `${hecho.eclosiones.length} hatched but not logged: pick it in the Box`)
        mostrar(partes.join('. '), false, { caidos: hecho.caidos || [], nuevos: (hecho.nuevos || []).map((c) => ({ ...c, marcado: true })) })
      } catch (e) {
        mostrar((es ? 'No se pudo leer la partida: ' : 'Could not read the save: ') + e.message, true)
      }
  }
</script>

{#if aviso}
  <div class="lx-aviso" class:lx-aviso-error={aviso.error} class:lx-aviso-pregunta={aviso.caidos?.length || aviso.nuevos?.length} data-lx-original>
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
      {:else if aviso.nuevos?.length}
        <p class="lx-aviso-caidos">{es ? `Capturas nuevas en tu partida. ¿Las añado a la run?` : `New catches in your save. Add them to your run?`}</p>
        <ul class="lx-aviso-nuevos">
          {#each aviso.nuevos as c}
            <li>
              <label>
                <input type="checkbox" bind:checked={c.marcado} />
                <b>{nombrePk(c.s.especie)}</b>{c.parche.nickname ? ` «${c.parche.nickname}»` : ''} · {traducirNombre(c.lugar === 'Starter' ? (es ? 'Inicial' : 'Starter') : c.lugar)}
              </label>
            </li>
          {/each}
        </ul>
        <span class="lx-aviso-botones">
          <button class="lx-aviso-si" on:click={anadirNuevos} disabled={!aviso.nuevos.some((c) => c.marcado)}>{es ? 'Añadir' : 'Add'}</button>
          <button on:click={() => (aviso = null)}>{es ? 'Ahora no' : 'Not now'}</button>
          <a href="/importar" on:click={() => (aviso = null)}>{es ? 'Ver en Importar' : 'Open Import'}</a>
        </span>
      {/if}
    </div>
  </div>
{/if}

<style>
  .lx-aviso-nuevos {
    margin: 4px 0;
    max-height: 160px;
    overflow-y: auto;
    font-size: 0.92em;
  }
  .lx-aviso-nuevos label {
    display: flex;
    gap: 6px;
    align-items: center;
  }
  .lx-aviso-botones a {
    align-self: center;
    font-size: 0.85em;
    text-decoration: underline;
    opacity: 0.8;
  }
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
