<script>
  // Sacrificio por medalla: tras cada medalla, la ruleta elige a uno del equipo y va al cementerio.
  // «lockedex.sacrificios.<id>» = { vistos: [id de líder], hechos: [...], pendiente: { jefe, nombre, lugar } | null }
  // La elección se guarda en cuanto se hace, así que recargar no vuelve a tirar la ruleta.
  import { onDestroy } from 'svelte'
  import { getGameStore, patch } from '$lib/store'
  import { fetchData } from '$utils/fetchers'
  import { leerReglas } from './reglas.js'
  import { norm } from './datos.js'
  import { t, traducirNombre } from './idioma.js'

  export let id = ''
  export let datos = {}

  const VIVOS = [1, 2, 3, 6]
  const clave = () => `lockedex.sacrificios.${id}`
  const leer = () => {
    try {
      return JSON.parse(localStorage.getItem(clave()) || 'null')
    } catch {
      return null
    }
  }
  const guardar = (e) => localStorage.setItem(clave(), JSON.stringify(e))

  let pk = null
  fetchData().then((d) => (pk = d))
  // (pk como argumento para que se repinte cuando llega la Pokédex)
  const sprite = (alias, _pk) => {
    const e = _pk?.aliasMap?.[norm(alias)] || _pk?.nameMap?.[norm(alias)]
    return e?.imgId ? `/assets/img/pokemon/base-${e.imgId}.png` : '/assets/img/pokemon/base-201-question.png'
  }
  const nombre = (lugar, _pk = pk) => {
    const e = datos?.[lugar] || {}
    const p = _pk?.aliasMap?.[norm(e.pokemon)]
    return e.nickname || traducirNombre(p?.name || e.pokemon || lugar)
  }

  let estado = null
  let ruleta = null // índice que se ilumina mientras gira
  let girando = false
  let confirmar = false
  let temporizador

  $: activa = !!leerReglas(id).sacrificio
  $: equipo = (datos?.__team || []).filter((l) => datos?.[l] && VIVOS.includes(+datos[l].status))
  $: lideres = (Array.isArray(datos?.__teams) ? datos.__teams : []).filter((e) => e?.group === 'gym-leader')
  // Solo con los datos de la run ya cargados (si no, todas las medallas parecerían nuevas)
  $: cargados = datos && Object.keys(datos).some((k) => !k.startsWith('__'))
  $: if (activa && id && cargados) revisar(lideres, equipo)

  const revisar = () => {
    let e = leer()
    // Primera vez: las medallas que ya tenías no cuentan
    if (!e) {
      e = { vistos: lideres.map((l) => String(l.id)), hechos: [], pendiente: null }
      guardar(e)
    }
    // Si el elegido ya no está en el equipo (cayó, lo sacaste…), se vuelve a tirar
    if (e.pendiente && !equipo.includes(e.pendiente.lugar)) e.pendiente = { ...e.pendiente, lugar: null }
    const nuevo = lideres.find((l) => !e.vistos.includes(String(l.id)))
    if (!e.pendiente && nuevo) e.pendiente = { jefe: String(nuevo.id), nombre: nuevo.name || nuevo.id, lugar: null }
    if (e.pendiente && !e.pendiente.lugar && equipo.length >= 2) {
      const r = new Uint32Array(1)
      crypto.getRandomValues(r)
      e.pendiente.lugar = equipo[r[0] % equipo.length]
      guardar(e)
      girar(equipo.indexOf(e.pendiente.lugar))
    }
    guardar(e)
    estado = e
  }

  // Animación de la ruleta: va pasando por el equipo y frena en el elegido
  const girar = (final) => {
    if (typeof window === 'undefined') return
    girando = true
    let i = 0
    const n = equipo.length
    const vueltas = n * 3 + final
    const paso = () => {
      ruleta = i % n
      if (i >= vueltas) {
        girando = false
        return
      }
      i++
      temporizador = setTimeout(paso, 50 + (i / vueltas) ** 3 * 260)
    }
    paso()
  }
  onDestroy(() => clearTimeout(temporizador))

  const sacrificar = () => {
    const p = estado?.pendiente
    if (!p?.lugar) return
    if (!confirmar) {
      confirmar = true
      setTimeout(() => (confirmar = false), 3000)
      return
    }
    confirmar = false
    const e = datos[p.lugar]
    getGameStore(id).update(
      patch({
        [p.lugar]: {
          ...e,
          status: 5,
          death: { type: 'sacrificio', time: Date.now(), epitaph: t(`Sacrificado tras la medalla de ${p.nombre}.`, `Sacrificed after ${p.nombre}'s badge.`), custom: true }
        },
        __team: (datos.__team || []).filter((l) => l !== p.lugar)
      })
    )
    const nuevo = { ...estado, vistos: [...estado.vistos, p.jefe], hechos: [...estado.hechos, { ...p, pokemon: e?.pokemon, fecha: Date.now() }], pendiente: null }
    guardar(nuevo)
    estado = nuevo
  }
  const noCuenta = () => {
    const p = estado?.pendiente
    if (!p) return
    const nuevo = { ...estado, vistos: [...estado.vistos, p.jefe], pendiente: null }
    guardar(nuevo)
    estado = nuevo
  }
</script>

{#if activa && estado?.pendiente}
  <section class="lx-sacrificio" data-lx-original>
    <header>✝ {t('SACRIFICIO', 'SACRIFICE')} · {t(`medalla de ${estado.pendiente.nombre}`, `${estado.pendiente.nombre}'s badge`)}</header>
    {#if estado.pendiente.lugar}
      <div class="lx-sac-ruleta">
        {#each equipo as l, i}
          <figure class:lx-luz={girando ? ruleta === i : l === estado.pendiente.lugar} class:lx-apagado={!girando && l !== estado.pendiente.lugar}>
            <img src={sprite(datos[l]?.pokemon, pk)} alt="" width="56" height="56" />
            <figcaption>{nombre(l, pk)}</figcaption>
          </figure>
        {/each}
      </div>
      <p>
        {#if girando}{t('La ruleta está girando…', 'The wheel is spinning…')}{:else}{t('La ruleta ha elegido a', 'The wheel picked')} <b>{nombre(estado.pendiente.lugar, pk)}</b>.{/if}
      </p>
      <div class="lx-sac-botones">
        <button class="lx-sac-si" class:lx-confirmar={confirmar} disabled={girando} on:click={sacrificar}>
          {confirmar ? t(`¿Seguro? ✝ ${nombre(estado.pendiente.lugar, pk)}`, `Sure? ✝ ${nombre(estado.pendiente.lugar, pk)}`) : t(`Sacrificar a ${nombre(estado.pendiente.lugar, pk)}`, `Sacrifice ${nombre(estado.pendiente.lugar, pk)}`)}
        </button>
        <button disabled={girando} on:click={noCuenta} title={t('Por si marcaste la medalla por error', 'In case you marked the badge by mistake')}>{t('Esta medalla no cuenta', 'This badge does not count')}</button>
      </div>
    {:else}
      <p>{t('Solo te queda un Pokémon en el equipo: no hay a quién sacrificar.', 'Only one Pokémon left in your team: nobody to sacrifice.')}</p>
      <div class="lx-sac-botones"><button on:click={noCuenta}>{t('Vale', 'OK')}</button></div>
    {/if}
  </section>
{/if}

<style>
  .lx-sacrificio {
    padding: 8px 12px 10px;
    color: #f8e8e8;
    background: repeating-linear-gradient(0deg, rgba(255, 255, 255, 0.03) 0 2px, transparent 2px 4px), #301018;
    border: 3px solid #a02030;
    box-shadow: inset 0 0 0 2px #301018, inset 0 0 0 4px #601020;
    font-family: 'LX Pixel', 'VT323', monospace;
    font-size: 12px;
  }
  header {
    text-align: center;
    font-size: 20px;
    line-height: 24px;
    color: #ff6070;
    text-shadow: 2px 2px 0 #000;
  }
  .lx-sac-ruleta {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 6px;
    margin: 6px 0;
  }
  figure {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 72px;
    padding: 2px;
    border: 2px solid transparent;
    border-radius: 6px;
    transition: opacity 0.3s, filter 0.3s;
  }
  figure img {
    image-rendering: pixelated;
  }
  figure.lx-luz {
    border-color: #ff6070;
    background: rgba(255, 96, 112, 0.18);
  }
  figure.lx-apagado {
    opacity: 0.35;
    filter: grayscale(1);
  }
  figcaption {
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  p {
    text-align: center;
    line-height: 18px;
  }
  p b {
    font-weight: normal;
    color: #ff8090;
  }
  .lx-sac-botones {
    display: flex;
    justify-content: center;
    gap: 8px;
    margin-top: 6px;
  }
  .lx-sac-botones button {
    padding: 2px 12px;
    color: #301018;
    background: #e8d0d4;
    box-shadow: inset 0 -2px 0 #907078;
  }
  .lx-sac-botones .lx-sac-si {
    color: #fff;
    background: #a02030;
    box-shadow: inset 0 -2px 0 #500810;
  }
  .lx-sac-botones .lx-sac-si.lx-confirmar {
    background: #ff2040;
  }
  button:disabled {
    opacity: 0.5;
  }
  @media (prefers-reduced-motion: reduce) {
    figure {
      transition: none;
    }
  }
</style>
