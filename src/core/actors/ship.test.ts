import { describe, expect, it } from 'vitest'
import { boardOf, createPuzzle, itemById } from '../level'
import { formatBoard, parseBoard } from '../notation'
import { trace } from '../trace'
import { stepShip } from './ship'
import { type ActorEvent, isOnBoard, type Step, type World } from './world'

function worldOf(text: string): World {
  const puzzle = createPuzzle(parseBoard(text), [])
  return { puzzle, light: trace(boardOf(puzzle)).light, memory: {}, random: 1 }
}

function step(world: World, id: number): Step {
  const ship = itemById(world.puzzle, id)
  if (ship === undefined || !isOnBoard(ship)) throw new Error(`No ship ${id} on the board`)
  return stepShip(world, ship)
}

/** Lets the ship take some steps, tracing the light after each. */
function fly(world: World, id: number, steps: number): { world: World; events: ActorEvent[] } {
  let current = world
  const events: ActorEvent[] = []
  for (let count = 0; count < steps; count++) {
    if (itemById(current.puzzle, id) === undefined) break
    const next = step(current, id)
    events.push(...next.events)
    current = { ...next.world, light: trace(boardOf(next.world.puzzle)).light }
  }
  return { world: current, events }
}

function expectBoard(world: World, expected: string) {
  expect(formatBoard(boardOf(world.puzzle))).toBe(formatBoard(parseBoard(expected)))
}

describe('spaceship', () => {
  const open = worldOf(`
    SH2 .   .
    .   .   .
  `)

  it('flies along its row, then drops a row and flies back', () => {
    expectBoard(fly(open, 0, 2).world, '. . SH2 \n . . .')
    expectBoard(fly(open, 0, 3).world, '. . . \n . . SH6')
    expectBoard(fly(open, 0, 5).world, '. . . \n SH6 . .')
  })

  it('turns round where it is when it cannot drop', () => {
    expectBoard(fly(open, 0, 6).world, '. . . \n SH2 . .')
    expectBoard(fly(open, 0, 7).world, '. . . \n . SH2 .')
  })

  it('drops a row at pieces and beams in its way', () => {
    expectBoard(fly(worldOf('SH2 Cr \n . .'), 0, 1).world, '. Cr \n SH6 .')
    expectBoard(fly(worldOf('SH2 . \n . . \n . L0r'), 0, 1).world, '. . \n SH6 . \n . L0r')
  })

  it('takes a fuel cell aboard from above and fires once at the next explosive ahead', () => {
    const start = worldOf(`
      SH2 .   M0  T   T
      FC  .   .   .   .
    `)
    const { world, events } = fly(start, 0, 1)
    expectBoard(world, '. SH2 M0 . T \n . . . . .')
    expect(events).toEqual([
      { kind: 'collected', item: 0, fuel: 4, cell: 5 },
      { kind: 'fired', item: 0, target: 2, from: 0, at: 3 },
      { kind: 'moved', item: 0, from: 0, to: 1 },
    ])
    expect(fly(start, 0, 2).events.filter((event) => event.kind === 'fired')).toHaveLength(1)
  })

  it('ignites an explosive or a fuel cell it runs into', () => {
    expect(step(worldOf('SH2 T'), 0).ignites).toEqual([1])
    expect(step(worldOf('SH2 FC'), 0).ignites).toEqual([1])
    expect(step(worldOf('SH2 . \n T .'), 0).ignites).toEqual([])
    expect(step(worldOf('SH2 Cr \n T .'), 0).ignites).toEqual([2])
  })

  it('is pulled into an unlit black hole in line with it, and destroyed', () => {
    const start = worldOf(`
      SH2 .   .
      .   .   .
      H   .   .
    `)
    expectBoard(fly(start, 0, 1).world, '. . . \n SH2 . . \n H . .')
    const { world, events } = fly(start, 0, 2)
    expectBoard(world, '. . . \n . . . \n H . .')
    expect(events.at(-1)).toEqual({ kind: 'swallowed', item: 0, cell: 6 })
  })

  it('keeps its course when the black hole is lit or a piece stands in between', () => {
    const lit = worldOf(`
      SH2 .   .
      .   .   .
      H   .   L6r
    `)
    expectBoard(fly(lit, 0, 1).world, '. SH2 . \n . . . \n H . L6r')
    const blocked = worldOf(`
      SH2 .   .
      Cr  .   .
      H   .   .
    `)
    expectBoard(fly(blocked, 0, 1).world, '. SH2 . \n Cr . . \n H . .')
  })

  it('is held by a beam between it and the black hole', () => {
    const start = worldOf(`
      SH2 .   .
      .   .   L6r
      H   .   .
    `)
    const { world, events } = fly(start, 0, 3)
    expect(events).toEqual([])
    expect(world.puzzle).toBe(start.puzzle)
  })
})
