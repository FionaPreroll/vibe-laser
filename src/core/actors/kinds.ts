import type { PartKind } from '../board'
import type { Direction } from '../direction'

/** Pieces that move by themselves, in fixed ticks. */
export const ACTOR_KINDS: ReadonlySet<PartKind> = new Set<PartKind>(['slime', 'mine', 'ship'])

/**
 * The headings an actor may have where not every direction is allowed: slimes walk straight along
 * rows and columns, ships fly east or west.
 */
export const HEADINGS: Readonly<Partial<Record<PartKind, readonly Direction[]>>> = {
  slime: [0, 2, 4, 6],
  ship: [2, 6],
}
