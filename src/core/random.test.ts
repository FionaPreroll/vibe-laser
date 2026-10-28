import { describe, expect, it } from 'vitest'
import { nextRandom, pick } from './random'

describe('random', () => {
  it('draws the same numbers from the same seed', () => {
    const draw = (seed: number) => {
      const values: number[] = []
      let state = seed
      for (let i = 0; i < 5; i++) {
        const drawn = nextRandom(state)
        values.push(drawn.value)
        state = drawn.state
      }
      return values
    }
    expect(draw(1)).toEqual(draw(1))
    expect(draw(1)).not.toEqual(draw(2))
  })

  it('stays between 0 and 1 and spreads over the whole range', () => {
    let state = 7
    let low = 0
    for (let i = 0; i < 2000; i++) {
      const drawn = nextRandom(state)
      expect(drawn.value).toBeGreaterThanOrEqual(0)
      expect(drawn.value).toBeLessThan(1)
      if (drawn.value < 0.5) low++
      state = drawn.state
    }
    expect(low).toBeGreaterThan(900)
    expect(low).toBeLessThan(1100)
  })

  it('picks every entry of a list now and then', () => {
    const seen = new Set<string>()
    let state = 3
    for (let i = 0; i < 100; i++) {
      const picked = pick(['a', 'b', 'c'], state)
      if (picked.item !== undefined) seen.add(picked.item)
      state = picked.state
    }
    expect(seen).toEqual(new Set(['a', 'b', 'c']))
  })

  it('picks nothing, and draws nothing, from an empty list', () => {
    expect(pick([], 5)).toEqual({ item: undefined, state: 5 })
  })
})
