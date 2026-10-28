// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/preact'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { solutionSteps, TUTORIAL } from '../content/levels'
import { mountBoard } from '../view/board'
import type { BoardController } from '../view/controller'
import { App } from './App'

vi.mock('../view/board', () => ({ mountBoard: vi.fn() }))
const mount = vi.mocked(mountBoard)

beforeEach(() => {
  mount.mockReset()
  mount.mockResolvedValue({ destroy: () => {} })
})
afterEach(cleanup)

/** The controller App handed to the board it mounted last. */
async function mounted(): Promise<BoardController> {
  await waitFor(() => expect(mount).toHaveBeenCalled())
  const controller = mount.mock.lastCall?.[1]
  if (controller === undefined) throw new Error('No board mounted')
  return controller
}

async function solve(controller: BoardController, id: string) {
  const level = TUTORIAL.find((candidate) => candidate.id === id)
  await act(() => {
    for (const step of level ? solutionSteps(level) : []) {
      if ('wait' in step) for (let tick = 0; tick < step.wait; tick++) controller.session.tick()
      else controller.session.execute(step)
    }
  })
}

describe('App', () => {
  it('opens on the first level', async () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: 'Vibe Laser' })).toBeTruthy()
    expect(
      screen.getByRole('application', {
        name: 'First Light: game board with 6 columns and 3 rows',
      }),
    ).toBeTruthy()
    await mounted()
  })

  it('switches levels with the picker', async () => {
    render(<App />)
    await act(() => {
      fireEvent.change(screen.getByLabelText('Level'), { target: { value: '1' } })
    })
    expect(screen.getByRole('application', { name: /^Two Turns:/ })).toBeTruthy()
  })

  it('offers the next level once a level is solved', async () => {
    render(<App />)
    await solve(await mounted(), 'first-light')
    const dialog = screen.getByRole('dialog', { name: 'Level solved' })
    await act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Next level' }))
    })
    expect(dialog.isConnected).toBe(false)
    expect(screen.getByRole('application', { name: /^Two Turns:/ })).toBeTruthy()
  })

  it('plays a solved level again from the start', async () => {
    render(<App />)
    const controller = await mounted()
    await solve(controller, 'first-light')
    await act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Play again' }))
    })
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(controller.session.state.value.phase).toBe('playing')
  })

  it('offers a fresh start after an explosion', async () => {
    render(<App />)
    const index = TUTORIAL.findIndex((level) => level.id === 'handle-with-care')
    await act(() => {
      fireEvent.change(screen.getByLabelText('Level'), { target: { value: String(index) } })
    })
    const controller = await mounted()
    await act(() => {
      // The mirror in A1, turned to send the beam east, lights the explosive in A3.
      controller.session.execute({ kind: 'move', item: 3, to: { area: 'board', cell: 0 } })
      controller.session.execute({ kind: 'rotate', item: 3, steps: 3 })
      for (let tick = 0; tick < 5; tick++) controller.session.tick()
    })
    expect(controller.session.state.value.phase).toBe('failed')
    const start = await screen.findByRole('button', { name: 'Start again' }, { timeout: 2000 })
    await act(() => {
      fireEvent.click(start)
    })
    expect(controller.session.state.value.phase).toBe('playing')
  })
})
