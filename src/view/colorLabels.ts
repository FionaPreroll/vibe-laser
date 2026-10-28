import { Container, Text, type TextStyleOptions } from 'pixi.js'
import { colorLetters } from '../core/color'
import type { Puzzle } from '../core/level'
import { CELL, placeCenter, type SceneGeometry } from './layout'

const STYLE: TextStyleOptions = {
  fontFamily: 'system-ui, sans-serif',
  fontSize: 15,
  fontWeight: '700',
  fill: 0xffffff,
  stroke: { color: 0x05060a, width: 4 },
}

/**
 * Color-blind mode's letters: every piece with a color names its primaries, R, G and B, in the
 * lower right corner of its cell, and a complex adds its inner color after a slash, as in R/GB.
 * The letters stay upright while pieces turn and coins spin.
 */
export class ColorLabelLayer extends Container {
  readonly #labels = new Map<number, Text>()

  /** Letters for the colored pieces of a puzzle, or none; a carried piece leaves its own out. */
  show(puzzle: Puzzle, geometry: SceneGeometry, on: boolean, carried?: number): void {
    const shown = new Set<number>()
    for (const item of on ? puzzle.items : []) {
      const { color, inner } = item.piece
      const letters = (colorLetters(color) + (inner ? `/${colorLetters(inner)}` : '')).toUpperCase()
      if (letters === '' || item.id === carried) continue
      shown.add(item.id)
      let label = this.#labels.get(item.id)
      if (label === undefined) {
        label = new Text({ text: letters, style: STYLE, anchor: { x: 1, y: 1 } })
        this.addChild(label)
        this.#labels.set(item.id, label)
      }
      label.text = letters
      const { x, y } = placeCenter(geometry, item.place)
      label.position.set(x + CELL / 2 - 4, y + CELL / 2 - 2)
    }
    for (const [id, label] of this.#labels) {
      if (shown.has(id)) continue
      label.destroy()
      this.#labels.delete(id)
    }
  }
}
