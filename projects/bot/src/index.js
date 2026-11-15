import { directions, step } from '@movebox/main'

// Bound the search so large or unsolvable boards do not run indefinitely.
export function solve (initialState, maxStates = 10000) {
  if (!Number.isInteger(maxStates) || maxStates < 1) throw new Error('O limite de estados deve ser um inteiro positivo.')
  if (initialState.won) return []
  const signature = state => `${state.player}|${[...state.boxes].sort().join(';')}`
  const seen = new Set([signature(initialState)])
  const queue = [{ state: initialState, path: [] }]
  for (let index = 0; index < queue.length; index++) {
    const { state, path } = queue[index]
    for (const direction of Object.keys(directions)) {
      const next = step(state, direction)
      if (!next) continue
      const nextPath = [...path, direction]
      if (next.won) return nextPath
      const id = signature(next)
      if (!seen.has(id)) {
        if (seen.size >= maxStates) return null
        seen.add(id)
        queue.push({ state: next, path: nextPath })
      }
    }
  }
  return null
}
