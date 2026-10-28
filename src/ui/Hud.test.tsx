// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/preact'
import { afterEach, describe, expect, it } from 'vitest'
import { puzzleOf, solutionSteps, TUTORIAL } from '../content/levels'
import { GameSession } from '../game/session'
import { BoardController } from '../view/controller'
import { Hud } from './Hud'

afterEach(cleanup)

function controllerFor(id: string): BoardController {
  const level = TUTORIAL.find((candidate) => candidate.id === id)
  if (level === undefined) throw new Error(`No level ${id}`)
  return new BoardController(new GameSession(puzzleOf(level)))
}

const button = (name: string) => screen.getByRole('button', { name }) as HTMLButtonElement

describe('Hud', () => {
  it('enables undo and redo as moves are made and taken back', async () => {
    const controller = controllerFor('first-light')
    render(<Hud controller={controller} />)
    expect(button('Undo').disabled).toBe(true)
    await act(() => {
      controller.move(2, { area: 'board', cell: 0 })
    })
    expect(button('Undo').disabled).toBe(false)
    expect(button('Clean up').disabled).toBe(false)
    await act(() => {
      fireEvent.click(button('Undo'))
    })
    expect(button('Undo').disabled).toBe(true)
    expect(button('Redo').disabled).toBe(false)
    await act(() => {
      fireEvent.click(button('Redo'))
    })
    await act(() => {
      fireEvent.click(button('Clean up'))
    })
    expect(controller.session.state.value.puzzle.items[2]?.place.area).toBe('toolbox')
  })

  it('rotates the selected piece with the rotate buttons', async () => {
    const controller = controllerFor('first-light')
    render(<Hud controller={controller} />)
    expect(button('Rotate right').disabled).toBe(true)
    await act(() => {
      controller.select(2)
    })
    await act(() => {
      fireEvent.click(button('Rotate right'))
    })
    expect(controller.session.state.value.puzzle.items[2]?.piece.rotation).toBe(1)
    await act(() => {
      fireEvent.click(button('Rotate left'))
    })
    expect(controller.session.state.value.puzzle.items[2]?.piece.rotation).toBe(0)
  })

  it('restarts the level', async () => {
    const controller = controllerFor('first-light')
    render(<Hud controller={controller} />)
    await act(() => {
      controller.move(2, { area: 'board', cell: 0 })
    })
    await act(() => {
      fireEvent.click(button('Restart'))
    })
    expect(controller.session.canUndo.value).toBe(false)
  })

  it('shows how long the board has held while it stabilizes', async () => {
    const controller = controllerFor('fenced-in')
    const level = TUTORIAL.find((candidate) => candidate.id === 'fenced-in')
    render(<Hud controller={controller} />)
    expect(screen.queryByRole('progressbar')).toBeNull()
    await act(() => {
      for (const step of level ? solutionSteps(level) : []) {
        if (!('wait' in step)) controller.session.execute(step)
      }
      for (let tick = 0; tick < 10; tick++) controller.session.tick()
    })
    const bar = screen.getByRole('progressbar', { name: 'Stability' }) as HTMLProgressElement
    expect(bar.value).toBe(10)
    expect(screen.getByText(/System stable/)).toBeTruthy()
  })
})
