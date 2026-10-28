// @vitest-environment happy-dom
import { cleanup, render, screen, waitFor } from '@testing-library/preact'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { puzzleOf, TUTORIAL } from '../content/levels'
import { GameSession } from '../game/session'
import { mountBoard } from '../view/board'
import { BoardController } from '../view/controller'
import { BoardCanvas } from './BoardCanvas'

vi.mock('../view/board', () => ({ mountBoard: vi.fn() }))
const mount = vi.mocked(mountBoard)

function controller(): BoardController {
  const level = TUTORIAL[0]
  if (level === undefined) throw new Error('No levels')
  return new BoardController(new GameSession(puzzleOf(level)))
}

beforeEach(() => {
  mount.mockReset()
  vi.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('BoardCanvas', () => {
  it('mounts the board into a labelled, focusable host and destroys it on unmount', async () => {
    const destroy = vi.fn()
    mount.mockResolvedValue({ destroy })
    const view = render(<BoardCanvas controller={controller()} label="First Light" />)
    const host = screen.getByRole('application', { name: 'First Light' })
    expect(host.getAttribute('aria-describedby')).toBe('controls-hint')
    await waitFor(() => expect(mount).toHaveBeenCalledWith(host, expect.any(BoardController)))
    view.unmount()
    await waitFor(() => expect(destroy).toHaveBeenCalledOnce())
  })

  it('destroys a board that finishes mounting after the canvas is gone', async () => {
    const destroy = vi.fn()
    let finish: (view: { destroy: () => void }) => void = () => {}
    mount.mockReturnValue(new Promise((resolve) => (finish = resolve)))
    const view = render(<BoardCanvas controller={controller()} label="First Light" />)
    view.unmount()
    finish({ destroy })
    await waitFor(() => expect(destroy).toHaveBeenCalledOnce())
  })

  it('explains when the graphics cannot start', async () => {
    mount.mockRejectedValue(new Error('No WebGL'))
    render(<BoardCanvas controller={controller()} label="First Light" />)
    expect(
      await screen.findByText('The game graphics could not start in this browser.'),
    ).toBeTruthy()
    expect(console.error).toHaveBeenCalled()
  })
})
