<script>
  // Randomlocke: apuntar el equipo real de un jefe cuando lo ves en el juego
  import { onMount, getContext } from 'svelte'
  import { cargarCalc, buscarEspecie, cargarPokedex, urlSprite } from './analista.js'
  import { infoJuego, movimientos as cargarMovs, norm } from './datos.js'
  import { guardarEquipoJefe, leerEquiposJefes } from './jefes.js'
  import { idioma } from './idioma.js'

  export let partidaId
  export let juego
  export let jefeId
  export let nombre = ''
  export let cap = 50
  export let alGuardar = () => {}

  const { close } = getContext('simple-modal')
  const es = idioma() === 'es'

  let datosCalc = null
  let pokedex = {}
  let movs = {}
  let filas = []

  const vacia = () => ({ especie: '', nivel: cap || 50, movimientos: ['', '', '', ''] })

  onMount(async () => {
    const info = infoJuego(juego)
    ;[datosCalc, pokedex, movs] = await Promise.all([cargarCalc(info?.gen || 9), cargarPokedex(juego), cargarMovs()])
    const previo = leerEquiposJefes(partidaId)[jefeId]
    filas = previo?.length
      ? previo.map((p) => ({ especie: p.especie, nivel: p.nivel, movimientos: [...(p.movimientos || []), '', '', '', ''].slice(0, 4) }))
      : [vacia()]
  })

  const guardar = () => {
    const equipo = filas
      .filter((f) => buscarEspecie(datosCalc, f.especie))
      .map((f) => ({ especie: buscarEspecie(datosCalc, f.especie).nombre, nivel: +f.nivel || cap, movimientos: f.movimientos.filter(Boolean) }))
    guardarEquipoJefe(partidaId, jefeId, equipo)
    alGuardar()
    close()
  }
</script>

<section class="lx-ej" data-lx-original>
  <header>
    <div>
      <small>RANDOMLOCKE</small>
      <h2>{es ? `Equipo real de ${nombre}` : `${nombre}'s real team`}</h2>
    </div>
    <button class="lx-ej-x" on:click={close}>✕</button>
  </header>
  <p>{es ? 'Apunta lo que veas en el combate. Los movimientos son opcionales: sin ellos, el riesgo se estima por tipos.' : 'Log what you see in battle. Moves are optional: without them, risk is estimated by type.'}</p>

  <datalist id="lx-ej-esp">{#each datosCalc?.especies || [] as sp}<option value={sp.nombre} />{/each}</datalist>
  <datalist id="lx-ej-movs">{#each datosCalc?.movimientos || [] as m}<option value={m} />{/each}</datalist>

  {#each filas as f, i}
    <div class="lx-ej-fila">
      <img src={urlSprite(pokedex, f.especie) || '/assets/img/pokemon/base-201-question.png'} alt="" />
      <input class="lx-ej-esp" list="lx-ej-esp" bind:value={f.especie} placeholder={es ? 'Pokémon' : 'Pokémon'} />
      <label>{es ? 'Nv.' : 'Lv.'}<input type="number" min="1" max="100" bind:value={f.nivel} /></label>
      <div class="lx-ej-movs">
        {#each [0, 1, 2, 3] as j}
          <input list="lx-ej-movs" bind:value={f.movimientos[j]} placeholder={es ? `Mov. ${j + 1}` : `Move ${j + 1}`} />
        {/each}
      </div>
      <button class="lx-ej-quitar" on:click={() => (filas = filas.filter((_, k) => k !== i))}>✕</button>
    </div>
  {/each}
  <div class="lx-ej-acciones">
    {#if filas.length < 6}<button on:click={() => (filas = [...filas, vacia()])}>{es ? '＋ Añadir Pokémon' : '＋ Add Pokémon'}</button>{/if}
    <button class="lx-ej-ok" on:click={guardar}>{es ? 'Guardar equipo' : 'Save team'}</button>
  </div>
</section>

<style>
  .lx-ej {
    width: min(760px, calc(100vw - 48px));
    background: #fbfbf7;
    color: #1b1b1f;
    border: 4px solid #1b1b1f;
    border-radius: 16px;
    box-shadow: 6px 6px 0 rgba(0, 0, 0, 0.4);
    padding-bottom: 14px;
    font-size: 14px;
  }
  :global(.dark) .lx-ej {
    background: #16202c;
    color: #e8eef5;
  }
  header {
    display: flex;
    align-items: center;
    padding: 12px 16px;
    background: linear-gradient(180deg, #ff3355, #dc0a2d 60%, #c10826);
    color: #fff;
    border-radius: 11px 11px 0 0;
  }
  header div {
    flex: 1;
  }
  header small {
    font-family: 'VT323', monospace;
    letter-spacing: 2px;
    opacity: 0.85;
  }
  header h2 {
    font-family: 'VT323', monospace;
    font-size: 32px;
    line-height: 0.9;
  }
  .lx-ej-x {
    width: 30px;
    height: 30px;
    border-radius: 8px;
    background: rgba(0, 0, 0, 0.25);
  }
  p {
    padding: 10px 16px 4px;
    opacity: 0.75;
    font-size: 13px;
  }
  .lx-ej-fila {
    display: grid;
    grid-template-columns: 44px minmax(0, 1.3fr) 70px minmax(0, 2.4fr) 24px;
    gap: 6px;
    align-items: center;
    padding: 4px 16px;
  }
  .lx-ej-fila img {
    width: 44px;
    height: 44px;
    image-rendering: pixelated;
  }
  input {
    border: 2px solid #d4d4d8;
    border-radius: 8px;
    padding: 4px 6px;
    background: #fff;
    color: inherit;
    min-width: 0;
    width: 100%;
    font-size: 13px;
  }
  :global(.dark) .lx-ej input {
    background: #1f2937;
    border-color: #374151;
  }
  .lx-ej-esp {
    font-family: 'VT323', monospace;
    font-size: 20px;
  }
  label {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 12px;
  }
  .lx-ej-movs {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 4px;
  }
  .lx-ej-quitar {
    opacity: 0.5;
  }
  .lx-ej-acciones {
    display: flex;
    justify-content: space-between;
    padding: 10px 16px 0;
  }
  .lx-ej-acciones button {
    padding: 6px 12px;
    border-radius: 8px;
    border: 2px solid #1b1b1f;
  }
  .lx-ej-ok {
    background: #dc0a2d;
    color: #fff;
    font-weight: 600;
  }
</style>
