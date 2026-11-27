// Azar con semilla: la misma semilla y los mismos ajustes dan siempre la misma ROM (sfc32)
const hash = (texto) => {
  let h1 = 1779033703 ^ texto.length
  for (let i = 0; i < texto.length; i++) {
    h1 = Math.imul(h1 ^ texto.charCodeAt(i), 3432918353)
    h1 = (h1 << 13) | (h1 >>> 19)
  }
  return () => {
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507)
    h1 = Math.imul(h1 ^ (h1 >>> 13), 3266489909)
    return (h1 ^= h1 >>> 16) >>> 0
  }
}

export const crearAzar = (semilla) => {
  const h = hash(String(semilla))
  let a = h(), b = h(), c = h(), d = h()
  const siguiente = () => {
    a >>>= 0; b >>>= 0; c >>>= 0; d >>>= 0
    let t = (a + b) | 0
    a = b ^ (b >>> 9)
    b = (c + (c << 3)) | 0
    c = (c << 21) | (c >>> 11)
    d = (d + 1) | 0
    t = (t + d) | 0
    c = (c + t) | 0
    return (t >>> 0) / 4294967296
  }
  for (let i = 0; i < 15; i++) siguiente()
  const azar = {
    real: siguiente,
    entero: (n) => Math.floor(siguiente() * n), // 0..n-1
    elegir: (lista) => lista[Math.floor(siguiente() * lista.length)],
    barajar: (lista) => {
      const a2 = [...lista]
      for (let i = a2.length - 1; i > 0; i--) {
        const j = Math.floor(siguiente() * (i + 1))
        ;[a2[i], a2[j]] = [a2[j], a2[i]]
      }
      return a2
    },
    prob: (p) => siguiente() < p
  }
  return azar
}

export const semillaNueva = () => {
  const letras = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const a = new Uint32Array(8)
  crypto.getRandomValues(a)
  return [...a].map((x) => letras[x % letras.length]).join('')
}
