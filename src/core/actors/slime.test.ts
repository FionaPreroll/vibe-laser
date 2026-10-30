import { describe, expect, it } from 'vitest'
import { boardOf, createPuzzle, itemById } from '../level'
import { formatBoard, parseBoard } from '../notation'
import { trace } from '../trace'
import { stepSlime } from './slime'
import { type ActorEvent, isOnBoard, type World } from './world'

function worldOf(text: string): World {
  const puzzle = createPuzzle(parseBoard(text), [])
  return { puzzle, light: trace(boardOf(puzzle)).light, memory: {}, random: 1 }
}

/** Lets the slime with this id take some steps, tracing the light after each. */
function walk(world: World, id: number, steps: number): { world: World; events: ActorEvent[] } {
  let current = world
  const events: ActorEvent[] = []
  for (let step = 0; step < steps; step++) {
    const slime = itemById(current.puzzle, id)
    if (slime === undefined || !isOnBoard(slime)) break
    const next = stepSlime(current, slime)
    events.push(...next.events)
    current = { ...next.world, light: trace(boardOf(next.world.puzzle)).light }
  }
  return { world: current, events }
}

function expectBoard(world: World, expected: string) {
  expect(formatBoard(boardOf(world.puzzle))).toBe(formatBoard(parseBoard(expected)))
}

describe('slime', () => {
  it('walks north and turns right at the edge', () => {
    const start = worldOf(`
      .   .   .
      .   .   .
      .   SL0 .
    `)
    expectBoard(walk(start, 0, 2).world, '. SL0 . \n . . . \n . . .')
    expectBoard(walk(start, 0, 3).world, '. . SL2 \n . . . \n . . .')
    expectBoard(walk(start, 0, 4).world, '. . . \n . . SL4 \n . . .')
  })

  it('turns right at pieces and beams', () => {
    const coin = worldOf(`
      .   Cr  .
      .   .   .
      .   SL0 .
    `)
    expectBoard(walk(coin, 1, 2).world, '. Cr . \n . . SL2 \n . . .')
    const beam = worldOf(`
      L2r .   .
      .   .   .
      .   SL0 .
    `)
    expectBoard(walk(beam, 1, 2).world, 'L2r . . \n . . SL2 \n . . .')
  })

  it('eats the explosive in its way, and that is its last meal', () => {
    const start = worldOf(`
      .   T   .
      .   .   .
      .   SL0 .
    `)
    const { world, events } = walk(start, 1, 3)
    expectBoard(world, '. . . \n . . . \n . . .')
    expect(events.at(-1)).toEqual({ kind: 'ate', item: 1, food: 0, meal: 'explosive', cell: 1 })
  })

  it('eats a plain mirror only while no light touches it', () => {
    const dark = worldOf(`
      .   M0  .
      .   SL0 .
    `)
    const eaten = walk(dark, 1, 1)
    expectBoard(eaten.world, '. . . \n . . .')
    expect(eaten.events.at(-1)).toMatchObject({ kind: 'ate', meal: 'mirror' })
    const lit = worldOf(`
      L2r M0  .
      .   SL0 .
    `)
    expectBoard(walk(lit, 2, 1).world, 'L2r M0 . \n . . SL2')
  })

  it('leaves other mirrors and fuel cells alone', () => {
    for (const piece of ['DM0', 'SM0', 'FC', 'R0']) {
      const start = worldOf(`. ${piece} . \n . SL0 .`)
      expectBoard(walk(start, 1, 1).world, `. ${piece} . \n . . SL2`)
    }
  })

  it('tries another way before walking the same lap twice', () => {
    const start = worldOf(`
      .   .
      SL0 .
    `)
    // One lap round the box: A1, A2, B2 and back to B1.
    expectBoard(walk(start, 0, 4).world, '. . \n SL6 .')
    // Going on north would repeat the lap, so it turns back east.
    expectBoard(walk(start, 0, 5).world, '. . \n . SL2')
  })

  it('waits when every way is blocked', () => {
    const start = worldOf(`
      Cr  .
      SL0 Cb
    `)
    const { world, events } = walk(start, 1, 1)
    expect(events).toEqual([])
    expect(world.puzzle).toBe(start.puzzle)
  })
})
