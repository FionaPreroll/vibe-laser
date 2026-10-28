import { batch, effect } from '@preact/signals-core'
import type { FederatedPointerEvent } from 'pixi.js'
import { type Item, itemAt, itemById, type Place } from '../core/level'
import { type Phase, STABLE_TICKS } from '../game/session'
import { createFlatArt } from './art/flat'
import type { ArtPack } from './art/types'
import type { BoardController } from './controller'
import { CELL, type Point, placeAt, placeCenter } from './layout'
import { BOARD_COLORS } from './palette'
import { createStage, isTextField } from './stage'

/** Pointer travel in screen pixels before a press turns into a drag. */
const DRAG_THRESHOLD = 6
/** The frame around the board tells the phase: stable, blown up or solved. */
const FRAME_COLORS: Partial<Record<Phase, number>> = {
  stabilizing: BOARD_COLORS.target,
  exploding: BOARD_COLORS.blocked,
  failed: BOARD_COLORS.blocked,
  solved: BOARD_COLORS.focus,
}

/** The frame for a phase, if it has one; while stabilizing it grows stronger as time passes. */
export function frameStyle(
  phase: Phase,
  stable: number,
): { color: number; alpha: number } | undefined {
  const color = FRAME_COLORS[phase]
  if (color === undefined) return undefined
  return { color, alpha: phase === 'stabilizing' ? 0.3 + (0.5 * stable) / STABLE_TICKS : 0.8 }
}

/** The pointer over a piece: grab what moves, pointer for what only rotates. */
export function cursorFor(item: Item | undefined, canPlay: boolean): string {
  if (item === undefined || !canPlay) return 'default'
  if (item.moveable) return 'grab'
  return item.rotateable ? 'pointer' : 'default'
}
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
  const stage = await createStage(host, geometry, art)
  const { scene, beams, pieces, effects, overlay, hasFocus, showGhost, outline } = stage

  const cellCenter = (cell: number) => placeCenter(geometry, { area: 'board', cell })
  const stopEffects = session.onEvents((events) => {
    for (const event of events) effects.play(event, cellCenter)
  })

  let press: Press | undefined
  let target: Place | undefined

  const render = () => {
    const { puzzle, light, spinning, phase, stable } = session.state.value
    const lifted = controller.lifted.value
    pieces.show(puzzle, spinning, geometry, press?.dragging ? press.id : lifted)
    beams.show(light, geometry)

    overlay.clear()
    const frame = frameStyle(phase, stable)
    if (frame !== undefined) {
      overlay
        .roundRect(
          geometry.boardLeft - 6,
          geometry.top - 6,
          geometry.columns * CELL + 12,
          geometry.rows * CELL + 12,
          12,
        )
        .stroke({ width: 4, ...frame })
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
    return cursorFor(place && itemAt(session.state.value.puzzle, place), session.canPlay.value)
  }

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
      if (travel < DRAG_THRESHOLD || !item?.moveable || !session.canPlay.value) return
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

  const onKey = (event: KeyboardEvent) => {
    if (controller.paused.value) return
    const ctrl = event.ctrlKey || event.metaKey
    const undoKey = ctrl && ['z', 'y'].includes(event.key.toLowerCase())
    if (!undoKey && (!hasFocus.value || !BOARD_KEYS.has(event.key))) return
    if (undoKey && isTextField(event.target)) return
    controller.handleKey(event.key, { ctrl, shift: event.shiftKey })
    event.preventDefault()
  }
  window.addEventListener('keydown', onKey)

  const stopRendering = effect(render)
  stage.app.ticker.add((ticker) => {
    if (!controller.paused.value) session.advance(ticker.deltaMS)
    const reduced = controller.reducedMotion.value
    // An endless time step lets gliding actors arrive at once.
    pieces.animate(
      performance.now() / 1000,
      reduced ? Number.POSITIVE_INFINITY : ticker.deltaMS / 1000,
    )
    effects.reducedMotion = reduced
    effects.animate(ticker.deltaMS / 1000)
  })

  return {
    destroy() {
      stopEffects()
      stopRendering()
      window.removeEventListener('keydown', onKey)
      stage.destroy()
    },
  }
}
