import { type Board, cellByName, emptyBoard, type Piece, withPiece } from '../core/board'
import { type Color, parseColor } from '../core/color'
import type { Command } from '../core/commands'
import type { Direction } from '../core/direction'
import { createPuzzle, type Puzzle } from '../core/level'
import { DEFAULT_RULES, type Rules } from '../core/rules'
import type { LevelFile } from './schema'

/** Ticks to wait in a known solution, while actors do their part. */
export interface Wait {
  readonly wait: number
}

type FilePiece = { readonly type: Piece['kind']; readonly rot?: number; readonly rgb?: string }

function pieceOf({ type, rot, rgb }: FilePiece): Piece {
  return {
    kind: type,
    rotation: (rot ?? 0) as Direction,
    color: (rgb === undefined ? 0 : (parseColor(rgb) ?? 0)) as Color,
  }
}

/** The toolbox with every entry repeated `count` times, in file order. */
function toolboxOf(level: LevelFile) {
  return level.toolbox.flatMap((entry) => Array.from({ length: entry.count ?? 1 }, () => entry))
}

function boardOfFile(level: LevelFile): Board {
  const [width, height] = level.size
  let board = emptyBoard(width, height)
  for (const object of level.objects) {
    board = withPiece(board, cellByName(board, object.pos), pieceOf(object))
  }
  return board
}

/**
 * The puzzle a checked level file starts with. Pieces on the board are fixed and toolbox pieces
 * free, unless the file says otherwise, as with the original editor's Moveable and Rotateable.
 */
export function puzzleOf(level: LevelFile): Puzzle {
  const board = boardOfFile(level)
  const toolbox = toolboxOf(level)
  const puzzle = createPuzzle(board, toolbox.map(pieceOf))
  const onBoard = new Map(level.objects.map((object) => [cellByName(board, object.pos), object]))
  return {
    ...puzzle,
    items: puzzle.items.map((item) => {
      const entry =
        item.place.area === 'board' ? onBoard.get(item.place.cell) : toolbox[item.place.slot]
      return {
        ...item,
        moveable: entry?.moveable ?? item.moveable,
        rotateable: entry?.rotateable ?? item.rotateable,
      }
    }),
  }
}

/** The rules a level plays by: the defaults, then the pack's overrides, then the level's own. */
export function rulesOf(level: LevelFile, packRules: Partial<Rules> = {}): Rules {
  return { ...DEFAULT_RULES, ...packRules, ...level.rules }
}

/** The player commands that carry out the level's known solution, and the waits between them. */
export function solutionSteps(level: LevelFile): (Command | Wait)[] {
  const puzzle = puzzleOf(level)
  const board = boardOfFile(level)
  return (level.solution ?? []).flatMap((step): (Command | Wait)[] => {
    if ('wait' in step) return [step]
    const item = puzzle.items.find(
      ({ place }) => place.area === 'toolbox' && place.slot === step.piece,
    )
    if (item === undefined) throw new RangeError(`The toolbox has no piece ${step.piece}`)
    const commands: Command[] = [
      { kind: 'move', item: item.id, to: { area: 'board', cell: cellByName(board, step.pos) } },
    ]
    const steps = step.rot - item.piece.rotation
    if (steps !== 0) commands.push({ kind: 'rotate', item: item.id, steps })
    return commands
  })
}
