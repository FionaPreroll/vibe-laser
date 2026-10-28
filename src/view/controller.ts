import { computed, type ReadonlySignal, type Signal, signal } from '@preact/signals-core'
import { itemAt, itemById, type Place, samePlace } from '../core/level'
import type { GameSession } from '../game/session'
import {
  type GridPoint,
  gridOfPlace,
  placeOfGrid,
  type SceneGeometry,
  sceneGeometry,
} from './layout'

export interface KeyModifiers {
  readonly ctrl: boolean
  readonly shift: boolean
}

/**
 * UI state around one game session: the selected piece, the keyboard focus, and a piece lifted
 * with the keyboard. Pointer, keyboard and HUD input all end up here as session commands.
 */
export class BoardController {
  readonly session: GameSession
  readonly geometry: SceneGeometry
  readonly selected = signal<number | undefined>(undefined)
  readonly focus: Signal<GridPoint>
  readonly lifted = signal<number | undefined>(undefined)
  /** True while the keyboard drives the board, so the focus frame shows. */
  readonly keyboardActive = signal(false)
  /** Whether the rotate buttons can turn the selected piece. */
  readonly canRotateSelected: ReadonlySignal<boolean>
  /** While help or the settings are open, the clock stands still. */
  readonly paused = signal(false)
  /** Actors jump instead of gliding, and blasts flash instead of swelling. */
  readonly reducedMotion = signal(false)

  constructor(session: GameSession) {
    this.session = session
    const { puzzle } = session.state.value
    this.geometry = sceneGeometry(puzzle.width, puzzle.height, puzzle.toolboxSize)
    // Play starts in the toolbox, so the keyboard focus does too.
    this.focus = signal(gridOfPlace(this.geometry, { area: 'toolbox', slot: 0 }))
    this.canRotateSelected = computed(() => {
      const { puzzle } = this.session.state.value
      const id = this.selected.value
      const rotateable = id !== undefined && itemById(puzzle, id)?.rotateable === true
      return this.session.canPlay.value && rotateable
    })
  }

  select(id: number | undefined): void {
    this.selected.value = id
  }

  rotate(id: number, steps: number): boolean {
    this.selected.value = id
    return this.session.execute({ kind: 'rotate', item: id, steps })
  }

  /** Rotates the selected piece, for the rotate buttons. */
  rotateSelected(steps: number): boolean {
    const id = this.selected.value
    return id !== undefined && this.rotate(id, steps)
  }

  move(id: number, to: Place): boolean {
    return this.session.execute({ kind: 'move', item: id, to })
  }

  /**
   * A tap on a touch screen, on a place or beside the board. The first tap on a piece selects it
   * and the next one turns it to the left; a tap on a free place moves the selected piece there.
   * Anything else lets go of the selection.
   */
  tap(place: Place | undefined): boolean {
    const item = place && itemAt(this.session.state.value.puzzle, place)
    const selected = this.selected.value
    if (item !== undefined) {
      if (item.id === selected) return this.rotate(item.id, -1)
      this.selected.value = item.id
      return true
    }
    if (place !== undefined && selected !== undefined && this.move(selected, place)) return true
    this.selected.value = undefined
    return false
  }

  /** Handles a key pressed on the board; true when the key did something on the board. */
  handleKey(key: string, modifiers: KeyModifiers): boolean {
    if (modifiers.ctrl) {
      const letter = key.toLowerCase()
      if (letter === 'z') return modifiers.shift ? this.session.redo() : this.session.undo()
      if (letter === 'y') return this.session.redo()
      return false
    }
    this.keyboardActive.value = true
    switch (key) {
      case 'ArrowLeft':
        return this.#step(-1, 0)
      case 'ArrowRight':
        return this.#step(1, 0)
      case 'ArrowUp':
        return this.#step(0, -1)
      case 'ArrowDown':
        return this.#step(0, 1)
      case 'Enter':
      case ' ':
        return this.#pickUpOrDrop()
      case 'Escape':
        this.lifted.value = undefined
        return true
      case 'q':
      case 'Q':
        return this.#rotateAtFocus(-1)
      case 'e':
      case 'E':
        return this.#rotateAtFocus(1)
      default:
        return false
    }
  }

  /** The board cell or toolbox slot under the keyboard focus. */
  focusedPlace(): Place | undefined {
    return placeOfGrid(this.geometry, this.focus.value)
  }

  #step(columns: number, rows: number): boolean {
    const next = { column: this.focus.value.column + columns, row: this.focus.value.row + rows }
    if (placeOfGrid(this.geometry, next) === undefined) return false
    this.focus.value = next
    return true
  }

  #pickUpOrDrop(): boolean {
    const place = this.focusedPlace()
    if (place === undefined) return false
    const { puzzle } = this.session.state.value
    const lifted = this.lifted.value
    if (lifted !== undefined) {
      const item = itemById(puzzle, lifted)
      const dropped =
        item !== undefined && (samePlace(item.place, place) || this.move(lifted, place))
      if (dropped) this.lifted.value = undefined
      return dropped
    }
    const item = itemAt(puzzle, place)
    if (item === undefined) return false
    this.selected.value = item.id
    if (!item.moveable || !this.session.canPlay.value) return false
    this.lifted.value = item.id
    return true
  }

  #rotateAtFocus(steps: number): boolean {
    const place = this.focusedPlace()
    const id = this.lifted.value ?? (place && itemAt(this.session.state.value.puzzle, place)?.id)
    return id !== undefined && this.rotate(id, steps)
  }
}
