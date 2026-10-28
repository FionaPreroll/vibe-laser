import type { GraphicsContext } from 'pixi.js'
import type { Piece } from '../../core/board'

/*
 * Outlines that every art pack shares, in rotation 0 and in scene units around the center of a
 * cell, so that a part has the same footprint whatever it looks like.
 */

/** One-way pieces, color converters and splicers: broad side south, narrow side north. */
export const TRAPEZOID = [-20, 20, 20, 20, 9, -20, -9, -20]
/** A glass bar along the north–south line whose slanted ends bend light. */
export const REFRACTOR = [-9, -26, 9, -18, 9, 26, -9, 18]
/** The splitter's tip faces north. */
export const SPLITTER = [0, -24, 22, 14, -22, 14]
/** Flat side south, two bevels facing north-east and north-west. */
export const THREEWAY = [-20, 20, 20, 20, 20, 2, 0, -20, -20, 2]
/** Light enters the south side and leaves the long side facing north-east; the west side stops it. */
export const PRISM = [-20, -22, -20, 20, 22, 20]
/** The prism's mirror image, with its base to the east. */
export const PRISMIRROR = [20, -22, 20, 20, -22, 20]
/**
 * Selectors and complexes: a bar with a flat south end and a north end beveled towards the
 * north-east. The shell shows the outer color, the core the inner one.
 */
export const SELECTOR_SHELL = [-10, -24, 10, -4, 10, 24, -10, 24]
export const SELECTOR_CORE = [-4, -18, 4, -10, 4, 24, -4, 24]
/** The ship's nose points the way it flies, north in rotation 0. */
export const SHIP_HULL = [0, -24, 11, 6, 21, 18, 0, 11, -21, 18, -11, 6]
/** The bolt on a fuel cell. */
export const BOLT = [3, -11, -5, 3, 0, 3, -3, 13, 6, -1, 1, -1]

/** Draws each kind and colors of piece once, on first use, and shares the shape from then on. */
export function shapeCache(
  draw: (piece: Piece) => GraphicsContext,
): (piece: Piece) => GraphicsContext {
  const shapes = new Map<string, GraphicsContext>()
  return (piece) => {
    const key = `${piece.kind}:${piece.color}:${piece.inner ?? 0}`
    let shape = shapes.get(key)
    if (shape === undefined) {
      shape = draw(piece)
      shapes.set(key, shape)
    }
    return shape
  }
}
