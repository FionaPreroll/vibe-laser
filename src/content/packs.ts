import {
  describeIssues,
  type LevelFile,
  levelSchema,
  type Names,
  type PackFile,
  packSchema,
} from './schema'

/** A level's place: pack, skill from 1 and slot from 1, as in "tutorial/2/5". */
export interface LevelEntry {
  readonly id: string
  readonly pack: string
  readonly skill: number
  readonly number: number
  readonly load: () => Promise<Level>
}

export interface Level extends Omit<LevelEntry, 'load'> {
  readonly file: LevelFile
}

export interface Skill {
  readonly number: number
  readonly name: Names
  readonly levels: readonly LevelEntry[]
}

export interface Pack {
  readonly id: string
  readonly file: PackFile
  readonly skills: readonly Skill[]
}

/** Thirty slots per skill, as in the original editor. */
export const SLOTS = 30

/** A level or pack file that does not pass the checks; the message lists every problem. */
export class ContentError extends Error {
  constructor(file: string, problems: readonly string[]) {
    super(`${file}:\n  ${problems.join('\n  ')}`)
    this.name = 'ContentError'
  }
}

const PACK_PATH = /^\/packs\/([a-z0-9-]+)\/pack\.json$/
const LEVEL_PATH = /^\/packs\/([a-z0-9-]+)\/levels\/skill(\d)\/level_(\d{3})\.json$/

/**
 * Packs from their files: pack.json by path, and a loader per level file. Packs come in the
 * order of their position; skills and levels in the order of their numbers.
 */
export function buildPacks(
  manifests: Readonly<Record<string, unknown>>,
  levelFiles: Readonly<Record<string, () => Promise<unknown>>>,
): Pack[] {
  const files = new Map<string, PackFile>()
  for (const [path, json] of Object.entries(manifests)) {
    const id = PACK_PATH.exec(path)?.[1]
    if (id === undefined) throw new ContentError(path, ['is no pack.json in a pack folder'])
    const parsed = packSchema.safeParse(json)
    if (!parsed.success) throw new ContentError(path, describeIssues(parsed.error))
    files.set(id, parsed.data)
  }
  const entries = new Map<string, LevelEntry[]>()
  for (const [path, load] of Object.entries(levelFiles)) {
    const [, pack = '', skillDigit = '', slot = ''] = LEVEL_PATH.exec(path) ?? []
    const skill = Number(skillDigit)
    const number = Number(slot)
    const skills = files.get(pack)?.skills.length ?? 0
    if (skill < 1 || skill > skills || number < 1 || number > SLOTS) {
      throw new ContentError(path, ['lies outside the skills and slots of its pack'])
    }
    const place = { id: `${pack}/${skill}/${number}`, pack, skill, number }
    const entry: LevelEntry = {
      ...place,
      load: async () => {
        const parsed = levelSchema.safeParse(await load())
        if (!parsed.success) throw new ContentError(path, describeIssues(parsed.error))
        return { ...place, file: parsed.data }
      },
    }
    const key = `${pack}/${skill}`
    entries.set(key, [...(entries.get(key) ?? []), entry])
  }
  return [...files]
    .map(([id, file]) => ({
      id,
      file,
      skills: file.skills.map((name, index) => ({
        number: index + 1,
        name,
        levels: (entries.get(`${id}/${index + 1}`) ?? []).sort((a, b) => a.number - b.number),
      })),
    }))
    .sort((a, b) => a.file.position - b.file.position)
}

/** The built-in packs under packs/: pack.json files right away, levels when they are needed. */
export const PACKS: readonly Pack[] = buildPacks(
  import.meta.glob('/packs/*/pack.json', { eager: true, import: 'default' }),
  import.meta.glob('/packs/*/levels/skill*/level_*.json', { import: 'default' }),
)

/** Every level of a pack, skill after skill. */
export function levelsOf(pack: Pack): LevelEntry[] {
  return pack.skills.flatMap((skill) => skill.levels)
}

export function findPack(id: string, packs: readonly Pack[] = PACKS): Pack | undefined {
  return packs.find((pack) => pack.id === id)
}

/** A level by its id, with the pack and skill it belongs to. */
export function findLevel(
  id: string,
  packs: readonly Pack[] = PACKS,
): { pack: Pack; skill: Skill; entry: LevelEntry } | undefined {
  for (const pack of packs) {
    for (const skill of pack.skills) {
      const entry = skill.levels.find((level) => level.id === id)
      if (entry !== undefined) return { pack, skill, entry }
    }
  }
  return undefined
}

export function countSolved(levels: readonly LevelEntry[], solved: ReadonlySet<string>): number {
  return levels.filter((level) => solved.has(level.id)).length
}

/**
 * The first unsolved level after this one in its pack, coming round to the pack's start; undefined
 * once every level of the pack is solved.
 */
export function nextUnsolved(
  id: string,
  solved: ReadonlySet<string>,
  packs: readonly Pack[] = PACKS,
): LevelEntry | undefined {
  const found = findLevel(id, packs)
  if (found === undefined) return undefined
  const levels = levelsOf(found.pack)
  const start = levels.findIndex((level) => level.id === id)
  const order = [...levels.slice(start + 1), ...levels.slice(0, start)]
  return order.find((level) => !solved.has(level.id))
}
