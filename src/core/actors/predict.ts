import { boardOf, itemById } from '../level'
import type { Rules } from '../rules'
import { trace } from '../trace'
import { STEP_TICKS } from './index'
import { stepShip } from './ship'
import { stepSlime } from './slime'
import { type BoardItem, isOnBoard, type Step, type World } from './world'

/** Where a slime or ship would go, cell by cell, from where it is now. */
export interface PredictedPath {
  readonly item: number
  readonly kind: 'slime' | 'ship'
  /** The cells it walks through, its own cell first. */
  readonly cells: readonly number[]
  /** It would run into an explosive or a fuel cell, at the last cell. */
  readonly ignites: boolean
}

/** How far ahead to look: enough for a slime to cross a big board, and a ship to sweep a few rows. */
const PREDICT_TICKS = 300
const MAX_CELLS = 40

const STEPPERS: Readonly<Record<'slime' | 'ship', (world: World, actor: BoardItem) => Step>> = {
  slime: stepSlime,
  ship: stepShip,
}

/**
 * The ways slimes and ships would take from this world if nobody moved a piece: they follow their
 * own rules, which leave nothing to chance. Mines jump at random, so they stay where they are and
 * only stand in the way. The prediction stops where an actor sets off an explosive.
 */
export function predictPaths(world: World, rules: Rules): PredictedPath[] {
  const paths = new Map<number, { kind: 'slime' | 'ship'; cells: number[]; ignites: boolean }>()
  for (const item of world.puzzle.items) {
    if (!isOnBoard(item)) continue
    const { kind } = item.piece
    if (kind === 'slime' || kind === 'ship') {
      paths.set(item.id, { kind, cells: [item.place.cell], ignites: false })
    }
  }
  let current = world
  const ids = [...paths.keys()].sort((a, b) => a - b)
  for (let tick = 1; tick <= PREDICT_TICKS && ids.length > 0; tick++) {
    for (const id of ids) {
      const path = paths.get(id)
      const actor = itemById(current.puzzle, id)
      if (path === undefined || actor === undefined || !isOnBoard(actor)) continue
      if (tick % STEP_TICKS[path.kind] !== 0 || path.cells.length >= MAX_CELLS) continue
      const step = STEPPERS[path.kind](current, actor)
      for (const event of step.events) {
        if (event.kind === 'moved' && event.item === id) path.cells.push(event.to)
      }
      if (step.ignites.length > 0) {
        path.ignites = true
        path.cells.push(...step.ignites.slice(0, 1))
        return finish(paths)
      }
      current =
        step.world.puzzle === current.puzzle
          ? step.world
          : { ...step.world, light: trace(boardOf(step.world.puzzle), rules).light }
    }
  }
  return finish(paths)
}

function finish(
  paths: ReadonlyMap<number, { kind: 'slime' | 'ship'; cells: number[]; ignites: boolean }>,
): PredictedPath[] {
  return [...paths].map(([item, path]) => ({ item, ...path }))
}
