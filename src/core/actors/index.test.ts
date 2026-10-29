import { describe, expect, it } from 'vitest'
import { cellByName } from '../board'
import { boardOf, createPuzzle } from '../level'
import { formatBoard, parseBoard } from '../notation'
import { DEFAULT_RULES } from '../rules'
import { halfColor, trace } from '../trace'
import { forgetPaths, STEP_TICKS, stepActors } from './index'
import type { World } from './world'

function worldOf(text: string): World {
  const puzzle = createPuzzle(parseBoard(text), [])
  return { puzzle, light: trace(boardOf(puzzle)).light, memory: {}, random: 1 }
}

function moved(world: World, tick: number): number[] {
  return stepActors(world, tick, DEFAULT_RULES)
    .events.filter((event) => event.kind === 'moved')
    .map((event) => event.item)
}

describe('stepActors', () => {
  const zoo = worldOf(`
    SL0 .   .   .
    .   .   .   .
    MI2 .   .   .
    SH2 .   .   .
  `)

  it('moves each kind on its own ticks', () => {
    expect(moved(zoo, 1)).toEqual([])
    expect(moved(zoo, 4)).toEqual([1, 2])
    expect(moved(zoo, 8)).toEqual([1, 2])
    expect(moved(zoo, 12)).toEqual([0, 1, 2])
  })

  it('gives a cell to the first actor that claims it', () => {
    const world = worldOf(`
      SL2 .   SL6
      .   .   .
    `)
    const { world: after } = stepActors(world, STEP_TICKS.slime, DEFAULT_RULES)
    expect(formatBoard(boardOf(after.puzzle))).toBe(formatBoard(parseBoard('. SL2 . \n . . SL4')))
  })

  it('traces the light again after each step', () => {
    const world = worldOf(`
      .   L4r .
      .   SH6 .
      .   .   .
    `)
    const { world: after } = stepActors(world, 4, DEFAULT_RULES)
    const c2 = cellByName(boardOf(after.puzzle), 'C2')
    expect(halfColor(after.light, c2, 0)).not.toBe(0)
  })

  it('stops the tick at the first explosive an actor runs into', () => {
    const world = worldOf(`
      MI2 T
      SH2 .
    `)
    const tick = stepActors(world, 8, DEFAULT_RULES)
    expect(tick.ignites).toEqual([1])
    expect(tick.events).toEqual([{ kind: 'rammed', item: 0, cell: 1 }])
  })

  it('makes slimes forget their paths when a piece disappears', () => {
    const world = worldOf(`
      .   T   .   .
      .   SL0 .   SL0
    `)
    const remembering = { ...world, memory: { 2: { visited: [7] } } }
    const { world: after } = stepActors(remembering, STEP_TICKS.slime, DEFAULT_RULES)
    expect(after.memory).toEqual({})
  })
})

describe('forgetPaths', () => {
  it('drops the slimes’ steps and keeps the rest', () => {
    expect(
      forgetPaths({ 1: { visited: [1, 2] }, 2: { shots: 1 }, 3: { visited: [], shots: 2 } }),
    ).toEqual({ 2: { shots: 1 }, 3: { shots: 2 } })
  })
})
