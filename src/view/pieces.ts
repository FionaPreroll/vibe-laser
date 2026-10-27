import { Container, Graphics } from 'pixi.js'
import type { Item, Puzzle } from '../core/level'
import type { ArtPack } from './art/types'
import { placeCenter, type SceneGeometry } from './layout'

/** One graphic per piece, on its cell or toolbox slot; spinning coins flip around their axis. */
export class PieceLayer extends Container {
  readonly #art: ArtPack
  readonly #views = new Map<number, Graphics>()
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
    for (const item of puzzle.items) {
      const view = this.#view(item)
      const center = placeCenter(geometry, item.place)
      view.position.set(center.x, center.y)
      view.rotation = (item.piece.rotation * Math.PI) / 4
      view.alpha = item.id === dimmed ? 0.35 : 1
      if (!spinning.has(item.id)) view.scale.set(1)
    }
  }

  animate(seconds: number): void {
    for (const id of this.#spinning) {
      const view = this.#views.get(id)
      if (view !== undefined) view.scale.x = Math.cos(seconds * 4)
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
    const existing = this.#views.get(item.id)
    if (existing !== undefined) return existing
    const view = new Graphics(this.#art.piece(item.piece))
    this.addChild(view)
    this.#views.set(item.id, view)
    return view
  }
}
