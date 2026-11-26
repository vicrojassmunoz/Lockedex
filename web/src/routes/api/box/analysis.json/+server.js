import { canonTypes as types } from '$lib/data/types'

import { efectividad } from '$lib/lockedex/tiposHabilidad.js'
import { typeAdvantages } from '$utils/advice/types'

/**
 * Calculates the box coverage for types
 * for suggestions of what types to catch
 */

export async function POST({ request }) {
  // cada Pokémon puede traer sus habilidades posibles («habilidades») y la generación del juego («gen»):
  // Gengar con Levitación no cuenta como débil a Tierra
  const { box, gen = 9 } = await request.json()
  // solo los tipos que existen en la generación del juego (sin Hada antes de la 6.ª, sin Siniestro ni Acero en la 1.ª)
  const tiposGen = types.filter((x) => !(gen < 6 && x === 'fairy') && !(gen < 2 && ['dark', 'steel'].includes(x)))
  const analysis = Object.entries(
    tiposGen.reduce((acc, it) => {
      const dmg = box.map(({ types, habilidades }) => efectividad(it, types, habilidades, gen))
      const minDmg = dmg.reduce((acc, it) => {
        const id = it < 1 ? 'resist' : it > 1 ? 'weak' : 'neutral'
        return {
          ...acc,
          [id]: (+acc[id] || 0) + 1
        }
      }, {})

      return { ...acc, [it]: minDmg }
    }, {})
  )

  const suggestMap = analysis
    .filter(([, { resist }]) => !resist)
    .map(([type]) => {
      return [
        ...(typeAdvantages[type]['0.5'] || []),
        ...(typeAdvantages[type]['0'] || [])
      ].filter((x) => tiposGen.includes(x))
    })
    .flat()
    .reduce(
      (acc, it) => ({
        ...acc,
        [it]: (acc[it] || 0) + 1
      }),
      {}
    )

  const suggestions = Object.entries(suggestMap)
    .sort(([, a], [, b]) => b - a)
    .map(([t]) => t)

  return new Response(JSON.stringify({ analysis, suggestions }))
}
