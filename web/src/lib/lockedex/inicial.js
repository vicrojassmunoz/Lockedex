// Tipo del inicial (planta, fuego o agua) a partir del Pokémon apuntado en «Inicial».
// De él depende el equipo del rival: si coges a Bulbasaur, el rival lleva a Charmander.
import { fetchData } from '$utils/fetchers'

const LINEAS = {
  grass: 'bulbasaur ivysaur venusaur chikorita bayleef meganium treecko grovyle sceptile turtwig grotle torterra snivy servine serperior chespin quilladin chesnaught rowlet dartrix decidueye grookey thwackey rillaboom sprigatito floragato meowscarada',
  fire: 'charmander charmeleon charizard cyndaquil quilava typhlosion torchic combusken blaziken chimchar monferno infernape tepig pignite emboar fennekin braixen delphox litten torracat incineroar scorbunny raboot cinderace fuecoco crocalor skeledirge',
  water: 'squirtle wartortle blastoise totodile croconaw feraligatr mudkip marshtomp swampert piplup prinplup empoleon oshawott dewott samurott froakie frogadier greninja popplio brionne primarina sobble drizzile inteleon quaxly quaxwell quaquaval'
}
const TIPO = {}
for (const [tipo, lista] of Object.entries(LINEAS)) for (const e of lista.split(' ')) TIPO[e] = tipo

// ROM hacks con iniciales propios: cada Pokémon ocupa la casilla de uno de los tres tipos
// (igual que en lib/components/starter-type.svelte)
const HACKS = {
  unbound: { gible: 'fire', beldum: 'water', larvitar: 'grass' },
  blazingem: { clefairy: 'fire', eevee: 'water', pikachu: 'grass' },
  newgen: { rattata: 'grass', sentret: 'fire', zigzagoon: 'water' }
}

const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '')

export const tipoInicial = async (especie, juego = '') => {
  if (!especie) return null
  const base = String(especie).toLowerCase()
  const hack = Object.keys(HACKS).find((h) => String(juego).startsWith(h))
  if (hack) {
    const linea = Object.entries(HACKS[hack]).find(([e]) => base.startsWith(e))
    return linea ? linea[1] : null
  }
  if (TIPO[base]) return TIPO[base]
  if (TIPO[base.split('-')[0]]) return TIPO[base.split('-')[0]]
  // ROM hacks con otros iniciales: se mira el tipo en la Pokédex del juego
  try {
    const datos = await fetchData()
    const p = datos?.aliasMap?.[norm(base)] || Object.values(datos?.aliasMap || {}).find((x) => norm(x.alias) === norm(base))
    const tipos = (p?.types || []).map((t) => String(t).toLowerCase())
    return ['grass', 'fire', 'water'].find((t) => tipos.includes(t)) || null
  } catch {
    return null
  }
}
