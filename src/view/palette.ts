import type { Color } from '../core/color'

/** Beam color per light color, bright enough for additive blending on the dark board. */
export const BEAM_COLORS: Readonly<Record<Color, number>> = {
  0: 0x000000,
  1: 0xff3b3b,
  2: 0x2dff5f,
  3: 0xffe23d,
  4: 0x3d6bff,
  5: 0xff3dff,
  6: 0x3dfff0,
  7: 0xffffff,
}

/** Fill per color for coins and laser lenses. */
export const PIECE_COLORS: Readonly<Record<Color, number>> = {
  0: 0x05060a,
  1: 0xe5484d,
  2: 0x30c46b,
  3: 0xf5c542,
  4: 0x4a74e8,
  5: 0xd64fd6,
  6: 0x2ec4d6,
  7: 0xf2f4f8,
}

export const BOARD_COLORS = {
  tile: 0x161b26,
  slot: 0x10141c,
  slotEdge: 0x262e3f,
  frame: 0x2a3246,
  label: 0x7d8799,
  focus: 0xf5c542,
  target: 0x59d6ff,
  blocked: 0xff5566,
  selection: 0xffffff,
} as const

/** Rings and lines for what actors do. */
export const EFFECT_COLORS = {
  ate: 0x7ed957,
  collected: 0x6fdc6b,
  swallowed: 0xb69cff,
  fired: 0x59d6ff,
} as const
