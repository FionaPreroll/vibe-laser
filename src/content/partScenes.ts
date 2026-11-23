import type { Board, PartKind } from '../core/board'
import { parseBoard } from '../core/notation'

/** Every picture in the help shows the same small board, so that the parts keep one size. */
export const SCENE_COLUMNS = 4
export const SCENE_ROWS = 3

/**
 * A small board for each part in the help, with lasers that show what it does to light. Lasers
 * fire east unless the part needs another angle; see notation.ts for the text form.
 */
const SCENES: Readonly<Record<PartKind, string>> = {
  laser: `
    .   .   .   .
    L2r .   .   .
    .   .   .   .`,
  // The beam has exactly the coin's color, so the coin spins.
  coin: `
    .   .   .   .
    L2g .   .   Cg
    .   .   .   .`,
  // The beam passes it by: the anti-coin stays dark and spins.
  antiCoin: `
    .   .   .   .
    L2r .   .   .
    .   .   A   .`,
  mirror: `
    .   .   .   .
    .   .   .   .
    L2r .   M7  .`,
  // Red hits one side and turns north, blue the other and turns south.
  doubleMirror: `
    .   .   .   .
    L2r .   DM7 L6b
    .   .   .   .`,
  // Red reflects off a face, green slips through the slit along the surface.
  slitMirror: `
    .   .   .   .
    L2r .   SM7 .
    .   L1g .   .`,
  refractor: `
    .   .   .   .
    .   .   .   .
    L2r R2  .   .`,
  // The same one-way part, once from its broad side and once from its narrow side.
  oneWay: `
    L2r OW2 .   .
    .   .   .   .
    .   OW2 .   L6b`,
  splitter: `
    .   .   .   .
    L2r .   S6  .
    .   .   .   .`,
  threeway: `
    .   .   .   .
    L2r SC2 .   .
    .   .   .   .`,
  prism: `
    L2rgb P2 .  .
    .   .   .   .
    .   .   .   .`,
  // Red through the narrow end turns green, through the broad end blue.
  colorConverter: `
    L2r CC6 .   .
    .   .   .   .
    L2r CC2 .   .`,
  filter: `
    .   .   .   .
    L2rgb . Fg  .
    .   .   .   .`,
  // Green passes the way the marker points, and nothing passes against it.
  polarizer: `
    L2rgb . PO2g .
    .   .   .   .
    .   PO2g .  L6rgb`,
  bender: `
    L2r BE  .   .
    .   .   .   .
    .   .   .   .`,
  splicer: `
    .   .   .   .
    L2r .   SP6 .
    .   .   .   .`,
  prismirror: `
    .   .   .   .
    .   .   .   .
    L2rgb PM2 . .`,
  // Its own red turns, cyan goes straight on.
  selector: `
    L2rgb SE2r . .
    .   .   .   .
    .   .   .   .`,
  // The outer red turns, the inner green goes straight on, and blue stops.
  complex: `
    L2rgb CX2r/g . .
    .   .   .   .
    .   .   .   .`,
  explosive: `
    .   .   .   .
    L2r .   .   T
    .   .   .   .`,
  fuelCell: `
    .   .   .   .
    L2r .   .   FC
    .   .   .   .`,
  blackHole: `
    .   .   .   .
    L2r .   H   .
    .   .   .   .`,
  // The beam across its path holds the slime back.
  slime: `
    .   .   .   .
    L2r .   .   .
    .   .   SL0 .`,
  mine: `
    .   .   .   .
    L2r .   .   .
    .   .   MI0 .`,
  // The ship flies east, towards the beam that holds it back.
  ship: `
    .   .   L4b .
    .   .   .   .
    SH2 .   .   .`,
}

/** The help's small board for a part. */
export function partScene(kind: PartKind): Board {
  return parseBoard(SCENES[kind])
}
