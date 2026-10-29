import type { PartKind } from '../board'
import { boardOf, itemById } from '../level'
import type { Rules } from '../rules'
import { trace } from '../trace'
import { ACTOR_KINDS } from './kinds'
import { stepMine } from './mine'
import { stepShip } from './ship'
import { stepSlime } from './slime'
import { type ActorEvent, type BoardItem, isOnBoard, type Step, type World } from './world'

export { ACTOR_KINDS, HEADINGS } from './kinds'
export type { ActorEvent, ActorMemory, World } from './world'

type ActorKind = 'slime' | 'mine' | 'ship'

/** Ticks between two steps of each kind: slimes crawl, mines and ships are quicker. */
export const STEP_TICKS: Readonly<Record<ActorKind, number>> = { slime: 12, mine: 4, ship: 4 }

const STEPPERS: Readonly<Record<ActorKind, (world: World, actor: BoardItem) => Step>> = {
  slime: stepSlime,
  mine: stepMine,
  ship: stepShip,
}

function isActorKind(kind: PartKind): kind is ActorKind {
  return ACTOR_KINDS.has(kind)
}

export interface Tick {
  readonly world: World
  readonly events: readonly ActorEvent[]
  /** Cells of the explosives actors ran into: they ignite. */
  readonly ignites: readonly number[]
}

/**
 * One fixed tick: every actor whose turn it is takes one step, in id order, so the first to claim
 * a cell gets it. The light is traced again after each step that changed the board, so the next
 * actor sees the beams as they are. Once an actor ignites an explosive, the others stop. When
 * actors eat, collect or shoot pieces, slimes forget their paths.
 */
export function stepActors(world: World, tick: number, rules: Rules): Tick {
  const turns = world.puzzle.items
    .filter((item) => isOnBoard(item) && isActorKind(item.piece.kind))
    .map((item) => item.id)
    .sort((a, b) => a - b)
  let current = world
  const events: ActorEvent[] = []
  for (const id of turns) {
    const actor = itemById(current.puzzle, id)
    if (actor === undefined || !isOnBoard(actor) || !isActorKind(actor.piece.kind)) continue
    if (tick % STEP_TICKS[actor.piece.kind] !== 0) continue
    const step = STEPPERS[actor.piece.kind](current, actor)
    events.push(...step.events)
    current =
      step.world.puzzle === current.puzzle
        ? step.world
        : { ...step.world, light: trace(boardOf(step.world.puzzle), rules).light }
    if (step.ignites.length > 0) return { world: current, events, ignites: step.ignites }
  }
  if (events.some((event) => event.kind !== 'moved')) {
    current = { ...current, memory: forgetPaths(current.memory) }
  }
  return { world: current, events, ignites: [] }
}

/** Slimes forget their steps once the board changes, because new ways may have opened. */
export function forgetPaths(memory: World['memory']): World['memory'] {
  return Object.fromEntries(
    Object.entries(memory).flatMap(([id, { visited: _, ...rest }]) =>
      Object.keys(rest).length === 0 ? [] : [[id, rest]],
    ),
  )
}
