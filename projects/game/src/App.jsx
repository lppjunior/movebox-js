import React, { useCallback, useEffect, useRef, useState } from 'react'
import { createGame, createState, levels } from '@movebox/main'
import {
  LANGUAGES,
  LANGUAGE_NAMES,
  HTML_LANG,
  LANGUAGE_PATHS,
  RTL_LANGUAGES,
  MESSAGES,
  languageFromPath,
  storeLanguage
} from './i18n.mjs'

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

function readRecords (t) {
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
      throw new Error(t.errInvalid)
    }
    if (migrating && Object.hasOwn(data, '71')) {
      throw new Error(t.errLegacy)
    }
    const records = migrating
      ? Object.fromEntries(Object.entries(data).map(([level, value]) => [Number(level) > 71 ? Number(level) - 1 : Number(level), value]))
      : data
    return { records, error: '', migrating }
  } catch (error) {
    return { records: {}, error: t.loadFail(error.message) }
  }
}

function LanguageSwitcher ({ lang, onChange, t }) {
  return (
    <select
      aria-label={t.language}
      className='language-switcher'
      onChange={event => onChange(event.target.value)}
      value={lang}
    >
      {LANGUAGES.map(code => (
        <option key={code} lang={code} value={code}>
          {LANGUAGE_NAMES[code]}
        </option>
      ))}
    </select>
  )
}

function App ({ lang, onLanguageChange, t }) {
  const [stored] = useState(() => readRecords(t))
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
      setError(t.migrateFail(error.message))
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
        if (stored.error) throw new Error(t.preserved)
        window.localStorage.setItem(storageKey, JSON.stringify(updated))
        setError('')
      } catch (error) {
        setError(t.saveFail(error.message))
      }
    }
  }, [game, level, records, stored.error, t])

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
          <div className='menu-top'><LanguageSwitcher lang={lang} onChange={onLanguageChange} t={t} /></div>
          <div className='brand'><img src='/logo.svg' alt='Movebox' width='220' height='48' fetchPriority='high' /></div>
          <p className='eyebrow centered'>{t.eyebrow}</p>
          <div className='progress-label'><span>{t.levelsDone}</span><strong>{completed} / {playable}</strong></div>
          <div className='progress'><span style={{ width: `${completed / playable * 100}%` }} /></div>
          <button className='primary full' onClick={() => start(level)}>▶ &nbsp; {t.play}</button>
          <div className='menu-grid'>
            <button onClick={() => setScreen('levels')}><strong>{t.levelsBtn}</strong><small>{t.levelsCount(levels.length)}</small></button>
            <button onClick={() => setScreen('stats')}><strong>{t.statsBtn}</strong><small>{t.statsSub}</small></button>
          </div>
          <p className='help'>{t.menuHelp}</p>
        </section>
      )}
      {screen === 'levels' && (
        <section className='card panel'>
          <button className='back' onClick={() => setScreen('menu')}>{t.back}</button>
          <p className='eyebrow'>{t.challenge}</p>
          <h1>{t.levelSelect}</h1>
          <p className='muted'>{t.completedOf(completed, playable)}</p>
          <div className='level-grid'>
            {levels.slice(page * 35, page * 35 + 35).map((rows, offset) => {
              const index = page * 35 + offset
              return <button key={index} disabled={!!availability[index]} title={availability[index] || t.playLevel(index + 1)} className={records[index] ? 'completed' : ''} onClick={() => start(index)}>{index + 1}{records[index] && <span>✓</span>}</button>
            })}
          </div>
          <div className='pagination'><button disabled={page === 0} onClick={() => setPage(page - 1)}>{t.prev}</button><span>{page + 1} / {Math.ceil(levels.length / 35)}</span><button disabled={(page + 1) * 35 >= levels.length} onClick={() => setPage(page + 1)}>{t.next}</button></div>
          {playable < levels.length && <p className='help'>{t.unavailable}</p>}
        </section>
      )}
      {screen === 'stats' && (
        <section className='card panel'>
          <button className='back' onClick={() => setScreen('menu')}>{t.back}</button>
          <p className='eyebrow'>{t.progress}</p>
          <h1>{t.statsTitle}</h1>
          <div className='stats-grid'><div><strong>{completed}</strong><small>{t.levelsDoneUpper}</small></div><div><strong>{Object.values(records).reduce((sum, record) => sum + record.wins, 0)}</strong><small>{t.winsUpper}</small></div></div>
          <h2>{t.yourRecords}</h2>
          {completed === 0
            ? <p className='muted'>{t.noRecords}</p>
            : (
              <div className='records'>{Object.entries(records).sort(([a], [b]) => Number(a) - Number(b)).map(([index, record]) => <div key={index}><strong>{t.levelN(Number(index) + 1)}</strong><span>{t.movesN(record.bestMoves)}</span><span>{formatTime(record.bestTime)}</span></div>)}</div>
              )}
          <p className='help'>{t.localData}</p>
        </section>
      )}
      {screen === 'game' && state && (
        <>
          <header className='game-header'>
            <button onClick={() => setScreen('menu')}>{t.back}</button>
            <div><small>{t.hLevel}</small><strong>{level + 1} / {levels.length}</strong></div>
            <div><small>{t.hMoves}</small><strong>{state.moves}</strong></div>
            <div><small>{t.hPushes}</small><strong>{state.pushes}</strong></div>
            <div><small>{t.hTime}</small><strong>{formatTime(seconds)}</strong></div>
            <button aria-label={t.undo} onClick={() => { if (game.undo()) setState(game.getState()) }}>↶ <span>{t.undoUpper}</span></button>
            <button aria-label={t.restart} onClick={() => start(level)}>↻ <span>{t.restartUpper}</span></button>
            <LanguageSwitcher lang={lang} onChange={onLanguageChange} t={t} />
          </header>
          <section className='game-content'>
            {state.won && <div className='victory' role='status'><strong>{t.done}</strong><span>{t.great}</span>{nextLevel !== -1 && <button className='primary' onClick={() => start(nextLevel)}>{t.nextLevel}</button>}<button onClick={() => setScreen('levels')}>{t.chooseLevel}</button></div>}
            <div className='board-wrap'>
              <div className='board' role='img' aria-label={t.boardLabel(level + 1, state.moves, state.pushes)} style={{ '--columns': state.width, '--rows': state.height }}>
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
            <div className='controls' aria-label={t.controls}>
              <button className='up' aria-label={t.up} onClick={() => move('up')}>↑</button>
              <button className='left' aria-label={t.left} onClick={() => move('left')}>←</button>
              <button className='down' aria-label={t.down} onClick={() => move('down')}>↓</button>
              <button className='right' aria-label={t.right} onClick={() => move('right')}>→</button>
            </div>
            <p className='help centered'>{t.keysHelp}</p>
          </section>
        </>
      )}
      <footer className='app-footer'><a href='https://lppjunior.com/'>lppjunior.com</a> · Movebox</footer>
    </main>
  )
}

export default function AppWithLanguage () {
  const [lang, setLang] = useState(() => languageFromPath(window.location.pathname))
  const t = MESSAGES[lang]

  useEffect(() => {
    document.documentElement.lang = HTML_LANG[lang]
    document.documentElement.dir = RTL_LANGUAGES.includes(lang) ? 'rtl' : 'ltr'
    document.title = t.title
  }, [lang, t])

  useEffect(() => {
    const syncLanguage = () => setLang(languageFromPath(window.location.pathname))
    window.addEventListener('popstate', syncLanguage)

    return () => window.removeEventListener('popstate', syncLanguage)
  }, [])

  function changeLanguage (next) {
    if (next === lang) return
    storeLanguage(window.localStorage, next)
    window.history.pushState(null, '', LANGUAGE_PATHS[next])
    setLang(next)
  }

  return <App lang={lang} onLanguageChange={changeLanguage} t={t} />
}
