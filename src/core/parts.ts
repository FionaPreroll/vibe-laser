import type { PartKind, Piece } from './board'
import { type Primary, shiftBackward, shiftForward } from './color'
import { type Direction, turn } from './direction'
import type { Rules } from './rules'

export interface Exit {
  readonly direction: Direction
  readonly primary: Primary
}

type Exits = readonly Direction[]

/** Exit directions for each direction of travel, indexed by the direction the beam travels. */
type Table = readonly [Exits, Exits, Exits, Exits, Exits, Exits, Exits, Exits]

/**
 * What a part does with one primary color traveling into it, in the part's own frame, rotation 0.
 * An empty list stops the beam. Other rotations reuse the behavior: `transfer` turns the beam
 * into the part's frame and turns the exits back.
 */
type Behavior = (travel: Direction, primary: Primary, piece: Piece, rules: Rules) => readonly Exit[]

const pass: Behavior = (travel, primary) => [{ direction: travel, primary }]
const stop: Behavior = () => []
const actor: Behavior = (travel, primary, piece, rules) =>
  rules.actorsBlockLight ? [] : pass(travel, primary, piece, rules)

function fromTable(table: Table): Behavior {
  return (travel, primary) => table[travel].map((direction) => ({ direction, primary }))
}

// The mirror family has its reflecting side facing north, so the mirror line runs east to west.
// A beam arriving at 45° turns by 90°; one arriving head-on goes straight back.
// Only the front of a mirror reflects; beams along the surface or onto the back stop.
const MIRROR: Table = [[], [], [], [1], [0], [7], [], []]
const DOUBLE_MIRROR: Table = [[4], [3], [], [1], [0], [7], [], [5]]
// A double mirror whose slit lets beams along the surface pass. That the other mirrors stop such
// beams is inferred: the slit is the only documented way through.
const SLIT_MIRROR: Table = [[4], [3], [2], [1], [0], [7], [6], [5]]

// A glass bar along the north–south line whose slanted ends bend light by 45°. A beam entering an
// end straight leaves diagonally; one entering diagonally from the matching side leaves straight,
// so every path also runs backwards. The other diagonal and the shaded long sides stop beams.
const REFRACTOR: Table = [[7], [], [], [4], [3], [], [], [0]]

// Lets light in only straight through its broad south side; it leaves to the north.
const ONE_WAY: Table = [[0], [], [], [], [], [], [], []]

// Light that hits the tip, coming from the north, splits 90° to the left and to the right.
const SPLITTER: Table = [[], [], [], [], [2, 6], [], [], []]

// Light entering the flat south side splits and leaves both bevels turned 45°; light entering a
// bevel leaves through the flat side, turned 45°.
const THREEWAY: Table = [[1, 7], [], [], [4], [], [4], [], []]

// Light enters the prism through its south side. Red keeps going, green turns 45° to the right,
// blue 90°. The same paths run backwards, which merges primaries leaving in one direction.
const PRISM: Readonly<Record<Primary, Table>> = {
  1: [[0], [], [], [], [4], [], [], []],
  2: [[1], [], [], [], [], [4], [], []],
  4: [[2], [], [], [], [], [], [4], []],
}

const BEHAVIORS: Readonly<Record<PartKind, Behavior>> = {
  laser: (travel, primary, piece, rules) =>
    rules.beamIntoLaser === 'pass' ? pass(travel, primary, piece, rules) : [],
  mirror: fromTable(MIRROR),
  doubleMirror: fromTable(DOUBLE_MIRROR),
  slitMirror: fromTable(SLIT_MIRROR),
  refractor: fromTable(REFRACTOR),
  oneWay: fromTable(ONE_WAY),
  splitter: fromTable(SPLITTER),
  threeway: fromTable(THREEWAY),
  prism: (travel, primary) => PRISM[primary][travel].map((direction) => ({ direction, primary })),
  // Straight through either end. The broad south side turns red blue, blue green and green red;
  // the narrow north side turns red green, green blue and blue red. White stays white.
  colorConverter: (travel, primary) => {
    if (travel === 0) return [{ direction: 0, primary: shiftBackward(primary) as Primary }]
    if (travel === 4) return [{ direction: 4, primary: shiftForward(primary) as Primary }]
    return []
  },
  // Lets its own components through, from every direction; filters do not rotate.
  filter: (travel, primary, piece) =>
    (piece.color & primary) !== 0 ? [{ direction: travel, primary }] : [],
  // A filter that also demands a direction: north in rotation 0, south too under the 'axis' rule.
  polarizer: (travel, primary, piece, rules) => {
    const aligned = travel === 0 || (rules.polarizer === 'axis' && travel === 4)
    return aligned && (piece.color & primary) !== 0 ? [{ direction: travel, primary }] : []
  },
  // Beams run through coins unchanged (spec). For anti-coins that is an assumption.
  coin: pass,
  antiCoin: pass,
  // Light that reaches an explosive or a fuel cell ignites it and goes no further.
  explosive: stop,
  fuelCell: stop,
  blackHole: stop,
  slime: actor,
  mine: actor,
  ship: actor,
}

/** Kinds with a rotation: it turns how a part acts on beams, or the way an actor heads. */
export const ROTATING_KINDS: ReadonlySet<PartKind> = new Set<PartKind>([
  'laser',
  'mirror',
  'doubleMirror',
  'slitMirror',
  'refractor',
  'oneWay',
  'splitter',
  'threeway',
  'prism',
  'colorConverter',
  'polarizer',
  'slime',
  'mine',
  'ship',
])

/** Where a primary goes after entering a cell while traveling in `travel`; [] if the cell stops it. */
export function transfer(
  piece: Piece | undefined,
  travel: Direction,
  primary: Primary,
  rules: Rules,
): readonly Exit[] {
  if (piece === undefined) return [{ direction: travel, primary }]
  const exits = BEHAVIORS[piece.kind](turn(travel, -piece.rotation), primary, piece, rules)
  return exits.map((exit) => ({
    direction: turn(exit.direction, piece.rotation),
    primary: exit.primary,
  }))
}
