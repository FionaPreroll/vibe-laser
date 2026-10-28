import { z } from 'zod'
import { HEADINGS } from '../core/actors/kinds'
import type { PartKind } from '../core/board'
import { parseColor } from '../core/color'
import { parseCellName } from '../core/grid'
import { COLORED_KINDS } from '../core/notation'
import { ROTATING_KINDS } from '../core/parts'

/*
 * The files of level packs, after the spec's JSON proposal: one pack.json per pack and one file per
 * level. Colors are the letters of the switched-on R, G and B switches, so "rb" is magenta, and
 * cells are named as in the original, row letter plus column number.
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
  /** Defaults: fixed on the board, free in the toolbox. */
  moveable: z.boolean().optional(),
  rotateable: z.boolean().optional(),
}

const boardObject = z.object({ ...piece, pos: cell }).strict()
const toolboxEntry = z
  .object({ ...piece, count: z.number().int().min(1).max(32).optional() })
  .strict()
const placement = z.object({ piece: z.number().int().min(0), pos: cell, rot: rotation }).strict()
const wait = z.object({ wait: z.number().int().min(1) }).strict()

const levelObject = z
  .object({
    $schema: z.string().optional(),
    version: z.literal(1),
    name: names,
    /** For level authors: what the level is about. Players do not see it. */
    note: z.string().optional(),
    size: z.tuple([z.number().int().min(1).max(32), z.number().int().min(1).max(26)]),
    objects: z.array(boardObject),
    toolbox: z.array(toolboxEntry).default([]),
    rules: rulesSchema.optional(),
    /** A known solution: placements of toolbox pieces, and waits in ticks for actors. */
    solution: z.array(z.union([placement, wait])).optional(),
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
    rules: rulesSchema.optional(),
  })
  .strict()

export type LevelFile = z.output<typeof levelSchema>
export type PackFile = z.output<typeof packSchema>
export type Names = z.output<typeof names>

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
  coin: 'a coin',
  antiCoin: 'an anti-coin',
  explosive: 'an explosive',
  fuelCell: 'a fuel cell',
  blackHole: 'a black hole',
  slime: 'a slime',
  mine: 'a mine',
  ship: 'a ship',
}

type Piece = { readonly type: PartKind; readonly rot?: number; readonly rgb?: string }

/** The checks beyond the shape of the file: everything has to fit together on the board. */
function checkLevel(level: z.output<typeof levelObject>, context: z.RefinementCtx): void {
  const [width, height] = level.size
  const issue = (path: (string | number)[], message: string) =>
    context.addIssue({ code: 'custom', path, message })
  const inside = (name: string, path: (string | number)[]) => {
    const cell = parseCellName(name)
    if (cell !== undefined && cell.x < width && cell.y < height) return true
    issue(path, `${name} lies outside a ${width} × ${height} board`)
    return false
  }
  const checkPiece = (piece: Piece, path: (string | number)[]) => {
    const what = NAMES[piece.type]
    if (COLORED_KINDS.has(piece.type) && piece.rgb === undefined) {
      issue([...path, 'rgb'], `${what} needs a color`)
    }
    if (!COLORED_KINDS.has(piece.type) && piece.rgb !== undefined) {
      issue([...path, 'rgb'], `${what} has no color`)
    }
    const turn = piece.rot ?? 0
    if (!ROTATING_KINDS.has(piece.type) && turn !== 0)
      issue([...path, 'rot'], `${what} does not rotate`)
    const headings: readonly number[] | undefined = HEADINGS[piece.type]
    if (headings !== undefined && !headings.includes(turn)) {
      issue([...path, 'rot'], `${what} cannot head that way`)
    }
  }

  const taken = new Map<string, number>()
  level.objects.forEach((object, index) => {
    checkPiece(object, ['objects', index])
    if (!inside(object.pos, ['objects', index, 'pos'])) return
    const before = taken.get(object.pos)
    if (before !== undefined) {
      issue(['objects', index, 'pos'], `${object.pos} already holds objects[${before}]`)
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
  if (coins.length === 0) issue(['objects'], 'a level needs at least one coin')

  level.solution?.forEach((step, index) => {
    if ('wait' in step) return
    const piece = toolbox[step.piece]
    if (piece === undefined) {
      issue(['solution', index, 'piece'], `the toolbox holds ${toolbox.length} pieces`)
      return
    }
    inside(step.pos, ['solution', index, 'pos'])
    checkPiece({ ...piece, rot: step.rot }, ['solution', index])
  })
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
