/** Beam directions, clockwise from north: 0 N, 1 NE, 2 E, 3 SE, 4 S, 5 SW, 6 W, 7 NW. */
export type Direction = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7

/** The four lines through a cell's center: 0 N–S, 1 NE–SW, 2 E–W, 3 SE–NW. */
export type Axis = 0 | 1 | 2 | 3

export const DIRECTIONS: readonly Direction[] = [0, 1, 2, 3, 4, 5, 6, 7]
export const AXES: readonly Axis[] = [0, 1, 2, 3]

/** Column step per direction. Rows grow downward, so north is a row step of -1. */
export const DX = [0, 1, 1, 1, 0, -1, -1, -1] as const
/** Row step per direction. */
export const DY = [-1, -1, 0, 1, 1, 1, 0, -1] as const

/** Turns by 45° steps, clockwise for positive steps. */
export function turn(direction: Direction, steps: number): Direction {
  return ((((direction + steps) % 8) + 8) % 8) as Direction
}

export function opposite(direction: Direction): Direction {
  return turn(direction, 4)
}

/** A direction and its opposite lie on the same axis. */
export function axisOf(direction: Direction): Axis {
  return (direction & 3) as Axis
}
