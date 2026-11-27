// Qué estadística sube (×1,1) y cuál baja (×0,9) cada naturaleza. Las cinco neutras (hardy, docile,
// serious, bashful y quirky) no están: no tocan nada.
export const NATURALEZAS = {
  lonely: ['atk', 'def'], brave: ['atk', 'spe'], adamant: ['atk', 'spa'], naughty: ['atk', 'spd'],
  bold: ['def', 'atk'], relaxed: ['def', 'spe'], impish: ['def', 'spa'], lax: ['def', 'spd'],
  timid: ['spe', 'atk'], hasty: ['spe', 'def'], jolly: ['spe', 'spa'], naive: ['spe', 'spd'],
  modest: ['spa', 'atk'], mild: ['spa', 'def'], quiet: ['spa', 'spe'], rash: ['spa', 'spd'],
  calm: ['spd', 'atk'], gentle: ['spd', 'def'], sassy: ['spd', 'spe'], careful: ['spd', 'spa']
}

// 1 si la naturaleza sube esa estadística (hp, atk, def, spa, spd, spe), -1 si la baja y 0 si no la toca
export const efectoNaturaleza = (naturaleza, k) => {
  const [sube, baja] = NATURALEZAS[String(naturaleza || '').toLowerCase().trim()] || []
  return k === sube ? 1 : k === baja ? -1 : 0
}

// «▲ Vel. ▼ Def. Esp.» para ponerlo junto al nombre de la naturaleza ('' si es neutra)
const CORTOS = { hp: ['PS', 'HP'], atk: ['Atq.', 'Atk'], def: ['Def.', 'Def'], spa: ['At. Esp.', 'SpA'], spd: ['Def. Esp.', 'SpD'], spe: ['Vel.', 'Spe'] }
export const resumenNaturaleza = (naturaleza, es = true) => {
  const [sube, baja] = NATURALEZAS[String(naturaleza || '').toLowerCase().trim()] || []
  if (!sube) return ''
  const n = (k) => CORTOS[k][es ? 0 : 1]
  return `▲ ${n(sube)} ▼ ${n(baja)}`
}
