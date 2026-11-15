export { levels } from './levels.js'

export const directions = {
  up: [0, -1],
  down: [0, 1],
  left: [-1, 0],
  right: [1, 0]
}

const key = (x, y) => `${x},${y}`

export function createState (rows) {
  if (!Array.isArray(rows) || rows.length === 0 || rows.some(row => typeof row !== 'string')) {
    throw new Error('Fase sem tabuleiro válido.')
  }
  const width = Math.max(...rows.map(row => row.length))
  const floor = []
  const targets = []
  const boxes = []
  let player = null
  for (let y = 0; y < rows.length; y++) {
    for (let x = 0; x < width; x++) {
      const tile = rows[y][x] || '_'
      if (!'_#-+x@&'.includes(tile)) throw new Error(`Casa desconhecida: ${tile}`)
      const position = key(x, y)
      if ('-+x@&'.includes(tile)) floor.push(position)
      if ('+x'.includes(tile)) targets.push(position)
      if ('@x'.includes(tile)) boxes.push(position)
      if (tile === '&') {
        if (player !== null) throw new Error('Fase com mais de um jogador.')
        player = position
      }
    }
  }
  if (!player || targets.length === 0 || boxes.length < targets.length) {
    throw new Error('Fase sem jogador ou sem caixas suficientes para os objetivos.')
  }
  return { width, height: rows.length, floor, targets, boxes, player, moves: 0, pushes: 0, won: targets.every(target => boxes.includes(target)) }
}

export function step (state, direction) {
  const delta = directions[direction]
  if (!delta) throw new Error(`Direção inválida: ${direction}`)
  if (state.won) return null
  const [x, y] = state.player.split(',').map(Number)
  const next = key(x + delta[0], y + delta[1])
  if (!state.floor.includes(next)) return null
  const boxIndex = state.boxes.indexOf(next)
  let boxes = state.boxes
  if (boxIndex !== -1) {
    const destination = key(x + 2 * delta[0], y + 2 * delta[1])
    if (!state.floor.includes(destination) || boxes.includes(destination)) return null
    boxes = [...boxes]
    boxes[boxIndex] = destination
  }
  return {
    ...state,
    boxes,
    player: next,
    moves: state.moves + 1,
    pushes: state.pushes + (boxIndex === -1 ? 0 : 1),
    won: state.targets.every(target => boxes.includes(target))
  }
}

function copy (state) {
  return { ...state, floor: [...state.floor], targets: [...state.targets], boxes: [...state.boxes] }
}

export function createGame (rows) {
  let state = createState(rows)
  let history = []
  const listeners = new Set()
  function notify (event) {
    for (const listener of listeners) listener(event, copy(state))
  }
  return {
    getState: () => copy(state),
    subscribe (listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    move (direction) {
      const next = step(state, direction)
      if (!next) return false
      history.push(state)
      state = next
      notify(state.won ? 'win' : 'move')
      return true
    },
    undo () {
      if (!history.length) return false
      state = history.pop()
      notify('undo')
      return true
    },
    restart () {
      state = createState(rows)
      history = []
      notify('restart')
    }
  }
}
