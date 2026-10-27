import { describe, expect, it } from 'vitest'
import {
  BLUE,
  type Color,
  CYAN,
  colorLetters,
  GREEN,
  MAGENTA,
  parseColor,
  primariesOf,
  RED,
  shiftBackward,
  shiftForward,
  WHITE,
  YELLOW,
} from './color'

const ALL_COLORS: Color[] = [0, 1, 2, 3, 4, 5, 6, 7]

describe('color converter shifts', () => {
  it('match the narrow side in the spec', () => {
    expect([RED, GREEN, BLUE].map(shiftForward)).toEqual([GREEN, BLUE, RED])
    expect([YELLOW, CYAN, MAGENTA].map(shiftForward)).toEqual([CYAN, MAGENTA, YELLOW])
  })

  it('match the broad side in the spec', () => {
    expect([RED, BLUE, GREEN].map(shiftBackward)).toEqual([BLUE, GREEN, RED])
    expect([YELLOW, MAGENTA, CYAN].map(shiftBackward)).toEqual([MAGENTA, CYAN, YELLOW])
  })

  it('keep white white and undo each other', () => {
    expect(shiftForward(WHITE)).toBe(WHITE)
    expect(shiftBackward(WHITE)).toBe(WHITE)
    for (const color of ALL_COLORS) expect(shiftBackward(shiftForward(color))).toBe(color)
  })
})

describe('color letters', () => {
  it('read the switched-on components in any order', () => {
    expect(parseColor('rb')).toBe(MAGENTA)
    expect(parseColor('br')).toBe(MAGENTA)
    expect(parseColor('rgb')).toBe(WHITE)
    expect(parseColor('')).toBe(0)
  })

  it.each(['x', 'rr', 'R', 'r b'])('reject %j', (letters) => {
    expect(parseColor(letters)).toBeUndefined()
  })

  it('round-trip for every color', () => {
    for (const color of ALL_COLORS) expect(parseColor(colorLetters(color))).toBe(color)
    expect(colorLetters(YELLOW)).toBe('rg')
  })
})

describe('primariesOf', () => {
  it('splits mixed light into its primaries', () => {
    expect(primariesOf(MAGENTA)).toEqual([RED, BLUE])
    expect(primariesOf(WHITE)).toEqual([RED, GREEN, BLUE])
    expect(primariesOf(0)).toEqual([])
  })
})
