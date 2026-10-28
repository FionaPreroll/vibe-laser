import { turn } from './direction'
import {
  freeSlot,
  isInside,
  itemAt,
  itemById,
  type Place,
  type Puzzle,
  replaceItem,
  samePlace,
} from './level'
import { ROTATING_KINDS } from './parts'
import { isLit, type LightField } from './trace'

/** A player move. Batches apply all of their commands or none. */
export type Command =
  | { readonly kind: 'move'; readonly item: number; readonly to: Place }
  | { readonly kind: 'rotate'; readonly item: number; readonly steps: number }
  | { readonly kind: 'batch'; readonly commands: readonly Command[] }

export interface Applied {
  readonly puzzle: Puzzle
  /** The command that takes the puzzle back to where it was. */
  readonly inverse: Command
}

/** Applies a command; undefined when the rules forbid it or it would change nothing. */
export function applyCommand(puzzle: Puzzle, command: Command): Applied | undefined {
  switch (command.kind) {
    case 'move':
      return move(puzzle, command.item, command.to)
    case 'rotate':
      return rotate(puzzle, command.item, command.steps)
    case 'batch': {
      let current = puzzle
      const inverses: Command[] = []
      for (const step of command.commands) {
        const applied = applyCommand(current, step)
        if (applied === undefined) return undefined
        current = applied.puzzle
        inverses.unshift(applied.inverse)
      }
      if (inverses.length === 0) return undefined
      return { puzzle: current, inverse: { kind: 'batch', commands: inverses } }
    }
  }
}

function move(puzzle: Puzzle, id: number, to: Place): Applied | undefined {
  const item = itemById(puzzle, id)
  if (!item?.moveable || samePlace(item.place, to) || !isInside(puzzle, to)) return undefined
  if (itemAt(puzzle, to) !== undefined) return undefined
  return {
    puzzle: replaceItem(puzzle, { ...item, place: to }),
    inverse: { kind: 'move', item: id, to: item.place },
  }
}

function rotate(puzzle: Puzzle, id: number, steps: number): Applied | undefined {
  const item = itemById(puzzle, id)
  if (!item?.rotateable || !ROTATING_KINDS.has(item.piece.kind)) return undefined
  if (!Number.isInteger(steps) || steps % 8 === 0) return undefined
  const piece = { ...item.piece, rotation: turn(item.piece.rotation, steps) }
  return {
    puzzle: replaceItem(puzzle, { ...item, piece }),
    inverse: { kind: 'rotate', item: id, steps: -steps },
  }
}

/**
 * Cleanup from the original: every moveable piece on the board that no light touches goes back
 * into the toolbox, in reading order, while free slots last. Undefined when nothing would move.
 */
export function cleanupCommand(puzzle: Puzzle, light: LightField): Command | undefined {
  const unlit = puzzle.items
    .flatMap((item) => (item.place.area === 'board' ? [{ item, cell: item.place.cell }] : []))
    .filter(({ item, cell }) => item.moveable && !isLit(light, cell))
    .sort((a, b) => a.cell - b.cell)
  const moves: Command[] = []
  let current = puzzle
  for (const { item } of unlit) {
    const slot = freeSlot(current)
    if (slot === undefined) break
    const command: Command = { kind: 'move', item: item.id, to: { area: 'toolbox', slot } }
    const applied = applyCommand(current, command)
    if (applied === undefined) continue
    current = applied.puzzle
    moves.push(command)
  }
  return moves.length === 0 ? undefined : { kind: 'batch', commands: moves }
}
