<script>
  // Modo batalla de la ventana compacta: durante el combate, tu Pokémon contra el del jefe con la
  // calculadora de daño (la misma del riesgo). Daño de cada ataque, si hace KO y en cuántos golpes, quién
  // pega antes y qué saca después el jefe. Con estados, clima y potenciadores.
  import { createEventDispatcher } from 'svelte'
  import { fetchData } from '$utils/fetchers'
  import { movimientos, habilidades, norm } from './datos.js'
  import { completarConAprendizaje } from './riesgo.js'
  import { COLOR_TIPO } from './colores.js'
  import { efectoNaturaleza } from './naturalezas.js'
  import { idioma, traducirNombre } from './idioma.js'

  export let jefe = null // { name, pokemon: [{ name, level, moves, ability, held, iv, nat }] }
  export let equipo = [] // fichas de equipoCompleto (con lo del .sav si lo hay)
  export let gen = 3
  export let cap = null
  export let grupo = null
  // En la pantalla de combate: las estadísticas y los tipos de los dos, lado a lado
  export let conStats = false
  // Pokémon del jefe elegido al abrir («Comparar con mi equipo» desde uno de su equipo)
  export let suInicial = 0

  const es = idioma() === 'es'
  const dispatch = createEventDispatcher()
  // Apuntar que ha caído el tuyo (con confirmación, como en la lista del equipo)
  let confirmarCaido = null
  const caido = () => {
    if (!tu?.lugar) return
    if (confirmarCaido !== tu.lugar) {
      confirmarCaido = tu.lugar
      setTimeout(() => (confirmarCaido = null), 3000)
      return
    }
    confirmarCaido = null
    dispatch('caido', { lugar: tu.lugar, nombre: tu.nombre })
  }
  const nombreBonito = (n = '') => String(n).replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())

  let listo = false
  let error = ''
  let calc = null
  let g = null
  let movs = {}
  let movPorId = {}
  let habs = {}
  let pk = null
  let datos = null // { jefe, equipo } completados con lo que aprenden por nivel

  let tuIdx = 0
  let suIdx = +suInicial || 0
  // Ajustes del combate
  let estadoTuyo = ''
  let estadoSuyo = ''
  let clima = ''
  let mejoraTuya = { atq: 0, def: 0, vel: 0 }
  let mejoraSuya = { atq: 0, def: 0, vel: 0 }
  let psTuyo = 100
  let psSuyo = 100

  let firma = ''
  $: cargar(jefe, equipo)
  const cargar = async (j, eq) => {
    const f = JSON.stringify([j?.name, (j?.pokemon || []).map((p) => [p.name, p.level]), eq.map((y) => [y.lugar, y.especie, y.nivel])])
    if (!j?.pokemon?.length || !eq.length || f === firma) return
    firma = f
    try {
      ;[calc, movs, habs, pk] = await Promise.all([import('@smogon/calc'), movimientos(), habilidades(), fetchData()])
      g = calc.Generations.get(gen)
      movPorId = {}
      for (const [k, m] of Object.entries(movs)) movPorId[m.id] = { ...m, clave: k }
      const eqBase = eq.map((y) => ({ ...y, nivel: y.nivel || null }))
      datos = (await completarConAprendizaje(j, eqBase, grupo, cap)) || { jefe: j, equipo: eqBase }
      if (tuIdx >= datos.equipo.length) tuIdx = 0
      if (suIdx >= datos.jefe.pokemon.length) suIdx = 0
      const t = datos.equipo[tuIdx]
      psTuyo = t?.psMax ? Math.round((t.ps / t.psMax) * 100) : 100
      listo = true
    } catch (e) {
      console.error('[batalla]', e)
      error = es ? 'No se pudo preparar la calculadora.' : 'Could not set up the calculator.'
    }
  }

  const especie = (n) => pk?.aliasMap?.[norm(n)] || pk?.nameMap?.[norm(n)] || null
  const sprite = (n) => {
    const e = especie(n)
    return e?.imgId ? `/assets/img/pokemon/base-${e.imgId}.png` : '/assets/img/pokemon/base-201-question.png'
  }
  const nombreMov = (en) => {
    const m = movs[norm(en)]
    return es ? m?.es || en : m?.en || en
  }
  const tipoMov = (en) => movs[norm(en)]?.tipo || 'normal'

  const ESTADOS = [
    ['', 'Sano', 'Healthy'],
    ['brn', 'Quemado', 'Burned'],
    ['par', 'Paralizado', 'Paralyzed'],
    ['psn', 'Envenenado', 'Poisoned']
  ]
  const CLIMAS = [
    ['', 'Sin clima', 'No weather'],
    ['Sun', 'Sol', 'Sun'],
    ['Rain', 'Lluvia', 'Rain'],
    ['Sand', 'Tormenta de arena', 'Sandstorm'],
    ['Hail', 'Granizo', 'Hail']
  ]
  const mejora = (m) => ({ atk: m.atq, spa: m.atq, def: m.def, spd: m.def, spe: m.vel })

  const crear = (nombre, opciones) => {
    try {
      return new calc.Pokemon(g, nombreBonito(nombre), opciones)
    } catch {
      return null
    }
  }
  const conPs = (p, pct) => {
    if (!p) return p
    p.originalCurHP = Math.max(1, Math.round((p.maxHP() * pct) / 100))
    return p
  }

  // Los dos Pokémon del duelo con todo lo elegido
  $: tu = listo ? datos.equipo[tuIdx] : null
  $: su = listo ? datos.jefe.pokemon[suIdx] : null
  $: duelo = listo && tu && su ? calcularDuelo(tu, su, estadoTuyo, estadoSuyo, clima, mejoraTuya, mejoraSuya, psTuyo, psSuyo) : null

  const calcularDuelo = (y, b) => {
    const misMovs = (y.movimientos || []).map((id) => movPorId[id]?.en).filter(Boolean)
    const pt = conPs(
      crear(y.especie || y.alias, {
        level: y.nivel || cap || 50,
        nature: nombreBonito(y.naturaleza || 'hardy'),
        ivs: y.ivs,
        evs: y.evs,
        ability: habs[y.habilidad]?.en || y.habilidadNombre,
        item: y.objeto || undefined,
        moves: misMovs,
        status: estadoTuyo,
        boosts: mejora(mejoraTuya)
      }),
      psTuyo
    )
    const iv = Number.isFinite(+b.iv) && b.iv !== null && b.iv !== '' ? +b.iv : 31
    const susMovs = (b.moves || []).map((m) => m?.name).filter(Boolean)
    const ps = conPs(
      crear(b.name, {
        level: parseInt(b.level, 10) || cap || 50,
        ability: b.ability?.name,
        item: b.held?.name,
        ivs: { hp: iv, atk: iv, def: iv, spa: iv, spd: iv, spe: iv },
        evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
        ...(b.nat ? { nature: nombreBonito(b.nat) } : {}),
        moves: susMovs,
        status: estadoSuyo,
        boosts: mejora(mejoraSuya)
      }),
      psSuyo
    )
    if (!pt || !ps) return { fallo: true }
    const campo = clima ? new calc.Field({ weather: clima }) : undefined
    const golpe = (atq, def, mov) => {
      try {
        const m = new calc.Move(g, mov)
        const r = calc.calculate(g, atq, def, m, campo)
        const [min, max] = r.range()
        const vida = def.curHP()
        const total = def.maxHP()
        return {
          mov,
          tipo: tipoMov(mov),
          min: min / total,
          max: max / total,
          // golpes para debilitarlo desde la vida que le queda (con el daño mínimo y con el máximo)
          golpesMin: max > 0 ? Math.ceil(vida / max) : 99,
          golpesMax: min > 0 ? Math.ceil(vida / min) : 99,
          prioridad: m.priority || 0,
          estado: m.category === 'Status'
        }
      } catch {
        return { mov, tipo: tipoMov(mov), min: 0, max: 0, golpesMin: 99, golpesMax: 99, prioridad: 0, estado: true }
      }
    }
    const mios = misMovs.map((m) => golpe(pt, ps, m))
    const suyos = susMovs.map((m) => golpe(ps, pt, m))
    // Velocidad: la de la calculadora (con potenciadores; la parálisis la divide)
    const velT = Math.floor(pt.stats.spe * mult(mejoraTuya.vel) * (estadoTuyo === 'par' ? (gen >= 7 ? 0.5 : 0.25) : 1))
    const velS = Math.floor(ps.stats.spe * mult(mejoraSuya.vel) * (estadoSuyo === 'par' ? (gen >= 7 ? 0.5 : 0.25) : 1))
    const mejorMio = [...mios].filter((x) => !x.estado).sort((a, b) => a.golpesMax - b.golpesMax || b.min - a.min)[0]
    const peorSuyo = [...suyos].filter((x) => !x.estado).sort((a, b) => a.golpesMin - b.golpesMin || b.max - a.max)[0]
    let rapido = velT > velS
    if (mejorMio?.prioridad > 0 && mejorMio.golpesMax === 1 && !(peorSuyo?.prioridad > 0)) rapido = true
    else if (peorSuyo?.prioridad > 0 && peorSuyo.golpesMin === 1 && !(mejorMio?.prioridad > 0)) rapido = false
    const yo = mejorMio?.golpesMax ?? 99
    const el = peorSuyo?.golpesMin ?? 99
    const ganas = rapido ? yo <= el : yo < el
    const stats = (p) => ({ ...(p.stats || {}) })
    return {
      mios, suyos, velT, velS, empate: velT === velS, rapido, yo, el, ganas, mejorMio, peorSuyo,
      tuyo: { stats: stats(pt), tipos: pt.types || [], nat: y.naturaleza || y.nature || '', nivel: pt.level },
      suyo: { stats: stats(ps), tipos: ps.types || [], nat: b.nat || '', nivel: ps.level }
    }
  }
  const mult = (n) => (n >= 0 ? (2 + n) / 2 : 2 / (2 - n))

  const pct = (x) => Math.round(x * 100)
  const STATS = [
    ['hp', 'PS', 'HP'],
    ['atk', 'Ataque', 'Attack'],
    ['def', 'Defensa', 'Defense'],
    ['spa', 'At. Esp.', 'Sp. Atk'],
    ['spd', 'Def. Esp.', 'Sp. Def'],
    ['spe', 'Velocidad', 'Speed']
  ]
  const flecha = (nat, k) => ['▼', '', '▲'][efectoNaturaleza(nat, k) + 1]
  const textoKO = (d) => {
    if (d.estado) return es ? 'estado' : 'status'
    if (d.max <= 0) return es ? 'no le afecta' : 'no effect'
    if (d.golpesMax === 1) return es ? 'KO seguro' : 'sure KO'
    if (d.golpesMin === 1) return es ? 'puede KO' : 'may KO'
    if (d.golpesMin === d.golpesMax) return es ? `KO en ${d.golpesMax}` : `${d.golpesMax}HKO`
    if (d.golpesMin >= 99) return '—'
    return es ? `KO en ${d.golpesMin}–${d.golpesMax}` : `${d.golpesMin}–${d.golpesMax}HKO`
  }
  $: siguiente = listo ? datos.jefe.pokemon[suIdx + 1] || null : null
  const paso = (obj, k, d) => {
    obj[k] = Math.max(-6, Math.min(6, obj[k] + d))
    return obj
  }
  const reiniciar = () => {
    estadoTuyo = estadoSuyo = clima = ''
    mejoraTuya = { atq: 0, def: 0, vel: 0 }
    mejoraSuya = { atq: 0, def: 0, vel: 0 }
    psSuyo = 100
    const t = datos?.equipo[tuIdx]
    psTuyo = t?.psMax ? Math.round((t.ps / t.psMax) * 100) : 100
  }
  const elegirTuyo = (i) => {
    tuIdx = i
    const t = datos.equipo[i]
    psTuyo = t?.psMax ? Math.round((t.ps / t.psMax) * 100) : 100
    mejoraTuya = { atq: 0, def: 0, vel: 0 }
    estadoTuyo = ''
  }
  const elegirSuyo = (i) => {
    suIdx = i
    psSuyo = 100
    mejoraSuya = { atq: 0, def: 0, vel: 0 }
    estadoSuyo = ''
  }
</script>

<div class="lx-bt">
  {#if error}
    <p class="lx-bt-msg">{error}</p>
  {:else if !listo}
    <p class="lx-bt-msg">{es ? 'Preparando la calculadora…' : 'Setting up the calculator…'}</p>
  {:else}
    <div class="lx-bt-lado">
      <small>{es ? 'SU POKÉMON' : 'THEIR POKÉMON'}</small>
      <div class="lx-bt-fila">
        {#each datos.jefe.pokemon as b, i}
          <button class:lx-sel={i === suIdx} on:click={() => elegirSuyo(i)} title="{nombreBonito(b.name)} · Nv. {b.level}">
            <img src={sprite(b.name)} alt={b.name} />
          </button>
        {/each}
      </div>
    </div>
    <div class="lx-bt-lado">
      <small>{es ? 'EL TUYO' : 'YOURS'}</small>
      <div class="lx-bt-fila">
        {#each datos.equipo as y, i}
          <button class:lx-sel={i === tuIdx} on:click={() => elegirTuyo(i)} title={y.nombre}>
            <img src={sprite(y.especie || y.alias)} alt={y.nombre} />
          </button>
        {/each}
      </div>
    </div>

    {#if duelo?.fallo}
      <p class="lx-bt-msg">{es ? 'La calculadora no conoce a uno de los dos.' : 'The calculator does not know one of them.'}</p>
    {:else if duelo}
      <p class="lx-bt-veredicto" class:lx-bien={duelo.ganas} class:lx-mal={!duelo.ganas}>
        <b>{tu.nombre}</b> {es ? 'contra' : 'vs'} <b>{traducirNombre(nombreBonito(su.name))}</b> ({es ? 'Nv.' : 'Lv.'} {su.level}):
        {#if duelo.ganas}{es ? `ganas el 1 contra 1 (lo debilitas en ${duelo.yo}, aguantas ${duelo.el >= 99 ? '∞' : duelo.el})` : `you win the 1v1 (KO in ${duelo.yo}, you survive ${duelo.el >= 99 ? '∞' : duelo.el})`}
        {:else}{es ? `pierdes el 1 contra 1 (necesitas ${duelo.yo >= 99 ? '∞' : duelo.yo}, aguantas ${duelo.el})` : `you lose the 1v1 (need ${duelo.yo >= 99 ? '∞' : duelo.yo}, survive ${duelo.el})`}{/if}
      </p>
      {#if tu?.lugar}
        <button class="lx-bt-caido" class:lx-confirmar={confirmarCaido === tu.lugar} on:click={caido}>
          {confirmarCaido === tu.lugar ? (es ? `¿Seguro? ☠ ${tu.nombre}` : `Sure? ☠ ${tu.nombre}`) : es ? `☠ Ha caído ${tu.nombre}` : `☠ ${tu.nombre} fainted`}
        </button>
      {/if}
      <p class="lx-bt-vel">
        {#if duelo.empate}{es ? `Misma velocidad (${duelo.velT}): empate a suertes` : `Speed tie (${duelo.velT})`}
        {:else if duelo.rapido}{es ? `Pegas tú primero (Vel. ${duelo.velT} contra ${duelo.velS})` : `You move first (Spe ${duelo.velT} vs ${duelo.velS})`}
        {:else}{es ? `Pega él primero (Vel. ${duelo.velS} contra ${duelo.velT})` : `They move first (Spe ${duelo.velS} vs ${duelo.velT})`}{/if}
      </p>

      {#if conStats && duelo.tuyo && duelo.suyo}
        <div class="lx-bt-stats">
          <span />
          <b class="lx-bt-quien">{tu.nombre} <small>{es ? 'Nv.' : 'Lv.'} {duelo.tuyo.nivel}</small></b>
          <b class="lx-bt-quien">{traducirNombre(nombreBonito(su.name))} <small>{es ? 'Nv.' : 'Lv.'} {duelo.suyo.nivel}</small></b>
          <span class="lx-bt-etq">{es ? 'Tipo' : 'Type'}</span>
          {#each [duelo.tuyo, duelo.suyo] as lado}
            <span class="lx-bt-tipos">
              {#each lado.tipos as tp}<em style="background:{COLOR_TIPO[String(tp).toLowerCase()] || '#888'}">{traducirNombre(tp)}</em>{/each}
            </span>
          {/each}
          {#each STATS as [k, e, n]}
            <span class="lx-bt-etq">{es ? e : n}</span>
            {#each [[duelo.tuyo, duelo.suyo], [duelo.suyo, duelo.tuyo]] as [lado, otro]}
              <span
                class="lx-bt-valor"
                class:lx-bt-mas={lado.stats[k] > otro.stats[k]}
                class:lx-bt-sube={efectoNaturaleza(lado.nat, k) > 0}
                class:lx-bt-baja={efectoNaturaleza(lado.nat, k) < 0}
                title={efectoNaturaleza(lado.nat, k) ? (efectoNaturaleza(lado.nat, k) > 0 ? (es ? 'La naturaleza la sube' : 'Raised by nature') : es ? 'La naturaleza la baja' : 'Lowered by nature') : ''}
              >{lado.stats[k] ?? '—'}{flecha(lado.nat, k)}</span>
            {/each}
          {/each}
        </div>
        <p class="lx-bt-nota">{es ? 'Estadísticas reales a su nivel: las tuyas con lo del .sav (o sin IVs ni EVs conocidos); las suyas con sus IVs y sin EVs.' : 'Actual stats at their level: yours from the .sav when linked; theirs with their IVs and no EVs.'}</p>
      {/if}

      <small class="lx-bt-tit">{es ? 'TUS ATAQUES' : 'YOUR MOVES'}</small>
      <ul class="lx-bt-movs">
        {#each duelo.mios as d}
          <li class:lx-mejor={d === duelo.mejorMio}>
            <span class="lx-bt-nom"><i style="background:{COLOR_TIPO[d.tipo]}" />{nombreMov(d.mov)}</span>
            <span class="lx-bt-pct">{d.estado ? '' : `${pct(d.min)}–${pct(d.max)}%`}</span>
            <em class:lx-ko={d.golpesMin === 1}>{textoKO(d)}</em>
          </li>
        {:else}
          <li class="lx-bt-vacio">{es ? 'Sin movimientos conocidos' : 'No known moves'}</li>
        {/each}
      </ul>
      <small class="lx-bt-tit">{es ? 'LOS SUYOS' : 'THEIR MOVES'}</small>
      <ul class="lx-bt-movs">
        {#each duelo.suyos as d}
          <li class:lx-peligro={d === duelo.peorSuyo}>
            <span class="lx-bt-nom"><i style="background:{COLOR_TIPO[d.tipo]}" />{nombreMov(d.mov)}</span>
            <span class="lx-bt-pct">{d.estado ? '' : `${pct(d.min)}–${pct(d.max)}%`}</span>
            <em class:lx-ko={d.golpesMin === 1}>{textoKO(d)}</em>
          </li>
        {:else}
          <li class="lx-bt-vacio">{es ? 'Sin movimientos conocidos' : 'No known moves'}</li>
        {/each}
      </ul>
      {#if siguiente}
        <p class="lx-bt-sig">
          {es ? 'Después saca' : 'Next up'}: <img src={sprite(siguiente.name)} alt="" /> <b>{traducirNombre(nombreBonito(siguiente.name))}</b> ({es ? 'Nv.' : 'Lv.'} {siguiente.level})
          <button on:click={() => elegirSuyo(suIdx + 1)}>{es ? 'Ver ▶' : 'Show ▶'}</button>
        </p>
      {/if}

      <details class="lx-bt-ajustes">
        <summary>{es ? 'Estados, clima, potenciadores y PS' : 'Status, weather, boosts and HP'}</summary>
        <div class="lx-bt-rejilla">
          <span>{es ? 'Tu estado' : 'Your status'}</span>
          <select bind:value={estadoTuyo}>{#each ESTADOS as [v, e, n]}<option value={v}>{es ? e : n}</option>{/each}</select>
          <span>{es ? 'Su estado' : 'Their status'}</span>
          <select bind:value={estadoSuyo}>{#each ESTADOS as [v, e, n]}<option value={v}>{es ? e : n}</option>{/each}</select>
          <span>{es ? 'Clima' : 'Weather'}</span>
          <select bind:value={clima}>{#each CLIMAS as [v, e, n]}<option value={v}>{es ? e : n}</option>{/each}</select>
          <span>{es ? 'Tus PS' : 'Your HP'} {psTuyo}%</span>
          <input type="range" min="1" max="100" bind:value={psTuyo} />
          <span>{es ? 'Sus PS' : 'Their HP'} {psSuyo}%</span>
          <input type="range" min="1" max="100" bind:value={psSuyo} />
        </div>
        {#each [[es ? 'Tú' : 'You', 'tuya'], [es ? 'Él' : 'Them', 'suya']] as [quien, lado]}
          <div class="lx-bt-mejoras">
            <span>{quien}</span>
            {#each [['atq', es ? 'Atq' : 'Atk'], ['def', 'Def'], ['vel', es ? 'Vel' : 'Spe']] as [k, nom]}
              <span class="lx-bt-paso">
                {nom}
                <button on:click={() => (lado === 'tuya' ? (mejoraTuya = paso(mejoraTuya, k, -1)) : (mejoraSuya = paso(mejoraSuya, k, -1)))}>−</button>
                <b>{(lado === 'tuya' ? mejoraTuya : mejoraSuya)[k] > 0 ? '+' : ''}{(lado === 'tuya' ? mejoraTuya : mejoraSuya)[k]}</b>
                <button on:click={() => (lado === 'tuya' ? (mejoraTuya = paso(mejoraTuya, k, 1)) : (mejoraSuya = paso(mejoraSuya, k, 1)))}>+</button>
              </span>
            {/each}
          </div>
        {/each}
        <button class="lx-bt-reset" on:click={reiniciar}>{es ? 'Quitar todo' : 'Reset'}</button>
      </details>
      {#if datos.equipo.some((y) => y.estimado)}
        <p class="lx-bt-nota">{es ? 'Sin .sav, tus movimientos son los que aprenden por nivel.' : 'Without a .sav, your moves are the level-up ones.'}</p>
      {/if}
    {/if}
  {/if}
</div>

<style>
  .lx-bt {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin-top: 6px;
    padding: 8px;
    background: #f4f6f8;
    border: 2px solid #1b1b1f;
    border-radius: 6px;
    font-size: 12px;
  }
  :global(.dark) .lx-bt {
    background: #1c2430;
    border-color: #8090a8;
    color: #e0e6ee;
  }
  .lx-bt-msg,
  .lx-bt-nota {
    color: #6b7280;
  }
  .lx-bt-lado small,
  .lx-bt-tit {
    font-size: 10px;
    letter-spacing: 0.05em;
    color: #6b7280;
  }
  .lx-bt-fila {
    display: flex;
    flex-wrap: wrap;
    gap: 2px;
  }
  .lx-bt-fila button {
    width: 40px;
    height: 40px;
    border: 2px solid transparent;
    border-radius: 6px;
    overflow: hidden;
  }
  .lx-bt-fila button.lx-sel {
    border-color: #dc0a2d;
    background: #fde8ec;
  }
  .lx-bt-fila img {
    width: 56px;
    max-width: none;
    margin: -8px;
    image-rendering: pixelated;
  }
  .lx-bt-veredicto {
    padding: 4px 6px;
    border-radius: 4px;
    line-height: 1.3;
  }
  .lx-bt-veredicto.lx-bien {
    background: #e0f4e4;
    color: #1d5c2c;
  }
  .lx-bt-veredicto.lx-mal {
    background: #fde8ec;
    color: #8b0a1e;
  }
  .lx-bt-caido {
    align-self: flex-start;
    padding: 1px 8px;
    border: 1px solid #9ca3af;
    border-radius: 4px;
    background: #fff;
    color: #8b0a1e;
  }
  .lx-bt-caido.lx-confirmar {
    background: #dc0a2d;
    border-color: #8b0a1e;
    color: #fff;
  }
  .lx-bt-vel {
    color: #374151;
  }
  :global(.dark) .lx-bt-vel {
    color: #c8d0dc;
  }
  .lx-bt-movs li {
    display: grid;
    grid-template-columns: 1fr auto 76px;
    align-items: center;
    gap: 6px;
    padding: 1px 4px;
    border-radius: 3px;
  }
  .lx-bt-movs li i {
    display: inline-block;
    width: 8px;
    height: 8px;
    margin-right: 4px;
    border-radius: 2px;
  }
  .lx-bt-nom {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .lx-bt-pct {
    font-variant-numeric: tabular-nums;
  }
  .lx-bt-movs em {
    font-style: normal;
    text-align: right;
    color: #6b7280;
  }
  .lx-bt-movs em.lx-ko {
    color: #dc0a2d;
    font-weight: 600;
  }
  .lx-bt-movs li.lx-mejor {
    background: #e0f4e4;
  }
  .lx-bt-movs li.lx-peligro {
    background: #fde8ec;
  }
  :global(.dark) .lx-bt-movs li.lx-mejor {
    background: #1f3a28;
  }
  :global(.dark) .lx-bt-movs li.lx-peligro {
    background: #3a1f26;
  }
  .lx-bt-vacio {
    color: #6b7280;
  }
  .lx-bt-sig {
    display: flex;
    align-items: center;
    gap: 4px;
    flex-wrap: wrap;
  }
  .lx-bt-sig img {
    width: 32px;
    height: 32px;
    image-rendering: pixelated;
  }
  .lx-bt-sig button,
  .lx-bt-reset,
  .lx-bt-paso button {
    padding: 0 6px;
    border: 1px solid #9ca3af;
    border-radius: 4px;
    background: #fff;
  }
  :global(.dark) .lx-bt-sig button,
  :global(.dark) .lx-bt-reset,
  :global(.dark) .lx-bt-paso button {
    background: #24303e;
    color: #e0e6ee;
  }
  .lx-bt-ajustes summary {
    cursor: pointer;
    color: #374151;
  }
  :global(.dark) .lx-bt-ajustes summary {
    color: #c8d0dc;
  }
  .lx-bt-rejilla {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 4px 8px;
    align-items: center;
    margin: 6px 0;
  }
  .lx-bt-rejilla select {
    padding: 1px 4px;
    border: 1px solid #9ca3af;
    border-radius: 4px;
    background: #fff;
    color: #1b1b1f;
  }
  .lx-bt-mejoras {
    display: grid;
    grid-template-columns: 28px repeat(3, auto);
    justify-content: start;
    align-items: center;
    gap: 4px 8px;
    margin-bottom: 4px;
  }
  .lx-bt-paso {
    white-space: nowrap;
  }
  .lx-bt-mejoras > span:first-child {
    width: 30px;
    color: #6b7280;
  }
  .lx-bt-paso b {
    display: inline-block;
    width: 18px;
    text-align: center;
    font-weight: 600;
  }
  .lx-bt-stats {
    display: grid;
    grid-template-columns: max-content minmax(0, 220px) minmax(0, 220px);
    gap: 2px 18px;
    margin: 8px 0 2px;
    padding: 8px 10px;
    border-radius: 8px;
    background: var(--lx-panel-2, rgba(0, 0, 0, 0.04));
    font-size: 0.92em;
  }
  .lx-bt-quien {
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .lx-bt-quien small {
    font-weight: normal;
    opacity: 0.7;
  }
  .lx-bt-etq {
    opacity: 0.7;
  }
  .lx-bt-tipos {
    display: flex;
    gap: 4px;
  }
  .lx-bt-tipos em {
    padding: 0 6px;
    border-radius: 4px;
    color: #fff;
    font-style: normal;
    font-size: 0.82em;
    text-shadow: 0 1px 0 rgba(0, 0, 0, 0.4);
  }
  .lx-bt-valor {
    font-variant-numeric: tabular-nums;
  }
  .lx-bt-mas {
    font-weight: 700;
  }
  .lx-bt-sube {
    color: #d03828;
  }
  .lx-bt-baja {
    color: #3060c8;
  }
  :global(html.dark) .lx-bt-sube {
    color: #f08070;
  }
  :global(html.dark) .lx-bt-baja {
    color: #80a8f8;
  }
  .lx-bt-nota {
    font-size: 0.75em;
    opacity: 0.65;
    margin-bottom: 6px;
  }
</style>
