import { createState, step } from '@movebox/main'
import { solve } from '../src/index.js'

test('finds a playable solution and returns no solution within the limit', () => {
  const state = createState(['######', '#&-@+#', '######'])
  const path = solve(state)
  expect(path.reduce((current, direction) => step(current, direction), state).won).toBe(true)
  expect(solve(state, 1)).toBeNull()
  expect(solve(path.reduce((current, direction) => step(current, direction), state))).toEqual([])
  expect(() => solve(state, 0)).toThrow()
})
