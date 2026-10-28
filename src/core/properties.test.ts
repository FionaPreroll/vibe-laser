import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { type Board, neighbour, type PartKind, type Piece, withPiece } from './board'
import type { Color } from './color'
import { DIRECTIONS, type Direction, opposite, turn } from './direction'
import { formatBoard, parseBoard } from './notation'
import { ROTATING_KINDS } from './parts'
import type { Rules } from './rules'
import { trace } from './trace'

const rotation = fc.integer({ min: 0, max: 7 }).map((step) => step as Direction)
const color = fc.integer({ min: 1, max: 7 }).map((bits) => bits as Color)

/** Parts whose mirror image is a different part: they bend light one way round. */
const CHIRAL_KINDS = new Set<PartKind>(['prism'])

/**
 * The rotation in which a part shows its own mirror image, east to west; 0 unless listed. The
 * mirror image of a part in rotation r is then the same part in rotation `MIRROR_ROTATION - r`.
 */
const MIRROR_ROTATION: Partial<Record<PartKind, Direction>> = { refractor: 1 }

const piece: fc.Arbitrary<Piece> = fc.oneof(
  fc.record({ kind: fc.constant('laser' as const), rotation, color }),
  fc.record({
    kind: fc.constantFrom<PartKind>(
      'mirror',
      'doubleMirror',
      'slitMirror',
      'refractor',
      'oneWay',
      'splitter',
      'threeway',
      'prism',
      'colorConverter',
    ),
    rotation,
    color: fc.constant(0 as const),
  }),
  fc.record({ kind: fc.constant('polarizer' as const), rotation, color }),
  fc.record({ kind: fc.constant('filter' as const), rotation: fc.constant(0 as const), color }),
  fc.record({ kind: fc.constant('coin' as const), rotation: fc.constant(0 as const), color }),
  fc.record({
    kind: fc.constantFrom<PartKind>('explosive', 'fuelCell', 'blackHole'),
    rotation: fc.constant(0 as const),
    color: fc.constant(0 as const),
  }),
  fc.record({
    kind: fc.constant('slime' as const),
    rotation: fc.constantFrom<Direction>(0, 2, 4, 6),
    color: fc.constant(0 as const),
  }),
  fc.record({ kind: fc.constant('mine' as const), rotation, color: fc.constant(0 as const) }),
  fc.record({
    kind: fc.constant('ship' as const),
    rotation: fc.constantFrom<Direction>(2, 6),
    color: fc.constant(0 as const),
  }),
  fc.record({
    kind: fc.constant('antiCoin' as const),
    rotation: fc.constant(0 as const),
    color: fc.constant(0 as const),
  }),
)

function boardOf(pieces: fc.Arbitrary<Piece>): fc.Arbitrary<Board> {
  const cell = fc.oneof(
    { arbitrary: fc.constant(undefined), weight: 3 },
    { arbitrary: pieces, weight: 2 },
  )
  return fc
    .record({ width: fc.integer({ min: 1, max: 7 }), height: fc.integer({ min: 1, max: 7 }) })
    .chain(({ width, height }) =>
      fc
        .array(cell, { minLength: width * height, maxLength: width * height })
        .map((cells) => ({ width, height, cells })),
    )
}

const board = boardOf(piece)
const achiralBoard = boardOf(piece.filter((candidate) => !CHIRAL_KINDS.has(candidate.kind)))

const rules = fc.record({
  coinAngles: fc.constantFrom('single' as const, 'sameColor' as const),
  beamIntoLaser: fc.constantFrom('absorb' as const, 'pass' as const),
  polarizer: fc.constantFrom('direction' as const, 'axis' as const),
  actorsBlockLight: fc.boolean(),
}) satisfies fc.Arbitrary<Rules>

/** Moves every cell to the index `place` gives it and turns pieces that have a rotation. */
function transform(
  board: Board,
  size: { width: number; height: number },
  place: (x: number, y: number) => number,
  turnPiece: (piece: Piece) => Direction,
): Board {
  const cells: (Piece | undefined)[] = Array.from({ length: board.cells.length }, () => undefined)
  board.cells.forEach((piece, index) => {
    const target = place(index % board.width, Math.floor(index / board.width))
    cells[target] =
      piece && ROTATING_KINDS.has(piece.kind) ? { ...piece, rotation: turnPiece(piece) } : piece
  })
  return { ...size, cells }
}

describe('beam model properties', () => {
  it('traces every board within width × height × 8 × 3 steps', () => {
    fc.assert(
      fc.property(board, rules, (b, r) => {
        expect(trace(b, r).steps).toBeLessThanOrEqual(b.cells.length * 8 * 3)
      }),
    )
  })

  it('lights both halves of every segment alike', () => {
    fc.assert(
      fc.property(board, rules, (b, r) => {
        const { halves } = trace(b, r).light
        b.cells.forEach((_, index) => {
          for (const direction of DIRECTIONS) {
            const next = neighbour(b, index, direction)
            if (next < 0) continue
            expect(halves[index * 8 + direction]).toBe(halves[next * 8 + opposite(direction)])
          }
        })
      }),
    )
  })

  it('adds up the light of each laser on its own (superposition)', () => {
    fc.assert(
      fc.property(board, rules, (b, r) => {
        const lasers = b.cells.flatMap((piece, index) => (piece?.kind === 'laser' ? [index] : []))
        const combined = new Uint8Array(b.cells.length * 8)
        for (const on of lasers) {
          // The other lasers stay on the board, switched off.
          const alone = lasers.reduce((current, off) => {
            const laser = b.cells[off]
            return off === on || !laser ? current : withPiece(current, off, { ...laser, color: 0 })
          }, b)
          trace(alone, r).light.halves.forEach((bits, index) => {
            combined[index] = (combined[index] ?? 0) | bits
          })
        }
        expect(trace(b, r).light.halves).toEqual(combined)
      }),
    )
  })

  it('turns the light with the board: a quarter turn clockwise', () => {
    fc.assert(
      fc.property(board, rules, (b, r) => {
        const turned = transform(
          b,
          { width: b.height, height: b.width },
          (x, y) => x * b.height + (b.height - 1 - y),
          (piece) => turn(piece.rotation, 2),
        )
        const before = trace(b, r).light.halves
        const after = trace(turned, r).light.halves
        b.cells.forEach((_, index) => {
          const target = (index % b.width) * b.height + (b.height - 1 - Math.floor(index / b.width))
          for (const direction of DIRECTIONS) {
            expect(after[target * 8 + turn(direction, 2)]).toBe(before[index * 8 + direction])
          }
        })
      }),
    )
  })

  it('mirrors the light with the board, east to west, for parts without a handedness', () => {
    fc.assert(
      fc.property(achiralBoard, rules, (b, r) => {
        const reflect = (direction: Direction) => turn(0, -direction)
        const mirrored = transform(
          b,
          { width: b.width, height: b.height },
          (x, y) => y * b.width + (b.width - 1 - x),
          (piece) => turn(MIRROR_ROTATION[piece.kind] ?? 0, -piece.rotation),
        )
        const before = trace(b, r).light.halves
        const after = trace(mirrored, r).light.halves
        b.cells.forEach((_, index) => {
          const x = index % b.width
          const target = index - x + (b.width - 1 - x)
          for (const direction of DIRECTIONS) {
            expect(after[target * 8 + reflect(direction)]).toBe(before[index * 8 + direction])
          }
        })
      }),
    )
  })

  it('writes every board as text that reads back unchanged', () => {
    fc.assert(
      fc.property(board, (b) => {
        expect(parseBoard(formatBoard(b))).toEqual(b)
      }),
    )
  })
})
