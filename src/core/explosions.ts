import { neighbour, type PartKind } from './board'
import { DIRECTIONS } from './direction'
import { itemOnCell, type Puzzle, removeItems } from './level'
import { isLit, type LightField } from './trace'

/** Kinds that blow up when light, a mine or a ship reaches them. */
export const EXPLOSIVE_KINDS: ReadonlySet<PartKind> = new Set<PartKind>(['explosive', 'fuelCell'])

/** Black holes swallow explosions as they swallow light. */
const INDESTRUCTIBLE_KINDS: ReadonlySet<PartKind> = new Set<PartKind>(['blackHole'])

/** Cells of the explosives that light reaches, in reading order; each of them ignites. */
export function litExplosives(puzzle: Puzzle, light: LightField): number[] {
  const cells: number[] = []
  for (const { piece, place } of puzzle.items) {
    if (place.area !== 'board' || !EXPLOSIVE_KINDS.has(piece.kind)) continue
    if (isLit(light, place.cell)) cells.push(place.cell)
  }
  return cells.sort((a, b) => a - b)
}

export interface Blast {
  readonly puzzle: Puzzle
  /** Ids of the items the blast destroyed, the burning explosives included. */
  readonly destroyed: readonly number[]
  /** Cells of the explosives the blast reached, in reading order; they burn on the next tick. */
  readonly next: readonly number[]
}

/**
 * One tick of an explosion chain. Each burning cell loses its explosive and destroys everything on
 * its eight neighbours, except black holes; explosives among them ignite and burn on the next tick.
 */
export function burn(puzzle: Puzzle, burning: readonly number[]): Blast {
  const burningNow = new Set(burning)
  const destroyed = new Set<number>()
  const next = new Set<number>()
  for (const cell of burningNow) {
    const own = itemOnCell(puzzle, cell)
    if (own !== undefined) destroyed.add(own.id)
    for (const direction of DIRECTIONS) {
      const around = neighbour(puzzle, cell, direction)
      if (around < 0 || burningNow.has(around)) continue
      const item = itemOnCell(puzzle, around)
      if (item === undefined || INDESTRUCTIBLE_KINDS.has(item.piece.kind)) continue
      if (EXPLOSIVE_KINDS.has(item.piece.kind)) next.add(around)
      else destroyed.add(item.id)
    }
  }
  return {
    puzzle: removeItems(puzzle, destroyed),
    destroyed: [...destroyed].sort((a, b) => a - b),
    next: [...next].sort((a, b) => a - b),
  }
}
