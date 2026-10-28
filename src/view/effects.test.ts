import { describe, expect, it } from 'vitest'
import { EffectLayer } from './effects'
import type { Point } from './layout'

const at = (cell: number): Point => ({ x: cell * 10, y: 0 })

describe('EffectLayer', () => {
  it('plays a swelling, fading blast and removes it when it is over', () => {
    const effects = new EffectLayer()
    effects.blast({ x: 5, y: 6 })
    const blast = effects.children[0]
    expect(blast?.position.x).toBe(5)
    effects.animate(0.35)
    expect(blast?.alpha).toBeCloseTo(0.5)
    expect(blast?.scale.x).toBeGreaterThan(1)
    effects.animate(0.4)
    expect(effects.children).toHaveLength(0)
    expect(effects.playing).toBe(0)
  })

  it('shows what game events look like', () => {
    const effects = new EffectLayer()
    effects.play({ kind: 'ignited', cells: [1, 2] }, at)
    expect(effects.playing).toBe(2)
    effects.play({ kind: 'fired', item: 0, target: 3, from: 0, at: 4 }, at)
    expect(effects.playing).toBe(4)
    effects.play({ kind: 'ate', item: 0, food: 1, cell: 2 }, at)
    effects.play({ kind: 'collected', item: 0, fuel: 1, cell: 2 }, at)
    effects.play({ kind: 'swallowed', item: 0, cell: 2 }, at)
    expect(effects.playing).toBe(7)
    effects.play({ kind: 'moved', item: 0, from: 1, to: 2 }, at)
    effects.play({ kind: 'exploded', cells: [1], destroyed: [] }, at)
    expect(effects.playing).toBe(7)
    effects.animate(1)
    expect(effects.playing).toBe(0)
  })

  it('draws a shot from the ship to its target', () => {
    const effects = new EffectLayer()
    effects.shot({ x: 0, y: 0 }, { x: 128, y: 0 })
    const shot = effects.children[0]
    expect(shot?.width).toBeGreaterThanOrEqual(128)
    effects.animate(0.2)
    expect(shot?.alpha).toBeLessThan(1)
  })
})
