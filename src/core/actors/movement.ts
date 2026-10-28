import { neighbour } from '../board'
import { type Direction, turn } from '../direction'
import { itemOnCell, type Puzzle, replaceItem } from '../level'
import { halfColor, isLit, type LightField } from '../trace'
import type { BoardItem, World } from './world'

/**
 * Whether light bars a step: the target cell is lit, or for a diagonal step, a beam runs along the
 * crossing diagonal through the shared corner. That is how diagonal beams trap a mine.
 */
export function lightBars(
  puzzle: Puzzle,
  light: LightField,
  from: number,
  direction: Direction,
): boolean {
  const to = neighbour(puzzle, from, direction)
  if (to >= 0 && isLit(light, to)) return true
  if (to < 0 || direction % 2 === 0) return false
  // For a step to the north-east, the crossing diagonal runs from the cell to the north to the
  // cell to the east.
  const left = neighbour(puzzle, from, turn(direction, -1))
  const right = neighbour(puzzle, from, turn(direction, 1))
  return (
    halfColor(light, left, turn(direction, 2)) !== 0 ||
    halfColor(light, right, turn(direction, -2)) !== 0
  )
}

/** Whether an actor may step onto the neighbouring cell: it lies on the board, empty and unlit. */
export function isOpen(world: World, from: number, direction: Direction): boolean {
  const to = neighbour(world.puzzle, from, direction)
  return (
    to >= 0 &&
    itemOnCell(world.puzzle, to) === undefined &&
    !lightBars(world.puzzle, world.light, from, direction)
  )
}

/** The puzzle with the actor on another cell, heading another way. */
export function moveActor(
  puzzle: Puzzle,
  actor: BoardItem,
  cell: number,
  heading: Direction,
): Puzzle {
  const piece = { ...actor.piece, rotation: heading }
  return replaceItem(puzzle, { ...actor, piece, place: { area: 'board', cell } })
}
