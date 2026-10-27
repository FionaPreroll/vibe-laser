import { GraphicsContext } from 'pixi.js'
import type { Piece } from '../../core/board'
import { BOARD_COLORS, PIECE_COLORS } from '../palette'
import type { ArtPack } from './types'

const SILVER = 0xdfe8ff
const MIRROR_BACK = 0x3a4255
const BODY = 0x2a3142
const BODY_EDGE = 0x434d63
const ANTI_EDGE = 0x4a5268

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
  }
  return shape
}
