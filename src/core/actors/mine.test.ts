import { describe, expect, it } from 'vitest'
import { cellByName } from '../board'
import { boardOf, createPuzzle, itemById } from '../level'
import { formatBoard, parseBoard } from '../notation'
import { trace } from '../trace'
import { stepMine } from './mine'
import { isOnBoard, type Step, type World } from './world'

function worldOf(text: string, random = 1): World {
  const puzzle = createPuzzle(parseBoard(text), [])
  return { puzzle, light: trace(boardOf(puzzle)).light, memory: {}, random }
}

function step(world: World, id: number): Step {
  const mine = itemById(world.puzzle, id)
  if (mine === undefined || !isOnBoard(mine)) throw new Error(`No mine ${id} on the board`)
  return stepMine(world, mine)
}

function cellOf(world: World, id: number): number {
  const mine = itemById(world.puzzle, id)
  return mine?.place.area === 'board' ? mine.place.cell : -1
}

describe('robot mine', () => {
  it('keeps its heading while the way is open', () => {
    let world = worldOf('MI2 . . .')
    for (let jump = 0; jump < 3; jump++) world = step(world, 0).world
    expect(formatBoard(boardOf(world.puzzle))).toBe('.   .   .   MI2')
  })

  it('bounces off the edge into a random open direction, the same for the same seed', () => {
    const board = `
      .   .   .
      .   .   MI2
    `
    const open = ['A3', 'A2', 'B2'].map((name) => cellByName(parseBoard(board), name))
    const landed = new Set<number>()
    for (let seed = 1; seed <= 40; seed++) {
      const once = cellOf(step(worldOf(board, seed), 0).world, 0)
      expect(cellOf(step(worldOf(board, seed), 0).world, 0)).toBe(once)
      expect(open).toContain(once)
      landed.add(once)
    }
    expect(landed.size).toBe(3)
  })

  it('cannot jump diagonally across a beam through the shared corner', () => {
    const start = worldOf(`
      L3r .
      MI1 .
    `)
    const { world, events } = step(start, 1)
    expect(events).toEqual([])
    expect(cellOf(world, 1)).toBe(cellOf(start, 1))
  })

  it('runs into an explosive, which ignites', () => {
    const start = worldOf('MI2 T')
    const { world, ignites, events } = step(start, 0)
    expect(ignites).toEqual([1])
    expect(events).toEqual([{ kind: 'rammed', item: 0, cell: 1 }])
    expect(cellOf(world, 0)).toBe(0)
  })

  it('treats a fuel cell as an obstacle', () => {
    for (let seed = 1; seed <= 10; seed++) {
      const { ignites, world } = step(worldOf('MI2 FC \n . .', seed), 0)
      expect(ignites).toEqual([])
      expect([2, 3]).toContain(cellOf(world, 0))
    }
  })
})
