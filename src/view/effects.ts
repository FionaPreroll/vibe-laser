import { Container, Graphics, GraphicsContext } from 'pixi.js'
import { CELL, type Point } from './layout'

interface Effect {
  readonly view: Graphics
  readonly seconds: number
  age: number
  /** Sets the view for a progress from 0 to 1. */
  readonly play: (view: Graphics, progress: number) => void
}

const BLAST = new GraphicsContext()
  .circle(0, 0, CELL / 2)
  .fill({ color: 0xff7a2e, alpha: 0.85 })
  .circle(0, 0, CELL / 3)
  .fill({ color: 0xffd166, alpha: 0.9 })
  .circle(0, 0, CELL / 7)
  .fill(0xffffff)

/** Short-lived animations above the board: blasts, shots and little bursts. */
export class EffectLayer extends Container {
  readonly #effects: Effect[] = []

  /** A fireball that swells over the cell and its neighbours, then fades. */
  blast(at: Point): void {
    const view = new Graphics(BLAST)
    view.blendMode = 'add'
    this.#start(view, at, 0.7, (blast, progress) => {
      blast.scale.set(0.4 + progress * 2.6)
      blast.alpha = 1 - progress
    })
  }

  /** A shot from a ship, as a bright line that fades. */
  shot(from: Point, to: Point): void {
    const view = new Graphics()
      .moveTo(0, 0)
      .lineTo(to.x - from.x, to.y - from.y)
      .stroke({ width: 5, color: 0x59d6ff })
    view.blendMode = 'add'
    this.#start(view, from, 0.35, (line, progress) => {
      line.alpha = 1 - progress
    })
  }

  /** A ring that widens and fades: something was eaten, collected or swallowed. */
  ring(at: Point, color: number): void {
    const view = new Graphics().circle(0, 0, CELL / 3).stroke({ width: 4, color })
    this.#start(view, at, 0.45, (ring, progress) => {
      ring.scale.set(0.6 + progress)
      ring.alpha = 1 - progress
    })
  }

  animate(deltaSeconds: number): void {
    for (const effect of [...this.#effects]) {
      effect.age += deltaSeconds
      const progress = Math.min(effect.age / effect.seconds, 1)
      effect.play(effect.view, progress)
      if (progress < 1) continue
      effect.view.destroy()
      this.#effects.splice(this.#effects.indexOf(effect), 1)
    }
  }

  #start(view: Graphics, at: Point, seconds: number, play: Effect['play']): void {
    view.position.set(at.x, at.y)
    play(view, 0)
    this.addChild(view)
    this.#effects.push({ view, seconds, age: 0, play })
  }
}
