import { createGame, createState, levels, step } from '../src/index.js'

const board = ['#####', '#&@+#', '#####']

test('preserves the original levels and reports malformed boards', () => {
  expect(levels).toHaveLength(105)
  const invalid = levels.map((rows, index) => {
    try { createState(rows); return null } catch (error) { return index + 1 }
  }).filter(Boolean)
  expect(invalid).toEqual([52, 72])
  expect(createState(['####', '#&+#', '#@#', '####']).width).toBe(4)
  expect(() => createState(['#?&+#'])).toThrow('Casa desconhecida')
  expect(() => createState(['&&@+'])).toThrow('mais de um jogador')
})

test('moves, pushes, wins, undoes and restarts while notifying listeners', () => {
  const game = createGame(board)
  const events = []
  const unsubscribe = game.subscribe((event, state) => events.push([event, state.moves]))
  expect(game.move('up')).toBe(false)
  expect(game.move('right')).toBe(true)
  expect(game.getState()).toMatchObject({ player: '2,1', boxes: ['3,1'], moves: 1, pushes: 1, won: true })
  expect(game.move('left')).toBe(false)
  expect(game.undo()).toBe(true)
  expect(game.getState()).toMatchObject({ player: '1,1', moves: 0, pushes: 0, won: false })
  expect(game.undo()).toBe(false)
  game.restart()
  unsubscribe()
  game.move('right')
  expect(events).toEqual([['win', 1], ['undo', 0], ['restart', 0]])
})

test('blocks pushing into walls or another box and moves without pushing', () => {
  const state = createState(['#######', '#&-@@+#', '#######'])
  const moved = step(state, 'right')
  expect(moved).toMatchObject({ moves: 1, pushes: 0, player: '2,1' })
  expect(step(moved, 'right')).toBeNull()
  expect(() => step(state, 'diagonal')).toThrow('Direção inválida')
  const game = createGame(board)
  game.getState().boxes.push('1,1')
  expect(game.getState().boxes).toEqual(['2,1'])
})
