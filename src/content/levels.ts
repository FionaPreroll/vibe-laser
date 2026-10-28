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

/** Ticks to wait in a known solution, while actors do their part. */
export interface Wait {
  readonly wait: number
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
  readonly solution: readonly (Placement | Wait)[]
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
  {
    id: 'bend',
    name: { en: 'Bend', de: 'Knick' },
    board: `
      .   .   .   .   Cg
      .   .   .   .   .
      .   .   .   .   .
      L2g .   .   .   .
    `,
    toolbox: ['R0'],
    solution: [{ piece: 0, cell: 'D2', rotation: 2 }],
  },
  {
    id: 'one-way-street',
    name: { en: 'One-Way Street', de: 'Einbahnstraße' },
    // The one-way must let the red beam through and stop the green one in the same cell.
    board: `
      .   .   A   .   .
      L2r .   .   .   Cr
      .   .   L0g .   .
    `,
    toolbox: ['OW0'],
    solution: [{ piece: 0, cell: 'B3', rotation: 2 }],
  },
  {
    id: 'split',
    name: { en: 'Split', de: 'Geteilt' },
    board: `
      .   .   L4g .   .
      .   .   .   .   .
      Cg  .   .   .   Cg
    `,
    toolbox: ['S2'],
    solution: [{ piece: 0, cell: 'C3', rotation: 0 }],
  },
  {
    id: 'three-ways',
    name: { en: 'Three Ways', de: 'Drei Wege' },
    board: `
      Cb  .   .   .   Cb
      .   .   .   .   .
      .   .   .   .   .
      .   .   L0b .   .
    `,
    toolbox: ['SC2'],
    solution: [{ piece: 0, cell: 'C3', rotation: 0 }],
  },
  {
    id: 'rainbow',
    name: { en: 'Rainbow', de: 'Regenbogen' },
    board: `
      .   Cr    .   Cg  .
      .   .     .   .   .
      .   .     .   .   Cb
      .   L0rgb .   .   .
    `,
    toolbox: ['P6'],
    solution: [{ piece: 0, cell: 'C2', rotation: 0 }],
  },
  {
    id: 'color-shift',
    name: { en: 'Color Shift', de: 'Farbwechsel' },
    board: `
      L2r .   .   .   Cg
      L2r .   .   .   Cb
    `,
    toolbox: ['CC0', 'CC0'],
    solution: [
      { piece: 0, cell: 'A3', rotation: 6 },
      { piece: 1, cell: 'B3', rotation: 2 },
    ],
  },
  {
    id: 'filters',
    name: { en: 'Filters', de: 'Filter' },
    board: `
      L2rgb .   .   Cr
      L2rgb .   .   Crg
    `,
    toolbox: ['Fr', 'Frg'],
    solution: [
      { piece: 0, cell: 'A2', rotation: 0 },
      { piece: 1, cell: 'B2', rotation: 0 },
    ],
  },
  {
    id: 'polarized',
    name: { en: 'Polarized', de: 'Polarisiert' },
    // Only blue traveling east may cross B3: the polarizer filters by color and direction at once.
    board: `
      .     .   A   .   .
      L2rgb .   .   .   Cb
      .     .   L0r .   .
    `,
    toolbox: ['PO0b'],
    solution: [{ piece: 0, cell: 'B3', rotation: 2 }],
  },
  {
    id: 'handle-with-care',
    name: { en: 'Handle with Care', de: 'Vorsicht, Sprengstoff' },
    // The short way to the coin runs into the explosive.
    board: `
      .   .   T   .   Cr
      .   .   .   .   .
      L0r .   .   .   .
    `,
    toolbox: ['M0', 'M0'],
    solution: [
      { piece: 0, cell: 'B1', rotation: 3 },
      { piece: 1, cell: 'B5', rotation: 7 },
    ],
  },
  {
    id: 'hungry-slime',
    name: { en: 'Hungry Slime', de: 'Hungriger Schleim' },
    // The slime eats the explosive in its way; only then may the beam pass there.
    board: `
      .   .   T   .   Cr
      .   .   .   .   .
      .   .   SL0 .   .
      L0r .   .   .   .
    `,
    toolbox: ['M0'],
    solution: [{ wait: 20 }, { piece: 0, cell: 'A1', rotation: 3 }],
  },
  {
    id: 'fenced-in',
    name: { en: 'Fenced In', de: 'Eingezäunt' },
    // The beam along row C keeps the mine away from the explosive, and must go on doing so.
    board: `
      .   .   .   .   .
      .   MI2 .   .   .
      L2r .   .   .   .
      .   .   .   .   .
      T   .   .   .   Cr
    `,
    toolbox: ['M0'],
    solution: [{ piece: 0, cell: 'C5', rotation: 5 }],
  },
  {
    id: 'event-horizon',
    name: { en: 'Event Horizon', de: 'Ereignishorizont' },
    // Light falls into the black hole, so it lets the ship be. Take the beam to the coin, and the
    // dark hole pulls the ship in.
    board: `
      .   .   SH2 .   .
      L2r .   .   .   H
      .   .   .   .   .
      .   T   .   .   .
      .   .   .   .   Cr
    `,
    toolbox: ['M0', 'M0'],
    solution: [
      { piece: 0, cell: 'B3', rotation: 5 },
      { piece: 1, cell: 'E3', rotation: 1 },
    ],
  },
  {
    id: 'fuel-run',
    name: { en: 'Fuel Run', de: 'Treibstoff' },
    // Flying over the fuel cell, the ship takes it aboard and shoots the explosive; then the beam
    // may pass.
    board: `
      Cr  T   .   .   .   SH6
      .   .   .   .   FC  .
      .   .   .   .   .   .
      .   .   L0r .   .   .
    `,
    toolbox: ['M0'],
    solution: [{ wait: 20 }, { piece: 0, cell: 'A3', rotation: 5 }],
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

/** The player commands that carry out the level's known solution, and the waits between them. */
export function solutionSteps(level: LevelDefinition): (Command | Wait)[] {
  const puzzle = puzzleOf(level)
  const board = parseBoard(level.board)
  return level.solution.flatMap((step): (Command | Wait)[] => {
    if ('wait' in step) return [step]
    const { piece, cell, rotation } = step
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
