import { describe, expect, it } from 'vitest'
import { kindForKey, newPiece, PALETTE } from './palette'

describe('palette', () => {
  it('has every part once, each with a key of its own and none for rotating', () => {
    expect(new Set(PALETTE.map((entry) => entry.kind)).size).toBe(20)
    const keys = PALETTE.map((entry) => entry.key)
    expect(new Set(keys).size).toBe(20)
    expect(keys).not.toContain('q')
    expect(keys).not.toContain('e')
    expect(kindForKey('H')).toBe('blackHole')
    expect(kindForKey('q')).toBeUndefined()
  })

  it('makes red pieces turned to their first heading', () => {
    expect(newPiece('laser')).toEqual({ type: 'laser', rot: 0, rgb: 'r' })
    expect(newPiece('ship')).toEqual({ type: 'ship', rot: 2 })
    expect(newPiece('coin')).toEqual({ type: 'coin', rgb: 'r' })
    expect(newPiece('explosive')).toEqual({ type: 'explosive' })
  })
})
