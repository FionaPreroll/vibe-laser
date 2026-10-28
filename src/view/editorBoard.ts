import { effect } from '@preact/signals-core'
import type { FederatedPointerEvent } from 'pixi.js'
import type { PartKind } from '../core/board'
import { itemAt, type Place, samePlace } from '../core/level'
import type { EditorController, Tool } from '../editor/controller'
import { kindForKey } from '../editor/palette'
import { createFlatArt } from './art/flat'
import type { ArtPack } from './art/types'
import type { BoardView } from './board'
import { colorBlind } from './display'
import { type Point, placeAt, type SceneGeometry } from './layout'
import { BOARD_COLORS } from './palette'
import { createStage, isTextField } from './stage'

/** Pointer travel in screen pixels before a press on a piece turns into a drag. */
const DRAG_THRESHOLD = 6

const EDITOR_KEYS = new Set([
  'ArrowLeft',
  'ArrowRight',
  'ArrowUp',
  'ArrowDown',
  'Enter',
  ' ',
  'Escape',
  'Delete',
  'Backspace',
  'q',
  'Q',
  'e',
  'E',
])

const TOOL_CURSORS: Record<Exclude<Tool, 'select'>, string> = {
  paint: 'crosshair',
  erase: 'crosshair',
  clone: 'copy',
}

interface Press {
  readonly place: Place
  readonly x: number
  readonly y: number
  /** Paint and Eraser go on painting while the button is down. */
  readonly painting: boolean
  dragging: boolean
  last: Place
}

/**
 * Draws the level an editor works on and turns pointer and keys into edits: a click uses the tool,
 * a drag with Select moves a piece, a drag with Paint or Eraser paints, a right click turns a
 * piece to the right. The pointer moves the focus too, so a part's key puts it where the pointer
 * is, as in the original editor. The geometry stays as it was when the board was mounted; a level
 * that needs another one gets a new board.
 */
export async function mountEditorBoard(
  host: HTMLElement,
  editor: EditorController,
  art: ArtPack = createFlatArt(),
): Promise<BoardView> {
  const geometry = editor.scene.value.geometry
  const stage = await createStage(host, geometry, art)
  const { scene, beams, pieces, labels, overlay, hasFocus, showGhost, outline } = stage

  let press: Press | undefined
  let hover: Place | undefined

  const render = () => {
    const { puzzle, state, geometry: current } = editor.scene.value
    if (!sameGeometry(current, geometry)) return
    const dragged = press?.dragging ? itemAt(puzzle, press.place)?.id : undefined
    pieces.show(puzzle, state.spinning, geometry, dragged)
    labels.show(puzzle, geometry, colorBlind.value, dragged)
    beams.show(state.light, geometry, colorBlind.value)

    overlay.clear()
    const selected = editor.selected.value
    if (selected !== undefined) outline(selected, BOARD_COLORS.selection, 0.7)
    if (press?.dragging && hover !== undefined) {
      const free = itemAt(puzzle, hover) === undefined || samePlace(hover, press.place)
      outline(hover, free || hover.area === 'toolbox' ? BOARD_COLORS.target : BOARD_COLORS.blocked)
    } else if (hover !== undefined && !editor.keyboardActive.value) {
      outline(hover, BOARD_COLORS.target, 0.35)
    }
    const focused = editor.focusedPlace()
    if (hasFocus.value && editor.keyboardActive.value && focused !== undefined) {
      outline(focused, BOARD_COLORS.focus)
    }
  }

  const placeOf = (event: FederatedPointerEvent) => placeAt(geometry, scene.toLocal(event.global))
  const cursorAt = (place: Place | undefined): string => {
    const tool = editor.tool.value
    if (tool !== 'select') return TOOL_CURSORS[tool]
    return place !== undefined && editor.pieceAt(place) !== undefined ? 'grab' : 'default'
  }

  scene.on('pointerdown', (event: FederatedPointerEvent) => {
    const place = placeOf(event)
    if (place === undefined) return
    if (event.button === 2) {
      editor.selected.value = place
      editor.rotate(place, 1)
      return
    }
    if (event.button !== 0) return
    const painting = editor.tool.value === 'paint' || editor.tool.value === 'erase'
    if (painting) editor.beginStroke()
    editor.use(place)
    editor.keyboardActive.value = false
    press = {
      place,
      x: event.global.x,
      y: event.global.y,
      painting,
      dragging: false,
      last: place,
    }
  })

  scene.on('globalpointermove', (event: FederatedPointerEvent) => {
    const place = placeOf(event)
    const moved = hover === undefined || place === undefined || !samePlace(hover, place)
    hover = place
    if (place !== undefined && moved) editor.point(place)
    if (press === undefined) {
      scene.cursor = cursorAt(place)
      if (moved) render()
      return
    }
    if (press.painting) {
      if (place !== undefined && !samePlace(place, press.last)) {
        press.last = place
        editor.stroke(place)
      }
      return
    }
    const piece = editor.pieceAt(press.place)
    if (!press.dragging) {
      const travel = Math.hypot(event.global.x - press.x, event.global.y - press.y)
      if (travel < DRAG_THRESHOLD || piece === undefined || editor.tool.value !== 'select') return
      press.dragging = true
      scene.cursor = 'grabbing'
    }
    const item = itemAt(editor.scene.value.puzzle, press.place)
    showGhost(item, scene.toLocal(event.global) as Point)
    render()
  })

  const release = (event: FederatedPointerEvent) => {
    const ended = press
    press = undefined
    if (ended === undefined) return
    if (ended.painting) editor.endStroke()
    if (ended.dragging) {
      showGhost(undefined, undefined)
      const to = placeOf(event)
      if (to === undefined || !editor.move(ended.place, to)) render()
    }
    scene.cursor = cursorAt(placeOf(event))
  }
  scene.on('pointerup', release)
  scene.on('pointerupoutside', release)

  const onKey = (event: KeyboardEvent) => {
    const ctrl = event.ctrlKey || event.metaKey
    const undoKey = ctrl && ['z', 'y'].includes(event.key.toLowerCase())
    if (undoKey ? isTextField(event.target) : !hasFocus.value || ctrl || event.altKey) return
    if (!undoKey && !EDITOR_KEYS.has(event.key) && partKey(event.key) === undefined) return
    if (editor.handleKey(event.key, { ctrl, shift: event.shiftKey }) || !undoKey) {
      event.preventDefault()
    }
  }
  window.addEventListener('keydown', onKey)

  const stopRendering = effect(render)
  stage.app.ticker.add(() => {
    // Lit coins spin in the editor too, which shows at a glance what the light reaches.
    pieces.animate(performance.now() / 1000, Number.POSITIVE_INFINITY)
  })

  return {
    destroy() {
      stopRendering()
      window.removeEventListener('keydown', onKey)
      stage.destroy()
    },
  }
}

function partKey(key: string): PartKind | undefined {
  return key.length === 1 ? kindForKey(key) : undefined
}

function sameGeometry(a: SceneGeometry, b: SceneGeometry): boolean {
  return a.columns === b.columns && a.rows === b.rows && a.toolboxSize === b.toolboxSize
}
