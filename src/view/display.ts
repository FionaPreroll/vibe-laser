import { signal } from '@preact/signals-core'

/**
 * Color-blind mode, on every board: pieces write their colors as letters, and beams draw each
 * primary color as a line of its own. The active profile's settings switch it.
 */
export const colorBlind = signal(false)
