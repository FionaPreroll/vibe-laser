import { describe, expect, it } from 'vitest'
import { puzzleOf, TUTORIAL } from '../content/levels'
import { boardOf } from '../core/level'
import { formatBoard } from '../core/notation'
import { GameSession } from '../game/session'
import { BoardController } from './controller'

const PLAIN = { ctrl: false, shift: false }
const CTRL = { ctrl: true, shift: false }

function firstLevel(): BoardController {
  const level = TUTORIAL[0]
  if (level === undefined) throw new Error('No tutorial levels')
  return new BoardController(new GameSession(puzzleOf(level)))
}

function press(controller: BoardController, ...keys: string[]): void {
  for (const key of keys) controller.handleKey(key, PLAIN)
}

describe('BoardController keyboard', () => {
  it('solves the first level: lift the mirror, carry it to B6, rotate left', () => {
    const controller = firstLevel()
    press(controller, 'Enter')
    expect(controller.lifted.value).toBe(2)
    press(controller, ...Array<string>(7).fill('ArrowRight'), 'ArrowDown', 'Enter')
    expect(controller.lifted.value).toBeUndefined()
    press(controller, 'q')
    expect(controller.session.state.value.phase).toBe('solved')
  })

  it('keeps the focus on the toolbox and board', () => {
    const controller = firstLevel()
    expect(controller.handleKey('ArrowLeft', PLAIN)).toBe(false)
    expect(controller.handleKey('ArrowUp', PLAIN)).toBe(false)
    expect(controller.focus.value).toEqual({ column: -2, row: 0 })
    press(controller, ...Array<string>(20).fill('ArrowRight'))
    expect(controller.focus.value).toEqual({ column: 5, row: 0 })
  })

  it('cancels a lift with Escape and refuses to drop onto a taken cell', () => {
    const controller = firstLevel()
    press(controller, 'Enter', 'Escape')
    expect(controller.lifted.value).toBeUndefined()
    // B1 holds the laser, which is fixed and in the way.
    press(controller, 'Enter', 'ArrowRight', 'ArrowRight', 'ArrowDown')
    expect(controller.handleKey('Enter', PLAIN)).toBe(false)
    expect(controller.lifted.value).toBe(2)
  })

  it('undoes and redoes with Ctrl+Z, Ctrl+Shift+Z and Ctrl+Y', () => {
    const controller = firstLevel()
    const board = () => formatBoard(boardOf(controller.session.state.value.puzzle))
    press(controller, 'Enter', 'ArrowRight', 'ArrowRight', 'Enter')
    const placed = board()
    expect(controller.handleKey('z', CTRL)).toBe(true)
    expect(board()).not.toBe(placed)
    expect(controller.handleKey('Z', { ctrl: true, shift: true })).toBe(true)
    expect(board()).toBe(placed)
    controller.handleKey('z', CTRL)
    expect(controller.handleKey('y', CTRL)).toBe(true)
    expect(board()).toBe(placed)
  })

  it('rotates the selected piece for the HUD buttons', () => {
    const controller = firstLevel()
    expect(controller.rotateSelected(1)).toBe(false)
    controller.select(2)
    expect(controller.rotateSelected(1)).toBe(true)
    expect(controller.session.state.value.puzzle.items[2]?.piece.rotation).toBe(1)
  })
})

describe('BoardController for the HUD', () => {
  it('lets the rotate buttons work only on a selected piece that rotates, while playing', () => {
    const controller = firstLevel()
    expect(controller.canRotateSelected.value).toBe(false)
    controller.select(0)
    expect(controller.canRotateSelected.value).toBe(false)
    controller.select(2)
    expect(controller.canRotateSelected.value).toBe(true)
    press(controller, 'Enter', ...Array<string>(7).fill('ArrowRight'), 'ArrowDown', 'Enter', 'q')
    expect(controller.session.state.value.phase).toBe('solved')
    expect(controller.canRotateSelected.value).toBe(false)
  })

  it('ignores keys it does not know', () => {
    const controller = firstLevel()
    expect(controller.handleKey('a', CTRL)).toBe(false)
    expect(controller.handleKey('x', PLAIN)).toBe(false)
  })

  it('picks pieces up with the space bar too and rotates with capital letters', () => {
    const controller = firstLevel()
    press(controller, ' ')
    expect(controller.lifted.value).toBe(2)
    expect(controller.handleKey('E', PLAIN)).toBe(true)
    expect(controller.handleKey('Q', PLAIN)).toBe(true)
    expect(controller.session.state.value.puzzle.items[2]?.piece.rotation).toBe(0)
  })
})
