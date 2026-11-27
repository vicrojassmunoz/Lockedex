<script>
  import { claseVista } from './genVista.js'
  // Tarjeta que aparece al pasar el ratón por un movimiento, habilidad u objeto.
  // Cualquier elemento con data-lx-mov / data-lx-hab / data-lx-obj la activa.
  import { onMount } from 'svelte'
  import { movimientos, habilidades, objetos, tipos, norm } from './datos.js'
  import { idioma } from './idioma.js'
  import { COLOR_TIPO } from './colores.js'

  let visible = false
  let info = null
  let x = 0,
    y = 0
  let tarjeta
  let actual = null

  const es = idioma() === 'es'
  const CLASE = {
    physical: es ? 'Físico' : 'Physical',
    special: es ? 'Especial' : 'Special',
    status: es ? 'Estado' : 'Status'
  }

  let datos = {}
  onMount(async () => {
    const [m, h, o, t] = await Promise.all([movimientos(), habilidades(), objetos(), tipos()])
    datos = { m, h, o, t }

    const sobre = (e) => {
      const el = e.target.closest?.('[data-lx-mov],[data-lx-hab],[data-lx-obj]')
      if (!el || el === actual) return
      actual = el
      mostrar(el)
    }
    const fuera = (e) => {
      if (!actual) return
      if (e.relatedTarget && actual.contains(e.relatedTarget)) return
      actual = null
      visible = false
    }
    document.addEventListener('mouseover', sobre)
    document.addEventListener('mouseout', fuera)
    window.addEventListener('scroll', () => ((visible = false), (actual = null)), true)
    return () => {
      document.removeEventListener('mouseover', sobre)
      document.removeEventListener('mouseout', fuera)
    }
  })

  const mostrar = async (el) => {
    const { m = {}, h = {}, o = {}, t = {} } = datos
    if (el.dataset.lxMov !== undefined) {
      const d = m[norm(el.dataset.lxMov)]
      if (!d) return (visible = false)
      const potencia = +el.dataset.lxPot || d.potencia
      info = {
        tipo: 'mov',
        nombre: es ? d.es : d.en,
        sub: es && d.es !== d.en ? d.en : '',
        tipoPkmn: d.tipo,
        tipoNombre: es ? t[d.tipo] || d.tipo : d.tipo,
        clase: claseVista(d.clase, d.tipo),
        potencia,
        precision: d.precision,
        pp: d.pp,
        prioridad: d.prioridad,
        desc: (es ? d.desc : d.descEn) || d.descEn
      }
    } else if (el.dataset.lxHab !== undefined) {
      const d = h[norm(el.dataset.lxHab)]
      if (!d) return (visible = false)
      info = {
        tipo: 'hab',
        nombre: es ? d.es : d.en,
        sub: es && d.es !== d.en ? d.en : '',
        desc: (es ? d.desc : d.descEn) || d.descEn
      }
    } else {
      const d = o[norm(el.dataset.lxObj)]
      if (!d) return (visible = false)
      info = {
        tipo: 'obj',
        nombre: es ? d.es : d.en,
        sub: es && d.es !== d.en ? d.en : '',
        desc: (es ? d.desc : d.descEn) || d.descEn
      }
    }

    const r = el.getBoundingClientRect()
    visible = true
    await Promise.resolve()
    const ancho = tarjeta?.offsetWidth || 280
    const alto = tarjeta?.offsetHeight || 160
    x = Math.min(Math.max(8, r.left + r.width / 2 - ancho / 2), window.innerWidth - ancho - 8)
    y = r.top - alto - 10
    if (y < 56) y = r.bottom + 10
  }
</script>

{#if visible && info}
  <div
    bind:this={tarjeta}
    class="lx-info"
    style="left:{x}px; top:{y}px; --c:{COLOR_TIPO[info.tipoPkmn] || '#dc0a2d'}"
    data-lx-original
    role="tooltip"
  >
    <div class="lx-info-cab">
      <span class="lx-info-nombre">{info.nombre}</span>
      {#if info.sub}<span class="lx-info-sub">{info.sub}</span>{/if}
      <span class="lx-info-etq">
        {info.tipo === 'mov' ? (es ? 'Movimiento' : 'Move') : info.tipo === 'hab' ? (es ? 'Habilidad' : 'Ability') : es ? 'Objeto' : 'Item'}
      </span>
    </div>

    {#if info.tipo === 'mov'}
      <div class="lx-info-chips">
        <span class="lx-chip" style="background:var(--c)">{info.tipoNombre}</span>
        <span class="lx-chip lx-chip-clase lx-{info.clase}">{CLASE[info.clase] || '—'}</span>
        {#if info.prioridad}
          <span class="lx-chip lx-chip-prio">{es ? 'Prioridad' : 'Priority'} {info.prioridad > 0 ? '+' : ''}{info.prioridad}</span>
        {/if}
      </div>
      <div class="lx-info-stats">
        <div><small>{es ? 'Potencia' : 'Power'}</small><b>{info.potencia || '—'}</b></div>
        <div><small>{es ? 'Precisión' : 'Accuracy'}</small><b>{info.precision ? info.precision + '%' : '—'}</b></div>
        <div><small>PP</small><b>{info.pp || '—'}</b></div>
      </div>
    {/if}

    {#if info.desc}
      <p class="lx-info-desc">{info.desc}</p>
    {/if}
  </div>
{/if}

<style>
  .lx-info {
    position: fixed;
    z-index: 2147483000;
    width: 290px;
    pointer-events: none;
    background: #fbfbf7;
    color: #1d1d1f;
    border: 3px solid #1d1d1f;
    border-radius: 10px;
    box-shadow: 4px 4px 0 rgba(0, 0, 0, 0.35);
    overflow: hidden;
    font-size: 13px;
    line-height: 1.35;
    animation: aparecer 0.12s ease-out;
  }
  :global(.dark) .lx-info {
    background: #16202c;
    color: #e8eef5;
    border-color: #0b1118;
  }
  @keyframes aparecer {
    from {
      opacity: 0;
      transform: translateY(4px);
    }
  }
  .lx-info-cab {
    display: flex;
    align-items: baseline;
    gap: 6px;
    padding: 6px 10px 5px;
    background: var(--c);
    color: #fff;
    text-shadow: 1px 1px 0 rgba(0, 0, 0, 0.45);
    flex-wrap: wrap;
  }
  .lx-info-nombre {
    font-family: 'VT323', monospace;
    font-size: 22px;
    line-height: 1;
  }
  .lx-info-sub {
    font-size: 11px;
    opacity: 0.85;
  }
  .lx-info-etq {
    margin-left: auto;
    font-family: 'VT323', monospace;
    font-size: 14px;
    opacity: 0.9;
    text-transform: uppercase;
  }
  .lx-info-chips {
    display: flex;
    gap: 5px;
    padding: 8px 10px 0;
    flex-wrap: wrap;
  }
  .lx-chip {
    font-family: 'VT323', monospace;
    font-size: 15px;
    line-height: 1;
    padding: 3px 7px 2px;
    border-radius: 5px;
    color: #fff;
    text-transform: uppercase;
    text-shadow: 1px 1px 0 rgba(0, 0, 0, 0.35);
  }
  .lx-chip-clase {
    background: #6b7280;
  }
  .lx-physical {
    background: #c92112;
  }
  .lx-special {
    background: #4f5870;
  }
  .lx-status {
    background: #8c888c;
  }
  .lx-chip-prio {
    background: #1d1d1f;
  }
  .lx-info-stats {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 6px;
    padding: 8px 10px 2px;
  }
  .lx-info-stats div {
    display: flex;
    flex-direction: column;
    align-items: center;
    background: rgba(0, 0, 0, 0.05);
    border-radius: 6px;
    padding: 3px 0;
  }
  :global(.dark) .lx-info-stats div {
    background: rgba(255, 255, 255, 0.06);
  }
  .lx-info-stats small {
    font-size: 10px;
    text-transform: uppercase;
    opacity: 0.65;
    letter-spacing: 0.04em;
  }
  .lx-info-stats b {
    font-family: 'VT323', monospace;
    font-size: 22px;
    line-height: 1;
  }
  .lx-info-desc {
    padding: 8px 10px 10px;
    margin: 0;
  }
</style>
