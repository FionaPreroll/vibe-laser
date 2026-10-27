import { describe, expect, it } from 'vitest'
import { cellByName } from './board'
import { coinSpins, isSolved } from './coins'
import { parseBoard } from './notation'
import { DEFAULT_RULES, type Rules } from './rules'
import { trace } from './trace'

const SINGLE: Rules = { ...DEFAULT_RULES, coinAngles: 'single' }
const SAME_COLOR: Rules = { ...DEFAULT_RULES, coinAngles: 'sameColor' }

/** Whether the coin in the named cell spins. */
function spins(text: string, name: string, rules: Rules = DEFAULT_RULES): boolean {
  const board = parseBoard(text)
  const cell = cellByName(board, name)
  const coin = board.cells[cell]
  if (coin === undefined) throw new Error(`No coin in ${name}`)
  return coinSpins(coin, trace(board, rules).light, cell, rules)
}

function solved(text: string): boolean {
  const board = parseBoard(text)
  return isSolved(board, trace(board).light, DEFAULT_RULES)
}

describe('coins', () => {
  it('spin when the light on their line has exactly their color', () => {
    expect(spins('L2r . Cr', 'A3')).toBe(true)
    expect(spins('L2r . Cb', 'A3')).toBe(false)
    expect(spins('L2rb . Cr', 'A3')).toBe(false)
  })

  it('stay still without light', () => {
    expect(spins('Cr L2r .', 'A1')).toBe(false)
  })

  it('see beams running against each other on one line as mixed light', () => {
    expect(spins('L2r Crb L6b', 'A2')).toBe(true)
    expect(spins('L2r Cr L6b', 'A2')).toBe(false)
  })

  const twoRedAngles = `
    .   L4r .
    L2r Cr  .
  `

  it('spin with several angles of their own color only under sameColor', () => {
    expect(spins(twoRedAngles, 'B2', SAME_COLOR)).toBe(true)
    expect(spins(twoRedAngles, 'B2', SINGLE)).toBe(false)
  })

  it('never mix beams from different angles', () => {
    const redAndBlue = `
      .   L4b .
      L2r Crb .
    `
    expect(spins(redAndBlue, 'B2', SAME_COLOR)).toBe(false)
    expect(spins(redAndBlue, 'B2', SINGLE)).toBe(false)
    expect(spins(redAndBlue.replace('Crb', 'Cr '), 'B2', SAME_COLOR)).toBe(false)
  })
})

describe('anti-coins', () => {
  it('spin only while no light touches them', () => {
    expect(spins('A L2r .', 'A1')).toBe(true)
    expect(spins('L2r . A', 'A3')).toBe(false)
  })
})

describe('isSolved', () => {
  it('needs every coin and anti-coin to spin', () => {
    expect(solved('L2r Cr . \n A . .')).toBe(true)
    expect(solved('L2r Cr . \n Cb . .')).toBe(false)
    expect(solved('L2r Cr A')).toBe(false)
  })

  it('is false for a board without coins', () => {
    expect(solved('L2r . .')).toBe(false)
  })
})
