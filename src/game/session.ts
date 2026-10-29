import { batch, computed, type ReadonlySignal, type Signal, signal } from '@preact/signals-core'
import { type ActorEvent, forgetPaths, stepActors, type World } from '../core/actors'
import { coinSpins, isSolved } from '../core/coins'
import { applyCommand, type Command, cleanupCommand } from '../core/commands'
import { burn, litExplosives } from '../core/explosions'
import { boardOf, type Puzzle } from '../core/level'
import { DEFAULT_RULES, type Rules } from '../core/rules'
import { type LightField, trace } from '../core/trace'

/** Length of one fixed tick of the simulation. */
export const TICK_MS = 100
/** Ticks the board must hold with every coin spinning while mines or ships are about: 5 s. */
export const STABLE_TICKS = 5000 / TICK_MS
/** After a pause, at most this much time is caught up. */
const MAX_CATCH_UP_MS = 1000

/**
 * - playing: until every coin spins.
 * - stabilizing: every coin spins while mines or ships are about; it must hold for STABLE_TICKS.
 * - exploding: an explosive went off and the chain reaction runs; no input.
 * - failed: the chain has ended; only Restart remains.
 * - solved: the level is locked.
 */
export type Phase = 'playing' | 'stabilizing' | 'exploding' | 'failed' | 'solved'

export interface GameState {
  readonly puzzle: Puzzle
  readonly light: LightField
  /** Ids of the coins and anti-coins that spin. */
  readonly spinning: ReadonlySet<number>
  readonly phase: Phase
  /** Ticks the stabilizing phase has held so far. */
  readonly stable: number
  /** Cells of the explosives that burn on the next tick. */
  readonly burning: readonly number[]
  /** What actors remember, by item id. */
  readonly memory: World['memory']
  /** State of the seeded random generator. */
  readonly random: number
}

/** Things that happen, for animations and sounds. */
export type GameEvent =
  | ActorEvent
  /** A player move went through: a command, or an undo or redo, which applies an inverse. */
  | { readonly kind: 'command'; readonly command: Command }
  | { readonly kind: 'ignited'; readonly cells: readonly number[] }
  | {
      readonly kind: 'exploded'
      readonly cells: readonly number[]
      readonly destroyed: readonly number[]
    }

type Listener = (events: readonly GameEvent[]) => void

/** What a command would do to the light, without doing it. */
export interface Preview {
  readonly light: LightField
  /** Cells of the explosives that light would set off. */
  readonly ignites: readonly number[]
}

/**
 * One level in play, and the only writer of its state. Undo applies the stored inverse of a
 * command to the current puzzle instead of restoring a snapshot, so whatever slimes, mines, ships
 * and explosions did survives it, as the spec demands.
 */
export class GameSession {
  readonly #start: Puzzle
  readonly #rules: Rules
  readonly #seed: number
  readonly #state: Signal<GameState>
  readonly #undo = signal<readonly Command[]>([])
  readonly #redo = signal<readonly Command[]>([])
  readonly #listeners = new Set<Listener>()
  #ticks = 0
  #pending = 0

  readonly state: ReadonlySignal<GameState>
  /** Whether the player may move pieces: while playing or stabilizing. */
  readonly canPlay: ReadonlySignal<boolean>
  readonly canUndo: ReadonlySignal<boolean>
  readonly canRedo: ReadonlySignal<boolean>
  /** Whether Cleanup would move anything. */
  readonly canCleanup: ReadonlySignal<boolean>

  constructor(start: Puzzle, rules: Rules = DEFAULT_RULES, seed = 1) {
    this.#start = start
    this.#rules = rules
    this.#seed = seed
    this.#state = signal(this.#initial())
    this.state = this.#state
    this.canPlay = computed(() => isPlaying(this.#state.value.phase))
    this.canUndo = computed(() => this.canPlay.value && this.#undo.value.length > 0)
    this.canRedo = computed(() => this.canPlay.value && this.#redo.value.length > 0)
    this.canCleanup = computed(() => {
      const { puzzle, light } = this.#state.value
      return this.canPlay.value && cleanupCommand(puzzle, light) !== undefined
    })
  }

  /** Ticks played since the level started, or since the last restart. */
  get ticks(): number {
    return this.#ticks
  }

  /** Runs a player command. False when it is not allowed or the level no longer takes moves. */
  execute(command: Command): boolean {
    const applied = this.#apply(command)
    if (applied === undefined) return false
    batch(() => {
      this.#undo.value = [...this.#undo.value, applied.inverse]
      this.#redo.value = []
      this.#state.value = applied.state
    })
    this.#emit(applied.events)
    return true
  }

  /** Takes back the latest player command that still applies; entries that no longer apply are dropped. */
  undo(): boolean {
    return this.#travel(this.#undo, this.#redo)
  }

  redo(): boolean {
    return this.#travel(this.#redo, this.#undo)
  }

  /**
   * The light after a command, for a faint preview while a piece is carried. Nothing changes and
   * nothing goes off; undefined when the command is not allowed now or would change nothing.
   */
  preview(command: Command): Preview | undefined {
    if (!this.canPlay.value) return undefined
    const applied = applyCommand(this.#state.value.puzzle, command)
    if (applied === undefined) return undefined
    const light = trace(boardOf(applied.puzzle), this.#rules).light
    return { light, ignites: litExplosives(applied.puzzle, light) }
  }

  /** Cleanup: unlit moveable pieces go back into the toolbox, as one undoable step. */
  cleanup(): boolean {
    const command = cleanupCommand(this.#state.value.puzzle, this.#state.value.light)
    return command !== undefined && this.execute(command)
  }

  /** Back to the start of the level; the history is gone. */
  restart(): void {
    this.#ticks = 0
    this.#pending = 0
    batch(() => {
      this.#undo.value = []
      this.#redo.value = []
      this.#state.value = this.#initial()
    })
  }

  /** Feeds real time to the fixed ticks and returns how many ran. */
  advance(milliseconds: number): number {
    const { phase } = this.#state.value
    if (phase === 'failed' || phase === 'solved') {
      this.#pending = 0
      return 0
    }
    this.#pending = Math.min(this.#pending + milliseconds, MAX_CATCH_UP_MS)
    let ticks = 0
    while (this.#pending >= TICK_MS) {
      this.#pending -= TICK_MS
      this.tick()
      ticks++
    }
    return ticks
  }

  /**
   * One fixed tick: actors take their steps and the stabilizing phase counts on, or an explosion
   * chain spreads one ring further.
   */
  tick(): void {
    const state = this.#state.value
    if (state.phase === 'exploding') {
      this.#settle(spread(state, this.#rules))
      return
    }
    if (!isPlaying(state.phase)) return
    this.#ticks++
    const step = stepActors(state, this.#ticks, this.#rules)
    // A tick that changed nothing needs no new light; a ship turning round changes its heading.
    if (step.world === state && state.phase === 'playing') return
    const next = { ...state, ...step.world }
    this.#settle(settle(next, this.#rules, { ticks: 1, rammed: step.ignites, events: step.events }))
  }

  /** Calls the listener with the events of every command and tick; returns how to stop. */
  onEvents(listener: Listener): () => void {
    this.#listeners.add(listener)
    return () => this.#listeners.delete(listener)
  }

  #initial(): GameState {
    const start: GameState = {
      puzzle: this.#start,
      light: trace(boardOf(this.#start), this.#rules).light,
      spinning: new Set(),
      phase: 'playing',
      stable: 0,
      burning: [],
      memory: {},
      random: this.#seed,
    }
    return settle(start, this.#rules, NO_CHANGE).state
  }

  #settle({ state, events }: Settled): void {
    this.#state.value = state
    this.#emit(events)
  }

  #emit(events: readonly GameEvent[]): void {
    if (events.length === 0) return
    for (const listener of this.#listeners) listener(events)
  }

  #apply(command: Command): (Settled & { inverse: Command }) | undefined {
    const current = this.#state.value
    if (!isPlaying(current.phase)) return undefined
    const applied = applyCommand(current.puzzle, command)
    if (applied === undefined) return undefined
    const moved = { ...current, puzzle: applied.puzzle, memory: forgetPaths(current.memory) }
    const played = { ...NO_CHANGE, events: [{ kind: 'command', command } as const] }
    return { ...settle(moved, this.#rules, played), inverse: applied.inverse }
  }

  #travel(from: Signal<readonly Command[]>, to: Signal<readonly Command[]>): boolean {
    if (!isPlaying(this.#state.value.phase)) return false
    const stack = [...from.value]
    for (let command = stack.pop(); command !== undefined; command = stack.pop()) {
      const applied = this.#apply(command)
      if (applied === undefined) continue
      batch(() => {
        from.value = stack
        to.value = [...to.value, applied.inverse]
        this.#state.value = applied.state
      })
      this.#emit(applied.events)
      return true
    }
    // Every entry was stale: the pieces it moved are gone or their places are taken.
    from.value = []
    return false
  }
}

function isPlaying(phase: Phase): boolean {
  return phase === 'playing' || phase === 'stabilizing'
}

interface Settled {
  readonly state: GameState
  readonly events: readonly GameEvent[]
}

interface Change {
  /** Ticks that passed: 1 for a tick, 0 for a player command. */
  readonly ticks: number
  /** Explosives actors ran into. */
  readonly rammed: readonly number[]
  readonly events: readonly GameEvent[]
}

const NO_CHANGE: Change = { ticks: 0, rammed: [], events: [] }

/**
 * Traces the light for a changed board and moves the phase on: an explosive that light or an
 * actor reached sets off the chain; with every coin spinning the level is solved, or with mines
 * or ships about, it stabilizes first; anything else is play.
 */
function settle(next: GameState, rules: Rules, change: Change): Settled {
  const { puzzle } = next
  const light = trace(boardOf(puzzle), rules).light
  const spinning = spinningCoins(puzzle, light, rules)
  const events = [...change.events]
  const ignited = [...new Set([...change.rammed, ...litExplosives(puzzle, light)])]
  const base = { ...next, light, spinning, stable: 0, burning: [] }
  if (ignited.length > 0) {
    events.push({ kind: 'ignited', cells: ignited })
    return { state: { ...base, phase: 'exploding', burning: ignited }, events }
  }
  if (!allSpin(puzzle, light, rules)) return { state: { ...base, phase: 'playing' }, events }
  if (!hasMovers(puzzle)) return { state: { ...base, phase: 'solved' }, events }
  const stable = (next.phase === 'stabilizing' ? next.stable : 0) + change.ticks
  const phase = stable >= STABLE_TICKS ? 'solved' : 'stabilizing'
  return { state: { ...base, phase, stable }, events }
}

/** One ring of an explosion chain; once nothing burns any more, the level has failed. */
function spread(state: GameState, rules: Rules): Settled {
  const blast = burn(state.puzzle, state.burning)
  const light = trace(boardOf(blast.puzzle), rules).light
  const burning = [...new Set([...blast.next, ...litExplosives(blast.puzzle, light)])]
  const events: GameEvent[] = [
    { kind: 'exploded', cells: state.burning, destroyed: blast.destroyed },
  ]
  if (burning.length > 0) events.push({ kind: 'ignited', cells: burning })
  return {
    state: {
      ...state,
      puzzle: blast.puzzle,
      light,
      spinning: spinningCoins(blast.puzzle, light, rules),
      phase: burning.length > 0 ? 'exploding' : 'failed',
      burning,
    },
    events,
  }
}

function spinningCoins(puzzle: Puzzle, light: LightField, rules: Rules): Set<number> {
  const spinning = new Set<number>()
  for (const { id, piece, place } of puzzle.items) {
    if (place.area !== 'board' || (piece.kind !== 'coin' && piece.kind !== 'antiCoin')) continue
    if (coinSpins(piece, light, place.cell, rules)) spinning.add(id)
  }
  return spinning
}

/** Every coin spins; coins still waiting in the toolbox keep the level open. */
function allSpin(puzzle: Puzzle, light: LightField, rules: Rules): boolean {
  const waiting = puzzle.items.some(
    ({ piece, place }) =>
      place.area === 'toolbox' && (piece.kind === 'coin' || piece.kind === 'antiCoin'),
  )
  return !waiting && isSolved(boardOf(puzzle), light, rules)
}

/** Mines and ships keep moving, so with them about a solution must hold for a while. */
function hasMovers(puzzle: Puzzle): boolean {
  return puzzle.items.some(
    ({ piece, place }) =>
      place.area === 'board' && (piece.kind === 'mine' || piece.kind === 'ship'),
  )
}
