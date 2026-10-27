import type { Board, Piece } from './board'
import { AXES } from './direction'
import type { Rules } from './rules'
import { axisColor, isLit, type LightField } from './trace'

/** Whether a coin or anti-coin in `cell` spins under the given light. */
export function coinSpins(coin: Piece, light: LightField, cell: number, rules: Rules): boolean {
  if (coin.kind === 'antiCoin') return !isLit(light, cell)
  const lit = AXES.map((axis) => axisColor(light, cell, axis)).filter((color) => color !== 0)
  if (rules.coinAngles === 'single') return lit.length === 1 && lit[0] === coin.color
  return lit.length > 0 && lit.every((color) => color === coin.color)
}

/** A board is solved when it holds coins and every one of them spins, anti-coins included. */
export function isSolved(board: Board, light: LightField, rules: Rules): boolean {
  let coins = 0
  for (const [cell, piece] of board.cells.entries()) {
    if (piece?.kind !== 'coin' && piece?.kind !== 'antiCoin') continue
    coins++
    if (!coinSpins(piece, light, cell, rules)) return false
  }
  return coins > 0
}
