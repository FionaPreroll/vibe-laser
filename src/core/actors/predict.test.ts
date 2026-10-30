import { describe, expect, it } from 'vitest'
import { boardOf, createPuzzle } from '../level'
import { parseBoard } from '../notation'
import { DEFAULT_RULES } from '../rules'
import { trace } from '../trace'
import { predictPaths } from './predict'
import type { World } from './world'

function worldOf(text: string): World {
  const puzzle = createPuzzle(parseBoard(text), [])
  return { puzzle, light: trace(boardOf(puzzle)).light, memory: {}, random: 1 }
}

describe('predictPaths', () => {
  it('follows a slime ahead and round to the right at the edge', () => {
    const [path] = predictPaths(worldOf('. . . \n . . . \n . SL0 .'), DEFAULT_RULES)
    expect(path?.kind).toBe('slime')
    expect(path?.cells.slice(0, 4)).toEqual([7, 4, 1, 2])
    expect(path?.ignites).toBe(false)
  })

  it('stops where a ship would ram an explosive, and leaves mines out', () => {
    const paths = predictPaths(worldOf('T . SH6 \n . . MI0'), DEFAULT_RULES)
    expect(paths).toEqual([{ item: 1, kind: 'ship', cells: [2, 1, 0], ignites: true }])
  })

  it('keeps a slime held back by a beam where it is', () => {
    const [path] = predictPaths(worldOf('L2r . . \n . SL0 .'), DEFAULT_RULES)
    expect(path?.cells[0]).toBe(4)
    expect(path?.cells).not.toContain(1)
  })
})
