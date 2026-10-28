import { PACKS, type Pack } from '../../content/packs'
import type { LevelFile, PackFile } from '../../content/schema'
import { DEV_FILES, deleteLevelFile, saveLevelFile, savePackFile } from '../../editor/devFiles'
import { type CustomPack, type PackShelf, slotOf } from '../../persistence/packs'

/** A pack the editor can change: one of the player's own, or in development a built-in one. */
export interface PackSource {
  readonly id: string
  readonly file: PackFile
  /** Built-in packs live in packs/, and only the development server writes them. */
  readonly builtIn: boolean
  /** Every level of the pack, by slot as "2/17". */
  levels(): Promise<ReadonlyMap<string, LevelFile>>
  saveLevel(skill: number, slot: number, level: LevelFile): Promise<void>
  deleteLevel(skill: number, slot: number): Promise<void>
  savePack(file: PackFile): Promise<void>
}

/** Where level files point for their schema, from packs/<pack>/levels/skill<n>/. */
const LEVEL_SCHEMA = '../../../level.schema.json'
const PACK_SCHEMA = '../pack.schema.json'

/** The pack with this id the editor may change, if there is one. */
export function sourceOf(id: string, shelf: PackShelf): PackSource | undefined {
  const custom = shelf.find(id)
  if (custom !== undefined) return customSource(shelf, custom)
  const pack = DEV_FILES ? PACKS.find((each) => each.id === id) : undefined
  return pack && builtInSource(pack)
}

/** The built-in packs the editor may change: in development all of them, else none. */
export function builtInPacks(): readonly Pack[] {
  return DEV_FILES ? PACKS : []
}

function customSource(shelf: PackShelf, pack: CustomPack): PackSource {
  return {
    id: pack.id,
    file: pack.pack,
    builtIn: false,
    levels: async () => new Map(Object.entries(shelf.find(pack.id)?.levels ?? {})),
    saveLevel: (skill, slot, { $schema: _, ...level }) =>
      shelf.saveLevel(pack.id, skill, slot, level),
    deleteLevel: (skill, slot) => shelf.deleteLevel(pack.id, skill, slot),
    savePack: ({ $schema: _, ...file }) => shelf.updatePack(pack.id, file),
  }
}

function builtInSource(pack: Pack): PackSource {
  return {
    id: pack.id,
    file: pack.file,
    builtIn: true,
    levels: async () => {
      const entries = pack.skills.flatMap((skill) => skill.levels)
      const loaded = await Promise.all(entries.map((entry) => entry.load()))
      return new Map(loaded.map((level) => [slotOf(level.skill, level.number), level.file]))
    },
    saveLevel: (skill, slot, level) =>
      saveLevelFile(pack.id, skill, slot, { $schema: LEVEL_SCHEMA, ...level }),
    deleteLevel: (skill, slot) => deleteLevelFile(pack.id, skill, slot),
    savePack: (file) => savePackFile(pack.id, { $schema: PACK_SCHEMA, ...file }),
  }
}
