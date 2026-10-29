// @vitest-environment happy-dom
import { act, cleanup, render, screen, waitFor } from '@testing-library/preact'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPuzzle } from '../core/level'
import { parseBoard } from '../core/notation'
import { GameSession } from '../game/session'
import { mountBoard } from '../view/board'
import { BoardController } from '../view/controller'
import { artStyle } from '../view/display'
import { BoardCanvas } from './BoardCanvas'

vi.mock('../view/board', () => ({ mountBoard: vi.fn() }))
const mount = vi.mocked(mountBoard)

function controller(): BoardController {
  return new BoardController(new GameSession(createPuzzle(parseBoard('L2r . Cr'), [])))
}

beforeEach(() => {
  mount.mockReset()
  vi.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  artStyle.value = 'flat'
})

describe('BoardCanvas', () => {
  it('mounts the board into a labelled, focusable host and destroys it on unmount', async () => {
    const destroy = vi.fn()
    mount.mockResolvedValue({ destroy })
    const view = render(<BoardCanvas controller={controller()} label="First Light" />)
    const host = screen.getByRole('application', { name: 'First Light' })
    expect(host.getAttribute('aria-describedby')).toBe('controls-hint')
    await waitFor(() =>
      expect(mount).toHaveBeenCalledWith(
        host,
        expect.any(BoardController),
        expect.objectContaining({ id: 'flat' }),
      ),
    )
    view.unmount()
    await waitFor(() => expect(destroy).toHaveBeenCalledOnce())
  })

  it('mounts the board afresh in a new look, and the game goes on', async () => {
    const destroy = vi.fn()
    mount.mockResolvedValue({ destroy })
    const game = controller()
    render(<BoardCanvas controller={game} label="First Light" />)
    await waitFor(() => expect(mount).toHaveBeenCalledOnce())
    await act(() => {
      artStyle.value = 'neon'
    })
    await waitFor(() => expect(mount).toHaveBeenCalledTimes(2))
    expect(destroy).toHaveBeenCalledOnce()
    expect(mount.mock.calls[1]?.[1]).toBe(game)
    expect(mount.mock.calls[1]?.[2]).toMatchObject({ id: 'neon' })
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
