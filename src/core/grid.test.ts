import { describe, expect, it } from 'vitest'
import { cellName, columnName, DEFAULT_COLUMNS, DEFAULT_ROWS, parseCellName, rowName } from './grid'

describe('cell names', () => {
  it('match the notation of the original', () => {
    expect(cellName({ x: 4, y: 10 })).toBe('K5')
    expect(cellName({ x: 14, y: 5 })).toBe('F15')
    expect(cellName({ x: 0, y: 0 })).toBe('A1')
  })

  it('round-trip for every cell of a default board', () => {
    for (let y = 0; y < DEFAULT_ROWS; y++) {
      for (let x = 0; x < DEFAULT_COLUMNS; x++) {
        expect(parseCellName(cellName({ x, y }))).toEqual({ x, y })
      }
    }
  })

  it.each(['', 'k5', 'A0', 'A01', '5K', 'AA1', 'K5 ', 'K-5'])('rejects %j', (name) => {
    expect(parseCellName(name)).toBeUndefined()
  })

  it('rejects rows and columns outside the board notation', () => {
    expect(() => rowName(-1)).toThrow(RangeError)
    expect(() => rowName(26)).toThrow(RangeError)
    expect(() => rowName(1.5)).toThrow(RangeError)
    expect(() => columnName(-1)).toThrow(RangeError)
    expect(rowName(25)).toBe('Z')
  })
})
