import React, { useCallback, useEffect, useRef, useState } from 'react'
import { createGame, createState, levels } from '@movebox/main'

const storageKey = 'movebox.records.v2'
const legacyStorageKey = 'movebox.records.v1'
const availability = levels.map(rows => {
  try {
    createState(rows)
    return null
  } catch (error) {
    return error.message
  }
})
const playable = availability.filter(error => !error).length
const formatTime = seconds => `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`

function readRecords () {
  try {
    const current = window.localStorage.getItem(storageKey)
    const legacy = current === null ? window.localStorage.getItem(legacyStorageKey) : null
    const stored = current ?? legacy
    if (stored === null) return { records: {}, error: '' }
    const data = JSON.parse(stored)
    const migrating = current === null && legacy !== null
    if (!data || typeof data !== 'object' || Array.isArray(data) ||
      Object.entries(data).some(([level, value]) => !/^(0|[1-9]\d*)$/.test(level) ||
        Number(level) >= levels.length + (migrating ? 1 : 0) || !value || !Number.isInteger(value.wins) || value.wins < 1 ||
        !Number.isInteger(value.bestTime) || value.bestTime < 0 ||
        !Number.isInteger(value.bestMoves) || value.bestMoves < 0)) {
      throw new Error('Dados de estatísticas inválidos.')
    }
    if (migrating && Object.hasOwn(data, '71')) {
      throw new Error('Existe um recorde para a antiga fase 72, que estava vazia. Os dados originais foram preservados.')
    }
    const records = migrating
      ? Object.fromEntries(Object.entries(data).map(([level, value]) => [Number(level) > 71 ? Number(level) - 1 : Number(level), value]))
      : data
    return { records, error: '', migrating }
  } catch (error) {
    return { records: {}, error: `Não foi possível carregar as estatísticas: ${error.message}` }
  }
}

export default function App () {
  const [stored] = useState(readRecords)
  const [records, setRecords] = useState(stored.records)
  const [error, setError] = useState(stored.error)
  const [screen, setScreen] = useState('menu')
  const [level, setLevel] = useState(() => {
    const next = availability.findIndex((error, index) => !error && !stored.records[index])
    return next === -1 ? 0 : next
  })
  const [game, setGame] = useState(null)
  const [state, setState] = useState(null)
  const [seconds, setSeconds] = useState(0)
  const [page, setPage] = useState(0)
  const startTime = useRef(null)
  const saved = useRef(false)
  const completed = Object.keys(records).filter(index => !availability[Number(index)]).length

  useEffect(() => {
    if (!stored.migrating) return
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(stored.records))
    } catch (error) {
      setError(`Não foi possível migrar as estatísticas: ${error.message}`)
    }
  }, [stored])

  function start (index) {
    if (availability[index]) return
    const nextGame = createGame(levels[index])
    setLevel(index)
    setGame(nextGame)
    setState(nextGame.getState())
    setSeconds(0)
    startTime.current = null
    saved.current = false
    setScreen('game')
  }

  const move = useCallback(direction => {
    if (!game || !game.move(direction)) return
    if (startTime.current === null) startTime.current = Date.now()
    const next = game.getState()
    setState(next)
    if (next.won && !saved.current) {
      saved.current = true
      const time = Math.floor((Date.now() - startTime.current) / 1000)
      setSeconds(time)
      const previous = records[level]
      const updated = {
        ...records,
        [level]: {
          wins: (previous?.wins || 0) + 1,
          bestTime: Math.min(previous?.bestTime ?? time, time),
          bestMoves: Math.min(previous?.bestMoves ?? next.moves, next.moves)
        }
      }
      setRecords(updated)
      try {
        if (stored.error) throw new Error('Os dados existentes não puderam ser carregados e foram preservados.')
        window.localStorage.setItem(storageKey, JSON.stringify(updated))
        setError('')
      } catch (error) {
        setError(`Não foi possível salvar as estatísticas: ${error.message}`)
      }
    }
  }, [game, level, records, stored.error])

  useEffect(() => {
    if (screen !== 'game' || !state || state.won) return
    const timer = setInterval(() => {
      if (startTime.current !== null) setSeconds(Math.floor((Date.now() - startTime.current) / 1000))
    }, 250)
    return () => clearInterval(timer)
  }, [screen, state])

  useEffect(() => {
    if (screen !== 'game') return
    const keys = { ArrowUp: 'up', w: 'up', ArrowDown: 'down', s: 'down', ArrowLeft: 'left', a: 'left', ArrowRight: 'right', d: 'right' }
    function onKey (event) {
      if (event.ctrlKey && event.key.toLowerCase() === 'z') {
        event.preventDefault()
        if (game.undo()) setState(game.getState())
        return
      }
      const direction = keys[event.key] || keys[event.key.toLowerCase()]
      if (direction && !event.ctrlKey && !event.metaKey && !event.altKey) {
        event.preventDefault()
        move(direction)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [game, move, screen])

  const nextLevel = availability.findIndex((error, index) => index > level && !error)

  return (
    <main className={screen === 'game' ? 'app game-view' : 'app'}>
      {error && <div className='notice' role='alert'>{error}</div>}
      {screen === 'menu' && (
        <section className='card menu'>
          <div className='brand'><img src='/logo.svg' alt='Movebox' width='220' height='48' fetchPriority='high' /></div>
          <p className='eyebrow centered'>CLÁSSICO SOKOBAN</p>
          <div className='progress-label'><span>Fases concluídas</span><strong>{completed} / {playable}</strong></div>
          <div className='progress'><span style={{ width: `${completed / playable * 100}%` }} /></div>
          <button className='primary full' onClick={() => start(level)}>▶ &nbsp; JOGAR AGORA</button>
          <div className='menu-grid'>
            <button onClick={() => setScreen('levels')}><strong>FASES</strong><small>{levels.length} níveis</small></button>
            <button onClick={() => setScreen('stats')}><strong>ESTATÍSTICAS</strong><small>&amp; Recordes</small></button>
          </div>
          <p className='help'>Use as setas ou WASD para mover. Empurre as caixas até os objetivos.</p>
        </section>
      )}
      {screen === 'levels' && (
        <section className='card panel'>
          <button className='back' onClick={() => setScreen('menu')}>← MENU</button>
          <p className='eyebrow'>ESCOLHA SEU DESAFIO</p>
          <h1>Seleção de fases</h1>
          <p className='muted'>{completed} de {playable} fases concluídas</p>
          <div className='level-grid'>
            {levels.slice(page * 35, page * 35 + 35).map((rows, offset) => {
              const index = page * 35 + offset
              return <button key={index} disabled={!!availability[index]} title={availability[index] || `Jogar fase ${index + 1}`} className={records[index] ? 'completed' : ''} onClick={() => start(index)}>{index + 1}{records[index] && <span>✓</span>}</button>
            })}
          </div>
          <div className='pagination'><button disabled={page === 0} onClick={() => setPage(page - 1)}>← Anterior</button><span>{page + 1} / {Math.ceil(levels.length / 35)}</span><button disabled={(page + 1) * 35 >= levels.length} onClick={() => setPage(page + 1)}>Próxima →</button></div>
          {playable < levels.length && <p className='help'>Algumas fases estão indisponíveis devido a dados inválidos.</p>}
        </section>
      )}
      {screen === 'stats' && (
        <section className='card panel'>
          <button className='back' onClick={() => setScreen('menu')}>← MENU</button>
          <p className='eyebrow'>SEU PROGRESSO</p>
          <h1>Estatísticas</h1>
          <div className='stats-grid'><div><strong>{completed}</strong><small>FASES CONCLUÍDAS</small></div><div><strong>{Object.values(records).reduce((sum, record) => sum + record.wins, 0)}</strong><small>VITÓRIAS</small></div></div>
          <h2>Seus recordes</h2>
          {completed === 0
            ? <p className='muted'>Conclua uma fase para registrar seus recordes.</p>
            : (
              <div className='records'>{Object.entries(records).sort(([a], [b]) => Number(a) - Number(b)).map(([index, record]) => <div key={index}><strong>Fase {Number(index) + 1}</strong><span>{record.bestMoves} movimentos</span><span>{formatTime(record.bestTime)}</span></div>)}</div>
              )}
          <p className='help'>Os dados ficam apenas neste navegador.</p>
        </section>
      )}
      {screen === 'game' && state && (
        <>
          <header className='game-header'>
            <button onClick={() => setScreen('menu')}>← MENU</button>
            <div><small>FASE</small><strong>{level + 1} / {levels.length}</strong></div>
            <div><small>MOVIMENTOS</small><strong>{state.moves}</strong></div>
            <div><small>EMPURRÕES</small><strong>{state.pushes}</strong></div>
            <div><small>TEMPO</small><strong>{formatTime(seconds)}</strong></div>
            <button aria-label='Desfazer' onClick={() => { if (game.undo()) setState(game.getState()) }}>↶ <span>DESFAZER</span></button>
            <button aria-label='Reiniciar' onClick={() => start(level)}>↻ <span>REINICIAR</span></button>
          </header>
          <section className='game-content'>
            {state.won && <div className='victory' role='status'><strong>FASE CONCLUÍDA!</strong><span>Excelente trabalho.</span>{nextLevel !== -1 && <button className='primary' onClick={() => start(nextLevel)}>PRÓXIMA FASE →</button>}<button onClick={() => setScreen('levels')}>ESCOLHER FASE</button></div>}
            <div className='board-wrap'>
              <div className='board' role='img' aria-label={`Fase ${level + 1}: ${state.moves} movimentos e ${state.pushes} empurrões`} style={{ '--columns': state.width, '--rows': state.height }}>
                {Array.from({ length: state.height }, (_, y) => Array.from({ length: state.width }, (_, x) => {
                  const position = `${x},${y}`
                  const tile = levels[level][y][x]
                  const floor = state.floor.includes(position)
                  const target = state.targets.includes(position)
                  const box = state.boxes.includes(position)
                  const player = state.player === position
                  return <div key={position} className={`tile ${floor ? 'floor' : tile === '#' ? 'wall' : 'empty'} ${target ? 'target' : ''} ${box ? 'box' : ''} ${box && target ? 'placed' : ''} ${player ? 'player' : ''}`}>{box ? '▧' : player ? '●' : target ? '•' : ''}</div>
                }))}
              </div>
            </div>
            <div className='controls' aria-label='Controles de movimento'>
              <button className='up' aria-label='Mover para cima' onClick={() => move('up')}>↑</button>
              <button className='left' aria-label='Mover para a esquerda' onClick={() => move('left')}>←</button>
              <button className='down' aria-label='Mover para baixo' onClick={() => move('down')}>↓</button>
              <button className='right' aria-label='Mover para a direita' onClick={() => move('right')}>→</button>
            </div>
            <p className='help centered'>SETAS / WASD para mover &nbsp;·&nbsp; CTRL + Z para desfazer</p>
          </section>
        </>
      )}
      <footer className='app-footer'><a href='https://lppjunior.com/'>lppjunior.com</a> · Movebox</footer>
    </main>
  )
}
