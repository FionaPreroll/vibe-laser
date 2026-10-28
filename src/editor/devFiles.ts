import type { LevelFile, PackFile } from '../content/schema'

/**
 * While the development server runs, the editor can write built-in packs straight into packs/,
 * so the game's own levels are made in the game and committed with git. Production builds have no
 * such server, and this is false there.
 */
export const DEV_FILES: boolean = import.meta.env.DEV

/** The development server's endpoint; see tools/packFiles.ts. */
export const ENDPOINT = '/__vibe-laser/packs'

async function send(path: string, method: 'PUT' | 'DELETE', body?: unknown): Promise<void> {
  const response = await fetch(`${ENDPOINT}/${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  })
  if (!response.ok) {
    throw new Error(`The development server refused: ${response.status} ${await response.text()}`)
  }
}

/** Writes packs/<pack>/levels/skill<skill>/level_<slot>.json. */
export function saveLevelFile(pack: string, skill: number, slot: number, level: LevelFile) {
  return send(`${pack}/${skill}/${slot}`, 'PUT', level)
}

export function deleteLevelFile(pack: string, skill: number, slot: number) {
  return send(`${pack}/${skill}/${slot}`, 'DELETE')
}

/** Writes packs/<pack>/pack.json. */
export function savePackFile(pack: string, file: PackFile) {
  return send(pack, 'PUT', file)
}
