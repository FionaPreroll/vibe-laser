// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/preact'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { puzzleOf } from '../content/level'
import { findLevel, type Level } from '../content/packs'
import { playSolution } from '../content/solution'
import { createPuzzle, itemById } from '../core/level'
import { parseBoard } from '../core/notation'
import { GameSession } from '../game/session'
import { locale } from '../i18n'
import { bindings, DEFAULT_BINDINGS, gamepadConnected, resolveBindings } from '../view/bindings'
import { BoardController } from '../view/controller'
import { Hud } from './Hud'
import { touchScreen } from './pointer'

afterEach(() => {
  cleanup()
  touchScreen.value = false
  locale.value = 'en'
})

async function load(id: string): Promise<Level> {
  const level = await findLevel(id)?.entry.load()
  if (level === undefined) throw new Error(`No level ${id}`)
  return level
}

async function controllerFor(id: string): Promise<BoardController> {
  return new BoardController(new GameSession(puzzleOf((await load(id)).file)))
}

function renderHud(controller: BoardController, onExit = () => {}, onHelp = () => {}) {
  return render(<Hud controller={controller} onExit={onExit} onHelp={onHelp} />)
}

const button = (name: string) => screen.getByRole('button', { name }) as HTMLButtonElement

describe('Hud', () => {
  it('explains the controls for mouse and keyboard, or for fingers on a touch screen', async () => {
    const controller = await controllerFor('tutorial/1/1')
    renderHud(controller)
    const hint = () => document.getElementById('controls-hint')?.textContent
    expect(hint()).toContain('right-click to rotate it right')
    await act(() => {
      touchScreen.value = true
    })
    expect(hint()).toContain('Pinch to zoom')
  })

  it('enables undo and redo as moves are made and taken back', async () => {
    const controller = await controllerFor('tutorial/1/1')
    renderHud(controller)
    const moves = () => document.querySelector('.moves')?.textContent
    expect(button('Undo').disabled).toBe(true)
    expect(moves()).toBe('Moves: 0')
    await act(() => {
      controller.move(2, { area: 'board', cell: 0 })
    })
    expect(moves()).toBe('Moves: 1')
    expect(button('Undo').disabled).toBe(false)
    expect(button('Clean up').disabled).toBe(false)
    await act(() => {
      fireEvent.click(button('Undo'))
    })
    expect(button('Undo').disabled).toBe(true)
    expect(button('Redo').disabled).toBe(false)
    expect(moves()).toBe('Moves: 0')
    await act(() => {
      fireEvent.click(button('Redo'))
    })
    await act(() => {
      fireEvent.click(button('Clean up'))
    })
    expect(controller.session.state.value.puzzle.items[2]?.place.area).toBe('toolbox')
  })

  it('rotates the selected piece with the rotate buttons', async () => {
    const controller = await controllerFor('tutorial/1/1')
    renderHud(controller)
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

  it('restarts the level, and undo brings the game back', async () => {
    const controller = await controllerFor('tutorial/1/1')
    renderHud(controller)
    const place = () => itemById(controller.session.state.value.puzzle, 2)?.place
    await act(() => {
      controller.move(2, { area: 'board', cell: 0 })
    })
    await act(() => {
      fireEvent.click(button('Restart'))
    })
    expect(controller.session.moves.value).toBe(0)
    expect(place()).toEqual({ area: 'toolbox', slot: 0 })
    await act(() => {
      fireEvent.click(button('Undo'))
    })
    expect(place()).toEqual({ area: 'board', cell: 0 })
    expect(controller.session.moves.value).toBe(1)
  })

  it('leaves the level and asks for help', async () => {
    const onExit = vi.fn()
    const onHelp = vi.fn()
    renderHud(await controllerFor('tutorial/1/1'), onExit, onHelp)
    const names = screen.getAllByRole('button').map((each) => each.textContent)
    expect(names.at(0)).toBe('Exit')
    expect(names.at(-1)).toBe('Help')
    fireEvent.click(button('Exit'))
    fireEvent.click(button('Help'))
    expect(onExit).toHaveBeenCalledOnce()
    expect(onHelp).toHaveBeenCalledOnce()
  })

  it('shows how long the board has held while it stabilizes', async () => {
    const level = await load('tutorial/3/3')
    const controller = new BoardController(new GameSession(puzzleOf(level.file)))
    renderHud(controller)
    expect(screen.queryByRole('progressbar')).toBeNull()
    await act(() => {
      playSolution(controller.session, level.file)
      for (let tick = 0; tick < 10; tick++) controller.session.tick()
    })
    const bar = screen.getByRole('progressbar', { name: 'Stability' }) as HTMLProgressElement
    expect(bar.value).toBe(10)
    expect(screen.getByText(/System stable/)).toBeTruthy()
  })

  it('lights the dots in the colors of the piece under the pointer', async () => {
    // A yellow laser, a free cell and a complex, red outside and cyan inside.
    const board = parseBoard('L2rg . CX0r/gb Crg')
    const controller = new BoardController(new GameSession(createPuzzle(board, [])))
    renderHud(controller)
    const dots = () => {
      const found = document.querySelector('.color-dots')
      if (found === null) throw new Error('No color dots')
      return found
    }
    const lit = () =>
      [...dots().querySelectorAll('.color-dot')].map((dot) =>
        dot.getAttribute('data-on') === 'true' ? dot.textContent : '-',
      )
    expect(screen.getByRole('img', { name: 'Colors of the piece under the pointer: none' })).toBe(
      dots(),
    )
    expect(lit()).toEqual(['-', '-', '-'])
    await act(() => controller.hover({ area: 'board', cell: 0 }))
    expect(dots().getAttribute('aria-label')).toBe(
      'Colors of the piece under the pointer: Red, Green',
    )
    expect(lit()).toEqual(['R', 'G', '-'])
    await act(() => controller.hover({ area: 'board', cell: 2 }))
    expect(dots().getAttribute('aria-label')).toBe(
      'Colors of the piece under the pointer: Red, inside Green, Blue',
    )
    expect(lit()).toEqual(['R', '-', '-', '-', 'G', 'B'])
    await act(() => {
      locale.value = 'de'
    })
    expect(dots().getAttribute('aria-label')).toBe(
      'Farben des Teils unter dem Zeiger: Rot, innen Grün, Blau',
    )
    await act(() => controller.hover({ area: 'board', cell: 1 }))
    expect(dots().getAttribute('aria-label')).toBe('Farben des Teils unter dem Zeiger: keine')
  })

  it('says when the slime eats a mirror, and puts that away on a restart', async () => {
    const level = await load('tutorial/3/2')
    const controller = new BoardController(new GameSession(puzzleOf(level.file)))
    renderHud(controller)
    expect(screen.queryByText(/eaten a mirror/)).toBeNull()
    await act(() => {
      // The first mirror lets the slime go; the second waits, unlit, in its way.
      playSolution(controller.session, {
        ...level.file,
        solution: [{ piece: 0, pos: 'B2', rot: 7 }, { piece: 1, pos: 'A3', rot: 0 }, { wait: 40 }],
      })
    })
    expect(screen.getByRole('status').textContent).toContain('The slime has eaten a mirror')
    const restarts = screen.getAllByRole('button', { name: 'Restart' })
    await act(() => {
      fireEvent.click(restarts[0] as HTMLButtonElement)
    })
    expect(screen.queryByText(/eaten a mirror/)).toBeNull()
  })

  it('runs slimes, mines and ships faster, only where there are some', async () => {
    const calm = await controllerFor('tutorial/1/1')
    const { unmount } = renderHud(calm)
    expect(screen.queryByRole('button', { name: /^Speed/ })).toBeNull()
    unmount()

    const controller = await controllerFor('tutorial/3/2')
    renderHud(controller)
    const speed = () => screen.getByRole('button', { name: /^Speed/ })
    expect(speed().getAttribute('aria-pressed')).toBe('false')
    for (const expected of [2, 4, 1]) {
      await act(() => {
        fireEvent.click(speed())
      })
      expect(controller.speed.value).toBe(expected)
      expect(speed().textContent).toContain(`${expected}×`)
    }
  })

  it('offers the next level in the bar once the level is solved', async () => {
    const level = await load('tutorial/1/1')
    const controller = new BoardController(new GameSession(puzzleOf(level.file)))
    const onNext = vi.fn()
    render(<Hud controller={controller} onExit={() => {}} onHelp={() => {}} onNext={onNext} />)
    expect(screen.queryByRole('button', { name: 'Next unsolved level' })).toBeNull()
    await act(() => {
      playSolution(controller.session, level.file)
    })
    fireEvent.click(button('Next unsolved level'))
    expect(onNext).toHaveBeenCalledOnce()
  })

  it('names the keys of its buttons, and its controller buttons once a controller is there', async () => {
    const controller = await controllerFor('tutorial/1/1')
    renderHud(controller)
    expect(button('Undo').title).toBe('Undo (Ctrl+Z)')
    expect(button('Rotate left').title).toBe('Rotate left (Q)')
    expect(button('Exit').title).toBe('Exit')
    const hint = () => document.getElementById('controls-hint')?.textContent
    expect(hint()).toContain('Keyboard: ↑ ← ↓ → to move, Enter to pick up and drop')
    await act(() => {
      gamepadConnected.value = true
      bindings.value = resolveBindings({ keys: { undo: ['U'] } })
      locale.value = 'de'
    })
    try {
      expect(button('Rückgängig').title).toBe('Rückgängig (U / X)')
      expect(button('Verlassen').title).toBe('Verlassen (Back)')
      expect(hint()).toContain('U zum Rückgängigmachen')
    } finally {
      gamepadConnected.value = false
      bindings.value = DEFAULT_BINDINGS
    }
  })

  it('lends help, leaving and the next level to keys and controllers', async () => {
    const level = await load('tutorial/1/1')
    const controller = new BoardController(new GameSession(puzzleOf(level.file)))
    const onExit = vi.fn()
    const onHelp = vi.fn()
    const onNext = vi.fn()
    const { unmount } = render(
      <Hud controller={controller} onExit={onExit} onHelp={onHelp} onNext={onNext} />,
    )
    expect(controller.perform('next')).toBe(false)
    controller.perform('help')
    controller.perform('exit')
    await act(() => {
      playSolution(controller.session, level.file)
    })
    expect(controller.perform('next')).toBe(true)
    expect([onHelp, onExit, onNext].map((each) => each.mock.calls.length)).toEqual([1, 1, 1])
    await act(() => unmount())
    expect(controller.perform('help')).toBe(false)
  })
})
