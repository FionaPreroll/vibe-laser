import { type Board, neighbour } from './board'
import { type Color, type Primary, primariesOf } from './color'
import { type Axis, DIRECTIONS, type Direction, opposite } from './direction'
import { transfer } from './parts'
import { DEFAULT_RULES, type Rules } from './rules'

/**
 * Light on every half-segment, the line from a cell's center toward one of its eight neighbours.
 * Beams traveling either way along a half-segment add up there, which is the spec's mixing rule.
 */
export interface LightField {
  readonly width: number
  readonly height: number
  /** Color of each half-segment, at index cell × 8 + direction. */
  readonly halves: Uint8Array
}

export interface Trace {
  readonly light: LightField
  /** Photon states the tracer processed; never more than width × height × 8 × 3. */
  readonly steps: number
}

interface Photon {
  readonly cell: number
  readonly direction: Direction
  readonly primary: Primary
}

/**
 * Follows each primary color from each laser until every combination of cell, direction of travel
 * and primary has been seen once, which also ends loops and beams reflected onto themselves.
 * Parts act on each primary on its own, so mixed light needs no repeated pass: it is several
 * primaries on the same half-segment.
 */
export function trace(board: Board, rules: Rules = DEFAULT_RULES): Trace {
  const halves = new Uint8Array(board.cells.length * 8)
  const seen = new Uint8Array(board.cells.length * 8)
  const todo: Photon[] = []
  board.cells.forEach((piece, cell) => {
    if (piece?.kind !== 'laser') return
    for (const primary of primariesOf(piece.color)) {
      todo.push({ cell, direction: piece.rotation, primary })
    }
  })

  let steps = 0
  for (let photon = todo.pop(); photon !== undefined; photon = todo.pop()) {
    const { cell, direction, primary } = photon
    addBits(halves, cell * 8 + direction, primary)
    const next = neighbour(board, cell, direction)
    if (next < 0) continue
    addBits(halves, next * 8 + opposite(direction), primary)
    const state = next * 8 + direction
    if (((seen[state] ?? 0) & primary) !== 0) continue
    addBits(seen, state, primary)
    steps++
    for (const exit of transfer(board.cells[next], direction, primary, rules)) {
      todo.push({ cell: next, direction: exit.direction, primary: exit.primary })
    }
  }
  return { light: { width: board.width, height: board.height, halves }, steps }
}

function addBits(array: Uint8Array, index: number, bits: number): void {
  array[index] = (array[index] ?? 0) | bits
}

/** Color on the half-segment from the cell's center toward `direction`. */
export function halfColor(light: LightField, cell: number, direction: Direction): Color {
  return (light.halves[cell * 8 + direction] ?? 0) as Color
}

/** Light along one line through the cell's center: both of its halves together. */
export function axisColor(light: LightField, cell: number, axis: Axis): Color {
  return (halfColor(light, cell, axis) | halfColor(light, cell, opposite(axis))) as Color
}

/** Whether any light touches the cell. */
export function isLit(light: LightField, cell: number): boolean {
  return DIRECTIONS.some((direction) => halfColor(light, cell, direction) !== 0)
}
