<script>
  // Escenas que llegan de la partida del emulador: las evoluciones que la sincronización ya aplicó a la run
  // y la lápida de los caídos que confirmaste en el aviso. Esperan en una cola (escenasPendientes.js) y se
  // enseñan de una en una, solo con esta ventana delante y sin otra ventana encima: mientras juegas,
  // esperan.
  import { onMount, getContext } from 'svelte'
  import EscenaEvolucion from './EscenaEvolucion.svelte'
  import EscenaMuerte from './EscenaMuerte.svelte'
  import { siguienteEscena, hayEscenas, encolarEscenas, CLAVE_ESCENAS } from './escenasPendientes.js'
  import { getGameStore } from '$lib/store'
  import { fetchData } from '$utils/fetchers'
  import { norm } from './datos.js'

  const { open } = getContext('simple-modal')
  let enMarcha = false

  const alCerrar = () => {
    enMarcha = false
    setTimeout(siguiente, 300)
  }
  const siguiente = async () => {
    if (enMarcha || !document.hasFocus() || document.visibilityState !== 'visible') return
    if (document.querySelector('[role="dialog"]') || !hayEscenas()) return
    const e = siguienteEscena()
    if (!e) return
    enMarcha = true
    if (e.tipo === 'muerte') {
      const pkdx = await fetchData().catch(() => null)
      const pokemon = pkdx?.aliasMap?.[norm(e.pokemon)] || pkdx?.nameMap?.[norm(e.pokemon)] || { name: e.pokemon }
      // El caído ya está marcado (lo confirmaste en el aviso del .sav): aquí solo se apunta cómo fue
      const submit = (death) =>
        getGameStore(e.run).update((texto) => {
          const datos = JSON.parse(texto || '{}')
          if (datos[e.lugar]) datos[e.lugar] = { ...datos[e.lugar], status: 5, death }
          return JSON.stringify(datos)
        })
      open(EscenaMuerte, { submit, pokemon, nickname: e.mote || '', mode: 'new' }, {}, { onClosed: alCerrar })
    } else {
      open(EscenaEvolucion, { base: e.base, evolutions: [e.evo], nickname: e.mote, soloEscena: true }, {}, { onClosed: alCerrar })
    }
  }

  onMount(() => {
    // compatibilidad: quien aún mande el evento antiguo
    const antiguas = (ev) => encolarEscenas((ev.detail || []).map((x) => ({ tipo: 'evolucion', ...x })))
    const deOtraVentana = (ev) => ev.key === CLAVE_ESCENAS && siguiente()
    window.addEventListener('lx:evoluciones-sav', antiguas)
    window.addEventListener('lx:escenas', siguiente)
    window.addEventListener('storage', deOtraVentana)
    // al volver a la ventana (o al tocarla: en algunos sistemas el foco llega sin evento)
    window.addEventListener('focus', siguiente)
    window.addEventListener('pointerdown', siguiente)
    window.addEventListener('keydown', siguiente)
    document.addEventListener('visibilitychange', siguiente)
    setTimeout(siguiente, 1500)
    return () => {
      window.removeEventListener('lx:evoluciones-sav', antiguas)
      window.removeEventListener('lx:escenas', siguiente)
      window.removeEventListener('storage', deOtraVentana)
      window.removeEventListener('focus', siguiente)
      window.removeEventListener('pointerdown', siguiente)
      window.removeEventListener('keydown', siguiente)
      document.removeEventListener('visibilitychange', siguiente)
    }
  })
</script>
