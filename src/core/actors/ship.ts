import { neighbour } from '../board'
import { type Direction, opposite } from '../direction'
import { EXPLOSIVE_KINDS } from '../explosions'
import { itemOnCell, type Puzzle, removeItems } from '../level'
import { isLit, type LightField } from '../trace'
import { moveActor } from './movement'
import { type ActorEvent, type BoardItem, remember, type Step, type World } from './world'

const SOUTH: Direction = 4
const ORTHOGONAL: readonly Direction[] = [0, 2, 4, 6]

/**
 * A spaceship flies east or west and follows its course stubbornly: when something is in its way,
 * it drops one row and flies back. Passing right above a fuel cell, it takes the cell aboard and
 * can then fire once at the next explosive or fuel cell ahead; the shot passes other pieces.
 * Running into an explosive or a fuel cell ignites it. An unlit black hole in line with it, with
 * nothing in between, pulls the ship in and destroys it; a beam in between holds it where it is.
 */
export function stepShip(world: World, ship: BoardItem): Step {
  const events: ActorEvent[] = []
  const cell = ship.place.cell
  let { puzzle } = world
  let shots = world.memory[ship.id]?.shots ?? 0
  const done = (changed: Puzzle, ignites: readonly number[] = []): Step => ({
    world: remember({ ...world, puzzle: changed }, ship.id, shots > 0 ? { shots } : undefined),
    events,
    ignites,
  })

  const below = neighbour(puzzle, cell, SOUTH)
  const fuel = below < 0 ? undefined : itemOnCell(puzzle, below)
  if (fuel?.piece.kind === 'fuelCell') {
    puzzle = removeItems(puzzle, [fuel.id])
    shots++
    events.push({ kind: 'collected', item: ship.id, fuel: fuel.id, cell: below })
  }

  const pull = blackHolePull(puzzle, world.light, cell)
  if (pull !== undefined) {
    const next = neighbour(puzzle, cell, pull)
    if (itemOnCell(puzzle, next)?.piece.kind === 'blackHole') {
      events.push({ kind: 'swallowed', item: ship.id, cell: next })
      shots = 0
      return done(removeItems(puzzle, [ship.id]))
    }
    if (isLit(world.light, next)) return done(puzzle)
    events.push({ kind: 'moved', item: ship.id, from: cell, to: next })
    return done(moveActor(puzzle, ship, next, ship.piece.rotation))
  }

  const heading = ship.piece.rotation
  const target = shots > 0 ? targetAhead(puzzle, cell, heading) : undefined
  if (target !== undefined) {
    puzzle = removeItems(puzzle, [target.id])
    shots--
    events.push({ kind: 'fired', item: ship.id, target: target.id, from: cell, at: target.cell })
  }

  const enter = (next: number, turned: Direction): Step | undefined => {
    if (next < 0) return undefined
    const occupant = itemOnCell(puzzle, next)
    if (occupant !== undefined && EXPLOSIVE_KINDS.has(occupant.piece.kind)) {
      events.push({ kind: 'rammed', item: ship.id, cell: next })
      return done(puzzle, [next])
    }
    if (occupant !== undefined || isLit(world.light, next)) return undefined
    events.push({ kind: 'moved', item: ship.id, from: cell, to: next })
    return done(moveActor(puzzle, ship, next, turned))
  }
  return (
    enter(neighbour(puzzle, cell, heading), heading) ??
    enter(neighbour(puzzle, cell, SOUTH), opposite(heading)) ??
    // Nowhere to go: it turns round where it is.
    done(moveActor(puzzle, ship, cell, opposite(heading)))
  )
}

/** The cells in a straight line from a cell to the edge of the board, nearest first. */
function* line(puzzle: Puzzle, from: number, direction: Direction): Generator<number> {
  for (let cell = neighbour(puzzle, from, direction); cell >= 0; ) {
    yield cell
    cell = neighbour(puzzle, cell, direction)
  }
}

/** The way to the nearest unlit black hole in line with the ship, with nothing in between. */
function blackHolePull(puzzle: Puzzle, light: LightField, from: number): Direction | undefined {
  let nearest: { direction: Direction; distance: number } | undefined
  for (const direction of ORTHOGONAL) {
    let distance = 0
    for (const cell of line(puzzle, from, direction)) {
      distance++
      const item = itemOnCell(puzzle, cell)
      if (item === undefined) continue
      const pulls = item.piece.kind === 'blackHole' && !isLit(light, cell)
      if (pulls && distance < (nearest?.distance ?? Number.POSITIVE_INFINITY)) {
        nearest = { direction, distance }
      }
      break
    }
  }
  return nearest?.direction
}

/** The next explosive or fuel cell ahead of the ship in its row; the shot passes everything else. */
function targetAhead(
  puzzle: Puzzle,
  from: number,
  heading: Direction,
): { readonly id: number; readonly cell: number } | undefined {
  for (const cell of line(puzzle, from, heading)) {
    const item = itemOnCell(puzzle, cell)
    if (item !== undefined && EXPLOSIVE_KINDS.has(item.piece.kind)) return { id: item.id, cell }
  }
  return undefined
}
