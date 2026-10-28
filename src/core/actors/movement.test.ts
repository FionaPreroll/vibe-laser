import { describe, expect, it } from 'vitest'
import { cellByName } from '../board'
import type { Direction } from '../direction'
import { boardOf, createPuzzle } from '../level'
import { parseBoard } from '../notation'
import { trace } from '../trace'
import { isOpen, lightBars } from './movement'
import type { World } from './world'

const N: Direction = 0
const NE: Direction = 1
const E: Direction = 2
const SE: Direction = 3
const W: Direction = 6
const NW: Direction = 7

// A red beam runs diagonally from A2 through the corner between B2's north and east neighbours.
const world: World = (() => {
  const puzzle = createPuzzle(
    parseBoard(`
      .   L3r .
      .   MI0 .
      .   .   .
    `),
    [],
  )
  return { puzzle, light: trace(boardOf(puzzle)).light, memory: {}, random: 1 }
})()
const B2 = cellByName(boardOf(world.puzzle), 'B2')

describe('lightBars', () => {
  it('bars a step onto a lit cell', () => {
    expect(lightBars(world.puzzle, world.light, B2, E)).toBe(true)
  })

  it('bars a diagonal step across a beam through the shared corner', () => {
    expect(lightBars(world.puzzle, world.light, B2, NE)).toBe(true)
  })

  it('lets other diagonal steps pass', () => {
    expect(lightBars(world.puzzle, world.light, B2, SE)).toBe(false)
    expect(lightBars(world.puzzle, world.light, B2, NW)).toBe(false)
  })
})

describe('isOpen', () => {
  it('opens only empty, unlit cells on the board', () => {
    expect(isOpen(world, B2, N)).toBe(false)
    expect(isOpen(world, B2, E)).toBe(false)
    expect(isOpen(world, B2, W)).toBe(true)
    expect(isOpen(world, cellByName(boardOf(world.puzzle), 'B1'), W)).toBe(false)
  })
})
