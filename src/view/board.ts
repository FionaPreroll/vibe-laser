import { batch, effect, signal } from '@preact/signals-core'
import {
  Application,
  Container,
  type FederatedPointerEvent,
  Graphics,
  type GraphicsContext,
  Rectangle,
  Text,
} from 'pixi.js'
import { columnName, rowName } from '../core/grid'
import { type Item, itemAt, itemById, type Place } from '../core/level'
import { createFlatArt } from './art/flat'
import type { ArtPack } from './art/types'
import { BeamLayer } from './beams'
import type { BoardController } from './controller'
import {
  CELL,
  fitScene,
  GUTTER,
  type Point,
  placeAt,
  placeCenter,
  type SceneGeometry,
  TOOLBOX_COLUMNS,
} from './layout'
import { BOARD_COLORS } from './palette'
import { PieceLayer } from './pieces'

/** Pointer travel in screen pixels before a press turns into a drag. */
const DRAG_THRESHOLD = 6
const BOARD_KEYS = new Set([
  'ArrowLeft',
  'ArrowRight',
  'ArrowUp',
  'ArrowDown',
  'Enter',
  ' ',
  'Escape',
  'q',
  'Q',
  'e',
  'E',
])

export interface BoardView {
  destroy(): void
}

interface Press {
  readonly id: number | undefined
  readonly button: number
  readonly x: number
  readonly y: number
  dragging: boolean
}

/**
 * Draws the controller's game into `host` and turns pointer and keyboard input into commands.
 * Left click rotates a piece to the left, right click to the right, as in the original.
 */
export async function mountBoard(
  host: HTMLElement,
  controller: BoardController,
  art: ArtPack = createFlatArt(),
): Promise<BoardView> {
  const { session, geometry } = controller
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
  const overlay = new Graphics()
  const carried = new Container()
  scene.addChild(drawBackground(geometry, art), beams, pieces, overlay, carried)
  app.stage.addChild(scene)

  const hasFocus = signal(document.activeElement === host)
  let press: Press | undefined
  let target: Place | undefined
  let ghost: { readonly id: number; readonly view: Graphics } | undefined

  /** Shows a carried piece at a point, or hides it. */
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

  const outline = (place: Place, color: number) => {
    const { x, y } = placeCenter(geometry, place)
    overlay.roundRect(x - 31, y - 31, 62, 62, 8).stroke({ width: 3, color })
  }

  const render = () => {
    const { puzzle, light, spinning, phase } = session.state.value
    const lifted = controller.lifted.value
    pieces.show(puzzle, spinning, geometry, press?.dragging ? press.id : lifted)
    beams.show(light, geometry)

    overlay.clear()
    if (phase === 'solved') {
      overlay
        .roundRect(
          geometry.boardLeft - 6,
          geometry.top - 6,
          geometry.columns * CELL + 12,
          geometry.rows * CELL + 12,
          12,
        )
        .stroke({ width: 4, color: BOARD_COLORS.focus, alpha: 0.8 })
    }
    const selected = controller.selected.value
    const selectedItem = selected === undefined ? undefined : itemById(puzzle, selected)
    if (selectedItem !== undefined) {
      const { x, y } = placeCenter(geometry, selectedItem.place)
      overlay.circle(x, y, 29).stroke({ width: 2, color: BOARD_COLORS.selection, alpha: 0.5 })
    }
    if (press?.dragging && target !== undefined) {
      const occupant = itemAt(puzzle, target)
      outline(
        target,
        occupant === undefined || occupant.id === press.id
          ? BOARD_COLORS.target
          : BOARD_COLORS.blocked,
      )
    }
    const focused = controller.focusedPlace()
    const keyboard = hasFocus.value && controller.keyboardActive.value
    if (keyboard && focused !== undefined) outline(focused, BOARD_COLORS.focus)
    if (!press?.dragging) {
      const liftedItem = lifted === undefined ? undefined : itemById(puzzle, lifted)
      showGhost(liftedItem, focused && placeCenter(geometry, focused))
    }
  }

  const cursorAt = (point: Point): string => {
    const place = placeAt(geometry, point)
    const item = place && itemAt(session.state.value.puzzle, place)
    if (item === undefined || session.state.value.phase !== 'playing') return 'default'
    if (item.moveable) return 'grab'
    return item.rotateable ? 'pointer' : 'default'
  }

  scene.eventMode = 'static'
  scene.hitArea = new Rectangle(0, 0, geometry.width, geometry.height)
  scene.on('pointerdown', (event: FederatedPointerEvent) => {
    const place = placeAt(geometry, scene.toLocal(event.global))
    const item = place && itemAt(session.state.value.puzzle, place)
    batch(() => {
      controller.keyboardActive.value = false
      controller.lifted.value = undefined
      controller.select(item?.id)
    })
    press = {
      id: item?.id,
      button: event.button,
      x: event.global.x,
      y: event.global.y,
      dragging: false,
    }
  })
  scene.on('globalpointermove', (event: FederatedPointerEvent) => {
    const local = scene.toLocal(event.global)
    if (press === undefined) {
      scene.cursor = cursorAt(local)
      return
    }
    const item = press.id === undefined ? undefined : itemById(session.state.value.puzzle, press.id)
    if (!press.dragging) {
      const travel = Math.hypot(event.global.x - press.x, event.global.y - press.y)
      if (travel < DRAG_THRESHOLD || !item?.moveable || session.state.value.phase !== 'playing')
        return
      press.dragging = true
      scene.cursor = 'grabbing'
    }
    target = placeAt(geometry, local)
    showGhost(item, local)
    render()
  })
  const release = (event: FederatedPointerEvent) => {
    const ended = press
    press = undefined
    if (ended === undefined) return
    if (ended.dragging) {
      const to = placeAt(geometry, scene.toLocal(event.global))
      target = undefined
      showGhost(undefined, undefined)
      if (ended.id === undefined || to === undefined || !controller.move(ended.id, to)) render()
    } else if (ended.id !== undefined && (ended.button === 0 || ended.button === 2)) {
      controller.rotate(ended.id, ended.button === 2 ? 1 : -1)
    }
    scene.cursor = cursorAt(scene.toLocal(event.global))
  }
  scene.on('pointerup', release)
  scene.on('pointerupoutside', release)

  const preventMenu = (event: Event) => event.preventDefault()
  const onFocus = () => {
    hasFocus.value = true
  }
  const onBlur = () => {
    hasFocus.value = false
  }
  const onKey = (event: KeyboardEvent) => {
    const ctrl = event.ctrlKey || event.metaKey
    const undoKey = ctrl && ['z', 'y'].includes(event.key.toLowerCase())
    if (!undoKey && (!hasFocus.value || !BOARD_KEYS.has(event.key))) return
    if (undoKey && isTextField(event.target)) return
    controller.handleKey(event.key, { ctrl, shift: event.shiftKey })
    event.preventDefault()
  }
  host.tabIndex = 0
  app.canvas.addEventListener('contextmenu', preventMenu)
  host.addEventListener('focus', onFocus)
  host.addEventListener('blur', onBlur)
  window.addEventListener('keydown', onKey)

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
  const stopRendering = effect(render)
  app.ticker.add(() => pieces.animate(performance.now() / 1000))

  return {
    destroy() {
      stopRendering()
      window.removeEventListener('keydown', onKey)
      host.removeEventListener('focus', onFocus)
      host.removeEventListener('blur', onBlur)
      app.renderer.off('resize', fitToHost)
      app.destroy(true, { children: true })
    },
  }
}

function isTextField(target: EventTarget | null): boolean {
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
