import { GraphicsContext } from 'pixi.js'
import type { Piece } from '../../core/board'
import { BOARD_COLORS, PIECE_COLORS } from '../palette'
import type { ArtPack } from './types'

const SILVER = 0xdfe8ff
const MIRROR_BACK = 0x3a4255
const BODY = 0x2a3142
const BODY_EDGE = 0x434d63
const ANTI_EDGE = 0x4a5268
const GLASS = 0x7fd6ff
const GLASS_EDGE = 0xbfeaff
const SHADE = 0x3a4255
// Trapezoid of one-way pieces and color converters: broad side south, narrow side north.
const TRAPEZOID = [-20, 20, 20, 20, 9, -20, -9, -20]

/** The first art pack: flat vector shapes drawn in code, shared by every piece of a kind. */
export function createFlatArt(): ArtPack {
  const shapes = new Map<string, GraphicsContext>()
  return {
    id: 'flat',
    tile: new GraphicsContext().roundRect(-30, -30, 60, 60, 6).fill(BOARD_COLORS.tile),
    slot: new GraphicsContext()
      .roundRect(-30, -30, 60, 60, 6)
      .fill(BOARD_COLORS.slot)
      .stroke({ width: 2, color: BOARD_COLORS.slotEdge }),
    piece(piece) {
      const key = `${piece.kind}:${piece.color}`
      let shape = shapes.get(key)
      if (shape === undefined) {
        shape = draw(piece)
        shapes.set(key, shape)
      }
      return shape
    },
  }
}

function draw(piece: Piece): GraphicsContext {
  const shape = new GraphicsContext()
  switch (piece.kind) {
    case 'laser': {
      const lens = PIECE_COLORS[piece.color]
      shape.roundRect(-18, -12, 36, 36, 8).fill(BODY).stroke({ width: 2, color: BODY_EDGE })
      shape.rect(-7, -27, 14, 17).fill(lens)
      shape.circle(0, 6, 7).fill(lens)
      break
    }
    case 'mirror':
      // Silver on the reflecting north side, a dark plate on the back.
      shape.roundRect(-27, -1, 54, 9, 3).fill(MIRROR_BACK)
      shape.rect(-27, -5, 54, 5).fill(SILVER)
      break
    case 'doubleMirror':
      shape.rect(-27, -6, 54, 12).fill(MIRROR_BACK)
      shape.rect(-27, -6, 54, 4).fill(SILVER)
      shape.rect(-27, 2, 54, 4).fill(SILVER)
      break
    case 'slitMirror':
      // Two mirror faces with the slit between them, held by end caps.
      shape.rect(-27, -8, 54, 4).fill(SILVER)
      shape.rect(-27, 4, 54, 4).fill(SILVER)
      shape.rect(-30, -8, 4, 16).fill(MIRROR_BACK)
      shape.rect(26, -8, 4, 16).fill(MIRROR_BACK)
      break
    case 'refractor':
      // A glass bar with slanted ends; the shaded long sides stop light.
      shape
        .poly([-9, -26, 9, -18, 9, 26, -9, 18])
        .fill({ color: GLASS, alpha: 0.35 })
        .stroke({ width: 2, color: GLASS_EDGE })
      shape
        .moveTo(-9, -26)
        .lineTo(-9, 18)
        .moveTo(9, -18)
        .lineTo(9, 26)
        .stroke({ width: 4, color: SHADE })
      break
    case 'oneWay':
      shape.poly(TRAPEZOID).fill(BODY).stroke({ width: 2, color: BODY_EDGE })
      shape.poly([0, -13, 9, 5, -9, 5]).fill(SILVER)
      break
    case 'splitter':
      // The tip faces north; the dark base stops light.
      shape.poly([0, -24, 22, 14, -22, 14]).fill(SILVER)
      shape.rect(-22, 14, 44, 6).fill(MIRROR_BACK)
      break
    case 'threeway':
      // Flat side south, two bevels facing north-east and north-west.
      shape
        .poly([-20, 20, 20, 20, 20, 2, 0, -20, -20, 2])
        .fill({ color: GLASS, alpha: 0.35 })
        .stroke({ width: 2, color: GLASS_EDGE })
      break
    case 'prism':
      // Light enters the south side and leaves through the long side facing north-east; the thick
      // western base stops it. The strokes hint where red, green and blue go.
      shape
        .poly([-20, -22, -20, 20, 22, 20])
        .fill({ color: 0xffffff, alpha: 0.18 })
        .stroke({ width: 2, color: GLASS_EDGE })
      shape.moveTo(-20, -22).lineTo(-20, 20).stroke({ width: 6, color: SHADE })
      shape.moveTo(-9, 14).lineTo(-9, 0).stroke({ width: 3, color: PIECE_COLORS[1] })
      shape.moveTo(-7, 14).lineTo(3, 4).stroke({ width: 3, color: PIECE_COLORS[2] })
      shape.moveTo(-5, 15).lineTo(9, 15).stroke({ width: 3, color: PIECE_COLORS[4] })
      break
    case 'colorConverter':
      shape.poly(TRAPEZOID).fill(BODY).stroke({ width: 2, color: BODY_EDGE })
      shape.rect(-12, -2, 8, 14).fill(PIECE_COLORS[1])
      shape.rect(-4, -2, 8, 14).fill(PIECE_COLORS[2])
      shape.rect(4, -2, 8, 14).fill(PIECE_COLORS[4])
      break
    case 'filter': {
      const tint = PIECE_COLORS[piece.color]
      shape
        .roundRect(-22, -22, 44, 44, 6)
        .fill({ color: tint, alpha: 0.35 })
        .stroke({ width: 3, color: tint })
      break
    }
    case 'polarizer': {
      // A filter with stripes along its line and a marker on the side light leaves through.
      const tint = PIECE_COLORS[piece.color]
      shape
        .roundRect(-22, -22, 44, 44, 6)
        .fill({ color: tint, alpha: 0.25 })
        .stroke({ width: 3, color: tint })
      shape
        .moveTo(-10, -14)
        .lineTo(-10, 14)
        .moveTo(0, -14)
        .lineTo(0, 14)
        .moveTo(10, -14)
        .lineTo(10, 14)
        .stroke({ width: 2, color: tint, alpha: 0.9 })
      shape.poly([0, -31, 7, -24, -7, -24]).fill(tint)
      break
    }
    case 'coin':
      shape
        .circle(0, 0, 19)
        .fill(PIECE_COLORS[piece.color])
        .stroke({ width: 3, color: 0x000000, alpha: 0.35 })
      shape.circle(0, 0, 11).stroke({ width: 2, color: 0xffffff, alpha: 0.45 })
      break
    case 'antiCoin':
      shape.circle(0, 0, 19).fill(PIECE_COLORS[0]).stroke({ width: 3, color: ANTI_EDGE })
      shape.circle(0, 0, 11).stroke({ width: 2, color: ANTI_EDGE })
      break
    default: {
      const missing: never = piece.kind
      throw new Error(`No shape for ${String(missing)}`)
    }
  }
  return shape
}
