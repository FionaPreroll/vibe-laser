import { type Board, emptyBoard, type PartKind, type Piece } from './board'
import { colorLetters, parseColor } from './color'
import type { Direction } from './direction'
import { cellName } from './grid'
import { ROTATING_KINDS } from './parts'

/*
 * A compact text form of boards, in the spirit of the original editor's Script export. One line per
 * row, cells separated by spaces, "." for an empty cell. A part is its abbreviation from the spec,
 * then its rotation 0 to 7 if it has one, then its color letters: "L2r" is a red laser firing east,
 * "M5" a mirror in rotation 5, "Crb" a magenta coin, "A" an anti-coin.
 */

const ABBREVIATIONS: Record<PartKind, string> = {
  laser: 'L',
  mirror: 'M',
  doubleMirror: 'DM',
  slitMirror: 'SM',
  coin: 'C',
  antiCoin: 'A',
}
const KINDS = new Map(
  Object.entries(ABBREVIATIONS).map(([kind, abbreviation]) => [abbreviation, kind as PartKind]),
)
const COLORED_KINDS: ReadonlySet<PartKind> = new Set<PartKind>(['laser', 'coin'])
const TOKEN = /^([A-Z]+)([0-7]?)([a-z]*)$/

export function parseBoard(text: string): Board {
  const rows = text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line !== '')
    .map((line) => line.split(/\s+/))
  const width = rows[0]?.length ?? 0
  if (width === 0) throw new SyntaxError('The board text has no rows')
  const board = emptyBoard(width, rows.length)
  const cells: (Piece | undefined)[] = []
  for (const [y, tokens] of rows.entries()) {
    if (tokens.length !== width) {
      throw new SyntaxError(`Row ${y + 1} has ${tokens.length} cells, but row 1 has ${width}`)
    }
    for (const [x, token] of tokens.entries()) {
      cells.push(parsePiece(token, `${cellName({ x, y })} "${token}"`))
    }
  }
  return { ...board, cells }
}

/** Reads one part such as "M5" or "Crb", or "." for none; `where` names it in error messages. */
export function parsePiece(token: string, where = `"${token}"`): Piece | undefined {
  if (token === '.') return undefined
  const [, abbreviation = '', digit = '', letters = ''] = TOKEN.exec(token) ?? []
  const kind = KINDS.get(abbreviation)
  if (kind === undefined) throw new SyntaxError(`${where} is not a part`)
  const rotates = ROTATING_KINDS.has(kind)
  if (rotates !== (digit !== '')) {
    throw new SyntaxError(
      rotates ? `${where} needs a rotation from 0 to 7` : `${where} cannot rotate`,
    )
  }
  const color = parseColor(letters)
  if (color === undefined) throw new SyntaxError(`${where} has an unknown color`)
  const colored = COLORED_KINDS.has(kind)
  if (colored !== (color !== 0)) {
    throw new SyntaxError(colored ? `${where} needs a color` : `${where} cannot have a color`)
  }
  return { kind, rotation: rotates ? (Number(digit) as Direction) : 0, color }
}

/** The text form of a board, columns aligned; parseBoard reads it back. */
export function formatBoard(board: Board): string {
  const tokens = board.cells.map(formatPiece)
  const size = Math.max(...tokens.map((token) => token.length))
  const lines: string[] = []
  for (let y = 0; y < board.height; y++) {
    const row = tokens.slice(y * board.width, (y + 1) * board.width)
    lines.push(
      row
        .map((token) => token.padEnd(size))
        .join(' ')
        .trimEnd(),
    )
  }
  return lines.join('\n')
}

function formatPiece(piece: Piece | undefined): string {
  if (piece === undefined) return '.'
  const rotation = ROTATING_KINDS.has(piece.kind) ? String(piece.rotation) : ''
  return ABBREVIATIONS[piece.kind] + rotation + colorLetters(piece.color)
}
