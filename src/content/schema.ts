import { z } from 'zod'
import { HEADINGS } from '../core/actors/kinds'
import type { PartKind } from '../core/board'
import { parseColor } from '../core/color'
import { parseCellName } from '../core/grid'
import { COLORED_KINDS, INNER_COLORED_KINDS } from '../core/notation'
import { ROTATING_KINDS } from '../core/parts'

/*
 * The files of level packs, after the spec's JSON proposal: one pack.json per pack and one file per
 * level. Colors are the letters of the switched-on R, G and B switches, so "rb" is magenta, and
 * cells are named as in the original, row letter plus column number. A complex keeps its outer
 * color in "rgb" and its inner color in "inner".
 */

// A record, so that a new kind of piece fails the type check until level files may use it.
const KIND_NAMES = Object.keys({
  laser: 0,
  mirror: 0,
  doubleMirror: 0,
  slitMirror: 0,
  refractor: 0,
  oneWay: 0,
  splitter: 0,
  threeway: 0,
  prism: 0,
  colorConverter: 0,
  filter: 0,
  polarizer: 0,
  bender: 0,
  splicer: 0,
  prismirror: 0,
  selector: 0,
  complex: 0,
  coin: 0,
  antiCoin: 0,
  explosive: 0,
  fuelCell: 0,
  blackHole: 0,
  slime: 0,
  mine: 0,
  ship: 0,
} satisfies Record<PartKind, 0>) as [PartKind, ...PartKind[]]

const kind = z.enum(KIND_NAMES)
const cell = z.string().regex(/^[A-Z][1-9]\d*$/, 'expected a cell such as B4')
const rotation = z.number().int().min(0).max(7)
const color = z
  .string()
  .refine((letters) => (parseColor(letters) ?? 0) !== 0, 'expected color letters such as "rb"')
const names = z.object({ en: z.string().min(1), de: z.string().min(1) }).strict()

/** The looks a pack can be made for, as its skin: flat shapes, or glowing outlines. */
export const ART_STYLES = ['flat', 'neon'] as const
export type ArtStyle = (typeof ART_STYLES)[number]

/** Overrides of the rule flags in src/core/rules.ts, for a pack or a single level. */
export const rulesSchema = z
  .object({
    coinAngles: z.enum(['single', 'sameColor']).optional(),
    beamIntoLaser: z.enum(['absorb', 'pass']).optional(),
    polarizer: z.enum(['direction', 'axis']).optional(),
    actorsBlockLight: z.boolean().optional(),
  })
  .strict()

const piece = {
  type: kind,
  /** Clockwise 45° steps; for actors the way they head. */
  rot: rotation.optional(),
  rgb: color.optional(),
  /** The inner color of a complex. */
  inner: color.optional(),
  /** Defaults: fixed on the board, free in the toolbox. */
  moveable: z.boolean().optional(),
  rotateable: z.boolean().optional(),
}

// Type and cell first: parsing keeps this order, and saved files keep the order they were written in.
const { type: pieceType, ...traits } = piece
const boardObject = z.object({ type: pieceType, pos: cell, ...traits }).strict()
const toolboxEntry = z
  .object({ ...piece, count: z.number().int().min(1).max(32).optional() })
  .strict()
/** A toolbox piece, counted from 0 in file order, goes onto a cell in a rotation. */
const placement = z.object({ piece: z.number().int().min(0), pos: cell, rot: rotation }).strict()
/** A piece that starts on the board moves to a cell, or stays where it is, in a rotation. */
const shift = z.object({ from: cell, pos: cell, rot: rotation }).strict()
/** A piece that starts on the board goes into the first free toolbox slot. */
const stow = z.object({ from: cell, stow: z.literal(true) }).strict()
/** Ticks to let pass, while actors do their part. */
const wait = z.object({ wait: z.number().int().min(1) }).strict()

const levelObject = z
  .object({
    $schema: z.string().optional(),
    version: z.literal(1),
    name: names,
    /** What players read above the board, such as what a new part does. */
    intro: names.optional(),
    /** For level authors: what the level is about. Players do not see it. */
    note: z.string().optional(),
    size: z.tuple([z.number().int().min(1).max(32), z.number().int().min(1).max(26)]),
    objects: z.array(boardObject),
    toolbox: z.array(toolboxEntry).default([]),
    rules: rulesSchema.optional(),
    /** A known solution: where the player puts pieces, and waits in ticks for actors. */
    solution: z.array(z.union([placement, shift, stow, wait])).optional(),
  })
  .strict()

export const levelSchema = levelObject.superRefine(checkLevel)

export const packSchema = z
  .object({
    $schema: z.string().optional(),
    version: z.literal(1),
    title: names,
    description: names.optional(),
    /** Place in the pack selection; smaller comes first. */
    position: z.number().int().min(1).max(99999),
    /** Names of the skills, up to four, as Normal or Caution in the original. */
    skills: z.array(names).min(1).max(4),
    /** false goes straight from the pack to its levels, as with a single skill. */
    selectSkill: z.boolean().default(true),
    /** The look its levels are made for, unless the player chose one; flat without it. */
    skin: z.enum(ART_STYLES).optional(),
    /**
     * A Hints & Solutions pack, the original's IsSolved: players may ask where the next piece of a
     * level's known solution goes, or watch the whole solution.
     */
    showsSolutions: z.boolean().optional(),
    /** A built-in pack whose levels this one plays instead of levels of its own, skill by skill. */
    levelsFrom: z
      .string()
      .regex(/^[a-z0-9-]+$/)
      .optional(),
    rules: rulesSchema.optional(),
  })
  .strict()

export type LevelFile = z.output<typeof levelSchema>
export type PackFile = z.output<typeof packSchema>
/** A pack file as written, where defaults such as selectSkill may be left out. */
export type PackInput = z.input<typeof packSchema>
export type Names = z.output<typeof names>
export type SolutionStep = NonNullable<LevelFile['solution']>[number]
export type BoardObject = LevelFile['objects'][number]
export type ToolboxEntry = LevelFile['toolbox'][number]

/**
 * What is wrong with a level, for messages in the player's language: a key, and the part, cell or
 * count the message names.
 */
export interface LevelProblem {
  readonly key:
    | 'outside'
    | 'taken'
    | 'needsColor'
    | 'noColor'
    | 'needsInner'
    | 'noInner'
    | 'noRotation'
    | 'heading'
    | 'noCoin'
    | 'noPiece'
    | 'emptyCell'
    | 'fixed'
    | 'stiff'
  readonly kind?: PartKind
  readonly place?: string
  readonly count?: number
}

const NAMES: Record<PartKind, string> = {
  laser: 'a laser',
  mirror: 'a mirror',
  doubleMirror: 'a double mirror',
  slitMirror: 'a slit mirror',
  refractor: 'a refractor',
  oneWay: 'a one-way piece',
  splitter: 'a splitter',
  threeway: 'a threeway',
  prism: 'a prism',
  colorConverter: 'a color converter',
  filter: 'a filter',
  polarizer: 'a polarizer',
  bender: 'a bender',
  splicer: 'a splicer',
  prismirror: 'a prismirror',
  selector: 'a selector',
  complex: 'a complex',
  coin: 'a coin',
  antiCoin: 'an anti-coin',
  explosive: 'an explosive',
  fuelCell: 'a fuel cell',
  blackHole: 'a black hole',
  slime: 'a slime',
  mine: 'a mine',
  ship: 'a ship',
}

type Piece = {
  readonly type: PartKind
  readonly rot?: number
  readonly rgb?: string
  readonly inner?: string
  readonly moveable?: boolean
  readonly rotateable?: boolean
}

/** The checks beyond the shape of the file: everything has to fit together on the board. */
function checkLevel(level: z.output<typeof levelObject>, context: z.RefinementCtx): void {
  const [width, height] = level.size
  const issue = (path: (string | number)[], message: string, problem: LevelProblem) =>
    context.addIssue({ code: 'custom', path, message, params: { problem } })
  const inside = (name: string, path: (string | number)[]) => {
    const cell = parseCellName(name)
    if (cell !== undefined && cell.x < width && cell.y < height) return true
    issue(path, `${name} lies outside a ${width} × ${height} board`, {
      key: 'outside',
      place: name,
    })
    return false
  }
  const checkPiece = (piece: Piece, path: (string | number)[]) => {
    const kind = piece.type
    const what = NAMES[kind]
    if (COLORED_KINDS.has(kind) && piece.rgb === undefined) {
      issue([...path, 'rgb'], `${what} needs a color`, { key: 'needsColor', kind })
    }
    if (!COLORED_KINDS.has(kind) && piece.rgb !== undefined) {
      issue([...path, 'rgb'], `${what} has no color`, { key: 'noColor', kind })
    }
    if (INNER_COLORED_KINDS.has(kind) && piece.inner === undefined) {
      issue([...path, 'inner'], `${what} needs an inner color`, { key: 'needsInner', kind })
    }
    if (!INNER_COLORED_KINDS.has(kind) && piece.inner !== undefined) {
      issue([...path, 'inner'], `${what} has no inner color`, { key: 'noInner', kind })
    }
    const turn = piece.rot ?? 0
    if (!ROTATING_KINDS.has(kind) && turn !== 0)
      issue([...path, 'rot'], `${what} does not rotate`, { key: 'noRotation', kind })
    const headings: readonly number[] | undefined = HEADINGS[kind]
    if (headings !== undefined && !headings.includes(turn)) {
      issue([...path, 'rot'], `${what} cannot head that way`, { key: 'heading', kind })
    }
  }
  /** A solution step may only move and turn what the player can move and turn. */
  const checkFreedom = (piece: Piece, moved: boolean, rot: number, path: (string | number)[]) => {
    const kind = piece.type
    if (moved && !piece.moveable) {
      issue(path, `${NAMES[kind]} cannot be moved`, { key: 'fixed', kind })
    }
    // Kinds without a rotation already fail in checkPiece.
    if (rot !== (piece.rot ?? 0) && ROTATING_KINDS.has(kind) && !piece.rotateable) {
      issue([...path, 'rot'], `${NAMES[kind]} cannot be rotated`, { key: 'stiff', kind })
    }
  }

  const taken = new Map<string, number>()
  level.objects.forEach((object, index) => {
    checkPiece(object, ['objects', index])
    if (!inside(object.pos, ['objects', index, 'pos'])) return
    const before = taken.get(object.pos)
    if (before !== undefined) {
      issue(['objects', index, 'pos'], `${object.pos} already holds objects[${before}]`, {
        key: 'taken',
        place: object.pos,
      })
    }
    taken.set(object.pos, index)
  })

  const toolbox = level.toolbox.flatMap((entry, index) => {
    checkPiece(entry, ['toolbox', index])
    return Array.from({ length: entry.count ?? 1 }, () => entry)
  })
  const coins = [...level.objects, ...toolbox].filter(
    (piece) => piece.type === 'coin' || piece.type === 'antiCoin',
  )
  if (coins.length === 0) {
    issue(['objects'], 'a level needs at least one coin', { key: 'noCoin' })
  }

  level.solution?.forEach((step, index) => {
    const path = ['solution', index]
    if ('wait' in step) return
    if ('piece' in step) {
      const piece = toolbox[step.piece]
      if (piece === undefined) {
        issue([...path, 'piece'], `the toolbox holds ${toolbox.length} pieces`, {
          key: 'noPiece',
          count: toolbox.length,
        })
        return
      }
      // Toolbox pieces are free unless the file says otherwise.
      const free = {
        ...piece,
        moveable: piece.moveable ?? true,
        rotateable: piece.rotateable ?? ROTATING_KINDS.has(piece.type),
      }
      checkFreedom(free, true, step.rot, path)
      inside(step.pos, [...path, 'pos'])
      checkPiece({ ...piece, rot: step.rot }, path)
      return
    }
    const start = taken.get(step.from)
    const object = start === undefined ? undefined : level.objects[start]
    if (object === undefined) {
      issue([...path, 'from'], `${step.from} holds no piece at the start`, {
        key: 'emptyCell',
        place: step.from,
      })
      return
    }
    if ('stow' in step) {
      checkFreedom(object, true, object.rot ?? 0, path)
      return
    }
    checkFreedom(object, step.pos !== step.from, step.rot, path)
    inside(step.pos, [...path, 'pos'])
    checkPiece({ ...object, rot: step.rot }, path)
  })
}

/** The problem behind an issue of a level file, when it is one of the level checks. */
export function problemOf(issue: z.core.$ZodIssue): LevelProblem | undefined {
  if (issue.code !== 'custom') return undefined
  const problem: unknown = issue.params?.problem
  return typeof problem === 'object' && problem !== null ? (problem as LevelProblem) : undefined
}

/** Problems in a file, each led by where it is, such as "objects[3].pos: L17 lies outside …". */
export function describeIssues(error: z.ZodError): string[] {
  return error.issues.map((issue) => {
    const path = issue.path
      .map((part, index) =>
        typeof part === 'number' ? `[${part}]` : index === 0 ? String(part) : `.${String(part)}`,
      )
      .join('')
    return path === '' ? issue.message : `${path}: ${issue.message}`
  })
}
