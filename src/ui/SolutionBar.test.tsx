// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/preact'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { puzzleOf, rulesOf } from '../content/level'
import { findLevel } from '../content/packs'
import { itemById } from '../core/level'
import { GameSession, TICK_MS } from '../game/session'
import { BoardController } from '../view/controller'
import { SOLUTION_STEP_MS, SolutionBar } from './SolutionBar'

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

async function setUp(id: string) {
  const level = (await findLevel(id)?.entry.load())?.file
  if (level === undefined) throw new Error(`No level ${id}`)
  const controller = new BoardController(new GameSession(puzzleOf(level), rulesOf(level)))
  render(<SolutionBar controller={controller} level={level} />)
  return controller
}

const button = (name: string) => screen.getByRole('button', { name }) as HTMLButtonElement
const status = () => screen.getByRole('status').textContent
const phase = (controller: BoardController) => controller.session.state.value.phase

describe('SolutionBar', () => {
  it('shows where the next piece goes, in words and on the board, until it is there', async () => {
    // Two Turns: a mirror in A6 turned to 5, then one in D6 turned to 7.
    const controller = await setUp('tutorial/1/2')
    expect(screen.getByRole('toolbar', { name: 'Hints and solution' })).toBeTruthy()
    await act(() => void fireEvent.click(button('Show a hint')))
    expect(status()).toBe('Next: Mirror on A6, turned as the outline shows.')
    const hint = controller.hint.value
    expect(hint).toMatchObject({ place: { area: 'board', cell: 5 }, rotation: 5 })
    if (hint === undefined) throw new Error('No hint')
    await act(() => {
      controller.move(hint.item, hint.place)
      controller.rotate(hint.item, -3)
    })
    expect(itemById(controller.session.state.value.puzzle, hint.item)?.piece.rotation).toBe(5)
    await act(() => void fireEvent.click(button('Show a hint')))
    expect(status()).toBe('Next: Mirror on D6, turned as the outline shows.')
  })

  it('plays the solution from the start, a move at a time, and can stop', async () => {
    vi.useFakeTimers()
    const controller = await setUp('tutorial/1/2')
    await act(() => {
      controller.move(2, { area: 'board', cell: 0 })
    })
    await act(() => void fireEvent.click(button('Show the solution')))
    expect(status()).toBe('The solution plays itself, one move at a time.')
    expect(controller.session.canUndo.value).toBe(false)
    expect(button('Show a hint').disabled).toBe(true)
    await act(() => void vi.advanceTimersByTime(SOLUTION_STEP_MS))
    expect(controller.session.canUndo.value).toBe(true)
    expect(phase(controller)).toBe('playing')
    await act(() => void vi.advanceTimersByTime(SOLUTION_STEP_MS))
    expect(phase(controller)).toBe('solved')

    await act(() => void controller.session.restart())
    await act(() => void fireEvent.click(button('Show the solution')))
    await act(() => void fireEvent.click(button('Stop')))
    await act(() => void vi.advanceTimersByTime(SOLUTION_STEP_MS * 3))
    expect(controller.session.canUndo.value).toBe(false)
    expect(button('Show the solution')).toBeTruthy()
  })

  it('stops playing when the player starts the level again', async () => {
    vi.useFakeTimers()
    const controller = await setUp('tutorial/1/2')
    await act(() => void fireEvent.click(button('Show the solution')))
    await act(() => void vi.advanceTimersByTime(SOLUTION_STEP_MS))
    expect(controller.session.canUndo.value).toBe(true)
    await act(() => void controller.session.restart())
    expect(status()).toBe('')
    await act(() => void vi.advanceTimersByTime(SOLUTION_STEP_MS * 3))
    expect(controller.session.canUndo.value).toBe(false)
    expect(button('Show the solution')).toBeTruthy()
  })

  it("waits for the actors on the game's own clock, and says so in a hint", async () => {
    vi.useFakeTimers()
    // Hungry Slime: a mirror in B2 lets the slime go, then 40 ticks later one in A2.
    const controller = await setUp('tutorial/3/2')
    await act(() => void fireEvent.click(button('Show the solution')))
    await act(() => void vi.advanceTimersByTime(SOLUTION_STEP_MS * 2))
    // The clock of the game has not run, so the second mirror waits.
    await act(() => void vi.advanceTimersByTime(TICK_MS * 50))
    expect(
      controller.session.state.value.puzzle.items.filter((item) => item.place.area === 'board'),
    ).toHaveLength(controller.session.state.value.puzzle.items.length - 1)
    await act(() => {
      for (let tick = 0; tick < 40; tick++) controller.session.tick()
      vi.advanceTimersByTime(TICK_MS)
    })
    await act(() => void vi.advanceTimersByTime(SOLUTION_STEP_MS))
    expect(phase(controller)).toBe('solved')

    await act(() => void controller.session.restart())
    // The first mirror of the toolbox comes after the seven pieces on the board.
    await act(() => {
      controller.move(7, { area: 'board', cell: 6 })
      controller.rotate(7, -1)
    })
    await act(() => void fireEvent.click(button('Show a hint')))
    expect(status()).toBe(
      'Wait until the moving pieces have done their part, then: Mirror on A2, turned as the outline shows.',
    )
  })

  it('lets go of its hint on a restart, and says when nothing is left to show', async () => {
    const controller = await setUp('tutorial/1/2')
    await act(() => void fireEvent.click(button('Show a hint')))
    expect(controller.hint.value).toBeDefined()
    await act(() => void controller.session.restart())
    expect(controller.hint.value).toBeUndefined()
    expect(status()).toBe('')
    await act(() => {
      controller.move(2, { area: 'board', cell: 5 })
      controller.rotate(2, -3)
      controller.move(3, { area: 'board', cell: 23 })
      controller.rotate(3, -1)
    })
    expect(phase(controller)).toBe('solved')
    expect(button('Show a hint').disabled).toBe(true)
  })
})
