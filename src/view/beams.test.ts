// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest'
import { BLUE, GREEN, RED } from '../core/color'
import { parseBoard } from '../core/notation'
import { trace } from '../core/trace'
import { BeamLayer } from './beams'
import { CELL, placeCenter, sceneGeometry } from './layout'
import { BEAM_COLORS } from './palette'

const geometry = sceneGeometry(3, 2, 2)
const lightOf = (text: string) => trace(parseBoard(text)).light
const visible = (layer: BeamLayer) => layer.children.filter((child) => child.visible)

describe('BeamLayer', () => {
  it('draws one tinted sprite per lit half-segment, from the cell centre outward', () => {
    const layer = new BeamLayer()
    layer.show(lightOf('L2r . . \n . . .'), geometry)
    const sprites = visible(layer)
    // A1 east, then both halves of A2 and A3.
    expect(sprites).toHaveLength(5)
    for (const sprite of sprites) expect(sprite.tint).toBe(BEAM_COLORS[RED])
    const first = sprites[0]
    const a1 = placeCenter(geometry, { area: 'board', cell: 0 })
    expect(first?.position.x).toBe(a1.x)
    expect(first?.position.y).toBe(a1.y)
    expect(first?.width).toBe(CELL / 2)
  })

  it('draws a line per primary when split, in the same order on both halves of a segment', () => {
    const layer = new BeamLayer()
    layer.show(lightOf('L2rgb . . \n . . .'), geometry, true)
    const sprites = visible(layer)
    // Five half-segments, each with a red, a green and a blue line.
    expect(sprites).toHaveLength(15)
    expect(sprites.slice(0, 3).map((sprite) => sprite.tint)).toEqual([
      BEAM_COLORS[RED],
      BEAM_COLORS[GREEN],
      BEAM_COLORS[BLUE],
    ])
    const a2 = placeCenter(geometry, { area: 'board', cell: 1 })
    // A beam going east has red on top and blue below, on the westward half of A2 too.
    const halves = sprites.filter((sprite) => sprite.position.x === a2.x)
    expect(halves.map((sprite) => sprite.position.y - a2.y)).toEqual([-6, 0, 6, -6, 0, 6])
    expect(halves[0]?.height).toBe(7)
  })

  it('splits mixed light into its primaries only', () => {
    const layer = new BeamLayer()
    layer.show(lightOf('L4rg . . \n . . .'), geometry, true)
    // Three half-segments down column 1, each red and green.
    const pair = [BEAM_COLORS[RED], BEAM_COLORS[GREEN]]
    expect(visible(layer).map((sprite) => sprite.tint)).toEqual([...pair, ...pair, ...pair])
    // A beam going south has red to the west of it.
    const a1 = placeCenter(geometry, { area: 'board', cell: 0 })
    expect(visible(layer)[0]?.position.x).toBe(a1.x - 6)
  })

  it('makes diagonal half-segments longer', () => {
    const layer = new BeamLayer()
    layer.show(lightOf('L3r . . \n . . .'), geometry)
    expect(visible(layer)[0]?.width).toBeCloseTo((CELL * Math.SQRT2) / 2)
  })

  it('hides sprites it no longer needs and reuses them', () => {
    const layer = new BeamLayer()
    layer.show(lightOf('L2r . . \n . . .'), geometry)
    const count = layer.children.length
    layer.show(lightOf('L2r M2 . \n . . .'), geometry)
    expect(visible(layer)).toHaveLength(2)
    expect(layer.children).toHaveLength(count)
  })
})
