import { Container, Graphics, GraphicsContext } from 'pixi.js'
import type { GameEvent } from '../game/session'
import { CELL, type Point } from './layout'
import { EFFECT_COLORS } from './palette'

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

const SPARKS = 14
const SPARK_COLORS = [0xff3b3b, 0x2dff5f, 0x3d6bff, 0xffd166, 0xffffff] as const

/** Short-lived animations above the board: blasts, shots and little bursts. */
export class EffectLayer extends Container {
  readonly #effects: Effect[] = []
  /** Blasts flash where they are instead of swelling over their neighbours. */
  reducedMotion = false

  /** Shows what a game event looks like; `center` finds a board cell in the scene. */
  play(event: GameEvent, center: (cell: number) => Point): void {
    if (event.kind === 'ignited') {
      for (const cell of event.cells) this.blast(center(cell))
    } else if (event.kind === 'fired') {
      this.shot(center(event.from), center(event.at))
      this.ring(center(event.at), EFFECT_COLORS.fired)
    } else if (event.kind === 'ate' || event.kind === 'collected' || event.kind === 'swallowed') {
      this.ring(center(event.cell), EFFECT_COLORS[event.kind])
    }
  }

  /** How many effects are playing. */
  get playing(): number {
    return this.#effects.length
  }

  /** A fireball that swells over the cell and its neighbours, then fades. */
  blast(at: Point): void {
    const view = new Graphics(BLAST)
    view.blendMode = 'add'
    this.#start(view, at, 0.7, (blast, progress) => {
      blast.scale.set(this.reducedMotion ? 1.5 : 0.4 + progress * 2.6)
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

  /**
   * Sparks flying up and out from a spinning coin, in the colors of light, when the level is
   * solved. With less motion there are none.
   */
  celebrate(at: Point): void {
    if (this.reducedMotion) return
    for (let index = 0; index < SPARKS; index++) {
      const angle = (index / SPARKS) * Math.PI * 2 + Math.random() * 0.4
      const speed = CELL * (0.9 + Math.random() * 0.8)
      const color = SPARK_COLORS[index % SPARK_COLORS.length] ?? 0xffffff
      const view = new Graphics().circle(0, 0, 4).fill(color)
      view.blendMode = 'add'
      this.#start(view, at, 0.9 + Math.random() * 0.3, (spark, progress) => {
        const travel = speed * progress
        spark.position.set(
          at.x + Math.cos(angle) * travel,
          // A little gravity pulls them down as they slow.
          at.y + Math.sin(angle) * travel + CELL * 0.8 * progress * progress,
        )
        spark.alpha = 1 - progress
      })
    }
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
