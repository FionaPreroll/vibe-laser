import { describe, expect, it } from 'vitest'
import { type Board, cellByName } from './board'
import { BLUE, GREEN, MAGENTA, RED, WHITE } from './color'
import type { Axis, Direction } from './direction'
import { parseBoard } from './notation'
import { DEFAULT_RULES } from './rules'
import { axisColor, halfColor, isLit, type LightField, trace } from './trace'

const NORTH_SOUTH: Axis = 0
const EAST_WEST: Axis = 2
const SOUTH_EAST: Axis = 3
const E: Direction = 2
const S: Direction = 4
const SW: Direction = 5
const W: Direction = 6

function traced(text: string, rules = DEFAULT_RULES) {
  const board = parseBoard(text)
  const { light, steps } = trace(board, rules)
  const cell = (name: string) => cellByName(board, name)
  return {
    board,
    light,
    steps,
    half: (name: string, direction: Direction) => halfColor(light, cell(name), direction),
    axis: (name: string, axis: Axis) => axisColor(light, cell(name), axis),
    lit: (name: string) => isLit(light, cell(name)),
  }
}

function litCells(board: Board, light: LightField): number[] {
  return board.cells.map((_, cell) => cell).filter((cell) => isLit(light, cell))
}

describe('trace', () => {
  it('runs a beam straight to the edge of the board', () => {
    const { half, axis } = traced('L2r . .')
    expect(axis('A2', EAST_WEST)).toBe(RED)
    expect(axis('A2', NORTH_SOUTH)).toBe(0)
    expect(half('A3', E)).toBe(RED)
    expect(half('A1', W)).toBe(0)
  })

  it('turns a beam at a mirror, as in the design example', () => {
    const { half, axis, lit } = traced(`
      L2r  .  M5  .
      .    .  Cr  .
    `)
    expect(half('A3', W)).toBe(RED)
    expect(half('A3', S)).toBe(RED)
    expect(half('A3', E)).toBe(0)
    expect(axis('B3', NORTH_SOUTH)).toBe(RED)
    expect(lit('A4')).toBe(false)
  })

  it('stops a beam at the back of a one-sided mirror', () => {
    const { half, lit } = traced('L2r M2 .')
    expect(half('A2', W)).toBe(RED)
    expect(half('A2', E)).toBe(0)
    expect(lit('A3')).toBe(false)
  })

  it('reflects a beam straight back onto its laser', () => {
    const { half, axis, steps } = traced('L2r . M6')
    expect(axis('A2', EAST_WEST)).toBe(RED)
    expect(half('A3', W)).toBe(RED)
    expect(half('A3', E)).toBe(0)
    expect(steps).toBe(4)
  })

  it('mixes beams that run against each other on one line', () => {
    const { axis, half, lit } = traced('L2r . L6b .')
    expect(axis('A2', EAST_WEST)).toBe(MAGENTA)
    expect(half('A3', W)).toBe(MAGENTA)
    expect(lit('A4')).toBe(false)
  })

  it('lets beams pass through lasers when the rules say so', () => {
    const { half } = traced('L2r . L6b .', { ...DEFAULT_RULES, beamIntoLaser: 'pass' })
    expect(half('A4', W)).toBe(RED)
    expect(half('A1', W)).toBe(BLUE)
  })

  it('ends a beam that circles a ring of mirrors forever', () => {
    const ring = `
      DM3 L2r .   DM1
      .   .   .   .
      DM1 .   .   DM3
    `
    const { board, light, steps, lit } = traced(ring, { ...DEFAULT_RULES, beamIntoLaser: 'pass' })
    expect(litCells(board, light)).toHaveLength(10)
    expect(lit('B2')).toBe(false)
    expect(lit('B3')).toBe(false)
    expect(steps).toBeLessThanOrEqual(board.cells.length * 8 * 3)
  })

  it('runs diagonal beams through the corners between cells', () => {
    const { axis, lit } = traced(`
      L3r .   .
      .   .   .
      .   .   .
    `)
    expect(axis('B2', SOUTH_EAST)).toBe(RED)
    expect(axis('C3', SOUTH_EAST)).toBe(RED)
    expect(lit('A2')).toBe(false)
    expect(lit('B1')).toBe(false)
  })

  it('splits white light at a prism into red, green and blue beams', () => {
    const { half } = traced(`
      .  .     .
      .  P0    .
      .  L0rgb .
    `)
    expect(half('A2', S)).toBe(RED)
    expect(half('A3', SW)).toBe(GREEN)
    expect(half('B3', W)).toBe(BLUE)
  })

  it('merges two beams entering the bevels of a threeway into one mixed beam', () => {
    const { axis } = traced(`
      L3b .   L5r
      .   SC0 .
      .   .   .
    `)
    expect(axis('C2', NORTH_SOUTH)).toBe(MAGENTA)
  })

  it('shifts colors at a converter and filters them', () => {
    const { half } = traced('L2r CC6 . Fg .')
    expect(half('A3', W)).toBe(GREEN)
    expect(half('A5', W)).toBe(GREEN)
    const blocked = traced('L2r CC2 . Fg .')
    expect(blocked.half('A3', W)).toBe(BLUE)
    expect(blocked.lit('A5')).toBe(false)
  })

  it('stops beams at explosives, black holes and actors', () => {
    for (const piece of ['T', 'FC', 'H', 'SL0', 'MI0', 'SH2']) {
      const { half, lit } = traced(`L2r ${piece} .`)
      expect(half('A2', W)).toBe(RED)
      expect(lit('A3')).toBe(false)
    }
  })

  it('lets beams pass actors when the rules say so', () => {
    const rules = { ...DEFAULT_RULES, actorsBlockLight: false }
    for (const piece of ['SL0', 'MI0', 'SH2']) {
      expect(traced(`L2r ${piece} .`, rules).half('A3', W)).toBe(RED)
    }
    expect(traced('L2r H .', rules).lit('A3')).toBe(false)
  })

  it('traces each primary of white light', () => {
    const { axis } = traced('L2rgb M5 \n .  Crgb')
    expect(axis('B2', NORTH_SOUTH)).toBe(WHITE)
  })
})
