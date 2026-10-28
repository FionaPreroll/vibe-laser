import { GraphicsContext } from 'pixi.js'
import type { Piece } from '../../core/board'
import { type Color, WHITE } from '../../core/color'
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
// Trapezoid of one-way pieces, color converters and splicers: broad side south, narrow side north.
const TRAPEZOID = [-20, 20, 20, 20, 9, -20, -9, -20]
const SPLICER_END = 0xd9433b
const PRISMIRROR_GLASS = 0xff8f8f
const PRISMIRROR_EDGE = 0xffc6c6
// Selectors and complexes: a bar with a flat south end and a north end beveled towards the
// north-east. The shell shows the outer color, the core the inner one.
const SELECTOR_SHELL = [-10, -24, 10, -4, 10, 24, -10, 24]
const SELECTOR_CORE = [-4, -18, 4, -10, 4, 24, -4, 24]
const TNT = 0xd9433b
const TNT_EDGE = 0x8f1f1a
const BAND = 0x2b1d16
const FUSE = 0xc9b28a
const SPARK = 0xffd166
const FUEL = 0x6fdc6b
const FUEL_EDGE = 0x2f7a32
const HOLE_GLOW = 0x8b5cf6
const HOLE_RIM = 0xb69cff
const SLIME = 0x7ed957
const SLIME_EDGE = 0x3f8f2a
const EYE = 0xffffff
const PUPIL = 0x0b0e14
const MINE = 0x3b4152
const MINE_EDGE = 0x5b6378
const MINE_SPIKE = 0x8b93a7
const MINE_LIGHT = 0xff4d4d
const SHIP = 0xc7d2e8
const SHIP_EDGE = 0x6b778f
const COCKPIT = 0x59d6ff

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
      const key = `${piece.kind}:${piece.color}:${piece.inner ?? 0}`
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
    case 'bender': {
      // A round lens with an arrow running clockwise, the way it turns every beam.
      shape
        .circle(0, 0, 21)
        .fill({ color: GLASS, alpha: 0.35 })
        .stroke({ width: 2, color: GLASS_EDGE })
      const [start, end, radius] = [-0.9 * Math.PI, 0.4 * Math.PI, 12]
      shape
        .moveTo(Math.cos(start) * radius, Math.sin(start) * radius)
        .arc(0, 0, radius, start, end)
        .stroke({ width: 3, color: SILVER })
      // The arrowhead points along the arc at its end.
      const [x, y] = [Math.cos(end) * radius, Math.sin(end) * radius]
      const [dx, dy] = [-Math.sin(end), Math.cos(end)]
      shape
        .poly([x + dx * 6, y + dy * 6, x - dy * 5, y + dx * 5, x + dy * 5, y - dx * 5])
        .fill(SILVER)
      break
    }
    case 'splicer':
      // Light enters the narrow north end and leaves west, east and south; the red end stops it.
      shape
        .poly(TRAPEZOID)
        .fill({ color: GLASS, alpha: 0.35 })
        .stroke({ width: 2, color: GLASS_EDGE })
      shape.poly([-20, 20, 20, 20, 18.4, 14, -18.4, 14]).fill(SPLICER_END)
      shape
        .moveTo(0, -13)
        .lineTo(0, 10)
        .moveTo(-12, 0)
        .lineTo(12, 0)
        .stroke({ width: 3, color: SILVER })
      break
    case 'prismirror':
      // The prism's mirror image, slightly reddish, with its thick base to the east.
      shape
        .poly([20, -22, 20, 20, -22, 20])
        .fill({ color: PRISMIRROR_GLASS, alpha: 0.24 })
        .stroke({ width: 2, color: PRISMIRROR_EDGE })
      shape.moveTo(20, -22).lineTo(20, 20).stroke({ width: 6, color: SHADE })
      shape.moveTo(9, 14).lineTo(9, 0).stroke({ width: 3, color: PIECE_COLORS[1] })
      shape.moveTo(7, 14).lineTo(-3, 4).stroke({ width: 3, color: PIECE_COLORS[2] })
      shape.moveTo(5, 15).lineTo(-9, 15).stroke({ width: 3, color: PIECE_COLORS[4] })
      break
    case 'selector':
      selector(shape, piece.color, WHITE)
      break
    case 'complex':
      selector(shape, piece.color, piece.inner ?? 0)
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
    case 'explosive':
      // A bundle of red sticks with a band and a lit fuse. Packs may show barrels or crystals.
      for (const x of [-15, -5, 5]) {
        shape.roundRect(x, -14, 10, 32, 3).fill(TNT).stroke({ width: 1.5, color: TNT_EDGE })
      }
      shape.rect(-16, -1, 32, 6).fill(BAND)
      shape.moveTo(0, -14).quadraticCurveTo(3, -22, 10, -23).stroke({ width: 2, color: FUSE })
      shape.circle(10, -23, 3).fill(SPARK)
      break
    case 'fuelCell':
      // A glowing capsule with a terminal on top and a bolt on its side.
      shape.rect(-5, -22, 10, 6).fill(FUEL_EDGE)
      shape.roundRect(-12, -17, 24, 36, 7).fill(FUEL).stroke({ width: 2, color: FUEL_EDGE })
      shape.poly([3, -11, -5, 3, 0, 3, -3, 13, 6, -1, 1, -1]).fill(EYE)
      break
    case 'blackHole':
      shape.circle(0, 0, 25).fill({ color: HOLE_GLOW, alpha: 0.22 })
      shape.circle(0, 0, 19).fill({ color: HOLE_GLOW, alpha: 0.35 })
      shape.circle(0, 0, 13).fill(PUPIL).stroke({ width: 2, color: HOLE_RIM })
      break
    case 'slime':
      // A blob whose eyes look the way it heads, north in rotation 0.
      shape.ellipse(0, 3, 21, 17).fill(SLIME).stroke({ width: 2, color: SLIME_EDGE })
      shape.circle(-7, -6, 5).fill(EYE)
      shape.circle(7, -6, 5).fill(EYE)
      shape.circle(-7, -8, 2.5).fill(PUPIL)
      shape.circle(7, -8, 2.5).fill(PUPIL)
      break
    case 'mine': {
      // A spiked sphere with a red light, the same from every side.
      for (let spike = 0; spike < 8; spike++) {
        const angle = (spike * Math.PI) / 4
        shape.moveTo(Math.sin(angle) * 12, -Math.cos(angle) * 12)
        shape.lineTo(Math.sin(angle) * 23, -Math.cos(angle) * 23)
      }
      shape.stroke({ width: 4, color: MINE_SPIKE })
      shape.circle(0, 0, 15).fill(MINE).stroke({ width: 2, color: MINE_EDGE })
      shape.circle(0, 0, 5).fill(MINE_LIGHT)
      break
    }
    case 'ship':
      // Its nose points the way it flies, north in rotation 0.
      shape
        .poly([0, -24, 11, 6, 21, 18, 0, 11, -21, 18, -11, 6])
        .fill(SHIP)
        .stroke({ width: 2, color: SHIP_EDGE })
      shape.circle(0, -5, 5).fill(COCKPIT)
      break
    default: {
      const missing: never = piece.kind
      throw new Error(`No shape for ${String(missing)}`)
    }
  }
  return shape
}

function selector(shape: GraphicsContext, outer: Color, inner: Color): void {
  const tint = PIECE_COLORS[outer]
  shape.poly(SELECTOR_SHELL).fill({ color: tint, alpha: 0.45 }).stroke({ width: 2, color: tint })
  shape.poly(SELECTOR_CORE).fill({ color: PIECE_COLORS[inner], alpha: 0.9 })
}
