import { HEADINGS } from '../core/actors/kinds'
import type { PartKind } from '../core/board'
import { COLORED_KINDS } from '../core/notation'
import { ROTATING_KINDS } from '../core/parts'
import type { PieceSpec } from './draft'

/**
 * Every part in the order players meet them in the tutorial, each with a key that puts it on the
 * board, as "h" puts a black hole down in the original editor. Q and E stay free for rotating.
 */
export const PALETTE: readonly { readonly kind: PartKind; readonly key: string }[] = [
  { kind: 'laser', key: 'l' },
  { kind: 'coin', key: 'c' },
  { kind: 'antiCoin', key: 'a' },
  { kind: 'mirror', key: 'm' },
  { kind: 'doubleMirror', key: 'd' },
  { kind: 'slitMirror', key: 'k' },
  { kind: 'refractor', key: 'r' },
  { kind: 'oneWay', key: 'o' },
  { kind: 'splitter', key: 's' },
  { kind: 'threeway', key: 'w' },
  { kind: 'prism', key: 'p' },
  { kind: 'colorConverter', key: 'v' },
  { kind: 'filter', key: 'f' },
  { kind: 'polarizer', key: 'z' },
  { kind: 'explosive', key: 't' },
  { kind: 'slime', key: 'g' },
  { kind: 'mine', key: 'n' },
  { kind: 'blackHole', key: 'h' },
  { kind: 'ship', key: 'b' },
  { kind: 'fuelCell', key: 'u' },
]

/** The part a key puts down, whatever its case. */
export function kindForKey(key: string): PartKind | undefined {
  const letter = key.toLowerCase()
  return PALETTE.find((entry) => entry.key === letter)?.kind
}

/** A fresh piece of a kind: red where it needs a color, turned to its first allowed heading. */
export function newPiece(kind: PartKind): PieceSpec {
  return {
    type: kind,
    ...(ROTATING_KINDS.has(kind) ? { rot: HEADINGS[kind]?.[0] ?? 0 } : {}),
    ...(COLORED_KINDS.has(kind) ? { rgb: 'r' } : {}),
  }
}
