// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/preact'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { puzzleOf } from '../content/level'
import { findLevel, type Level } from '../content/packs'
import { playSolution } from '../content/solution'
import { GameSession } from '../game/session'
import { BoardController } from '../view/controller'
import { Hud } from './Hud'
import { touchScreen } from './pointer'

afterEach(() => {
  cleanup()
  touchScreen.value = false
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

  it('restarts the level', async () => {
    const controller = await controllerFor('tutorial/1/1')
    renderHud(controller)
    await act(() => {
      controller.move(2, { area: 'board', cell: 0 })
    })
    await act(() => {
      fireEvent.click(button('Restart'))
    })
    expect(controller.session.canUndo.value).toBe(false)
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
})
