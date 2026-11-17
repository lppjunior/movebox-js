import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import App from '../src/App.jsx'

beforeEach(() => window.localStorage.clear())

const playFirstLevel = () => {
  fireEvent.click(screen.getByRole('button', { name: /JOGAR AGORA/ }))
  for (const key of ['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowRight', 'ArrowRight']) {
    fireEvent.keyDown(window, { key })
  }
}

test('shows the footer in the menu and during gameplay', () => {
  render(<App />)
  expect(screen.getByText('lppjunior.com')).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: /JOGAR AGORA/ }))
  expect(screen.getByText('lppjunior.com')).toBeTruthy()
})

test('completes a real level and persists progress across reloads', () => {
  const { unmount } = render(<App />)
  playFirstLevel()
  expect(screen.getByRole('status').textContent).toContain('FASE CONCLUÍDA')
  expect(JSON.parse(window.localStorage.getItem('movebox.records.v2'))['0']).toMatchObject({ wins: 1, bestMoves: 10 })
  unmount()
  render(<App />)
  expect(screen.getByText('1 / 104')).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: /ESTATÍSTICAS/ }))
  expect(screen.getByText('10 movimentos')).toBeTruthy()
})

test('makes corrected and renumbered phases available and supports touch controls', () => {
  render(<App />)
  fireEvent.click(screen.getByRole('button', { name: /FASES 104/ }))
  fireEvent.click(screen.getByRole('button', { name: 'Próxima →' }))
  fireEvent.click(screen.getByRole('button', { name: '52' }))
  expect(screen.getByRole('img', { name: /Fase 52: 0 movimentos/ })).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: '← MENU' }))
  fireEvent.click(screen.getByRole('button', { name: /FASES 104/ }))
  fireEvent.click(screen.getByRole('button', { name: 'Próxima →' }))
  fireEvent.click(screen.getByRole('button', { name: '72' }))
  expect(screen.getByRole('img', { name: /Fase 72: 0 movimentos/ })).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: '← MENU' }))
  fireEvent.click(screen.getByRole('button', { name: /FASES 104/ }))
  fireEvent.click(screen.getByRole('button', { name: '← Anterior' }))
  fireEvent.click(screen.getByRole('button', { name: '53' }))
  fireEvent.click(screen.getByRole('button', { name: 'Mover para a direita' }))
  expect(screen.getByRole('img', { name: /Fase 53: 1 movimentos/ })).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Desfazer' }))
  expect(screen.getByRole('img', { name: /Fase 53: 0 movimentos/ })).toBeTruthy()
})

test('migrates records once, preserving the old data and both sides of the removed level', () => {
  const record = (wins, bestMoves) => ({ wins, bestTime: 12, bestMoves })
  const legacy = { 0: record(1, 10), 70: record(2, 20), 72: record(3, 30), 104: record(4, 40) }
  const serialized = JSON.stringify(legacy)
  window.localStorage.setItem('movebox.records.v1', serialized)
  const { unmount } = render(<App />)
  expect(window.localStorage.getItem('movebox.records.v1')).toBe(serialized)
  expect(JSON.parse(window.localStorage.getItem('movebox.records.v2'))).toEqual({
    0: legacy[0], 70: legacy[70], 71: legacy[72], 103: legacy[104]
  })
  expect(screen.getByText('4 / 104')).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: /ESTATÍSTICAS/ }))
  expect(screen.getByText('Fase 71')).toBeTruthy()
  expect(screen.getByText('Fase 72')).toBeTruthy()
  expect(screen.getByText('Fase 104')).toBeTruthy()
  unmount()
  render(<App />)
  expect(JSON.parse(window.localStorage.getItem('movebox.records.v2'))).toEqual({
    0: legacy[0], 70: legacy[70], 71: legacy[72], 103: legacy[104]
  })
  expect(screen.getByText('4 / 104')).toBeTruthy()
})

test('prefers current records over the legacy backup', () => {
  window.localStorage.setItem('movebox.records.v1', '{')
  const current = JSON.stringify({ 71: { wins: 1, bestTime: 2, bestMoves: 3 } })
  window.localStorage.setItem('movebox.records.v2', current)
  render(<App />)
  expect(screen.queryByRole('alert')).toBeNull()
  expect(window.localStorage.getItem('movebox.records.v2')).toBe(current)
  expect(screen.getByText('1 / 104')).toBeTruthy()
})

test('preserves unexpected records for the removed level without overwriting them', () => {
  const legacy = JSON.stringify({ 71: { wins: 1, bestTime: 2, bestMoves: 3 } })
  window.localStorage.setItem('movebox.records.v1', legacy)
  render(<App />)
  expect(screen.getByRole('alert').textContent).toContain('antiga fase 72')
  playFirstLevel()
  expect(screen.getByRole('alert').textContent).toContain('foram preservados')
  expect(window.localStorage.getItem('movebox.records.v1')).toBe(legacy)
  expect(window.localStorage.getItem('movebox.records.v2')).toBeNull()
})

test('reports migration write failures while retaining the legacy data', () => {
  const legacy = JSON.stringify({ 72: { wins: 1, bestTime: 2, bestMoves: 3 } })
  window.localStorage.setItem('movebox.records.v1', legacy)
  const originalSetItem = Storage.prototype.setItem
  const spy = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(function (key, value) {
    if (key === 'movebox.records.v2') throw new Error('Armazenamento indisponível')
    return originalSetItem.call(this, key, value)
  })
  try {
    render(<App />)
    expect(screen.getByRole('alert').textContent).toContain('Não foi possível migrar')
    expect(window.localStorage.getItem('movebox.records.v1')).toBe(legacy)
    expect(window.localStorage.getItem('movebox.records.v2')).toBeNull()
  } finally {
    spy.mockRestore()
  }
})

test('reports malformed stored statistics', () => {
  window.localStorage.setItem('movebox.records.v2', '')
  render(<App />)
  expect(screen.getByRole('alert').textContent).toContain('Não foi possível carregar')
})
