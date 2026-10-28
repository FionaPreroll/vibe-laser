/**
 * A seeded random generator (mulberry32). Its whole state is one 32-bit number that lives in the
 * game state, so the same seed and the same moves replay the same game, in tests too.
 */
export interface Random {
  /** A number from 0 up to, but not including, 1. */
  readonly value: number
  /** The generator's state after drawing it. */
  readonly state: number
}

export function nextRandom(state: number): Random {
  const next = (state + 0x6d2b79f5) | 0
  let t = Math.imul(next ^ (next >>> 15), next | 1)
  t = (t + Math.imul(t ^ (t >>> 7), t | 61)) ^ t
  return { value: ((t ^ (t >>> 14)) >>> 0) / 4294967296, state: next }
}

/** One entry of a list, chosen at random; undefined, and no number drawn, for an empty list. */
export function pick<T>(
  items: readonly T[],
  state: number,
): { item: T | undefined; state: number } {
  if (items.length === 0) return { item: undefined, state }
  const drawn = nextRandom(state)
  return { item: items[Math.floor(drawn.value * items.length)], state: drawn.state }
}
