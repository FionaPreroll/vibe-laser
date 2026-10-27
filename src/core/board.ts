import type { Color } from './color'
import { type Direction, DX, DY } from './direction'
import { MAX_ROWS, parseCellName } from './grid'

/** The parts known so far; later milestones add hazards, actors and expansion parts. */
export type PartKind =
  | 'laser'
  | 'mirror'
  | 'doubleMirror'
  | 'slitMirror'
  | 'refractor'
  | 'oneWay'
  | 'splitter'
  | 'threeway'
  | 'prism'
  | 'colorConverter'
  | 'filter'
  | 'polarizer'
  | 'coin'
  | 'antiCoin'

export interface Piece {
  readonly kind: PartKind
  /** Clockwise 45° steps from the base orientation. A laser fires in the direction of its rotation. */
  readonly rotation: Direction
  /**
   * Color of lasers, coins, filters and polarizers; 0 for every other part. A laser with color 0
   * is switched off.
   */
  readonly color: Color
}

export interface Board {
  readonly width: number
  readonly height: number
  /** One entry per cell, row by row starting at A1; undefined is an empty cell. */
  readonly cells: readonly (Piece | undefined)[]
}

export function emptyBoard(width: number, height: number): Board {
  if (!Number.isInteger(width) || width < 1) {
    throw new RangeError(`Board width ${width} is not a positive whole number`)
  }
  if (!Number.isInteger(height) || height < 1 || height > MAX_ROWS) {
    throw new RangeError(`Board height ${height} is outside 1 to ${MAX_ROWS}`)
  }
  return { width, height, cells: Array.from({ length: width * height }, () => undefined) }
}

/** Index of the cell in column x and row y, or -1 outside the board. */
export function cellIndex(board: Board, x: number, y: number): number {
  return x >= 0 && x < board.width && y >= 0 && y < board.height ? y * board.width + x : -1
}

/** Index of a cell named as in the original, such as "K5"; -1 for other names or cells off the board. */
export function cellByName(board: Board, name: string): number {
  const cell = parseCellName(name)
  return cell === undefined ? -1 : cellIndex(board, cell.x, cell.y)
}

/** The neighbouring cell in a direction, or -1 beyond the board's edge. */
export function neighbour(board: Board, cell: number, direction: Direction): number {
  const x = (cell % board.width) + DX[direction]
  const y = Math.floor(cell / board.width) + DY[direction]
  return cellIndex(board, x, y)
}

/** A copy of the board with `piece` in `cell`; undefined empties the cell. */
export function withPiece(board: Board, cell: number, piece: Piece | undefined): Board {
  if (!Number.isInteger(cell) || cell < 0 || cell >= board.cells.length) {
    throw new RangeError(`Cell ${cell} lies outside a ${board.width} × ${board.height} board`)
  }
  const cells = [...board.cells]
  cells[cell] = piece
  return { ...board, cells }
}
