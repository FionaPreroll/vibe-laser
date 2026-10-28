import { signal } from '@preact/signals-core'
import type { ArtStyle } from '../content/schema'

/**
 * Color-blind mode, on every board: pieces write their colors as letters, and beams draw each
 * primary color as a line of its own. The active profile's settings switch it.
 */
export const colorBlind = signal(false)

/** The look players chose for every board: an art style, or 'pack' for the skin of each pack. */
export const chosenArt = signal<ArtStyle | 'pack'>('pack')

/**
 * The art style of a board in a pack with this skin: the player's choice, else the pack's, else
 * flat. Read while rendering, it renders again when the player chooses another look.
 */
export function artStyleOf(skin: ArtStyle | undefined): ArtStyle {
  const chosen = chosenArt.value
  return chosen === 'pack' ? (skin ?? 'flat') : chosen
}
