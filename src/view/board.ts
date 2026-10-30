import { batch, effect } from '@preact/signals-core'
import type { FederatedPointerEvent } from 'pixi.js'
import { type Item, itemAt, itemById, type Place, samePlace } from '../core/level'
import { type Phase, STABLE_TICKS } from '../game/session'
import { createFlatArt } from './art/flat'
import type { ArtPack } from './art/types'
import type { BoardController } from './controller'
import { beamPreview, colorBlind } from './display'
import { CELL, type Point, placeAt, placeCenter, type Transform } from './layout'
import { BOARD_COLORS } from './palette'
import { createStage, isTextField } from './stage'

/** Beams while a piece is carried show where light would go, faint since nothing has moved yet. */
const PREVIEW_ALPHA = 0.45
/** Pointer travel in screen pixels before a press turns into a drag; fingers wobble more. */
const DRAG_THRESHOLD = 6
const TOUCH_DRAG_THRESHOLD = 12
/** A finger held this long on a piece, without moving, turns it right, as a right click does. */
export const LONG_PRESS_MS = 450
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
  readonly touch: boolean
  readonly x: number
  readonly y: number
  /** Where the pointer was last, for panning. */
  last: Point
  dragging: boolean
  panning: boolean
  /** A long press has turned the piece already; letting go does nothing more. */
  turned: boolean
}

/**
 * Draws the controller's game into `host` and turns pointer and keyboard input into commands.
 * Left click rotates a piece to the left, right click to the right, as in the original. On touch
 * screens a tap selects and a second tap turns (see BoardController.tap), two fingers zoom and
 * pan, and one finger pans a zoomed board where it finds no piece to drag.
 */
export async function mountBoard(
  host: HTMLElement,
  controller: BoardController,
  art: ArtPack = createFlatArt(),
): Promise<BoardView> {
  const { session, geometry } = controller
  const stage = await createStage(host, geometry, art)
  const { scene, beams, pieces, labels, effects, overlay, hasFocus, showGhost, showHint, outline } =
    stage

  const cellCenter = (cell: number) => placeCenter(geometry, { area: 'board', cell })
  const stopEffects = session.onEvents((events) => {
    for (const event of events) effects.play(event, cellCenter)
  })

  let press: Press | undefined
  let target: Place | undefined
  /** Fingers on the board, by pointer id, at their latest screen positions. */
  const fingers = new Map<number, Point>()
  let pinching: { readonly start: Transform; readonly from: readonly [Point, Point] } | undefined
  /** After a pinch, the fingers still down neither tap nor drag. */
  let gesture = false
  let longPress: ReturnType<typeof setTimeout> | undefined
  const stopLongPress = () => {
    clearTimeout(longPress)
    longPress = undefined
  }

  const render = () => {
    const { puzzle, light, spinning, phase, stable } = session.state.value
    const lifted = controller.lifted.value
    const focused = controller.focusedPlace()
    const carried = press?.dragging ? press.id : lifted
    // A carried piece would go down under the pointer, or in the keyboard frame.
    const destination = press?.dragging ? target : focused
    const preview =
      beamPreview.value && carried !== undefined && destination !== undefined
        ? session.preview({ kind: 'move', item: carried, to: destination })
        : undefined
    pieces.show(puzzle, spinning, geometry, carried)
    labels.show(puzzle, geometry, colorBlind.value, carried)
    beams.show(preview?.light ?? light, geometry, colorBlind.value)
    beams.alpha = preview === undefined ? 1 : PREVIEW_ALPHA
    // Browser tests read whether the beams preview a move, and how many explosives it would light.
    host.dataset.preview = preview === undefined ? 'off' : String(preview.ignites.length)

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
    for (const cell of preview?.ignites ?? []) {
      const { x, y } = cellCenter(cell)
      overlay.circle(x, y, 28).stroke({ width: 3, color: BOARD_COLORS.blocked, alpha: 0.9 })
    }
    const hint = controller.hint.value
    const hinted = hint === undefined ? undefined : itemById(puzzle, hint.item)
    const done =
      hinted !== undefined &&
      hint !== undefined &&
      samePlace(hinted.place, hint.place) &&
      hinted.piece.rotation === hint.rotation
    if (hint !== undefined && hinted !== undefined && !done) {
      showHint({ ...hinted, piece: { ...hinted.piece, rotation: hint.rotation } }, hint.place)
      outline(hint.place, BOARD_COLORS.hint)
    } else {
      showHint(undefined, undefined)
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

  /** A second finger turns whatever the first one did into a pinch. */
  const startPinch = () => {
    const [first, second] = fingers.values()
    if (first === undefined || second === undefined) return
    if (press?.dragging) {
      target = undefined
      showGhost(undefined, undefined)
    }
    press = undefined
    stopLongPress()
    gesture = true
    pinching = { start: stage.transform(), from: [first, second] }
    render()
  }

  scene.on('pointerdown', (event: FederatedPointerEvent) => {
    const touch = event.pointerType === 'touch'
    if (touch) {
      fingers.set(event.pointerId, { x: event.global.x, y: event.global.y })
      if (fingers.size >= 2) {
        startPinch()
        return
      }
    }
    if (gesture) return
    const place = placeAt(geometry, scene.toLocal(event.global))
    const item = place && itemAt(session.state.value.puzzle, place)
    batch(() => {
      controller.keyboardActive.value = false
      controller.lifted.value = undefined
      // A touch decides what it selects once the finger lifts, and fingers do not hover.
      controller.hover(touch ? undefined : place)
      if (!touch) controller.select(item?.id)
    })
    press = {
      id: item?.id,
      button: event.button,
      touch,
      x: event.global.x,
      y: event.global.y,
      last: { x: event.global.x, y: event.global.y },
      dragging: false,
      panning: false,
      turned: false,
    }
    stopLongPress()
    if (touch && item?.rotateable) {
      const held = press
      longPress = setTimeout(() => {
        longPress = undefined
        if (press !== held || held.dragging || held.panning || !session.canPlay.value) return
        held.turned = controller.rotate(item.id, 1)
      }, LONG_PRESS_MS)
    }
  })
  scene.on('globalpointermove', (event: FederatedPointerEvent) => {
    if (fingers.has(event.pointerId)) {
      fingers.set(event.pointerId, { x: event.global.x, y: event.global.y })
      const [first, second] = fingers.values()
      if (pinching !== undefined && first !== undefined && second !== undefined) {
        stage.pinch(pinching.start, pinching.from, [first, second])
        return
      }
    }
    const local = scene.toLocal(event.global)
    if (press === undefined) {
      if (!fingers.has(event.pointerId)) {
        scene.cursor = cursorAt(local)
        controller.hover(placeAt(geometry, local))
      }
      return
    }
    const item = press.id === undefined ? undefined : itemById(session.state.value.puzzle, press.id)
    if (!press.dragging && !press.panning) {
      const travel = Math.hypot(event.global.x - press.x, event.global.y - press.y)
      if (travel < (press.touch ? TOUCH_DRAG_THRESHOLD : DRAG_THRESHOLD)) return
      if (press.turned) return
      stopLongPress()
      if (item?.moveable && session.canPlay.value) {
        press.dragging = true
        controller.select(item.id)
        scene.cursor = 'grabbing'
      } else if (stage.zoom() > 1) {
        press.panning = true
      } else {
        return
      }
    }
    if (press.panning) {
      stage.pan(event.global.x - press.last.x, event.global.y - press.last.y)
      press.last = { x: event.global.x, y: event.global.y }
      return
    }
    target = placeAt(geometry, local)
    showGhost(item, local)
    render()
  })
  const release = (event: FederatedPointerEvent) => {
    if (fingers.delete(event.pointerId)) {
      if (fingers.size < 2) pinching = undefined
      if (gesture) {
        gesture = fingers.size > 0
        return
      }
    }
    const ended = press
    press = undefined
    stopLongPress()
    if (ended === undefined || ended.panning || ended.turned) return
    const at = placeAt(geometry, scene.toLocal(event.global))
    if (ended.dragging) {
      target = undefined
      showGhost(undefined, undefined)
      if (ended.id === undefined || at === undefined || !controller.move(ended.id, at)) render()
    } else if (ended.touch) {
      controller.tap(at)
    } else if (ended.id !== undefined && (ended.button === 0 || ended.button === 2)) {
      controller.rotate(ended.id, ended.button === 2 ? 1 : -1)
    }
    if (!ended.touch) {
      scene.cursor = cursorAt(scene.toLocal(event.global))
      controller.hover(at)
    }
  }
  scene.on('pointerup', release)
  scene.on('pointerupoutside', release)
  scene.on('pointercancel', release)

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
  // A mouse that leaves the board points at nothing; a drag keeps what it carries.
  const onLeave = () => {
    if (press === undefined) controller.hover(undefined)
  }
  stage.app.canvas.addEventListener('pointerleave', onLeave)

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
      stopLongPress()
      stopEffects()
      stopRendering()
      window.removeEventListener('keydown', onKey)
      stage.app.canvas.removeEventListener('pointerleave', onLeave)
      stage.destroy()
    },
  }
}
