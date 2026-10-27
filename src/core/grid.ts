/** Most levels of the original use 16 columns and 11 rows. */
export const DEFAULT_COLUMNS = 16
export const DEFAULT_ROWS = 11

/** Rows are lettered A to Z, so a board has at most 26 rows. */
export const MAX_ROWS = 26

const LETTER_A = 'A'.charCodeAt(0)

export interface Cell {
  /** Zero-based column, 0 is column 1. */
  x: number
  /** Zero-based row, 0 is row A. */
  y: number
}

/** Letter of a zero-based row: 0 is "A", 10 is "K". */
export function rowName(y: number): string {
  if (!Number.isInteger(y) || y < 0 || y >= MAX_ROWS) {
    throw new RangeError(`Row ${y} is outside A to Z`)
  }
  return String.fromCharCode(LETTER_A + y)
}

/** Number of a zero-based column: 0 is "1", 15 is "16". */
export function columnName(x: number): string {
  if (!Number.isInteger(x) || x < 0) {
    throw new RangeError(`Column ${x} is not a zero-based column index`)
  }
  return String(x + 1)
}

/** Cell name as in the original: row letter plus column number, so x 4, y 10 is "K5". */
export function cellName({ x, y }: Cell): string {
  return rowName(y) + columnName(x)
}

/** Reads a cell name such as "K5"; returns undefined for anything else. */
export function parseCellName(name: string): Cell | undefined {
  const match = /^([A-Z])([1-9]\d*)$/.exec(name)
  if (!match?.[1] || !match[2]) return undefined
  return { x: Number(match[2]) - 1, y: match[1].charCodeAt(0) - LETTER_A }
}
