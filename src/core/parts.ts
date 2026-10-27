import type { PartKind, Piece } from './board'
import type { Primary } from './color'
import { type Direction, turn } from './direction'
import type { Rules } from './rules'

export interface Exit {
  readonly direction: Direction
  readonly primary: Primary
}

type Exits = readonly Direction[]

/**
 * Exit directions for each direction of travel, for a part in rotation 0, indexed by the direction
 * the beam travels. An empty list stops the beam. Other rotations reuse the table: the beam is
 * turned into the part's frame, and its exits are turned back.
 */
type Table = readonly [Exits, Exits, Exits, Exits, Exits, Exits, Exits, Exits]

// The mirror family in rotation 0 has its reflecting side facing north, so the mirror line runs
// east to west. A beam arriving at 45° turns by 90°; one arriving head-on goes straight back.
const MIRROR_TABLES: Record<'mirror' | 'doubleMirror' | 'slitMirror', Table> = {
  // Only the front reflects. Beams along the surface or onto the back stop.
  mirror: [[], [], [], [1], [0], [7], [], []],
  // Both sides reflect.
  doubleMirror: [[4], [3], [], [1], [0], [7], [], [5]],
  // A double mirror with a slit that lets beams along the surface pass. That the other mirrors stop
  // such beams is inferred: the slit is the only documented way through.
  slitMirror: [[4], [3], [2], [1], [0], [7], [6], [5]],
}

/** Kinds whose rotation changes how they act on beams. */
export const ROTATING_KINDS: ReadonlySet<PartKind> = new Set<PartKind>([
  'laser',
  'mirror',
  'doubleMirror',
  'slitMirror',
])

/** Where a primary goes after entering a cell while traveling in `travel`; [] if the cell stops it. */
export function transfer(
  piece: Piece | undefined,
  travel: Direction,
  primary: Primary,
  rules: Rules,
): readonly Exit[] {
  if (piece === undefined) return [{ direction: travel, primary }]
  switch (piece.kind) {
    case 'coin':
    case 'antiCoin':
      // Beams run through coins unchanged (spec). For anti-coins that is an assumption.
      return [{ direction: travel, primary }]
    case 'laser':
      return rules.beamIntoLaser === 'pass' ? [{ direction: travel, primary }] : []
    case 'mirror':
    case 'doubleMirror':
    case 'slitMirror': {
      const exits = MIRROR_TABLES[piece.kind][turn(travel, -piece.rotation)]
      return exits.map((exit) => ({ direction: turn(exit, piece.rotation), primary }))
    }
  }
}
