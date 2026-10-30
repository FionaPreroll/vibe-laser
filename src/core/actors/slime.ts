import { neighbour } from '../board'
import { type Direction, turn } from '../direction'
import { type Item, itemOnCell, removeItems } from '../level'
import { isLit, type LightField } from '../trace'
import { isOpen, moveActor } from './movement'
import { type BoardItem, remember, type Step, still, type World } from './world'

/** Ahead first, then turning right until a way is free. */
const RIGHT_TURNS = [0, 2, 4, 6] as const

/** A slime eats an explosive, or a plain mirror that no light touches; nothing else. */
export function isFood(item: Item, light: LightField): boolean {
  if (item.place.area !== 'board') return false
  if (item.piece.kind === 'explosive') return true
  return item.piece.kind === 'mirror' && !isLit(light, item.place.cell)
}

/**
 * A slime walks ahead, north unless it starts another way, and turns right when something is in
 * its way: a piece, a beam or the edge. Food in its way it eats, and that is its last meal: slime
 * and food are gone. It remembers its steps since the board last changed, and where a step would
 * repeat one, it tries the next way instead, so it does not walk in circles.
 */
export function stepSlime(world: World, slime: BoardItem): Step {
  const cell = slime.place.cell
  const visited = new Set(world.memory[slime.id]?.visited ?? [])
  let circling: Direction | undefined
  for (const steps of RIGHT_TURNS) {
    const heading = turn(slime.piece.rotation, steps)
    const next = neighbour(world.puzzle, cell, heading)
    if (next < 0) continue
    const occupant = itemOnCell(world.puzzle, next)
    if (occupant !== undefined && isFood(occupant, world.light)) {
      const puzzle = removeItems(world.puzzle, [slime.id, occupant.id])
      return {
        world: remember({ ...world, puzzle }, slime.id, undefined),
        events: [
          {
            kind: 'ate',
            item: slime.id,
            food: occupant.id,
            meal: occupant.piece.kind === 'explosive' ? 'explosive' : 'mirror',
            cell: next,
          },
        ],
        ignites: [],
      }
    }
    if (!isOpen(world, cell, heading)) continue
    if (!visited.has(next * 8 + heading)) return walk(world, slime, heading, visited)
    circling ??= heading
  }
  // Every free way repeats an earlier step: start remembering afresh from here.
  return circling === undefined ? still(world) : walk(world, slime, circling, new Set())
}

function walk(world: World, slime: BoardItem, heading: Direction, visited: Set<number>): Step {
  const from = slime.place.cell
  const to = neighbour(world.puzzle, from, heading)
  visited.add(to * 8 + heading)
  const puzzle = moveActor(world.puzzle, slime, to, heading)
  return {
    world: remember({ ...world, puzzle }, slime.id, { visited: [...visited] }),
    events: [{ kind: 'moved', item: slime.id, from, to }],
    ignites: [],
  }
}
