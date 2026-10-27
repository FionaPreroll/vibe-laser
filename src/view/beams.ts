import { Container, Sprite, Texture } from 'pixi.js'
import type { Color } from '../core/color'
import { DIRECTIONS, DX, DY } from '../core/direction'
import type { LightField } from '../core/trace'
import { CELL, placeCenter, type SceneGeometry } from './layout'
import { BEAM_COLORS } from './palette'

const BEAM_WIDTH = 14

/** A soft line with a bright core, white so that a tint gives it its color. */
function beamTexture(): Texture {
  const canvas = document.createElement('canvas')
  canvas.width = 4
  canvas.height = 32
  const context = canvas.getContext('2d')
  if (context === null) return Texture.WHITE
  const gradient = context.createLinearGradient(0, 0, 0, canvas.height)
  gradient.addColorStop(0, 'rgba(255, 255, 255, 0)')
  gradient.addColorStop(0.35, 'rgba(255, 255, 255, 0.3)')
  gradient.addColorStop(0.5, 'rgba(255, 255, 255, 1)')
  gradient.addColorStop(0.65, 'rgba(255, 255, 255, 0.3)')
  gradient.addColorStop(1, 'rgba(255, 255, 255, 0)')
  context.fillStyle = gradient
  context.fillRect(0, 0, canvas.width, canvas.height)
  return Texture.from(canvas)
}

/** Draws the light field: one additive sprite per lit half-segment, reused between traces. */
export class BeamLayer extends Container {
  readonly #texture = beamTexture()
  readonly #sprites: Sprite[] = []

  show(light: LightField, geometry: SceneGeometry): void {
    let used = 0
    for (let cell = 0; cell < light.width * light.height; cell++) {
      const center = placeCenter(geometry, { area: 'board', cell })
      for (const direction of DIRECTIONS) {
        const color = (light.halves[cell * 8 + direction] ?? 0) as Color
        if (color === 0) continue
        const sprite = this.#sprite(used++)
        sprite.position.set(center.x, center.y)
        sprite.rotation = Math.atan2(DY[direction], DX[direction])
        sprite.width = direction % 2 === 1 ? (CELL * Math.SQRT2) / 2 : CELL / 2
        sprite.height = BEAM_WIDTH
        sprite.tint = BEAM_COLORS[color]
        sprite.visible = true
      }
    }
    for (const sprite of this.#sprites.slice(used)) sprite.visible = false
  }

  #sprite(index: number): Sprite {
    const existing = this.#sprites[index]
    if (existing !== undefined) return existing
    const sprite = new Sprite(this.#texture)
    sprite.anchor.set(0, 0.5)
    sprite.blendMode = 'add'
    this.addChild(sprite)
    this.#sprites.push(sprite)
    return sprite
  }
}
