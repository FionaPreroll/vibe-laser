import type { Item, Place, Puzzle } from '../level'
import type { LightField } from '../trace'

/** What an actor remembers besides its cell and heading. */
export interface ActorMemory {
  /** Slimes: cell × 8 + heading after each step since the board last changed, to notice circles. */
  readonly visited?: readonly number[]
  /** Ships: fuel cells taken aboard and not fired yet. */
  readonly shots?: number
}

/** Everything actors see and change in one tick. */
export interface World {
  readonly puzzle: Puzzle
  readonly light: LightField
  /** Memory of each actor, by item id. */
  readonly memory: Readonly<Record<number, ActorMemory>>
  /** State of the seeded random generator. */
  readonly random: number
}

export type ActorEvent =
  | { readonly kind: 'moved'; readonly item: number; readonly from: number; readonly to: number }
  | { readonly kind: 'ate'; readonly item: number; readonly food: number; readonly cell: number }
  | {
      readonly kind: 'collected'
      readonly item: number
      readonly fuel: number
      readonly cell: number
    }
  | {
      readonly kind: 'fired'
      readonly item: number
      readonly target: number
      readonly from: number
      readonly at: number
    }
  | { readonly kind: 'swallowed'; readonly item: number; readonly cell: number }
  | { readonly kind: 'rammed'; readonly item: number; readonly cell: number }

/** The result of one actor's step. */
export interface Step {
  readonly world: World
  readonly events: readonly ActorEvent[]
  /** Cells of the explosives the actor ran into: they ignite. */
  readonly ignites: readonly number[]
}

/** An item on a board cell. */
export type BoardItem = Item & { readonly place: Extract<Place, { area: 'board' }> }

export function isOnBoard(item: Item): item is BoardItem {
  return item.place.area === 'board'
}

/** A step that changes nothing. */
export function still(world: World): Step {
  return { world, events: [], ignites: [] }
}

export function remember(world: World, id: number, memory: ActorMemory | undefined): World {
  const { [id]: _, ...others } = world.memory
  return { ...world, memory: memory === undefined ? others : { ...others, [id]: memory } }
}
