import { describe, expect, it } from 'vitest'
import { cellByName } from './board'
import { burn, litExplosives } from './explosions'
import { boardOf, createPuzzle, type Puzzle } from './level'
import { formatBoard, parseBoard } from './notation'
import { halfColor, trace } from './trace'

function puzzleOf(text: string): Puzzle {
  return createPuzzle(parseBoard(text), [])
}

function cells(puzzle: Puzzle, ...names: string[]): number[] {
  return names.map((name) => cellByName(boardOf(puzzle), name))
}

/** Compares boards whatever their column widths. */
function expectBoard(puzzle: Puzzle, expected: string) {
  expect(formatBoard(boardOf(puzzle))).toBe(formatBoard(parseBoard(expected)))
}

describe('litExplosives', () => {
  it('finds the explosives and fuel cells light reaches, and the light stops there', () => {
    const puzzle = puzzleOf(`
      L2r .  T  .
      L2b FC .  T
    `)
    const { light } = trace(boardOf(puzzle))
    expect(litExplosives(puzzle, light)).toEqual(cells(puzzle, 'A3', 'B2'))
    const [a4] = cells(puzzle, 'A4')
    expect(halfColor(light, a4 ?? -1, 6)).toBe(0)
  })
})

describe('burn', () => {
  const start = puzzleOf(`
    M0  Cr  .   .
    L2r T   T   .
    .   A   H   .
  `)

  it('destroys the eight neighbours and lets explosives among them burn next', () => {
    const blast = burn(start, cells(start, 'B2'))
    expectBoard(
      blast.puzzle,
      `
      .   .   .   .
      .   .   T   .
      .   .   H   .
    `,
    )
    expect(blast.next).toEqual(cells(start, 'B3'))
    expect(blast.destroyed).toEqual([0, 1, 2, 3, 5])
  })

  it('ends when no explosive is left nearby; black holes survive', () => {
    const first = burn(start, cells(start, 'B2'))
    const second = burn(first.puzzle, first.next)
    expectBoard(
      second.puzzle,
      `
      .   .   .   .
      .   .   .   .
      .   .   H   .
    `,
    )
    expect(second.next).toEqual([])
  })

  it('sets off fuel cells like explosives', () => {
    const puzzle = puzzleOf('T FC . T')
    const blast = burn(puzzle, cells(puzzle, 'A1'))
    expect(blast.next).toEqual(cells(puzzle, 'A2'))
    expect(burn(blast.puzzle, blast.next).next).toEqual([])
  })
})
