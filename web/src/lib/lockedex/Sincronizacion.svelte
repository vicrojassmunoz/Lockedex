<script>
  // Vigila la partida del emulador vinculada a la run activa y la reimporta al guardar
  import { onMount } from 'svelte'
  import { leerPartidaGen3 } from './sav/gen3.js'
  import { cargar } from './datos.js'
  import { claveSav, claveRutaSav } from './equipo.js'
  import { idioma } from './idioma.js'

  const es = idioma() === 'es'
  let aviso = null
  let temporizador

  const mostrar = (texto, error = false) => {
    aviso = { texto, error }
    clearTimeout(temporizador)
    temporizador = setTimeout(() => (aviso = null), 4500)
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
        mostrar((es ? 'Partida del emulador actualizada — ' : 'Emulator save updated — ') + equipo)
      } catch (e) {
        mostrar((es ? 'No se pudo leer la partida: ' : 'Could not read the save: ') + e.message, true)
      }
    })
  })
</script>

{#if aviso}
  <div class="lx-aviso" class:lx-aviso-error={aviso.error} data-lx-original>
    <span class="lx-aviso-luz" />
    {aviso.texto}
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
