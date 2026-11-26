<script>
  // Escenas que llegan de la partida del emulador: las evoluciones que Sincronizacion.svelte ya aplicó a la
  // run. Se enseñan de una en una y solo con la ventana de Lockedex delante (mientras juegas, esperan).
  import { onMount, getContext } from 'svelte'
  import EscenaEvolucion from './EscenaEvolucion.svelte'

  const { open } = getContext('simple-modal')
  let cola = []
  let enMarcha = false

  const siguiente = () => {
    if (enMarcha || !cola.length || !document.hasFocus() || document.visibilityState !== 'visible') return
    const e = cola.shift()
    enMarcha = true
    open(EscenaEvolucion, { base: e.base, evolutions: [e.evo], nickname: e.mote, soloEscena: true }, {}, { onClosed: () => ((enMarcha = false), setTimeout(siguiente, 300)) })
  }

  onMount(() => {
    const llegan = (ev) => {
      cola = cola.concat(ev.detail || [])
      siguiente()
    }
    window.addEventListener('lx:evoluciones-sav', llegan)
    window.addEventListener('focus', siguiente)
    document.addEventListener('visibilitychange', siguiente)
    return () => {
      window.removeEventListener('lx:evoluciones-sav', llegan)
      window.removeEventListener('focus', siguiente)
      document.removeEventListener('visibilitychange', siguiente)
    }
  })
</script>
