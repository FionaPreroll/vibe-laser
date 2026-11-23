import { describe, expect, it } from 'vitest'
import type { PartKind } from '../core/board'
import { BLUE, CYAN, GREEN, RED } from '../core/color'
import type { Direction } from '../core/direction'
import { trace } from '../core/trace'
import { PALETTE } from '../editor/palette'
import { partScene, SCENE_COLUMNS, SCENE_ROWS } from './partScenes'

/** The light leaving cell (x, y) towards a direction. */
function lightAt(kind: PartKind, x: number, y: number, direction: Direction): number {
  const light = trace(partScene(kind)).light
  return light.halves[(y * light.width + x) * 8 + direction] ?? 0
}

/** Whether any light reaches the cell of the scene's part. */
function lit(kind: PartKind): boolean {
  const board = partScene(kind)
  const light = trace(board).light
  const cell = board.cells.findIndex((piece) => piece?.kind === kind)
  return light.halves.slice(cell * 8, cell * 8 + 8).some((color) => color !== 0)
}

describe('partScene', () => {
  it('shows every part on a board of the same size', () => {
    for (const { kind } of PALETTE) {
      const board = partScene(kind)
      expect([board.width, board.height]).toEqual([SCENE_COLUMNS, SCENE_ROWS])
      expect(board.cells.some((piece) => piece?.kind === kind)).toBe(true)
    }
  })

  it('lights every part that acts on light, and leaves anti-coins and actors dark', () => {
    const dark = new Set<PartKind>(['antiCoin', 'slime', 'mine', 'ship'])
    for (const { kind } of PALETTE) expect(lit(kind), kind).toBe(!dark.has(kind))
  })

  it('shows what the parts do to a beam', () => {
    // The mirror turns the beam north, the splitter north and south.
    expect(lightAt('mirror', 2, 0, 0)).toBe(RED)
    expect(lightAt('splitter', 2, 0, 0)).toBe(RED)
    expect(lightAt('splitter', 2, 2, 4)).toBe(RED)
    // The prism fans white light out: red east, green south-east, blue south.
    expect(lightAt('prism', 2, 0, 2)).toBe(RED)
    expect(lightAt('prism', 2, 1, 3)).toBe(GREEN)
    expect(lightAt('prism', 1, 1, 4)).toBe(BLUE)
    // Red through the converter's narrow end turns green, through its broad end blue.
    expect(lightAt('colorConverter', 2, 0, 2)).toBe(GREEN)
    expect(lightAt('colorConverter', 2, 2, 2)).toBe(BLUE)
    // The selector turns its own red away and lets cyan through.
    expect(lightAt('selector', 2, 1, 3)).toBe(RED)
    expect(lightAt('selector', 2, 0, 2)).toBe(CYAN)
    // One-way parts and polarizers let light through only one way.
    expect(lightAt('oneWay', 2, 0, 2)).toBe(RED)
    expect(lightAt('oneWay', 0, 2, 6)).toBe(0)
    expect(lightAt('polarizer', 3, 0, 2)).toBe(GREEN)
    expect(lightAt('polarizer', 0, 2, 6)).toBe(0)
  })
})
