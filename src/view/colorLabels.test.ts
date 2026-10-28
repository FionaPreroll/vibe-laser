// @vitest-environment happy-dom
import type { Text } from 'pixi.js'
import { describe, expect, it } from 'vitest'
import { createPuzzle, type Item, type Puzzle, replaceItem } from '../core/level'
import { parseBoard, parsePiece } from '../core/notation'
import { ColorLabelLayer } from './colorLabels'
import { CELL, placeCenter, sceneGeometry } from './layout'

function puzzleOf(text: string, toolbox: string[] = []): Puzzle {
  return createPuzzle(
    parseBoard(text),
    toolbox.map((token) => parsePiece(token) ?? { kind: 'mirror', rotation: 0, color: 0 }),
  )
}

const letters = (layer: ColorLabelLayer) => layer.children.map((label) => (label as Text).text)

describe('ColorLabelLayer', () => {
  const puzzle = puzzleOf('L2rb . M3 \n Fg . Crgb', ['PO0b', 'M0'])
  const geometry = sceneGeometry(puzzle.width, puzzle.height, puzzle.toolboxSize)

  it('writes the primaries of every colored piece in the corner of its place', () => {
    const layer = new ColorLabelLayer()
    layer.show(puzzle, geometry, true)
    expect(letters(layer)).toEqual(['RB', 'G', 'RGB', 'B'])
    const corner = placeCenter(geometry, { area: 'board', cell: 0 })
    expect(layer.children[0]?.position.x).toBe(corner.x + CELL / 2 - 4)
    expect(layer.children[0]?.position.y).toBe(corner.y + CELL / 2 - 2)
  })

  it('leaves out a carried piece, follows color changes and clears when switched off', () => {
    const layer = new ColorLabelLayer()
    layer.show(puzzle, geometry, true, 0)
    expect(letters(layer)).toEqual(['G', 'RGB', 'B'])
    const coin = puzzle.items.find((item) => item.piece.kind === 'coin') as Item
    const recolored = replaceItem(puzzle, { ...coin, piece: { ...coin.piece, color: 3 } })
    layer.show(recolored, geometry, true)
    expect(letters(layer)).toContain('RG')
    layer.show(recolored, geometry, false)
    expect(layer.children).toHaveLength(0)
  })
})
