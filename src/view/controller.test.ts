import { describe, expect, it } from 'vitest'
import { boardOf, createPuzzle } from '../core/level'
import { formatBoard, parseBoard, parsePiece } from '../core/notation'
import { GameSession } from '../game/session'
import { BoardController } from './controller'

const PLAIN = { ctrl: false, shift: false }
const CTRL = { ctrl: true, shift: false }

/** The first tutorial level: a mirror in B6, turned to the north-west, lights the coin. */
function firstLevel(): BoardController {
  const board = parseBoard('. . . . . Cr \n L2r . . . . . \n . . . . . .')
  const mirror = parsePiece('M0')
  if (mirror === undefined) throw new Error('No mirror')
  return new BoardController(new GameSession(createPuzzle(board, [mirror])))
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

describe('BoardController taps', () => {
  const SLOT = { area: 'toolbox', slot: 0 } as const
  const B6 = { area: 'board', cell: 11 } as const
  const B1 = { area: 'board', cell: 6 } as const

  it('selects with a first tap, moves to a free place, and turns with the next tap', () => {
    const controller = firstLevel()
    const mirror = 2
    expect(controller.tap(SLOT)).toBe(true)
    expect(controller.selected.value).toBe(mirror)
    expect(controller.tap(B6)).toBe(true)
    expect(controller.selected.value).toBe(mirror)
    expect(controller.tap(B6)).toBe(true)
    expect(controller.session.state.value.phase).toBe('solved')
  })

  it('selects another piece instead of moving onto it, and lets go of the selection', () => {
    const controller = firstLevel()
    controller.tap(SLOT)
    expect(controller.tap(B1)).toBe(true)
    expect(controller.selected.value).toBe(1)
    // The laser is fixed: a free place lets go of it instead.
    expect(controller.tap({ area: 'board', cell: 8 })).toBe(false)
    expect(controller.selected.value).toBeUndefined()
    controller.tap(SLOT)
    expect(controller.tap(undefined)).toBe(false)
    expect(controller.selected.value).toBeUndefined()
  })
})

describe('BoardController for the color dots', () => {
  const SLOT = { area: 'toolbox', slot: 0 } as const
  const B1 = { area: 'board', cell: 6 } as const
  const B2 = { area: 'board', cell: 7 } as const
  const kind = (controller: BoardController) => controller.inspected.value?.kind

  it('shows the piece under the mouse, and nothing over a free cell', () => {
    const controller = firstLevel()
    expect(kind(controller)).toBeUndefined()
    controller.hover(B1)
    expect(controller.inspected.value).toMatchObject({ kind: 'laser', color: 1 })
    controller.hover(B2)
    expect(kind(controller)).toBeUndefined()
  })

  it('notes a new place only when the mouse reaches one', () => {
    const controller = firstLevel()
    controller.hover(B1)
    const hovered = controller.hovered.value
    controller.hover({ area: 'board', cell: 6 })
    expect(controller.hovered.value).toBe(hovered)
    controller.hover(SLOT)
    expect(controller.hovered.value).toEqual(SLOT)
    controller.hover(undefined)
    controller.hover(undefined)
    expect(controller.hovered.value).toBeUndefined()
  })

  it('follows the keyboard frame after a key, and the mouse once it moves again', () => {
    const controller = firstLevel()
    controller.hover(B1)
    press(controller, 'Escape')
    expect(controller.hovered.value).toBeUndefined()
    expect(kind(controller)).toBe('mirror')
    press(controller, 'Enter', 'ArrowRight', 'ArrowRight', 'ArrowRight')
    // The lifted mirror travels with the frame, over a free cell.
    expect(kind(controller)).toBe('mirror')
    controller.hover(B1)
    expect(kind(controller)).toBe('laser')
  })

  it('shows the selected piece without a mouse or a key, as on touch screens', () => {
    const controller = firstLevel()
    controller.tap(B1)
    expect(kind(controller)).toBe('laser')
    controller.tap(SLOT)
    expect(kind(controller)).toBe('mirror')
  })
})
