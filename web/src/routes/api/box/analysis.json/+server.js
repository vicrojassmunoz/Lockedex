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
  const analysis = Object.entries(
    types.reduce((acc, it) => {
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
      ]
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
