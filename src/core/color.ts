/** Light as three bits: red 1, green 2, blue 4. Mixing is OR, filtering is AND, 0 is no light. */
export type Color = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7
export type Primary = 1 | 2 | 4

export const RED: Primary = 1
export const GREEN: Primary = 2
export const BLUE: Primary = 4
export const YELLOW: Color = 3
export const MAGENTA: Color = 5
export const CYAN: Color = 6
export const WHITE: Color = 7

export const PRIMARIES: readonly Primary[] = [RED, GREEN, BLUE]

export function primariesOf(color: Color): Primary[] {
  return PRIMARIES.filter((primary) => (color & primary) !== 0)
}

/** Narrow side of a color converter: red to green, green to blue, blue to red; white stays white. */
export function shiftForward(color: Color): Color {
  return (((color << 1) | (color >> 2)) & 7) as Color
}

/** Broad side of a color converter: red to blue, blue to green, green to red. */
export function shiftBackward(color: Color): Color {
  return (((color >> 1) | (color << 2)) & 7) as Color
}

/**
 * Reads a color from the letters of its switched-on components, the way the original editor sets
 * it with three switches: "rb" is magenta, "" is no light. Unknown or repeated letters give undefined.
 */
export function parseColor(letters: string): Color | undefined {
  let color = 0
  for (const letter of letters) {
    const bit = letter === 'r' ? RED : letter === 'g' ? GREEN : letter === 'b' ? BLUE : 0
    if (bit === 0 || (color & bit) !== 0) return undefined
    color |= bit
  }
  return color as Color
}

/** The letters of a color's components, always in the order r, g, b. */
export function colorLetters(color: Color): string {
  return (color & RED ? 'r' : '') + (color & GREEN ? 'g' : '') + (color & BLUE ? 'b' : '')
}
