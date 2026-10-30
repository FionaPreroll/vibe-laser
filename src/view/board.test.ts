import { describe, expect, it } from 'vitest'
import type { Item } from '../core/level'
import { STABLE_TICKS } from '../game/session'
import { buzzFor, cursorFor, frameStyle } from './board'
import { BOARD_COLORS } from './palette'

const item = (moveable: boolean, rotateable: boolean): Item => ({
  id: 0,
  piece: { kind: 'mirror', rotation: 0, color: 0 },
  moveable,
  rotateable,
  place: { area: 'board', cell: 0 },
})

describe('frameStyle', () => {
  it('frames the board in the colour of the phase', () => {
    expect(frameStyle('playing', 0)).toBeUndefined()
    expect(frameStyle('solved', 0)).toEqual({ color: BOARD_COLORS.focus, alpha: 0.8 })
    expect(frameStyle('exploding', 0)?.color).toBe(BOARD_COLORS.blocked)
    expect(frameStyle('failed', 0)?.color).toBe(BOARD_COLORS.blocked)
  })

  it('grows stronger while the board stabilizes', () => {
    expect(frameStyle('stabilizing', 0)?.alpha).toBeCloseTo(0.3)
    expect(frameStyle('stabilizing', STABLE_TICKS)?.alpha).toBeCloseTo(0.8)
  })
})

describe('cursorFor', () => {
  it('shows what a piece allows, and nothing once the level takes no moves', () => {
    expect(cursorFor(item(true, true), true)).toBe('grab')
    expect(cursorFor(item(false, true), true)).toBe('pointer')
    expect(cursorFor(item(false, false), true)).toBe('default')
    expect(cursorFor(undefined, true)).toBe('default')
    expect(cursorFor(item(true, true), false)).toBe('default')
  })
})

describe('buzzFor', () => {
  it('ticks for a move, rumbles for an explosion, and stays still otherwise', () => {
    const move = { kind: 'command', command: { kind: 'rotate', item: 1, steps: 1 } } as const
    expect(buzzFor([move])).toBe(12)
    expect(buzzFor([move, { kind: 'ignited', cells: [3] }])).toEqual([80, 40, 160])
    expect(buzzFor([{ kind: 'moved', item: 1, from: 2, to: 3 }])).toBeUndefined()
  })
})
