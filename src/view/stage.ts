import { type Signal, signal } from '@preact/signals-core'
import { Application, Container, Graphics, type GraphicsContext, Rectangle, Text } from 'pixi.js'
import { columnName, rowName } from '../core/grid'
import type { Item, Place } from '../core/level'
import type { ArtPack } from './art/types'
import { BeamLayer } from './beams'
import { ColorLabelLayer } from './colorLabels'
import { EffectLayer } from './effects'
import {
  CELL,
  fitScene,
  GUTTER,
  type Point,
  placeCenter,
  type SceneGeometry,
  TOOLBOX_COLUMNS,
} from './layout'
import { BOARD_COLORS } from './palette'
import { PieceLayer } from './pieces'

/**
 * A PixiJS canvas in a host element with the board's layers: background, beams, pieces, effects,
 * an overlay for frames and a layer for a carried piece. Game and editor each add their input.
 */
export interface BoardStage {
  readonly app: Application
  readonly scene: Container
  readonly beams: BeamLayer
  readonly pieces: PieceLayer
  /** Color-blind mode's letters on colored pieces. */
  readonly labels: ColorLabelLayer
  readonly effects: EffectLayer
  readonly overlay: Graphics
  /** Whether the host has the keyboard focus. */
  readonly hasFocus: Signal<boolean>
  /** Shows a carried piece at a point, or hides it. */
  showGhost(item: Item | undefined, at: Point | undefined): void
  /** Draws a frame around a cell or slot on the overlay. */
  outline(place: Place, color: number, alpha?: number): void
  destroy(): void
}

export async function createStage(
  host: HTMLElement,
  geometry: SceneGeometry,
  art: ArtPack,
): Promise<BoardStage> {
  const app = new Application()
  await app.init({
    resizeTo: host,
    preference: 'webgl',
    antialias: true,
    autoDensity: true,
    resolution: window.devicePixelRatio,
    backgroundAlpha: 0,
  })
  host.appendChild(app.canvas)

  const scene = new Container()
  const beams = new BeamLayer()
  const pieces = new PieceLayer(art)
  const labels = new ColorLabelLayer()
  const effects = new EffectLayer()
  const overlay = new Graphics()
  const carried = new Container()
  scene.addChild(drawBackground(geometry, art), beams, pieces, labels, effects, overlay, carried)
  scene.eventMode = 'static'
  scene.hitArea = new Rectangle(0, 0, geometry.width, geometry.height)
  app.stage.addChild(scene)

  let ghost: { readonly id: number; readonly view: Graphics } | undefined
  const showGhost = (item: Item | undefined, at: Point | undefined) => {
    if (ghost !== undefined && ghost.id !== item?.id) {
      ghost.view.destroy()
      ghost = undefined
    }
    if (item === undefined || at === undefined) {
      ghost?.view.destroy()
      ghost = undefined
      return
    }
    ghost ??= { id: item.id, view: carried.addChild(pieces.ghostOf(item)) }
    ghost.view.position.set(at.x, at.y)
    ghost.view.rotation = (item.piece.rotation * Math.PI) / 4
  }

  const outline = (place: Place, color: number, alpha = 1) => {
    const { x, y } = placeCenter(geometry, place)
    overlay.roundRect(x - 31, y - 31, 62, 62, 8).stroke({ width: 3, color, alpha })
  }

  const hasFocus = signal(document.activeElement === host)
  const onFocus = () => {
    hasFocus.value = true
  }
  const onBlur = () => {
    hasFocus.value = false
  }
  const preventMenu = (event: Event) => event.preventDefault()
  host.tabIndex = 0
  app.canvas.addEventListener('contextmenu', preventMenu)
  host.addEventListener('focus', onFocus)
  host.addEventListener('blur', onBlur)

  const fitToHost = () => {
    const { scale, x, y } = fitScene(geometry, app.screen.width, app.screen.height)
    scene.scale.set(scale)
    scene.position.set(x, y)
    // Browser tests read the layout to find cells and slots on the canvas.
    host.dataset.layout = JSON.stringify({
      scale,
      x,
      y,
      cell: CELL,
      boardLeft: geometry.boardLeft,
      toolboxLeft: geometry.toolboxLeft,
      top: geometry.top,
      toolboxColumns: TOOLBOX_COLUMNS,
    })
  }
  fitToHost()
  app.renderer.on('resize', fitToHost)

  return {
    app,
    scene,
    beams,
    pieces,
    labels,
    effects,
    overlay,
    hasFocus,
    showGhost,
    outline,
    destroy() {
      host.removeEventListener('focus', onFocus)
      host.removeEventListener('blur', onBlur)
      app.renderer.off('resize', fitToHost)
      app.destroy(true, { children: true })
    },
  }
}

/** Whether a key press belongs to a text field rather than to the board. */
export function isTextField(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    (target instanceof HTMLElement && target.isContentEditable)
  )
}

function drawBackground(geometry: SceneGeometry, art: ArtPack): Container {
  const background = new Container()
  const stamp = (shape: GraphicsContext, place: Place) => {
    const { x, y } = placeCenter(geometry, place)
    background.addChild(new Graphics(shape)).position.set(x, y)
  }
  for (let cell = 0; cell < geometry.columns * geometry.rows; cell++) {
    stamp(art.tile, { area: 'board', cell })
  }
  for (let slot = 0; slot < geometry.toolboxSize; slot++) stamp(art.slot, { area: 'toolbox', slot })
  background.addChild(
    new Graphics()
      .roundRect(
        geometry.boardLeft - 4,
        geometry.top - 4,
        geometry.columns * CELL + 8,
        geometry.rows * CELL + 8,
        10,
      )
      .stroke({ width: 2, color: BOARD_COLORS.frame }),
  )
  const style = { fill: BOARD_COLORS.label, fontFamily: 'system-ui, sans-serif', fontSize: 22 }
  for (let column = 0; column < geometry.columns; column++) {
    const label = new Text({ text: columnName(column), style, anchor: 0.5 })
    label.position.set(geometry.boardLeft + (column + 0.5) * CELL, geometry.top - GUTTER / 2)
    background.addChild(label)
  }
  for (let row = 0; row < geometry.rows; row++) {
    const label = new Text({ text: rowName(row), style, anchor: 0.5 })
    label.position.set(geometry.boardLeft - GUTTER / 2, geometry.top + (row + 0.5) * CELL)
    background.addChild(label)
  }
  return background
}
