import { describe, expect, it } from 'vitest'
import { cellByName } from './board'
import { MAGENTA, RED } from './color'
import { formatBoard, parseBoard } from './notation'

describe('parseBoard', () => {
  it('reads the design example', () => {
    const board = parseBoard(`
      L2r  .  M5  .
      .    .  Crb A
    `)
    expect(board.width).toBe(4)
    expect(board.height).toBe(2)
    expect(board.cells[cellByName(board, 'A1')]).toEqual({ kind: 'laser', rotation: 2, color: RED })
    expect(board.cells[cellByName(board, 'A3')]).toEqual({ kind: 'mirror', rotation: 5, color: 0 })
    expect(board.cells[cellByName(board, 'B3')]).toEqual({
      kind: 'coin',
      rotation: 0,
      color: MAGENTA,
    })
    expect(board.cells[cellByName(board, 'B4')]).toEqual({
      kind: 'antiCoin',
      rotation: 0,
      color: 0,
    })
    expect(board.cells[cellByName(board, 'A2')]).toBeUndefined()
  })

  it.each([
    ['', 'no rows'],
    ['X1', 'A1 "X1" is not a part'],
    ['. M', 'A2 "M" needs a rotation from 0 to 7'],
    ['C2r', 'A1 "C2r" cannot rotate'],
    ['L2', 'A1 "L2" needs a color'],
    ['M3r', 'A1 "M3r" cannot have a color'],
    ['Cx', 'A1 "Cx" has an unknown color'],
    ['. .\n.', 'Row 2 has 1 cells, but row 1 has 2'],
  ])('rejects %j', (text, message) => {
    expect(() => parseBoard(text)).toThrow(message)
  })
})

describe('formatBoard', () => {
  it('writes aligned columns that parse back to the same board', () => {
    const text = 'L2rgb .     DM1\nA     Crb   SM7'
    expect(formatBoard(parseBoard(text))).toBe(text)
  })
})
