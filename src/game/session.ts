import { batch, computed, type ReadonlySignal, type Signal, signal } from '@preact/signals-core'
import { coinSpins, isSolved } from '../core/coins'
import { applyCommand, type Command, cleanupCommand } from '../core/commands'
import { boardOf, type Puzzle } from '../core/level'
import { DEFAULT_RULES, type Rules } from '../core/rules'
import { type LightField, trace } from '../core/trace'

/** Playing until every coin spins; then the level is solved and locked. */
export type Phase = 'playing' | 'solved'

export interface GameState {
  readonly puzzle: Puzzle
  readonly light: LightField
  /** Ids of the coins and anti-coins that spin. */
  readonly spinning: ReadonlySet<number>
  readonly phase: Phase
}

/**
 * One level in play, and the only writer of its state. Undo applies the stored inverse of a
 * command to the current puzzle instead of restoring a snapshot, so that later the effects of
 * slimes, mines and ships survive it, as the spec demands.
 */
export class GameSession {
  readonly #start: Puzzle
  readonly #rules: Rules
  readonly #state: Signal<GameState>
  readonly #undo = signal<readonly Command[]>([])
  readonly #redo = signal<readonly Command[]>([])

  readonly state: ReadonlySignal<GameState>
  readonly canUndo: ReadonlySignal<boolean>
  readonly canRedo: ReadonlySignal<boolean>
  /** Whether Cleanup would move anything. */
  readonly canCleanup: ReadonlySignal<boolean>

  constructor(start: Puzzle, rules: Rules = DEFAULT_RULES) {
    this.#start = start
    this.#rules = rules
    this.#state = signal(evaluate(start, rules))
    this.state = this.#state
    this.canUndo = computed(
      () => this.#state.value.phase === 'playing' && this.#undo.value.length > 0,
    )
    this.canRedo = computed(
      () => this.#state.value.phase === 'playing' && this.#redo.value.length > 0,
    )
    this.canCleanup = computed(() => {
      const { phase, puzzle, light } = this.#state.value
      return phase === 'playing' && cleanupCommand(puzzle, light) !== undefined
    })
  }

  /** Runs a player command. False when it is not allowed or the level is already solved. */
  execute(command: Command): boolean {
    const applied = this.#apply(command)
    if (applied === undefined) return false
    batch(() => {
      this.#undo.value = [...this.#undo.value, applied.inverse]
      this.#redo.value = []
      this.#state.value = applied.state
    })
    return true
  }

  /** Takes back the latest player command that still applies; entries that no longer apply are dropped. */
  undo(): boolean {
    return this.#travel(this.#undo, this.#redo)
  }

  redo(): boolean {
    return this.#travel(this.#redo, this.#undo)
  }

  /** Cleanup: unlit moveable pieces go back into the toolbox, as one undoable step. */
  cleanup(): boolean {
    const command = cleanupCommand(this.#state.value.puzzle, this.#state.value.light)
    return command !== undefined && this.execute(command)
  }

  /** Back to the start of the level; the history is gone. */
  restart(): void {
    batch(() => {
      this.#undo.value = []
      this.#redo.value = []
      this.#state.value = evaluate(this.#start, this.#rules)
    })
  }

  #apply(command: Command): { state: GameState; inverse: Command } | undefined {
    const current = this.#state.value
    if (current.phase !== 'playing') return undefined
    const applied = applyCommand(current.puzzle, command)
    if (applied === undefined) return undefined
    return { state: evaluate(applied.puzzle, this.#rules), inverse: applied.inverse }
  }

  #travel(from: Signal<readonly Command[]>, to: Signal<readonly Command[]>): boolean {
    if (this.#state.value.phase !== 'playing') return false
    const stack = [...from.value]
    for (let command = stack.pop(); command !== undefined; command = stack.pop()) {
      const applied = this.#apply(command)
      if (applied === undefined) continue
      batch(() => {
        from.value = stack
        to.value = [...to.value, applied.inverse]
        this.#state.value = applied.state
      })
      return true
    }
    // Every entry was stale: the pieces it moved are gone or their places are taken.
    from.value = []
    return false
  }
}

function evaluate(puzzle: Puzzle, rules: Rules): GameState {
  const board = boardOf(puzzle)
  const { light } = trace(board, rules)
  const spinning = new Set<number>()
  let coinOffBoard = false
  for (const item of puzzle.items) {
    if (item.piece.kind !== 'coin' && item.piece.kind !== 'antiCoin') continue
    if (item.place.area !== 'board') coinOffBoard = true
    else if (coinSpins(item.piece, light, item.place.cell, rules)) spinning.add(item.id)
  }
  // Coins still waiting in the toolbox keep the level open.
  const solved = !coinOffBoard && isSolved(board, light, rules)
  return { puzzle, light, spinning, phase: solved ? 'solved' : 'playing' }
}
