// @vitest-environment happy-dom
import type { Container } from 'pixi.js'
import { describe, expect, it } from 'vitest'
import { partScene } from '../content/partScenes'
import { createFlatArt } from './art/flat'
import { BeamLayer } from './beams'
import { CELL } from './layout'
import { boardGeometry, boardScene } from './partPictures'
import { PieceLayer } from './pieces'

describe('boardScene', () => {
  it('draws the tiles, beams and pieces of a board without toolbox or gutters', () => {
    expect(boardGeometry(4, 3)).toMatchObject({ boardLeft: 0, top: 0, width: 4 * CELL })
    const beams = new BeamLayer()
    const scene = boardScene(partScene('prism'), createFlatArt(), false, beams)
    // Twelve tiles, then the layers.
    expect(scene.children).toHaveLength(12 + 3)
    expect(scene.children[12]).toBe(beams)
    // Red, green and blue leave the prism, white comes in: every lit half-segment has a sprite.
    const lit = beams.children.filter((sprite) => sprite.visible)
    expect(lit.length).toBeGreaterThan(8)
    const pieces = scene.children[13] as Container
    expect(pieces).toBeInstanceOf(PieceLayer)
    expect(pieces.children).toHaveLength(2)
  })
})
