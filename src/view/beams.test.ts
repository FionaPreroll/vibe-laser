// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest'
import { RED } from '../core/color'
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
