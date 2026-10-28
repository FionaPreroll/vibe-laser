import { Container, Graphics } from 'pixi.js'
import { ACTOR_KINDS } from '../core/actors/kinds'
import type { Item, Puzzle } from '../core/level'
import type { ArtPack } from './art/types'
import { CELL, type Point, placeCenter, type SceneGeometry } from './layout'

/** How fast actors glide to their new cell: about a tenth of a second to get most of the way. */
const GLIDE_RATE = 14

/**
 * One graphic per piece, on its cell or toolbox slot; spinning coins flip around their axis.
 * Actors glide from cell to cell instead of jumping; pieces that left the puzzle disappear.
 */
export class PieceLayer extends Container {
  readonly #art: ArtPack
  readonly #views = new Map<number, Graphics>()
  /** Where each gliding actor is headed. */
  readonly #targets = new Map<number, Point>()
  #spinning: ReadonlySet<number> = new Set()

  constructor(art: ArtPack) {
    super()
    this.#art = art
  }

  /** Places every piece; `dimmed` is the piece being carried elsewhere. */
  show(
    puzzle: Puzzle,
    spinning: ReadonlySet<number>,
    geometry: SceneGeometry,
    dimmed?: number,
  ): void {
    this.#spinning = spinning
    const present = new Set<number>()
    for (const item of puzzle.items) {
      present.add(item.id)
      const existing = this.#views.get(item.id)
      const view = existing ?? this.#view(item)
      const center = placeCenter(geometry, item.place)
      const near =
        existing !== undefined && Math.hypot(center.x - view.x, center.y - view.y) <= CELL * 1.5
      if (near && ACTOR_KINDS.has(item.piece.kind)) {
        this.#targets.set(item.id, center)
      } else {
        this.#targets.delete(item.id)
        view.position.set(center.x, center.y)
      }
      view.rotation = (item.piece.rotation * Math.PI) / 4
      view.alpha = item.id === dimmed ? 0.35 : 1
      if (!spinning.has(item.id)) view.scale.set(1)
    }
    for (const [id, view] of this.#views) {
      if (present.has(id)) continue
      view.destroy()
      this.#views.delete(id)
      this.#targets.delete(id)
    }
  }

  animate(seconds: number, deltaSeconds: number): void {
    for (const id of this.#spinning) {
      const view = this.#views.get(id)
      if (view !== undefined) view.scale.x = Math.cos(seconds * 4)
    }
    const glide = 1 - Math.exp(-deltaSeconds * GLIDE_RATE)
    for (const [id, target] of this.#targets) {
      const view = this.#views.get(id)
      if (view === undefined) continue
      view.position.set(view.x + (target.x - view.x) * glide, view.y + (target.y - view.y) * glide)
    }
  }

  /** A free-standing copy of a piece's shape, for dragging it around. */
  ghostOf(item: Item): Graphics {
    const ghost = new Graphics(this.#art.piece(item.piece))
    ghost.rotation = (item.piece.rotation * Math.PI) / 4
    ghost.alpha = 0.85
    return ghost
  }

  #view(item: Item): Graphics {
    const view = new Graphics(this.#art.piece(item.piece))
    this.addChild(view)
    this.#views.set(item.id, view)
    return view
  }
}
