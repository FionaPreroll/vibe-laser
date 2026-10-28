import { describe, expect, it } from 'vitest'
import { cellByName } from './board'
import { BLUE, CYAN, GREEN, MAGENTA, RED } from './color'
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

  it('reads the parts of the expansion packs, with the inner color of a complex', () => {
    const board = parseBoard('BE SP4 PM1 SE2g CX3r/gb')
    expect(board.cells).toEqual([
      { kind: 'bender', rotation: 0, color: 0 },
      { kind: 'splicer', rotation: 4, color: 0 },
      { kind: 'prismirror', rotation: 1, color: 0 },
      { kind: 'selector', rotation: 2, color: GREEN },
      { kind: 'complex', rotation: 3, color: RED, inner: CYAN },
    ])
    expect(board.cells[3]).not.toHaveProperty('inner')
  })

  it('reads hazards and actors, with the way each actor heads', () => {
    const board = parseBoard('T FC H SL2 MI5 SH6')
    expect(board.cells.map((piece) => piece && [piece.kind, piece.rotation])).toEqual([
      ['explosive', 0],
      ['fuelCell', 0],
      ['blackHole', 0],
      ['slime', 2],
      ['mine', 5],
      ['ship', 6],
    ])
  })

  it.each([
    ['', 'no rows'],
    ['SL1', 'A1 "SL1" cannot head that way'],
    ['SH0', 'A1 "SH0" cannot head that way'],
    ['T2', 'A1 "T2" cannot rotate'],
    ['MI', 'A1 "MI" needs a rotation from 0 to 7'],
    ['F2r', 'A1 "F2r" cannot rotate'],
    ['PO2', 'A1 "PO2" needs a color'],
    ['P3r', 'A1 "P3r" cannot have a color'],
    ['X1', 'A1 "X1" is not a part'],
    ['. M', 'A2 "M" needs a rotation from 0 to 7'],
    ['C2r', 'A1 "C2r" cannot rotate'],
    ['L2', 'A1 "L2" needs a color'],
    ['M3r', 'A1 "M3r" cannot have a color'],
    ['Cx', 'A1 "Cx" has an unknown color'],
    ['BE2', 'A1 "BE2" cannot rotate'],
    ['SE0', 'A1 "SE0" needs a color'],
    ['CX0r', 'A1 "CX0r" needs an inner color'],
    ['CX0r/gg', 'A1 "CX0r/gg" has an unknown inner color'],
    ['SE0r/g', 'A1 "SE0r/g" cannot have an inner color'],
    ['M0/', 'A1 "M0/" is not a part'],
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

  it('writes the inner color of a complex after a slash', () => {
    const text = 'CX0r/gb SE7b    BE'
    expect(formatBoard(parseBoard(text))).toBe(text)
  })
})
