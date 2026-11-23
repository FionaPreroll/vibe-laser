import { type CustomPack, type PackShelf, parsePacks } from './packs'
import { migrate, type ProfileBook, type SaveData } from './profiles'

/** What a backup file brings back: every profile, and the player's own packs. */
export interface Backup {
  readonly saves: SaveData
  readonly packs: readonly CustomPack[]
}

/** Every profile and every pack of the player's own as one JSON file, to keep or to move. */
export function exportBackup(book: ProfileBook, shelf: PackShelf, now = new Date()): string {
  const file = {
    format: 'vibe-laser-backup',
    version: 1,
    created: now.toISOString(),
    saves: book.data.value,
    packs: shelf.packs.value,
  }
  return `${JSON.stringify(file, null, 2)}\n`
}

/** Reads a backup file; throws a SyntaxError for anything else. */
export function parseBackup(text: string): Backup {
  let json: unknown
  try {
    json = JSON.parse(text)
  } catch {
    throw new SyntaxError('The file is no backup')
  }
  if (typeof json !== 'object' || json === null) throw new SyntaxError('The file is no backup')
  const file = json as Record<string, unknown>
  if (file.format !== 'vibe-laser-backup' || file.version !== 1) {
    throw new SyntaxError('The file is no backup')
  }
  const saves = migrate(file.saves)
  const packs = parsePacks(file.packs ?? [])
  if (saves === undefined || packs === undefined) throw new SyntaxError('The file is no backup')
  const ids = new Set(packs.map((pack) => pack.id))
  const profileIds = new Set(saves.profiles.map((profile) => profile.id))
  if (ids.size !== packs.length || profileIds.size !== saves.profiles.length) {
    throw new SyntaxError('The file is no backup')
  }
  return { saves, packs }
}
