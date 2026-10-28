import { describe, expect, it } from 'vitest'
import type { PartKind, Piece } from '../../core/board'
import { BLUE, type Color, GREEN, RED, WHITE } from '../../core/color'
import { createArt } from '.'
import { createFlatArt } from './flat'
import { createNeonArt } from './neon'

// A record, so a new kind without art fails the type check here too.
const KINDS = Object.keys({
  laser: 0,
  mirror: 0,
  doubleMirror: 0,
  slitMirror: 0,
  refractor: 0,
  oneWay: 0,
  splitter: 0,
  threeway: 0,
  prism: 0,
  colorConverter: 0,
  filter: 0,
  polarizer: 0,
  bender: 0,
  splicer: 0,
  prismirror: 0,
  selector: 0,
  complex: 0,
  coin: 0,
  antiCoin: 0,
  explosive: 0,
  fuelCell: 0,
  blackHole: 0,
  slime: 0,
  mine: 0,
  ship: 0,
} satisfies Record<PartKind, 0>) as PartKind[]

const piece = (kind: PartKind, color: Color = RED): Piece => ({ kind, rotation: 0, color })

describe.each([
  ['flat', createFlatArt],
  ['neon', createNeonArt],
])('%s art', (id, create) => {
  const art = create()

  it('draws every kind of piece inside its cell', () => {
    for (const kind of KINDS) {
      const { bounds } = art.piece(piece(kind))
      expect(bounds.width, kind).toBeGreaterThan(10)
      expect(bounds.height, kind).toBeGreaterThan(5)
      expect(bounds.minX, kind).toBeGreaterThanOrEqual(-32)
      expect(bounds.maxX, kind).toBeLessThanOrEqual(32)
      expect(bounds.minY, kind).toBeGreaterThanOrEqual(-32)
      expect(bounds.maxY, kind).toBeLessThanOrEqual(32)
    }
  })

  it('draws switched-off lasers, every color and either selector inside its cell', () => {
    for (const color of [0, RED, GREEN, BLUE, WHITE] as Color[]) {
      expect(art.piece(piece('laser', color)).bounds.width).toBeGreaterThan(10)
      expect(art.piece(piece('coin', color)).bounds.width).toBeGreaterThan(10)
    }
    expect(art.piece(piece('selector', WHITE)).bounds.height).toBeGreaterThan(40)
  })

  it('draws a shape once per kind and color and shares it', () => {
    expect(art.piece(piece('coin'))).toBe(art.piece({ ...piece('coin'), rotation: 3 }))
    expect(art.piece(piece('coin'))).not.toBe(art.piece(piece('coin', WHITE)))
  })

  it('draws a complex anew for each inner color', () => {
    const complex = (inner: Color): Piece => ({ ...piece('complex'), inner })
    expect(art.piece(complex(GREEN))).toBe(art.piece(complex(GREEN)))
    expect(art.piece(complex(GREEN))).not.toBe(art.piece(complex(BLUE)))
  })

  it('has a tile for board cells and a slot for the toolbox', () => {
    expect(art.id).toBe(id)
    expect(art.tile.bounds.width).toBe(60)
    expect(art.slot.bounds.width).toBeGreaterThanOrEqual(60)
  })
})

describe('createArt', () => {
  it('makes the art pack of each style', () => {
    expect(createArt('flat').id).toBe('flat')
    expect(createArt('neon').id).toBe('neon')
  })
})
