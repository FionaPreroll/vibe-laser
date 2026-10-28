import { signal } from '@preact/signals'
import type { LevelFile } from '../../content/schema'

/** A level copied in the editor, and the slot it came from, for Paste and Swap. */
export interface Copied {
  readonly level: LevelFile
  readonly pack: string
  readonly skill: number
  readonly slot: number
}

export const clipboard = signal<Copied | undefined>(undefined)

/**
 * Unsaved changes of levels left without saving, by slot as "pack/2/17", so leaving the editor by
 * the header does not lose them while the page stays open.
 */
export const drafts = new Map<string, LevelFile>()
