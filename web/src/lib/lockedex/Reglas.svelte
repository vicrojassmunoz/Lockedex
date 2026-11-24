<script>
  // Editor de reglas de una run. En la ventana de ajustes guarda al momento;
  // al crear partida (modo "borrador") solo avisa de los cambios.
  import { createEventDispatcher } from 'svelte'
  import { REGLAS, GRUPOS_REGLAS, PLANTILLAS, leerReglas, guardarReglas } from './reglas.js'
  import { COLOR_TIPO } from './colores.js'
  import { idioma, traducirNombre } from './idioma.js'

  export let id = ''
  export let borrador = false
  export let reglas = borrador ? { ...PLANTILLAS.clasico.reglas, plantilla: 'clasico' } : leerReglas(id)

  const dispatch = createEventDispatcher()
  const es = idioma() === 'es'
  const TIPOS = Object.keys(COLOR_TIPO)

  const guardar = () => {
    if (!borrador && id) guardarReglas(id, reglas)
    dispatch('cambio', reglas)
  }

  const elegirPlantilla = (k) => {
    reglas = { ...PLANTILLAS[k].reglas, plantilla: k }
    // Ajustes de la app que acompañan a la plantilla (sugerencias, niveles máx…)
    for (const [indice, valor] of Object.entries(PLANTILLAS[k].ajustes)) dispatch('ajuste', { indice: +indice, valor })
    guardar()
  }

  const alternar = (r) => {
    reglas[r.id] = !reglas[r.id]
    if (r.id === 'randomlocke') {
      if (!reglas.randomlocke) reglas.entrenadoresAleatorios = false
      dispatch('ajuste', { indice: 1, valor: reglas.randomlocke ? '0' : '1' })
    }
    reglas.plantilla = 'libre'
    guardar()
  }

  const elegirTipo = (e) => {
    reglas.monotipo = e.target.value
    reglas.plantilla = 'libre'
    guardar()
  }

  $: grupos = Object.entries(GRUPOS_REGLAS).map(([g, nombre]) => [g, nombre, REGLAS.filter((r) => r.grupo === g)])
</script>

<section class="lx-reglas" data-lx-original>
  <div class="lx-r-cab">
    <h3>{es ? 'Reglas de la run' : 'Run rules'}</h3>
    <div class="lx-r-plantillas">
      {#each Object.entries(PLANTILLAS) as [k, p]}
        <button class:lx-sel={reglas.plantilla === k} on:click={() => elegirPlantilla(k)}>{es ? p.es : p.en}</button>
      {/each}
    </div>
  </div>

  {#each grupos as [g, nombre, lista]}
    <h4>{es ? nombre[0] : nombre[1]}</h4>
    <div class="lx-r-lista">
      {#each lista as r}
        {#if !r.depende || reglas[r.depende]}
          <div class="lx-r-regla" class:lx-on={r.tipo === 'tipo' ? !!reglas[r.id] : reglas[r.id]} class:lx-r-hija={r.depende}>
            {#if r.tipo === 'tipo'}
              <select value={reglas[r.id] || ''} on:change={elegirTipo}>
                <option value="">{es ? 'No' : 'Off'}</option>
                {#each TIPOS as tp}<option value={tp}>{traducirNombre(tp.charAt(0).toUpperCase() + tp.slice(1))}</option>{/each}
              </select>
            {:else}
              <button class="lx-r-interruptor" role="switch" aria-checked={!!reglas[r.id]} on:click={() => alternar(r)}><i /></button>
            {/if}
            <div>
              <b>{es ? r.es : r.en}</b>
              <small>{es ? r.desc[0] : r.desc[1]}</small>
            </div>
          </div>
        {/if}
      {/each}
    </div>
  {/each}
</section>

<style>
  .lx-reglas {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .lx-r-cab {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    flex-wrap: wrap;
  }
  h3 {
    font-family: 'VT323', monospace;
    font-size: 26px;
    line-height: 1;
  }
  h4 {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    opacity: 0.6;
    margin-top: 6px;
  }
  .lx-r-plantillas {
    display: flex;
    gap: 4px;
    flex-wrap: wrap;
  }
  .lx-r-plantillas button {
    font-size: 13px;
    padding: 4px 10px;
    border-radius: 8px;
    border: 2px solid #1b1b1f;
  }
  .lx-r-plantillas button.lx-sel {
    background: #dc0a2d;
    color: #fff;
  }
  .lx-r-lista {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    gap: 6px;
  }
  .lx-r-regla {
    display: flex;
    gap: 10px;
    align-items: flex-start;
    padding: 8px 10px;
    border-radius: 10px;
    background: rgba(0, 0, 0, 0.04);
    border: 2px solid transparent;
  }
  .lx-r-regla.lx-on {
    border-color: #1b1b1f;
    background: rgba(220, 10, 45, 0.06);
  }
  .lx-r-hija {
    margin-left: 18px;
  }
  .lx-r-regla b {
    display: block;
    font-size: 14px;
  }
  .lx-r-regla small {
    display: block;
    font-size: 12px;
    opacity: 0.7;
    line-height: 1.3;
  }
  .lx-r-regla select {
    font-size: 13px;
    border: 2px solid #d4d4d8;
    border-radius: 8px;
    padding: 2px 4px;
    background: transparent;
  }
  .lx-r-interruptor {
    flex: none;
    width: 38px;
    height: 22px;
    border-radius: 11px;
    background: #d4d4d8;
    position: relative;
    transition: background 0.15s;
    margin-top: 2px;
  }
  .lx-r-interruptor i {
    position: absolute;
    top: 3px;
    left: 3px;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: #fff;
    transition: transform 0.15s;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
  }
  .lx-on .lx-r-interruptor {
    background: #dc0a2d;
  }
  .lx-on .lx-r-interruptor i {
    transform: translateX(16px);
  }
</style>
