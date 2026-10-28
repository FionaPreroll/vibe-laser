import type { BoardObject, LevelFile, SolutionStep } from '../content/schema'
import { HEADINGS } from '../core/actors/kinds'
import { cellByName, type PartKind } from '../core/board'
import { cellName, DEFAULT_COLUMNS, DEFAULT_ROWS, MAX_ROWS } from '../core/grid'
import type { Place } from '../core/level'
import { ROTATING_KINDS } from '../core/parts'

/*
 * Edits of a level, each a pure function from one level file to the next. While the editor works
 * on a level its toolbox holds one entry per piece, so toolbox slot n is entry n; saving counts
 * equal neighbours together again. An edit that changes nothing returns the level it was given.
 */

/** A piece as a level file describes it, without its place. */
export type PieceSpec = Omit<BoardObject, 'pos'>

/** The widest board a level file allows; rows run from A to Z. */
export const MAX_COLUMNS = 32
export { MAX_ROWS }

/** An empty board of the original's usual size, without a name yet. */
export function newLevel(): LevelFile {
  return {
    version: 1,
    name: { en: '', de: '' },
    size: [DEFAULT_COLUMNS, DEFAULT_ROWS],
    objects: [],
    toolbox: [],
  }
}

/** A level as the editor works on it: one toolbox entry per piece. */
export function openLevel(level: LevelFile): LevelFile {
  return {
    ...level,
    toolbox: level.toolbox.flatMap(({ count, ...entry }) =>
      Array.from({ length: count ?? 1 }, () => entry),
    ),
  }
}

/** A level ready to save: board pieces in reading order and equal toolbox neighbours counted. */
export function finishLevel(level: LevelFile): LevelFile {
  const objects = [...level.objects].sort((a, b) => cellOf(level, a.pos) - cellOf(level, b.pos))
  const toolbox: LevelFile['toolbox'] = []
  for (const entry of level.toolbox) {
    const last = toolbox.at(-1)
    if (last !== undefined && samePiece(last, entry)) {
      toolbox[toolbox.length - 1] = { ...last, count: (last.count ?? 1) + (entry.count ?? 1) }
    } else {
      toolbox.push(entry)
    }
  }
  const { note, ...rest } = level
  return { ...rest, ...(note?.trim() ? { note: note.trim() } : {}), objects, toolbox }
}

export function pieceAt(level: LevelFile, place: Place): PieceSpec | undefined {
  if (place.area === 'toolbox') {
    const entry = level.toolbox[place.slot]
    if (entry === undefined) return undefined
    const { count: _, ...piece } = entry
    return piece
  }
  const object = level.objects.find((each) => each.pos === nameOf(level, place.cell))
  if (object === undefined) return undefined
  const { pos: _, ...piece } = object
  return piece
}

/**
 * Puts a piece on a place, in place of what was there. A toolbox slot past the last piece adds
 * the piece at the end, as the toolbox has no gaps.
 */
export function putPiece(level: LevelFile, place: Place, piece: PieceSpec): LevelFile {
  const clean = tidy(piece)
  const there = pieceAt(level, place)
  if (there !== undefined && samePiece(there, clean)) return level
  if (place.area === 'toolbox') {
    const toolbox = [...level.toolbox]
    if (place.slot < toolbox.length) toolbox[place.slot] = clean
    else toolbox.push(clean)
    return { ...level, toolbox }
  }
  const pos = nameOf(level, place.cell)
  const object = { ...clean, pos }
  const at = level.objects.findIndex((each) => each.pos === pos)
  const objects = [...level.objects]
  if (at >= 0) objects[at] = object
  else objects.push(object)
  return { ...level, objects }
}

export function removePiece(level: LevelFile, place: Place): LevelFile {
  if (pieceAt(level, place) === undefined) return level
  if (place.area === 'toolbox') {
    return { ...level, toolbox: level.toolbox.filter((_, slot) => slot !== place.slot) }
  }
  const pos = nameOf(level, place.cell)
  return { ...level, objects: level.objects.filter((each) => each.pos !== pos) }
}

/**
 * Moves a piece to a free cell, or within or into the toolbox. A piece that changes between board
 * and toolbox takes on the defaults there: fixed on the board, free in the toolbox.
 */
export function movePiece(level: LevelFile, from: Place, to: Place): LevelFile {
  const piece = pieceAt(level, from)
  if (piece === undefined) return level
  if (from.area === 'toolbox' && to.area === 'toolbox') {
    if (from.slot === to.slot) return level
    const toolbox = level.toolbox.filter((_, slot) => slot !== from.slot)
    const entry = level.toolbox[from.slot]
    if (entry !== undefined) toolbox.splice(Math.min(to.slot, toolbox.length), 0, entry)
    return { ...level, toolbox }
  }
  if (to.area === 'board' && pieceAt(level, to) !== undefined) return level
  const { moveable: _, rotateable: __, ...plain } = piece
  const moved = from.area === to.area ? piece : plain
  const without = removePiece(level, from)
  return putPiece(without, to.area === 'toolbox' ? { area: 'toolbox', slot: Infinity } : to, moved)
}

/** Changes properties of the piece on a place; undefined values remove them. */
export function changePiece(
  level: LevelFile,
  place: Place,
  changes: Partial<PieceSpec>,
): LevelFile {
  const piece = pieceAt(level, place)
  if (piece === undefined) return level
  const next = tidy({ ...piece, ...changes })
  return samePiece(piece, next) ? level : putPiece(level, place, next)
}

/**
 * Turns the piece on a place by 45° steps, clockwise for positive steps. Actors with only some
 * headings go round those; parts that do not rotate stay as they are.
 */
export function rotatePiece(level: LevelFile, place: Place, steps: number): LevelFile {
  const piece = pieceAt(level, place)
  if (piece === undefined || !ROTATING_KINDS.has(piece.type) || steps === 0) return level
  return changePiece(level, place, { rot: turned(piece.type, piece.rot ?? 0, steps) })
}

function turned(kind: PartKind, rotation: number, steps: number): number {
  const headings = HEADINGS[kind]
  if (headings === undefined) return (((rotation + steps) % 8) + 8) % 8
  const index = Math.max(0, headings.indexOf(rotation as never))
  const next = (((index + Math.sign(steps)) % headings.length) + headings.length) % headings.length
  return headings[next] ?? rotation
}

/** A new board size; pieces that no longer fit are taken off. */
export function resizeLevel(level: LevelFile, columns: number, rows: number): LevelFile {
  const width = clamp(columns, 1, MAX_COLUMNS)
  const height = clamp(rows, 1, MAX_ROWS)
  if (width === level.size[0] && height === level.size[1]) return level
  const size = { width, height }
  return {
    ...level,
    size: [width, height],
    objects: level.objects.filter((object) => cellByName(size, object.pos) >= 0),
  }
}

export function renameLevel(level: LevelFile, locale: 'en' | 'de', name: string): LevelFile {
  return level.name[locale] === name ? level : { ...level, name: { ...level.name, [locale]: name } }
}

export function noteLevel(level: LevelFile, note: string): LevelFile {
  if ((level.note ?? '') === note) return level
  const { note: _, ...rest } = level
  return note === '' ? rest : { ...rest, note }
}

/** The known solution, or none. */
export function solveLevel(
  level: LevelFile,
  solution: readonly SolutionStep[] | undefined,
): LevelFile {
  const { solution: _, ...rest } = level
  return solution === undefined ? rest : { ...rest, solution: [...solution] }
}

/** The board and toolbox emptied; name, size and rules stay. */
export function clearLevel(level: LevelFile): LevelFile {
  const { solution: _, ...rest } = level
  return { ...rest, objects: [], toolbox: [] }
}

export function nameOf(level: LevelFile, cell: number): string {
  const [width] = level.size
  return cellName({ x: cell % width, y: Math.floor(cell / width) })
}

export function cellOf(level: LevelFile, name: string): number {
  return cellByName({ width: level.size[0], height: level.size[1] }, name)
}

function samePiece(a: PieceSpec, b: PieceSpec): boolean {
  return JSON.stringify(tidy(a)) === JSON.stringify(tidy(b))
}

/** The piece's properties in a fixed order, without undefined ones. */
function tidy(piece: PieceSpec): PieceSpec {
  const { type, rot, rgb, moveable, rotateable } = piece
  return {
    type,
    ...(rot === undefined ? {} : { rot }),
    ...(rgb === undefined ? {} : { rgb }),
    ...(moveable === undefined ? {} : { moveable }),
    ...(rotateable === undefined ? {} : { rotateable }),
  }
}

function clamp(value: number, low: number, high: number): number {
  return Math.min(high, Math.max(low, Math.round(Number.isFinite(value) ? value : low)))
}
