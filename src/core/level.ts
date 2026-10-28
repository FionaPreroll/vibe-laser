import type { Board, Piece } from './board'
import { ROTATING_KINDS } from './parts'

/** Where a piece sits: on a board cell or in a toolbox slot. */
export type Place =
  | { readonly area: 'board'; readonly cell: number }
  | { readonly area: 'toolbox'; readonly slot: number }

export interface Item {
  readonly id: number
  readonly piece: Piece
  /** Whether the player may move the piece, like the original editor's Moveable switch. */
  readonly moveable: boolean
  /** Whether the player may rotate the piece (Rotateable). */
  readonly rotateable: boolean
  readonly place: Place
}

/** The part of a level the player changes: which piece sits where, and how it is turned. */
export interface Puzzle {
  readonly width: number
  readonly height: number
  readonly toolboxSize: number
  readonly items: readonly Item[]
}

/**
 * A puzzle from a board and the pieces of its toolbox. Pieces on the board stay fixed; toolbox
 * pieces can be moved, and rotated if their kind has a rotation. The toolbox has two slots per
 * board row, or more if needed.
 */
export function createPuzzle(board: Board, toolbox: readonly Piece[]): Puzzle {
  const items: Item[] = []
  board.cells.forEach((piece, cell) => {
    if (piece === undefined) return
    items.push({
      id: items.length,
      piece,
      moveable: false,
      rotateable: false,
      place: { area: 'board', cell },
    })
  })
  toolbox.forEach((piece, slot) => {
    items.push({
      id: items.length,
      piece,
      moveable: true,
      rotateable: ROTATING_KINDS.has(piece.kind),
      place: { area: 'toolbox', slot },
    })
  })
  return {
    width: board.width,
    height: board.height,
    toolboxSize: Math.max(2 * board.height, toolbox.length),
    items,
  }
}

/** The board as the tracer sees it: the pieces on it, without the toolbox. */
export function boardOf(puzzle: Puzzle): Board {
  const cells: (Piece | undefined)[] = Array.from(
    { length: puzzle.width * puzzle.height },
    () => undefined,
  )
  for (const item of puzzle.items) {
    if (item.place.area === 'board') cells[item.place.cell] = item.piece
  }
  return { width: puzzle.width, height: puzzle.height, cells }
}

export function samePlace(a: Place, b: Place): boolean {
  return a.area === 'board'
    ? b.area === 'board' && a.cell === b.cell
    : b.area === 'toolbox' && a.slot === b.slot
}

/** Whether the place exists in this puzzle: a cell on the board or a slot in the toolbox. */
export function isInside(puzzle: Puzzle, place: Place): boolean {
  const index = place.area === 'board' ? place.cell : place.slot
  const size = place.area === 'board' ? puzzle.width * puzzle.height : puzzle.toolboxSize
  return Number.isInteger(index) && index >= 0 && index < size
}

export function itemAt(puzzle: Puzzle, place: Place): Item | undefined {
  return puzzle.items.find((item) => samePlace(item.place, place))
}

export function itemById(puzzle: Puzzle, id: number): Item | undefined {
  return puzzle.items.find((item) => item.id === id)
}

/** The item on a board cell, if any. */
export function itemOnCell(puzzle: Puzzle, cell: number): Item | undefined {
  return itemAt(puzzle, { area: 'board', cell })
}

/** The puzzle with `changed` in place of the item with its id. */
export function replaceItem(puzzle: Puzzle, changed: Item): Puzzle {
  return {
    ...puzzle,
    items: puzzle.items.map((item) => (item.id === changed.id ? changed : item)),
  }
}

/** The puzzle without the items with these ids: eaten, shot or blown up. */
export function removeItems(puzzle: Puzzle, ids: Iterable<number>): Puzzle {
  const gone = new Set(ids)
  return gone.size === 0
    ? puzzle
    : { ...puzzle, items: puzzle.items.filter((item) => !gone.has(item.id)) }
}

/** The first empty toolbox slot, or undefined when the toolbox is full. */
export function freeSlot(puzzle: Puzzle): number | undefined {
  for (let slot = 0; slot < puzzle.toolboxSize; slot++) {
    if (itemAt(puzzle, { area: 'toolbox', slot }) === undefined) return slot
  }
  return undefined
}
