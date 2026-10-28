import { GraphicsContext } from 'pixi.js'
import type { Piece } from '../../core/board'
import { type Color, WHITE } from '../../core/color'
import { BEAM_COLORS } from '../palette'
import {
  BOLT,
  PRISM,
  PRISMIRROR,
  REFRACTOR,
  SELECTOR_CORE,
  SELECTOR_SHELL,
  SHIP_HULL,
  SPLITTER,
  shapeCache,
  THREEWAY,
  TRAPEZOID,
} from './common'
import type { ArtPack } from './types'

const TILE = 0x0c1120
const TILE_EDGE = 0x1b2a44
const SLOT = 0x080b14
const SLOT_EDGE = 0x2a3f66
const GLASS = 0x5ff3ff
const SILVER = 0xe8f6ff
const DIM = 0x35506a
const RED_END = 0xff4d4d
const TNT = 0xff6a3d
const SPARK = 0xffd166
const FUEL = 0x6fff8a
const HOLE = 0xb38cff
const SLIME = 0x8dff5a
const STEEL = 0x9aa3b8
const MINE_LIGHT = 0xff4d4d
const SHIP = 0xd6e2ff
const COCKPIT = 0x59d6ff

/** A color's glow; a laser that is switched off glows dim. */
const tint = (color: Color) => (color === 0 ? DIM : BEAM_COLORS[color])

/**
 * The second art pack: every part an outline that glows on a dark board, as in a neon sign. The
 * outlines are the flat pack's, so a part has the same footprint in both.
 */
export function createNeonArt(): ArtPack {
  return {
    id: 'neon',
    // The edge sits inside the 60 units of a tile.
    tile: new GraphicsContext()
      .roundRect(-29.5, -29.5, 59, 59, 6)
      .fill(TILE)
      .stroke({ width: 1, color: TILE_EDGE }),
    slot: new GraphicsContext()
      .roundRect(-30, -30, 60, 60, 6)
      .fill(SLOT)
      .stroke({ width: 2, color: SLOT_EDGE }),
    piece: shapeCache(draw),
  }
}

/** Strokes a path twice, wide and faint and then thin and bright, so that it seems to glow. */
function glow(
  shape: GraphicsContext,
  path: (shape: GraphicsContext) => void,
  color: number,
  width = 2.5,
): void {
  // Round corners keep the wide glow of sharp tips inside the cell.
  path(shape)
  shape.stroke({ width: width * 3.2, color, alpha: 0.22, join: 'round', cap: 'round' })
  path(shape)
  shape.stroke({ width, color, join: 'round', cap: 'round' })
}

function draw(piece: Piece): GraphicsContext {
  const shape = new GraphicsContext()
  const line = (x1: number, y1: number, x2: number, y2: number) => (g: GraphicsContext) =>
    g.moveTo(x1, y1).lineTo(x2, y2)
  switch (piece.kind) {
    case 'laser': {
      const color = tint(piece.color)
      glow(shape, (g) => g.roundRect(-18, -12, 36, 36, 8), color)
      glow(shape, line(0, -12, 0, -23), color, 3.5)
      shape.circle(0, 6, 6).fill(color)
      break
    }
    case 'mirror':
      // The reflecting north face glows; the back is a dim line.
      glow(shape, line(-26, -2, 26, -2), SILVER, 3)
      shape.moveTo(-26, 4).lineTo(26, 4).stroke({ width: 2, color: DIM })
      break
    case 'doubleMirror':
      glow(shape, line(-27, -3, 27, -3), SILVER, 2.5)
      glow(shape, line(-27, 3, 27, 3), SILVER, 2.5)
      break
    case 'slitMirror':
      glow(shape, line(-26, -6, 26, -6), SILVER, 2.5)
      glow(shape, line(-26, 6, 26, 6), SILVER, 2.5)
      shape
        .moveTo(-28, -9)
        .lineTo(-28, 9)
        .moveTo(28, -9)
        .lineTo(28, 9)
        .stroke({ width: 3, color: DIM })
      break
    case 'refractor': {
      // The slanted ends glow, where light goes in and out; the long sides stay dim.
      const [ax = 0, ay = 0, bx = 0, by = 0, cx = 0, cy = 0, dx = 0, dy = 0] = REFRACTOR
      glow(shape, line(ax, ay, bx, by), GLASS)
      glow(shape, line(dx, dy, cx, cy), GLASS)
      shape
        .moveTo(ax, ay)
        .lineTo(dx, dy)
        .moveTo(bx, by)
        .lineTo(cx, cy)
        .stroke({ width: 3, color: DIM })
      break
    }
    case 'oneWay':
      glow(shape, (g) => g.poly(TRAPEZOID), GLASS)
      shape.poly([0, -13, 9, 5, -9, 5]).fill({ color: GLASS, alpha: 0.8 })
      break
    case 'splitter':
      glow(shape, (g) => g.poly(SPLITTER), SILVER)
      shape.moveTo(-22, 17).lineTo(22, 17).stroke({ width: 4, color: DIM })
      break
    case 'threeway':
      glow(shape, (g) => g.poly(THREEWAY), GLASS)
      break
    case 'prism':
      glow(shape, (g) => g.poly(PRISM), SILVER)
      shape.moveTo(-20, -22).lineTo(-20, 20).stroke({ width: 5, color: DIM })
      spectrum(shape, 1)
      break
    case 'prismirror':
      // Slightly reddish, as the original's.
      glow(shape, (g) => g.poly(PRISMIRROR), 0xffb3b3)
      shape.moveTo(20, -22).lineTo(20, 20).stroke({ width: 5, color: DIM })
      spectrum(shape, -1)
      break
    case 'colorConverter':
      glow(shape, (g) => g.poly(TRAPEZOID), GLASS)
      for (const [x, color] of [
        [-8, BEAM_COLORS[1]],
        [0, BEAM_COLORS[2]],
        [8, BEAM_COLORS[4]],
      ] as const) {
        shape.circle(x, 6, 3.5).fill(color)
      }
      break
    case 'filter': {
      const color = tint(piece.color)
      shape.roundRect(-22, -22, 44, 44, 6).fill({ color, alpha: 0.12 })
      glow(shape, (g) => g.roundRect(-22, -22, 44, 44, 6), color)
      break
    }
    case 'polarizer': {
      const color = tint(piece.color)
      shape.roundRect(-22, -22, 44, 44, 6).fill({ color, alpha: 0.1 })
      glow(shape, (g) => g.roundRect(-22, -22, 44, 44, 6), color)
      shape
        .moveTo(-10, -14)
        .lineTo(-10, 14)
        .moveTo(0, -14)
        .lineTo(0, 14)
        .moveTo(10, -14)
        .lineTo(10, 14)
        .stroke({ width: 1.5, color, alpha: 0.8 })
      shape.poly([0, -31, 7, -24, -7, -24]).fill(color)
      break
    }
    case 'bender': {
      glow(shape, (g) => g.circle(0, 0, 20), GLASS)
      // An arrow running clockwise, the way it turns every beam.
      const [start, end, radius] = [-0.9 * Math.PI, 0.4 * Math.PI, 11]
      glow(
        shape,
        (g) =>
          g
            .moveTo(Math.cos(start) * radius, Math.sin(start) * radius)
            .arc(0, 0, radius, start, end),
        SILVER,
        2,
      )
      const [x, y] = [Math.cos(end) * radius, Math.sin(end) * radius]
      const [dx, dy] = [-Math.sin(end), Math.cos(end)]
      shape
        .poly([x + dx * 6, y + dy * 6, x - dy * 5, y + dx * 5, x + dy * 5, y - dx * 5])
        .fill(SILVER)
      break
    }
    case 'splicer':
      glow(shape, (g) => g.poly(TRAPEZOID), GLASS)
      glow(shape, line(-19, 17, 19, 17), RED_END, 3)
      shape
        .moveTo(0, -13)
        .lineTo(0, 10)
        .moveTo(-12, 0)
        .lineTo(12, 0)
        .stroke({ width: 2.5, color: SILVER })
      break
    case 'selector':
      selector(shape, piece.color, WHITE)
      break
    case 'complex':
      selector(shape, piece.color, piece.inner ?? 0)
      break
    case 'coin': {
      const color = tint(piece.color)
      shape.circle(0, 0, 18).fill({ color, alpha: 0.15 })
      glow(shape, (g) => g.circle(0, 0, 18), color, 3.5)
      shape.circle(0, 0, 10).stroke({ width: 2, color, alpha: 0.6 })
      break
    }
    case 'antiCoin':
      // Dark, as it must stay: grey rings without a glow.
      shape.circle(0, 0, 18).stroke({ width: 3, color: DIM })
      shape.circle(0, 0, 10).stroke({ width: 2, color: DIM })
      break
    case 'explosive':
      for (const x of [-15, -5, 5]) glow(shape, (g) => g.roundRect(x, -14, 10, 32, 3), TNT, 1.5)
      shape.moveTo(-16, 2).lineTo(16, 2).stroke({ width: 3, color: TNT, alpha: 0.6 })
      shape.moveTo(0, -14).quadraticCurveTo(3, -22, 10, -23).stroke({ width: 2, color: SPARK })
      shape.circle(10, -23, 3).fill(SPARK)
      break
    case 'fuelCell':
      shape.rect(-5, -22, 10, 5).fill(FUEL)
      glow(shape, (g) => g.roundRect(-12, -17, 24, 36, 7), FUEL)
      shape.poly(BOLT).fill(FUEL)
      break
    case 'blackHole':
      shape.circle(0, 0, 23).stroke({ width: 6, color: HOLE, alpha: 0.25 })
      glow(shape, (g) => g.circle(0, 0, 15), HOLE)
      shape.circle(0, 0, 12).fill(0x000000)
      break
    case 'slime':
      // Its eyes look the way it heads, north in rotation 0.
      glow(shape, (g) => g.ellipse(0, 3, 21, 17), SLIME)
      shape.circle(-7, -6, 4.5).fill(0xffffff)
      shape.circle(7, -6, 4.5).fill(0xffffff)
      shape.circle(-7, -8, 2.2).fill(0x000000)
      shape.circle(7, -8, 2.2).fill(0x000000)
      break
    case 'mine': {
      for (let spike = 0; spike < 8; spike++) {
        const angle = (spike * Math.PI) / 4
        shape.moveTo(Math.sin(angle) * 13, -Math.cos(angle) * 13)
        shape.lineTo(Math.sin(angle) * 23, -Math.cos(angle) * 23)
      }
      shape.stroke({ width: 3, color: STEEL, alpha: 0.8 })
      glow(shape, (g) => g.circle(0, 0, 14), STEEL)
      shape.circle(0, 0, 5).fill(MINE_LIGHT)
      break
    }
    case 'ship':
      glow(shape, (g) => g.poly(SHIP_HULL), SHIP)
      shape.circle(0, -5, 4.5).fill(COCKPIT)
      break
    default: {
      const missing: never = piece.kind
      throw new Error(`No shape for ${String(missing)}`)
    }
  }
  return shape
}

/** Where red, green and blue leave a prism; `side` is 1 for a prism, -1 for its mirror image. */
function spectrum(shape: GraphicsContext, side: 1 | -1): void {
  const x = (value: number) => value * side
  shape.moveTo(x(-9), 14).lineTo(x(-9), 0).stroke({ width: 2.5, color: BEAM_COLORS[1] })
  shape.moveTo(x(-7), 14).lineTo(x(3), 4).stroke({ width: 2.5, color: BEAM_COLORS[2] })
  shape.moveTo(x(-5), 15).lineTo(x(9), 15).stroke({ width: 2.5, color: BEAM_COLORS[4] })
}

function selector(shape: GraphicsContext, outer: Color, inner: Color): void {
  glow(shape, (g) => g.poly(SELECTOR_SHELL), tint(outer))
  glow(shape, (g) => g.poly(SELECTOR_CORE), inner === WHITE ? SILVER : tint(inner), 1.5)
}
