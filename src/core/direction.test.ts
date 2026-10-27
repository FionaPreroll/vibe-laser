import { describe, expect, it } from 'vitest'
import { axisOf, DIRECTIONS, DX, DY, opposite, turn } from './direction'

describe('directions', () => {
  it('run clockwise from north, with rows growing downward', () => {
    expect(DIRECTIONS.map((direction) => [DX[direction], DY[direction]])).toEqual([
      [0, -1],
      [1, -1],
      [1, 0],
      [1, 1],
      [0, 1],
      [-1, 1],
      [-1, 0],
      [-1, -1],
    ])
  })

  it('turn in 45° steps and wrap around', () => {
    expect(turn(0, 1)).toBe(1)
    expect(turn(7, 1)).toBe(0)
    expect(turn(0, -1)).toBe(7)
    expect(turn(2, -10)).toBe(0)
    expect(turn(5, 16)).toBe(5)
  })

  it.each(DIRECTIONS)('%i and its opposite point apart and share an axis', (direction) => {
    const back = opposite(direction)
    expect(DX[back] + DX[direction]).toBe(0)
    expect(DY[back] + DY[direction]).toBe(0)
    expect(axisOf(back)).toBe(axisOf(direction))
    expect(opposite(back)).toBe(direction)
  })
})
