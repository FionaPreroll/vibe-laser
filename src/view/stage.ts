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
  clampTransform,
  fitScene,
  GUTTER,
  type Point,
  pinchTransform,
  placeCenter,
  refitTransform,
  type SceneGeometry,
  TOOLBOX_COLUMNS,
  type Transform,
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
  /** Where the scene sits on the screen: fitted at first, then zoomed and panned by touch. */
  transform(): Transform
  /** How far the scene is zoomed in over its fitted size; 1 when it is not. */
  zoom(): number
  /** Zooms and pans the scene along with two fingers; see pinchTransform. */
  pinch(start: Transform, from: readonly [Point, Point], to: readonly [Point, Point]): void
  /** Moves a zoomed scene by some pixels on the screen, as far as it goes. */
  pan(dx: number, dy: number): void
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
    antialias: !rendersInSoftware(),
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

  let screen = { width: app.screen.width, height: app.screen.height }
  let transform = fitScene(geometry, screen.width, screen.height)
  const show = (next: Transform) => {
    transform = next
    scene.scale.set(next.scale)
    scene.position.set(next.x, next.y)
    // Browser tests read the layout to find cells and slots on the canvas.
    host.dataset.layout = JSON.stringify({
      scale: next.scale,
      x: next.x,
      y: next.y,
      cell: CELL,
      boardLeft: geometry.boardLeft,
      toolboxLeft: geometry.toolboxLeft,
      top: geometry.top,
      toolboxColumns: TOOLBOX_COLUMNS,
    })
  }
  show(transform)
  // Browser tests also read which art pack draws the board.
  host.dataset.art = art.id
  // A zoomed view stays zoomed when the screen changes, as when a phone's address bar hides.
  const fitToHost = () => {
    const resized = { width: app.screen.width, height: app.screen.height }
    show(refitTransform(geometry, transform, screen, resized))
    screen = resized
  }
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
    transform: () => transform,
    zoom: () => transform.scale / (fitScene(geometry, screen.width, screen.height).scale || 1),
    pinch(start, from, to) {
      show(pinchTransform(geometry, screen.width, screen.height, start, from, to))
    },
    pan(dx, dy) {
      const moved = { ...transform, x: transform.x + dx, y: transform.y + dy }
      show(clampTransform(geometry, screen.width, screen.height, moved))
    },
    destroy() {
      host.removeEventListener('focus', onFocus)
      host.removeEventListener('blur', onBlur)
      app.renderer.off('resize', fitToHost)
      app.destroy(true, { children: true })
    },
  }
}

// Names of WebGL renderers without a graphics card: Chrome's SwiftShader, Mesa's llvmpipe and
// softpipe, and Windows' WARP.
const SOFTWARE_RENDERERS = /swiftshader|llvmpipe|softpipe|basic render driver/i

/**
 * Whether WebGL draws without a graphics card, as in headless browsers and many virtual machines.
 * Antialiasing there takes longer than everything else in a frame and halves the frame rate, so
 * the board goes without it.
 */
export function rendersInSoftware(): boolean {
  const gl = document.createElement('canvas').getContext('webgl2')
  if (gl === null) return false
  const info = gl.getExtension('WEBGL_debug_renderer_info')
  const renderer = String(gl.getParameter(info?.UNMASKED_RENDERER_WEBGL ?? gl.RENDERER))
  // Browsers keep only so many contexts; this one has done its job.
  gl.getExtension('WEBGL_lose_context')?.loseContext()
  return SOFTWARE_RENDERERS.test(renderer)
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
