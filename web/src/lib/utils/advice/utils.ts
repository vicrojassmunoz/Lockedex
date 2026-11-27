import { claseVista } from '$lib/lockedex/genVista.js'
interface IMove {
  damage_class: 'status' | 'physical' | 'special'
  type: string
}

export const moveToType = (move: IMove, prop: string = 'type') => {
  if (move.damage_class === 'status') return
  return move[prop].toLowerCase()
}

export const movesToTypes = (moves: IMove[]) =>
  moves.map((m) => moveToType(m)).filter((i) => i)

// Lockedex: hasta la 3.ª gen físico o especial lo decide el tipo (claseVista)
export const movesToCategory = (moves: IMove[]) =>
  moves
    .filter((m) => m.damage_class !== 'status')
    .map((m) => claseVista(m.damage_class, m.type))
    .filter((i) => i)
