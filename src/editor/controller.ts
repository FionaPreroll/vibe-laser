import { batch, computed, type ReadonlySignal, type Signal, signal } from '@preact/signals-core'
import { puzzleOf, rulesOf } from '../content/level'
import { type LevelFile, type LevelProblem, levelSchema, problemOf } from '../content/schema'
import { verifySolution } from '../content/solution'
import type { PartKind } from '../core/board'
import type { Place, Puzzle } from '../core/level'
import type { Rules } from '../core/rules'
import { GameSession, type GameState } from '../game/session'
import {
  type GridPoint,
  gridOfPlace,
  placeOfGrid,
  type SceneGeometry,
  sceneGeometry,
} from '../view/layout'
import {
  cellOf,
  changePiece,
  clearLevel,
  finishLevel,
  introLevel,
  movePiece,
  newLevel,
  noteLevel,
  openLevel,
  type PieceSpec,
  pieceAt,
  putPiece,
  removePiece,
  renameLevel,
  resizeLevel,
  rotatePiece,
  solveLevel,
} from './draft'
import { History } from './history'
import { kindForKey, newPiece } from './palette'

/** What a click or Enter does on the board. */
export type Tool = 'select' | 'paint' | 'clone' | 'erase'

/** The board as the editor shows it: the pieces, their light, and room in the toolbox. */
export interface EditorScene {
  readonly puzzle: Puzzle
  readonly state: GameState
  readonly geometry: SceneGeometry
}

export type ProblemKey =
  | LevelProblem['key']
  | 'noName'
  | 'halfIntro'
  | 'invalid'
  | 'startsSolved'
  | 'startsExploding'
  | 'solutionFails'
  | 'solutionShaky'

/** Something wrong with the level, for a message in the player's language. */
export interface Problem {
  readonly key: ProblemKey
  readonly kind?: PartKind
  readonly place?: string
  readonly count?: number
  /** For a shaky solution: with how many of how many random seeds it works. */
  readonly solved?: number
  readonly tried?: number
  /** The board cell or toolbox slot the problem is about, for selecting it. */
  readonly at?: Place
  /** Whether the problem keeps the level from being saved. */
  readonly blocking: boolean
}

export type SolutionStatus =
  | { readonly kind: 'none' }
  | { readonly kind: 'fails' }
  | { readonly kind: 'works'; readonly solved: number; readonly tried: number }

export interface KeyModifiers {
  readonly ctrl: boolean
  readonly shift: boolean
}

export interface EditorOptions {
  /** The level to edit; a new, empty one when absent. */
  readonly level?: LevelFile
  /** Rule overrides of the pack the level belongs to. */
  readonly packRules?: Partial<Rules>
}

/**
 * The level editor's state: the level with its undo history, the tool and the piece it paints
 * with, the selected place and the keyboard focus. The board view and the panels both read and
 * change the level through it.
 */
export class EditorController {
  readonly #history: History<LevelFile>
  readonly #saved: Signal<LevelFile>
  readonly #packRules: Partial<Rules> | undefined
  /** While a stroke is painted, every cell after the first joins the first one's undo step. */
  #stroke: 'none' | 'started' | 'open' = 'none'

  readonly level: ReadonlySignal<LevelFile>
  readonly canUndo: ReadonlySignal<boolean>
  readonly canRedo: ReadonlySignal<boolean>
  /** Whether the level differs from its saved version. */
  readonly dirty: ReadonlySignal<boolean>
  readonly scene: ReadonlySignal<EditorScene>
  readonly problems: ReadonlySignal<readonly Problem[]>
  readonly solution: ReadonlySignal<SolutionStatus>
  /** Whether nothing keeps the level from being saved. */
  readonly canSave: ReadonlySignal<boolean>

  readonly tool = signal<Tool>('select')
  /** The piece Paint puts down: a part from the palette, or a copy Clone picked up. */
  readonly brush = signal<PieceSpec>(newPiece('mirror'))
  /** The place whose piece the properties panel shows. */
  readonly selected = signal<Place | undefined>(undefined)
  /** Keyboard focus and mouse pointer: where keys put, rotate and erase pieces. */
  readonly focus = signal<GridPoint>({ column: 0, row: 0 })
  /** True while the keyboard drives the board, so the focus frame shows. */
  readonly keyboardActive = signal(false)

  constructor({ level, packRules }: EditorOptions = {}) {
    const start = level === undefined ? newLevel() : openLevel(level)
    this.#history = new History(start)
    this.#saved = signal(start)
    this.#packRules = packRules
    this.level = this.#history.current
    this.canUndo = this.#history.canUndo
    this.canRedo = this.#history.canRedo
    this.dirty = computed(
      () => saveKey(finishLevel(this.level.value)) !== saveKey(finishLevel(this.#saved.value)),
    )
    this.scene = computed(
      cachedBy(
        () => playKey(this.level.value),
        () => this.#sceneOf(),
      ),
    )
    this.solution = computed(
      cachedBy(
        () => `${playKey(this.level.value)}|${JSON.stringify(this.level.value.solution)}`,
        () => this.#solutionOf(),
      ),
    )
    this.problems = computed(() => this.#problemsOf())
    this.canSave = computed(() => this.problems.value.every((problem) => !problem.blocking))
  }

  /** The level ready to save, with equal toolbox neighbours counted together. */
  finished(): LevelFile {
    return finishLevel(this.level.value)
  }

  /** The level as it is now counts as saved. */
  markSaved(): void {
    this.#saved.value = this.level.value
  }

  pieceAt(place: Place): PieceSpec | undefined {
    return pieceAt(this.level.value, place)
  }

  focusedPlace(): Place | undefined {
    return placeOfGrid(this.scene.value.geometry, this.focus.value)
  }

  /** What a click does with the current tool: select, paint, clone or erase there. */
  use(place: Place): boolean {
    this.selected.value = place
    this.focus.value = gridOfPlace(this.scene.value.geometry, place)
    switch (this.tool.value) {
      case 'select':
        return true
      case 'paint':
        return this.#edit(putPiece(this.level.value, place, this.brush.value))
      case 'erase':
        return this.#edit(removePiece(this.level.value, place))
      case 'clone': {
        const piece = this.pieceAt(place)
        if (piece === undefined) return false
        batch(() => {
          this.brush.value = piece
          this.tool.value = 'paint'
        })
        return true
      }
    }
  }

  /** Starts a stroke: the cells a drag paints or erases undo as one step. */
  beginStroke(): void {
    this.#stroke = 'started'
  }

  endStroke(): void {
    this.#stroke = 'none'
  }

  /** Paints or erases on with the stroke, without selecting every cell it crosses. */
  stroke(place: Place): boolean {
    const tool = this.tool.value
    if (tool === 'paint') return this.#edit(putPiece(this.level.value, place, this.brush.value))
    if (tool === 'erase') return this.#edit(removePiece(this.level.value, place))
    return false
  }

  /** Puts a fresh piece of a kind on a place and selects it; the brush becomes that part. */
  put(place: Place, kind: PartKind): boolean {
    const piece = newPiece(kind)
    batch(() => {
      this.brush.value = piece
      this.selected.value = place
    })
    return this.#edit(putPiece(this.level.value, place, piece))
  }

  erase(place: Place): boolean {
    return this.#edit(removePiece(this.level.value, place))
  }

  /** Moves a piece; the selection goes with it. */
  move(from: Place, to: Place): boolean {
    if (!this.#edit(movePiece(this.level.value, from, to))) return false
    // The toolbox has no gaps: pieces from the board join at its end.
    const last = this.level.value.toolbox.length - 1
    this.selected.value =
      to.area === 'board'
        ? to
        : { area: 'toolbox', slot: from.area === 'board' ? last : Math.min(to.slot, last) }
    return true
  }

  /** The pointer is over a place: keys act there now. */
  point(place: Place): void {
    batch(() => {
      this.focus.value = gridOfPlace(this.scene.value.geometry, place)
      this.keyboardActive.value = false
    })
  }

  rotate(place: Place, steps: number): boolean {
    return this.#edit(rotatePiece(this.level.value, place, steps))
  }

  change(place: Place, changes: Partial<PieceSpec>): boolean {
    return this.#edit(changePiece(this.level.value, place, changes))
  }

  resize(columns: number, rows: number): boolean {
    return this.#edit(resizeLevel(this.level.value, columns, rows))
  }

  rename(locale: 'en' | 'de', name: string): boolean {
    return this.#edit(renameLevel(this.level.value, locale, name))
  }

  setIntro(locale: 'en' | 'de', text: string): boolean {
    return this.#edit(introLevel(this.level.value, locale, text))
  }

  setNote(note: string): boolean {
    return this.#edit(noteLevel(this.level.value, note))
  }

  setSolution(solution: LevelFile['solution']): boolean {
    return this.#edit(solveLevel(this.level.value, solution))
  }

  /** Empties board and toolbox; name, size and rules stay. */
  clear(): boolean {
    return this.#edit(clearLevel(this.level.value))
  }

  /** Puts another level in place of this one, as one step to undo: pasted or imported. */
  replace(level: LevelFile): boolean {
    this.selected.value = undefined
    return this.#edit(openLevel(level))
  }

  undo(): boolean {
    return this.#history.undo()
  }

  redo(): boolean {
    return this.#history.redo()
  }

  /** Handles a key pressed on the board; true when the key did something. */
  handleKey(key: string, modifiers: KeyModifiers): boolean {
    if (modifiers.ctrl) {
      const letter = key.toLowerCase()
      if (letter === 'z') return modifiers.shift ? this.redo() : this.undo()
      if (letter === 'y') return this.redo()
      return false
    }
    const place = this.focusedPlace()
    switch (key) {
      case 'ArrowLeft':
        return this.#step(-1, 0)
      case 'ArrowRight':
        return this.#step(1, 0)
      case 'ArrowUp':
        return this.#step(0, -1)
      case 'ArrowDown':
        return this.#step(0, 1)
      case 'Escape':
        this.selected.value = undefined
        return true
    }
    if (place === undefined) return false
    switch (key) {
      case 'Enter':
      case ' ':
        this.keyboardActive.value = true
        return this.use(place)
      case 'Delete':
      case 'Backspace':
        return this.erase(place)
      case 'q':
      case 'Q':
        this.selected.value = place
        return this.rotate(place, -1)
      case 'e':
      case 'E':
        this.selected.value = place
        return this.rotate(place, 1)
    }
    const kind = key.length === 1 ? kindForKey(key) : undefined
    return kind !== undefined && this.put(place, kind)
  }

  #step(columns: number, rows: number): boolean {
    this.keyboardActive.value = true
    const next = { column: this.focus.value.column + columns, row: this.focus.value.row + rows }
    if (placeOfGrid(this.scene.value.geometry, next) === undefined) return false
    this.focus.value = next
    return true
  }

  #edit(next: LevelFile): boolean {
    if (next === this.level.value) return false
    if (this.#stroke === 'open') {
      this.#history.amend(next)
    } else {
      this.#history.push(next)
      if (this.#stroke === 'started') this.#stroke = 'open'
    }
    const geometry = this.scene.value.geometry
    if (placeOfGrid(geometry, this.focus.value) === undefined) {
      this.focus.value = { column: 0, row: 0 }
    }
    return true
  }

  #sceneOf(): EditorScene {
    const level = this.level.value
    const [columns, rows] = level.size
    const playable = puzzleOf(level)
    // Always one free slot past the pieces, to paint the next one into.
    const toolboxSize = Math.max(2 * rows, level.toolbox.length + 1)
    const puzzle = { ...playable, toolboxSize }
    const state = new GameSession(puzzle, rulesOf(level, this.#packRules)).state.value
    return { puzzle, state, geometry: sceneGeometry(columns, rows, toolboxSize) }
  }

  #solutionOf(): SolutionStatus {
    const level = this.level.value
    if (level.solution === undefined) return { kind: 'none' }
    // Replaying refuses steps that name missing pieces or cells off the board.
    const { solved, tried } = verifySolution(level, this.#packRules)
    return solved === 0 ? { kind: 'fails' } : { kind: 'works', solved, tried }
  }

  #problemsOf(): Problem[] {
    const level = this.level.value
    const problems: Problem[] = []
    const add = (problem: Problem) => {
      if (!problems.some((each) => sameProblem(each, problem))) problems.push(problem)
    }
    const parsed = levelSchema.safeParse(level)
    for (const issue of parsed.error?.issues ?? []) {
      const [area, index] = issue.path
      if (area === 'name') add({ key: 'noName', blocking: true })
      else if (area === 'intro') add({ key: 'halfIntro', blocking: true })
      else if (area === 'solution') add({ key: 'solutionFails', blocking: true })
      else {
        const found = problemOf(issue)
        const at = this.#placeOf(area, index)
        add(found ? { ...found, ...(at && { at }), blocking: true } : invalid(issue.path))
      }
    }
    const { phase } = this.scene.value.state
    if (phase === 'exploding') add({ key: 'startsExploding', blocking: true })
    const coinless = problems.some((problem) => problem.key === 'noCoin')
    if (!coinless && (phase === 'solved' || phase === 'stabilizing')) {
      add({ key: 'startsSolved', blocking: true })
    }
    const solution = this.solution.value
    if (solution.kind === 'fails') add({ key: 'solutionFails', blocking: true })
    if (solution.kind === 'works' && solution.solved < solution.tried) {
      add({ key: 'solutionShaky', solved: solution.solved, tried: solution.tried, blocking: false })
    }
    return problems
  }

  #placeOf(area: PropertyKey | undefined, index: PropertyKey | undefined): Place | undefined {
    if (typeof index !== 'number') return undefined
    if (area === 'toolbox') return { area: 'toolbox', slot: index }
    const object = area === 'objects' ? this.level.value.objects[index] : undefined
    const cell = object === undefined ? -1 : cellOf(this.level.value, object.pos)
    return cell < 0 ? undefined : { area: 'board', cell }
  }
}

function invalid(path: readonly PropertyKey[]): Problem {
  return { key: 'invalid', place: path.map(String).join('.'), blocking: true }
}

function sameProblem(a: Problem, b: Problem): boolean {
  return JSON.stringify(a) === JSON.stringify(b)
}

/** What decides how the level plays: board, pieces and rules, but not its name, intro or note. */
function playKey(level: LevelFile): string {
  return JSON.stringify([level.size, level.objects, level.toolbox, level.rules])
}

function saveKey(level: LevelFile): string {
  return JSON.stringify(level)
}

/** Runs compute again only when the key changed since the last run. */
function cachedBy<T>(key: () => string, compute: () => T): () => T {
  let last: { readonly key: string; readonly value: T } | undefined
  return () => {
    const now = key()
    if (last?.key !== now) last = { key: now, value: compute() }
    return last.value
  }
}
