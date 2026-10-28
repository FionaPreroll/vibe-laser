import { neighbour } from '../board'
import { DIRECTIONS, type Direction } from '../direction'
import { itemOnCell } from '../level'
import { pick } from '../random'
import { lightBars, moveActor } from './movement'
import { type BoardItem, type Step, still, type World } from './world'

/**
 * A robot mine jumps from cell to cell in any of the eight directions. It keeps its heading while
 * the way is open and bounces off pieces, beams and the edge into a random open direction. It does
 * not shy away from explosives: running into one ignites it.
 */
export function stepMine(world: World, mine: BoardItem): Step {
  const cell = mine.place.cell
  const open = (direction: Direction) => {
    const next = neighbour(world.puzzle, cell, direction)
    if (next < 0 || lightBars(world.puzzle, world.light, cell, direction)) return false
    const occupant = itemOnCell(world.puzzle, next)
    return occupant === undefined || occupant.piece.kind === 'explosive'
  }
  let heading: Direction | undefined = mine.piece.rotation
  let random = world.random
  if (!open(heading)) {
    const bounce = pick(DIRECTIONS.filter(open), random)
    heading = bounce.item
    random = bounce.state
  }
  if (heading === undefined) return still(world)
  const next = neighbour(world.puzzle, cell, heading)
  if (itemOnCell(world.puzzle, next) !== undefined) {
    return {
      world: { ...world, puzzle: moveActor(world.puzzle, mine, cell, heading), random },
      events: [{ kind: 'rammed', item: mine.id, cell: next }],
      ignites: [next],
    }
  }
  return {
    world: { ...world, puzzle: moveActor(world.puzzle, mine, next, heading), random },
    events: [{ kind: 'moved', item: mine.id, from: cell, to: next }],
    ignites: [],
  }
}
