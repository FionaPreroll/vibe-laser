import type { GraphicsContext } from 'pixi.js'
import type { Piece } from '../../core/board'

/**
 * A switchable set of shapes for the board and its parts. Every shape is centered on (0, 0) in a
 * cell of CELL scene units and drawn in rotation 0: lasers fire north, mirrors face north.
 */
export interface ArtPack {
  readonly id: string
  piece(piece: Piece): GraphicsContext
  readonly tile: GraphicsContext
  readonly slot: GraphicsContext
}
