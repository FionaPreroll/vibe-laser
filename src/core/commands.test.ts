import { describe, expect, it } from 'vitest'
import type { Piece } from './board'
import { applyCommand, type Command, cleanupCommand } from './commands'
import { boardOf, createPuzzle, freeSlot, type Item, itemById, type Puzzle } from './level'
import { formatBoard, parseBoard, parsePiece } from './notation'
import { trace } from './trace'

function piece(token: string): Piece {
  const parsed = parsePiece(token)
  if (parsed === undefined) throw new Error(`"${token}" is no piece`)
  return parsed
}

function puzzle(board: string, toolbox: string[] = []): Puzzle {
  return createPuzzle(parseBoard(board), toolbox.map(piece))
}

/** Applies commands one after another and fails the test if one is refused. */
function play(start: Puzzle, ...commands: Command[]): Puzzle {
  return commands.reduce((current, command) => {
    const applied = applyCommand(current, command)
    if (applied === undefined) throw new Error(`Refused: ${JSON.stringify(command)}`)
    return applied.puzzle
  }, start)
}

const toCell = (cell: number) => ({ area: 'board', cell }) as const
const toSlot = (slot: number) => ({ area: 'toolbox', slot }) as const

describe('createPuzzle', () => {
  it('fixes board pieces and frees toolbox pieces', () => {
    const start = puzzle('L2r . Cr', ['M0', 'DM3'])
    expect(start.toolboxSize).toBe(2)
    expect(
      start.items.map(({ id, moveable, rotateable, place }) => ({
        id,
        moveable,
        rotateable,
        place,
      })),
    ).toEqual([
      { id: 0, moveable: false, rotateable: false, place: toCell(0) },
      { id: 1, moveable: false, rotateable: false, place: toCell(2) },
      { id: 2, moveable: true, rotateable: true, place: toSlot(0) },
      { id: 3, moveable: true, rotateable: true, place: toSlot(1) },
    ])
  })

  it('offers two toolbox slots per row, more if the toolbox needs them', () => {
    expect(puzzle('.\n.\n.', ['M0']).toolboxSize).toBe(6)
    expect(puzzle('.', ['M0', 'M0', 'M0']).toolboxSize).toBe(3)
  })
})

describe('move', () => {
  const start = puzzle('L2r . . Cr', ['M0'])

  it('puts a toolbox piece on an empty cell and back', () => {
    const applied = applyCommand(start, { kind: 'move', item: 2, to: toCell(1) })
    expect(applied?.inverse).toEqual({ kind: 'move', item: 2, to: toSlot(0) })
    const placed = applied?.puzzle ?? start
    expect(formatBoard(boardOf(placed))).toBe('L2r M0  .   Cr')
    expect(freeSlot(placed)).toBe(0)
    expect(play(placed, { kind: 'move', item: 2, to: toSlot(1) }).items[2]?.place).toEqual(
      toSlot(1),
    )
  })

  it.each<[string, Command]>([
    ['onto an occupied cell', { kind: 'move', item: 2, to: toCell(0) }],
    ['to where it already is', { kind: 'move', item: 2, to: toSlot(0) }],
    ['a fixed piece', { kind: 'move', item: 0, to: toCell(1) }],
    ['off the board', { kind: 'move', item: 2, to: toCell(4) }],
    ['past the toolbox', { kind: 'move', item: 2, to: toSlot(2) }],
    ['a piece that does not exist', { kind: 'move', item: 9, to: toCell(1) }],
  ])('refuses moving %s', (_, command) => {
    expect(applyCommand(start, command)).toBeUndefined()
  })
})

describe('rotate', () => {
  const start = puzzle('L2r . Cr', ['M0'])

  it('turns a rotateable piece in either direction', () => {
    const applied = applyCommand(start, { kind: 'rotate', item: 2, steps: -1 })
    expect(applied?.inverse).toEqual({ kind: 'rotate', item: 2, steps: 1 })
    expect(itemById(applied?.puzzle ?? start, 2)?.piece.rotation).toBe(7)
  })

  it('refuses fixed pieces and full turns', () => {
    expect(applyCommand(start, { kind: 'rotate', item: 0, steps: 1 })).toBeUndefined()
    expect(applyCommand(start, { kind: 'rotate', item: 2, steps: 8 })).toBeUndefined()
    expect(applyCommand(start, { kind: 'rotate', item: 2, steps: 0 })).toBeUndefined()
  })
})

describe('batch', () => {
  const start = puzzle('L2r . . Cr', ['M0', 'M0'])

  it('applies every command or none', () => {
    const good: Command = {
      kind: 'batch',
      commands: [
        { kind: 'move', item: 2, to: toCell(1) },
        { kind: 'move', item: 3, to: toCell(2) },
      ],
    }
    const bad: Command = {
      kind: 'batch',
      commands: [
        { kind: 'move', item: 2, to: toCell(1) },
        { kind: 'move', item: 3, to: toCell(1) },
      ],
    }
    const applied = applyCommand(start, good)
    expect(applied).toBeDefined()
    expect(applyCommand(start, bad)).toBeUndefined()
    expect(play(applied?.puzzle ?? start, applied?.inverse ?? good)).toEqual(start)
  })
})

describe('cleanupCommand', () => {
  it('returns unlit moveable pieces to the toolbox and keeps lit ones', () => {
    // The mirror in A3 blocks the beam, so light touches it; the one in B4 is dark.
    const placed = play(
      puzzle('L2r . . .\n.   . . .', ['M0', 'M0', 'M0']),
      { kind: 'move', item: 1, to: toCell(2) },
      { kind: 'move', item: 2, to: toCell(7) },
    )
    const command = cleanupCommand(placed, trace(boardOf(placed)).light)
    expect(command).toEqual({ kind: 'batch', commands: [{ kind: 'move', item: 2, to: toSlot(0) }] })
    const cleaned = play(placed, command ?? { kind: 'batch', commands: [] })
    expect(formatBoard(boardOf(cleaned))).toBe('L2r .   M0  .\n.   .   .   .')
  })

  it('stops when the toolbox is full', () => {
    const mirror = (id: number, cell: number): Item => ({
      id,
      piece: piece('M0'),
      moveable: true,
      rotateable: true,
      place: toCell(cell),
    })
    const full: Puzzle = {
      width: 3,
      height: 1,
      toolboxSize: 1,
      items: [mirror(0, 0), mirror(1, 2)],
    }
    expect(cleanupCommand(full, trace(boardOf(full)).light)).toEqual({
      kind: 'batch',
      commands: [{ kind: 'move', item: 0, to: toSlot(0) }],
    })
  })

  it('is undefined when nothing would move', () => {
    const start = puzzle('L2r . Cr', ['M0'])
    expect(cleanupCommand(start, trace(boardOf(start)).light)).toBeUndefined()
  })
})
