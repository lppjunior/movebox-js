import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import App from '../src/App.jsx'

beforeEach(() => window.localStorage.clear())

test('completes a real level and persists progress across reloads', () => {
  const { unmount } = render(<App />)
  fireEvent.click(screen.getByRole('button', { name: /JOGAR AGORA/ }))
  for (const key of ['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowRight', 'ArrowRight']) {
    fireEvent.keyDown(window, { key })
  }
  expect(screen.getByRole('status').textContent).toContain('FASE CONCLUÍDA')
  expect(JSON.parse(window.localStorage.getItem('movebox.records.v1'))['0']).toMatchObject({ wins: 1, bestMoves: 10 })
  unmount()
  render(<App />)
  expect(screen.getByText('1 / 103')).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: /ESTATÍSTICAS/ }))
  expect(screen.getByText('10 movimentos')).toBeTruthy()
})

test('makes invalid phases unavailable without blocking later levels and supports touch controls', () => {
  render(<App />)
  fireEvent.click(screen.getByRole('button', { name: /FASES 105/ }))
  fireEvent.click(screen.getByRole('button', { name: 'Próxima →' }))
  expect(screen.getByRole('button', { name: '52' }).disabled).toBe(true)
  fireEvent.click(screen.getByRole('button', { name: 'Próxima →' }))
  expect(screen.getByRole('button', { name: '72' }).disabled).toBe(true)
  expect(screen.getByRole('button', { name: '73' }).disabled).toBe(false)
  fireEvent.click(screen.getByRole('button', { name: '← Anterior' }))
  fireEvent.click(screen.getByRole('button', { name: '53' }))
  fireEvent.click(screen.getByRole('button', { name: 'Mover para a direita' }))
  expect(screen.getByRole('img', { name: /Fase 53: 1 movimentos/ })).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Desfazer' }))
  expect(screen.getByRole('img', { name: /Fase 53: 0 movimentos/ })).toBeTruthy()
})

test('reports malformed stored statistics', () => {
  window.localStorage.setItem('movebox.records.v1', '{')
  render(<App />)
  expect(screen.getByRole('alert').textContent).toContain('Não foi possível carregar')
})
