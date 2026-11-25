<script>
  // Lápida pixel art propia de Lockedex, dibujada en una rejilla de 48×64 con rectángulos nítidos.
  // `variante` elige la forma (0–3) y `semilla` varía musgo, grietas y una ligera inclinación.
  export let variante = 0
  export let semilla = 0

  const ANCHO = 48
  const SUELO = 57

  // Silueta por filas: devuelve [x0, x1) para cada fila de la piedra
  const siluetas = [
    // 0: arco clásico
    () => {
      const filas = []
      const r = 17, cx = 24, arriba = 4
      for (let y = arriba; y < SUELO; y++) {
        const dy = y - arriba + 0.5
        const medio = dy < r ? Math.round(Math.sqrt(r * r - (r - dy) * (r - dy))) : r
        filas.push([y, cx - medio, cx + medio])
      }
      return filas
    },
    // 1: gótica, acabada en punta
    () => {
      const filas = []
      const cx = 24, arriba = 2, alto = 22, r = 16
      for (let y = arriba; y < SUELO; y++) {
        const dy = y - arriba + 0.5
        const medio = dy < alto ? Math.max(1, Math.round(r * Math.pow(dy / alto, 0.62))) : r
        filas.push([y, cx - medio, cx + medio])
      }
      return filas
    },
    // 2: losa con remate más ancho
    () => {
      const filas = []
      for (let y = 6; y < SUELO; y++) {
        if (y < 8) filas.push([y, 8, 40])
        else if (y < 12) filas.push([y, 6, 42])
        else filas.push([y, 9, 39])
      }
      return filas
    },
    // 3: piedra baja y redondeada
    () => {
      const filas = []
      const arriba = 12, esquina = 7
      for (let y = arriba; y < SUELO; y++) {
        const dy = y - arriba + 0.5
        const recorte = dy < esquina ? Math.round(esquina - Math.sqrt(esquina * esquina - (esquina - dy) * (esquina - dy))) : 0
        filas.push([y, 5 + recorte, 43 - recorte])
      }
      return filas
    }
  ]

  // Pseudoaleatorio estable a partir de la semilla
  const aleatorio = (n) => {
    let x = Math.sin((semilla + 1) * 9301 + n * 49297) * 233280
    return x - Math.floor(x)
  }

  const rect = (x, y, w, h = 1) => (w > 0 ? `M${x} ${y}h${w}v${h}h${-w}z` : '')

  $: forma = siluetas[((variante % 4) + 4) % 4]()
  $: arriba = forma[0][0]
  $: contorno =
    forma.map(([y, a, b]) => rect(a - 1, y, b - a + 2)).join('') +
    rect(forma[0][1], arriba - 1, forma[0][2] - forma[0][1]) +
    // escalones del borde superior (para que el contorno sea continuo en las curvas)
    forma
      .slice(1)
      .map(([y, a, b], i) => {
        const [, pa, pb] = forma[i]
        return rect(a - 1, y - 1, Math.max(0, pa - a + 1)) + rect(pb, y - 1, Math.max(0, b - pb + 1))
      })
      .join('')
  $: relleno = forma.map(([y, a, b]) => rect(a, y, b - a)).join('')
  $: luz = forma.map(([y, a, b]) => rect(a, y, Math.min(2, b - a))).join('') + rect(forma[0][1], arriba, forma[0][2] - forma[0][1])
  $: sombra = forma.map(([y, a, b]) => rect(Math.max(a, b - 3), y, Math.min(3, b - a))).join('') +
    forma.slice(-3).map(([y, a, b]) => rect(a, y, b - a)).join('')
  // Hendidura decorativa: una línea grabada bajo el remate
  $: grabado = (() => {
    const fila = forma.find(([y]) => y === arriba + (variante % 4 === 2 ? 9 : 10))
    if (!fila) return ''
    const [y, a, b] = fila
    return rect(a + 5, y, b - a - 10) + rect(a + 5, y + 1, 1) + rect(b - 6, y + 1, 1)
  })()
  // Musgo y grietas
  $: musgo = Array.from({ length: 7 }, (_, i) => {
    const fila = forma[forma.length - 4 - Math.floor(aleatorio(i) * 9)]
    if (!fila) return ''
    const [y, a, b] = fila
    const lado = aleatorio(i + 20) < 0.5 ? a : b - 3
    return rect(lado + Math.floor(aleatorio(i + 40) * 3), y, 1 + Math.floor(aleatorio(i + 60) * 3))
  }).join('')
  $: grieta = (() => {
    if (aleatorio(99) < 0.35) return ''
    const fila = forma[Math.floor(forma.length * (0.25 + aleatorio(7) * 0.2))]
    if (!fila) return ''
    let [y, a, b] = fila
    let x = aleatorio(8) < 0.5 ? a + 2 : b - 6
    let d = ''
    for (let i = 0; i < 6; i++) {
      d += rect(x, y + i, 1)
      x += aleatorio(30 + i) < 0.5 ? 1 : 0
    }
    return d
  })()
  // Montículo de hierba
  $: hierba = [
    [SUELO - 1, 7, 41],
    [SUELO, 4, 44],
    [SUELO + 1, 2, 46],
    [SUELO + 2, 1, 47],
    [SUELO + 3, 1, 47],
    [SUELO + 4, 2, 46]
  ]
  $: hierbaRelleno = hierba.map(([y, a, b]) => rect(a, y, b - a)).join('')
  $: hierbaOscura = hierba.slice(3).map(([y, a, b]) => rect(a, y, b - a)).join('')
  $: hierbaBrotes = Array.from({ length: 9 }, (_, i) => {
    const x = 3 + Math.floor(aleatorio(i + 80) * 42)
    const alto = 1 + Math.floor(aleatorio(i + 90) * 2)
    return rect(x, SUELO - 1 - alto, 1, alto + 1)
  }).join('')
  $: inclinacion = (aleatorio(5) - 0.5) * 4
  $: espejo = aleatorio(6) < 0.5
</script>

<svg
  class="lx-lapida"
  viewBox="0 0 {ANCHO} 64"
  shape-rendering="crispEdges"
  aria-hidden="true"
  style="transform: rotate({inclinacion}deg) scaleX({espejo ? -1 : 1})"
>
  <path d={hierbaRelleno} class="lx-l-hierba" />
  <path d={hierbaOscura} class="lx-l-hierba-oscura" />
  <path d={contorno} class="lx-l-contorno" />
  <path d={relleno} class="lx-l-piedra" />
  <path d={luz} class="lx-l-luz" />
  <path d={sombra} class="lx-l-sombra" />
  <path d={grabado} class="lx-l-grabado" />
  <path d={grieta} class="lx-l-grabado" />
  <path d={musgo} class="lx-l-musgo" />
  <path d={hierbaBrotes} class="lx-l-hierba" />
</svg>

<style>
  .lx-lapida {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    image-rendering: pixelated;
    filter: drop-shadow(3px 4px 0 rgba(0, 0, 0, 0.3));
  }
  .lx-l-contorno {
    fill: #23262b;
  }
  .lx-l-piedra {
    fill: #7f858e;
  }
  .lx-l-luz {
    fill: #a2a8b1;
  }
  .lx-l-sombra {
    fill: #61666e;
  }
  .lx-l-grabado {
    fill: #4b4f56;
  }
  .lx-l-musgo {
    fill: #5c8a4a;
  }
  .lx-l-hierba {
    fill: #4f9a4a;
  }
  .lx-l-hierba-oscura {
    fill: #357238;
  }
  :global(html.dark) .lx-l-piedra {
    fill: #6c727b;
  }
  :global(html.dark) .lx-l-luz {
    fill: #8a9099;
  }
  :global(html.dark) .lx-l-sombra {
    fill: #50555c;
  }
  :global(html.dark) .lx-l-hierba {
    fill: #3d7a3a;
  }
  :global(html.dark) .lx-l-hierba-oscura {
    fill: #285a2a;
  }
</style>
