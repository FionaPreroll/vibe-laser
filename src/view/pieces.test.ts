import { describe, expect, it } from 'vitest'
import { createPuzzle, type Item, type Puzzle, replaceItem } from '../core/level'
import { parseBoard, parsePiece } from '../core/notation'
import { createFlatArt } from './art/flat'
import { CELL, placeCenter, sceneGeometry } from './layout'
import { PieceLayer } from './pieces'

function puzzleOf(text: string, toolbox: string[] = []): Puzzle {
  return createPuzzle(
    parseBoard(text),
    toolbox.map((token) => parsePiece(token) ?? { kind: 'mirror', rotation: 0, color: 0 }),
  )
}

/** The puzzle with the item moved to another board cell. */
function moved(puzzle: Puzzle, id: number, cell: number): Puzzle {
  const item = puzzle.items.find((candidate) => candidate.id === id)
  if (item === undefined) throw new Error(`No item ${id}`)
  return replaceItem(puzzle, { ...item, place: { area: 'board', cell } })
}

describe('PieceLayer', () => {
  const puzzle = puzzleOf('L2r . M3 \n . SL0 Cr', ['DM0'])
  const geometry = sceneGeometry(puzzle.width, puzzle.height, puzzle.toolboxSize)

  it('shows every piece on its cell or slot, turned by its rotation', () => {
    const layer = new PieceLayer(createFlatArt())
    layer.show(puzzle, new Set(), geometry)
    expect(layer.children).toHaveLength(5)
    const mirror = layer.children[1]
    const c3 = placeCenter(geometry, { area: 'board', cell: 2 })
    expect(mirror?.position.x).toBe(c3.x)
    expect(mirror?.rotation).toBeCloseTo((3 * Math.PI) / 4)
    const slot = placeCenter(geometry, { area: 'toolbox', slot: 0 })
    expect(layer.children[4]?.position.y).toBe(slot.y)
  })

  it('dims the piece being carried', () => {
    const layer = new PieceLayer(createFlatArt())
    layer.show(puzzle, new Set(), geometry, 4)
    expect(layer.children[4]?.alpha).toBe(0.35)
    expect(layer.children[0]?.alpha).toBe(1)
  })

  it('spins coins by squeezing them and lets them go flat again', () => {
    const layer = new PieceLayer(createFlatArt())
    layer.show(puzzle, new Set([3]), geometry)
    layer.animate(0.5, 0.016)
    expect(layer.children[3]?.scale.x).toBeCloseTo(Math.cos(2))
    layer.show(puzzle, new Set(), geometry)
    expect(layer.children[3]?.scale.x).toBe(1)
  })

  it('lets actors glide to their next cell while other pieces jump', () => {
    const layer = new PieceLayer(createFlatArt())
    layer.show(puzzle, new Set(), geometry)
    const slime = layer.children[2]
    const from = { x: slime?.x ?? 0, y: slime?.y ?? 0 }
    layer.show(moved(puzzle, 2, 1), new Set(), geometry)
    expect(slime?.x).toBe(from.x)
    layer.animate(0, 0.05)
    const target = placeCenter(geometry, { area: 'board', cell: 1 })
    expect(slime?.y).toBeLessThan(from.y)
    expect(slime?.y).toBeGreaterThan(target.y)
    for (let frame = 0; frame < 60; frame++) layer.animate(0, 0.05)
    expect(slime?.y).toBeCloseTo(target.y)

    const far = moved(puzzle, 1, 3)
    layer.show(far, new Set(), geometry)
    expect(layer.children[1]?.x).toBe(placeCenter(geometry, { area: 'board', cell: 3 }).x)
  })

  it('snaps actors that move further than a cell, as after a restart', () => {
    const row = puzzleOf('SL2 . .')
    const rowGeometry = sceneGeometry(row.width, row.height, row.toolboxSize)
    const layer = new PieceLayer(createFlatArt())
    layer.show(row, new Set(), rowGeometry)
    layer.show(moved(row, 0, 2), new Set(), rowGeometry)
    const end = placeCenter(rowGeometry, { area: 'board', cell: 2 })
    expect(layer.children[0]?.x).toBe(end.x)
    layer.show(row, new Set(), rowGeometry)
    expect(end.x - (layer.children[0]?.x ?? 0)).toBe(2 * CELL)
  })

  it('removes pieces that left the puzzle and brings them back when they return', () => {
    const layer = new PieceLayer(createFlatArt())
    layer.show(puzzle, new Set(), geometry)
    const eaten = { ...puzzle, items: puzzle.items.filter((item) => item.id !== 1) }
    layer.show(eaten, new Set(), geometry)
    expect(layer.children).toHaveLength(4)
    layer.show(puzzle, new Set(), geometry)
    expect(layer.children).toHaveLength(5)
  })

  it('draws an id anew once it stands for another kind or color of piece', () => {
    const layer = new PieceLayer(createFlatArt())
    layer.show(puzzle, new Set(), geometry)
    const coin = layer.children[3]
    const recolored = replaceItem(puzzle, {
      ...(puzzle.items[3] as Item),
      piece: { kind: 'coin', rotation: 0, color: 2 },
    })
    layer.show(recolored, new Set(), geometry)
    expect(layer.children).toHaveLength(5)
    expect(layer.children).not.toContain(coin)
    const turned = layer.children.at(-1)
    layer.show(moved(recolored, 3, 0), new Set(), geometry)
    expect(layer.children.at(-1)).toBe(turned)
  })

  it('makes a turned, see-through copy of a piece for dragging', () => {
    const layer = new PieceLayer(createFlatArt())
    const item = puzzle.items[1]
    if (item === undefined) throw new Error('No mirror')
    const ghost = layer.ghostOf(item)
    expect(ghost.alpha).toBe(0.85)
    expect(ghost.rotation).toBeCloseTo((3 * Math.PI) / 4)
  })
})
