import type { Piece } from '../core/board'
import { cellByName } from '../core/board'
import type { Command } from '../core/commands'
import type { Direction } from '../core/direction'
import { createPuzzle, type Puzzle } from '../core/level'
import { parseBoard, parsePiece } from '../core/notation'
import type { Locale } from '../i18n/locale'

/** Where one toolbox piece goes in a known solution, and how it is turned. */
export interface Placement {
  /** Index of the piece in the level's toolbox. */
  readonly piece: number
  readonly cell: string
  readonly rotation: Direction
}

/**
 * A level until packs arrive in M5. Fixed pieces are written in the text notation of
 * src/core/notation.ts, toolbox pieces as single tokens of it.
 */
export interface LevelDefinition {
  readonly id: string
  readonly name: Readonly<Record<Locale, string>>
  readonly board: string
  readonly toolbox: readonly string[]
  readonly solution: readonly Placement[]
}

export const TUTORIAL: readonly LevelDefinition[] = [
  {
    id: 'first-light',
    name: { en: 'First Light', de: 'Erstes Licht' },
    board: `
      .   .   .   .   .   Cr
      L2r .   .   .   .   .
      .   .   .   .   .   .
    `,
    toolbox: ['M0'],
    solution: [{ piece: 0, cell: 'B6', rotation: 7 }],
  },
  {
    id: 'two-turns',
    name: { en: 'Two Turns', de: 'Zwei Kurven' },
    board: `
      L2b .   .   .   .   .
      .   .   .   .   .   .
      .   .   .   .   .   .
      Cb  .   .   .   .   .
    `,
    toolbox: ['M0', 'M0'],
    solution: [
      { piece: 0, cell: 'A6', rotation: 5 },
      { piece: 1, cell: 'D6', rotation: 7 },
    ],
  },
  {
    id: 'meeting-point',
    name: { en: 'Meeting Point', de: 'Treffpunkt' },
    board: `
      L4r .   .   .   .
      .   .   Crb .   .
      .   .   .   .   L0b
    `,
    toolbox: ['M0', 'M0'],
    solution: [
      { piece: 0, cell: 'B1', rotation: 1 },
      { piece: 1, cell: 'B5', rotation: 5 },
    ],
  },
  {
    id: 'dark-coin',
    name: { en: 'Dark Coin', de: 'Dunkle Münze' },
    board: `
      L2g .   A   .   Cg
      .   .   .   .   .
    `,
    toolbox: ['M0', 'M0', 'M0'],
    solution: [
      { piece: 0, cell: 'A2', rotation: 5 },
      { piece: 1, cell: 'B2', rotation: 1 },
      { piece: 2, cell: 'B5', rotation: 7 },
    ],
  },
  {
    id: 'through-the-slit',
    name: { en: 'Through the Slit', de: 'Durch den Spalt' },
    board: `
      .   .   .   .   .
      L2r .   .   .   Cr
      .   .   .   .   .
      L1g .   .   .   Cg
    `,
    toolbox: ['SM0'],
    solution: [{ piece: 0, cell: 'B3', rotation: 0 }],
  },
]

function toolboxPiece(token: string, level: LevelDefinition): Piece {
  const piece = parsePiece(token, `Toolbox piece "${token}" of ${level.id}`)
  if (piece === undefined) throw new SyntaxError(`${level.id} has an empty toolbox piece`)
  return piece
}

export function puzzleOf(level: LevelDefinition): Puzzle {
  return createPuzzle(
    parseBoard(level.board),
    level.toolbox.map((token) => toolboxPiece(token, level)),
  )
}

/** The player commands that carry out the level's known solution. */
export function solutionCommands(level: LevelDefinition): Command[] {
  const puzzle = puzzleOf(level)
  const board = parseBoard(level.board)
  return level.solution.flatMap(({ piece, cell, rotation }) => {
    const item = puzzle.items.find(({ place }) => place.area === 'toolbox' && place.slot === piece)
    if (item === undefined) throw new RangeError(`${level.id} has no toolbox piece ${piece}`)
    const to = cellByName(board, cell)
    if (to < 0) throw new RangeError(`${level.id} has no cell ${cell}`)
    const steps = rotation - item.piece.rotation
    const commands: Command[] = [{ kind: 'move', item: item.id, to: { area: 'board', cell: to } }]
    if (steps !== 0) commands.push({ kind: 'rotate', item: item.id, steps })
    return commands
  })
}
