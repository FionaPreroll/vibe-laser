import { describe, expect, it } from 'vitest'
import { cellByName } from './board'
import { BLUE, GREEN, MAGENTA, RED } from './color'
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

  it('reads every optical part', () => {
    const board = parseBoard('R3 OW2 S0 SC1 P7 CC4 Fg PO2b')
    expect(board.cells.map((piece) => piece && [piece.kind, piece.rotation, piece.color])).toEqual([
      ['refractor', 3, 0],
      ['oneWay', 2, 0],
      ['splitter', 0, 0],
      ['threeway', 1, 0],
      ['prism', 7, 0],
      ['colorConverter', 4, 0],
      ['filter', 0, GREEN],
      ['polarizer', 2, BLUE],
    ])
  })

  it.each([
    ['', 'no rows'],
    ['F2r', 'A1 "F2r" cannot rotate'],
    ['PO2', 'A1 "PO2" needs a color'],
    ['P3r', 'A1 "P3r" cannot have a color'],
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
