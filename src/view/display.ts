import { signal } from '@preact/signals-core'

/**
 * Color-blind mode, on every board: pieces write their colors as letters, and beams draw each
 * primary color as a line of its own. The active profile's settings switch it.
 */
export const colorBlind = signal(false)

/** The art packs players choose from: the flat one and the glowing one. */
export const ART_STYLES = ['flat', 'neon'] as const
export type ArtStyle = (typeof ART_STYLES)[number]

/** The look of every board, from the active profile's settings. */
export const artStyle = signal<ArtStyle>('flat')
