import { effect } from '@preact/signals-core'
import { cellByName, type Size } from '../core/board'
import type { Command } from '../core/commands'
import type { Direction } from '../core/direction'
import { cellName } from '../core/grid'
import { freeSlot, type Item, itemById, type Place, type Puzzle, samePlace } from '../core/level'
import type { Rules } from '../core/rules'
import { GameSession, STABLE_TICKS } from '../game/session'
import { puzzleOf, rulesOf } from './level'
import type { LevelFile, SolutionStep } from './schema'

/** Mines bounce at random, so a solution has to work with each of these seeds. */
export const SEEDS: readonly number[] = [1, 2, 3, 4, 5, 6, 7, 8]

type Move = Exclude<SolutionStep, { readonly wait: number }>

/**
 * Plays a level's known solution on a session that has just started the level: placements, moves
 * and waits, in order. It stops once the level is solved; it returns how many steps that took, or
 * undefined when the game refused a step.
 */
export function playSolution(session: GameSession, level: LevelFile): number | undefined {
  const start = puzzleOf(level)
  const size = { width: level.size[0], height: level.size[1] }
  const steps = level.solution ?? []
  for (const [index, step] of steps.entries()) {
    if (session.state.value.phase === 'solved') return index
    if ('wait' in step) {
      for (let tick = 0; tick < step.wait; tick++) session.tick()
    } else if (!applyStep(session, start, size, step)) {
      return undefined
    }
  }
  return steps.length
}

/**
 * Par: the moves the level's known solution takes, counted as the game counts them, where every
 * piece put down counts one and every 45° turn one more, as a click turns it. Undefined without a
 * solution that solves the level.
 */
export function parOf(level: LevelFile, packRules?: Partial<Rules>): number | undefined {
  const session = new GameSession(puzzleOf(level), rulesOf(level, packRules))
  let moves = 0
  const stop = session.onEvents((events) => {
    for (const event of events) if (event.kind === 'command') moves += clicks(event.command)
  })
  try {
    playSolution(session, level)
    if (session.state.value.phase !== 'stabilizing') return solvedOrNot(session, moves)
    // With mines or ships about, the solution must hold until the bar is full.
    for (let tick = 0; tick < STABLE_TICKS && session.state.value.phase === 'stabilizing'; tick++) {
      session.tick()
    }
    return solvedOrNot(session, moves)
  } finally {
    stop()
  }
}

function solvedOrNot(session: GameSession, moves: number): number | undefined {
  return session.state.value.phase === 'solved' ? moves : undefined
}

/** How many moves a command takes a player: one per piece moved, one per 45° turn. */
function clicks(command: Command): number {
  switch (command.kind) {
    case 'move':
      return 1
    case 'rotate':
      return Math.abs(command.steps)
    case 'batch':
      return command.commands.reduce((sum, each) => sum + clicks(each), 0)
  }
}

/** The id of the item a step moves: by its toolbox slot or its cell at the start. */
function itemOfStep(start: Puzzle, size: Size, step: Move): number | undefined {
  const origin: Place =
    'piece' in step
      ? { area: 'toolbox', slot: step.piece }
      : { area: 'board', cell: cellByName(size, step.from) }
  return start.items.find((item) => samePlace(item.place, origin))?.id
}

/** The item a step means, where it is now, and plays the step on it. */
function applyStep(session: GameSession, start: Puzzle, size: Size, step: Move): boolean {
  const id = itemOfStep(start, size, step)
  const item = id === undefined ? undefined : itemById(session.state.value.puzzle, id)
  if (item === undefined) return false
  if ('stow' in step) {
    if (item.place.area === 'toolbox') return true
    const slot = freeSlot(session.state.value.puzzle)
    return (
      slot !== undefined &&
      session.execute({ kind: 'move', item: item.id, to: { area: 'toolbox', slot } })
    )
  }
  const to: Place = { area: 'board', cell: cellByName(size, step.pos) }
  if (!samePlace(item.place, to) && !session.execute({ kind: 'move', item: item.id, to })) {
    return false
  }
  const turn = (((step.rot - item.piece.rotation) % 8) + 8) % 8
  if (turn === 0 || session.state.value.phase === 'solved') return true
  return session.execute({ kind: 'rotate', item: item.id, steps: turn > 4 ? turn - 8 : turn })
}

/** Plays one move of a level's known solution, by its index; false for a wait or a refused move. */
export function playStep(session: GameSession, level: LevelFile, index: number): boolean {
  const step = level.solution?.[index]
  if (step === undefined || 'wait' in step) return false
  return applyStep(session, puzzleOf(level), sizeOf(level), step)
}

/** A move of a level's known solution as a hint: which piece goes where, and turned how. */
export interface Hint {
  /** The step's index in the solution. */
  readonly index: number
  readonly item: number
  /** A cell for a move, or a free toolbox slot for a piece that goes back into the toolbox. */
  readonly place: Place
  readonly rotation: Direction
  /** Whether the solution waits for slimes, mines or ships before this move. */
  readonly afterWait: boolean
}

/**
 * The first move of the level's known solution, from step `from` on, that the puzzle does not
 * show yet. Moves the player has already made are skipped, as are pieces the game has destroyed.
 */
export function nextHint(level: LevelFile, puzzle: Puzzle, from = 0): Hint | undefined {
  const start = puzzleOf(level)
  const size = sizeOf(level)
  const steps = level.solution ?? []
  let afterWait = false
  for (let index = from; index < steps.length; index++) {
    const step = steps[index]
    if (step === undefined) break
    if ('wait' in step) {
      afterWait = true
      continue
    }
    const id = itemOfStep(start, size, step)
    const item = id === undefined ? undefined : itemById(puzzle, id)
    if (item === undefined) continue
    const { rotation } = item.piece
    if ('stow' in step) {
      const slot = freeSlot(puzzle)
      if (item.place.area !== 'toolbox' && slot !== undefined) {
        return { index, item: item.id, place: { area: 'toolbox', slot }, rotation, afterWait }
      }
    } else {
      const to: Place = { area: 'board', cell: cellByName(size, step.pos) }
      if (!samePlace(item.place, to) || rotation !== step.rot) {
        return { index, item: item.id, place: to, rotation: step.rot as Direction, afterWait }
      }
    }
    afterWait = false
  }
  return undefined
}

function sizeOf(level: LevelFile): Size {
  return { width: level.size[0], height: level.size[1] }
}

/**
 * A fresh session of the level with its solution played, then left to run until the level is
 * solved or long enough that it never will be.
 */
export function replaySolution(
  level: LevelFile,
  packRules: Partial<Rules> | undefined,
  seed: number,
): GameSession {
  const session = new GameSession(puzzleOf(level), rulesOf(level, packRules), seed)
  if (playSolution(session, level) === undefined) return session
  for (let tick = 0; tick <= STABLE_TICKS && session.state.value.phase !== 'solved'; tick++) {
    session.tick()
  }
  return session
}

/** How many seeds the level's solution solves the level with; one seed is enough without mines. */
export function verifySolution(
  level: LevelFile,
  packRules?: Partial<Rules>,
): { readonly solved: number; readonly tried: number } {
  const seeds = hasPart(level, ['mine']) ? SEEDS : SEEDS.slice(0, 1)
  const solved = seeds.filter(
    (seed) => replaySolution(level, packRules, seed).state.value.phase === 'solved',
  ).length
  return { solved, tried: seeds.length }
}

/** Where the player's last move on a piece left it, and on which tick. */
export interface LastMove {
  readonly tick: number
  readonly place: Place
  readonly rotation: number
}

/**
 * The player's moves as solution steps: each piece the player left on another place or turned,
 * in the order of their last moves, which is the order of the map. Waits between the steps keep
 * the timing where actors make it matter.
 */
export function recordSolution(
  level: LevelFile,
  moves: ReadonlyMap<number, LastMove>,
): SolutionStep[] {
  const start = puzzleOf(level)
  const size = { width: level.size[0], height: level.size[1] }
  const timed = hasPart(level, ['slime', 'mine', 'ship'])
  const steps: SolutionStep[] = []
  let time = 0
  for (const [id, move] of moves) {
    const origin = itemById(start, id)
    const step = origin && stepFor(origin, move, size)
    if (step === undefined) continue
    if (timed && move.tick > time) {
      steps.push({ wait: move.tick - time })
      time = move.tick
    }
    steps.push(step)
  }
  return steps
}

/**
 * Notes the player's last move on each piece of a session that starts from `start`, in the order
 * recordSolution wants. A restart clears the notes.
 */
export function recordMoves(
  session: GameSession,
  start: Puzzle,
): { readonly moves: ReadonlyMap<number, LastMove>; stop(): void } {
  const moves = new Map<number, LastMove>()
  const note = (command: Command) => {
    if (command.kind === 'batch') {
      for (const step of command.commands) note(step)
      return
    }
    const item = itemById(session.state.value.puzzle, command.item)
    if (item === undefined) return
    moves.delete(item.id)
    moves.set(item.id, { tick: session.ticks, place: item.place, rotation: item.piece.rotation })
  }
  const stopEvents = session.onEvents((events) => {
    for (const event of events) if (event.kind === 'command') note(event.command)
  })
  // Only a restart brings back the very puzzle the session started with.
  const stopRestarts = effect(() => {
    if (session.state.value.puzzle === start) moves.clear()
  })
  return {
    moves,
    stop() {
      stopEvents()
      stopRestarts()
    },
  }
}

function stepFor(origin: Item, move: LastMove, size: Size): Move | undefined {
  if (samePlace(origin.place, move.place) && origin.piece.rotation === move.rotation) {
    return undefined
  }
  const name = (cell: number) =>
    cellName({ x: cell % size.width, y: Math.floor(cell / size.width) })
  if (move.place.area === 'toolbox') {
    return origin.place.area === 'board' ? { from: name(origin.place.cell), stow: true } : undefined
  }
  const pos = name(move.place.cell)
  return origin.place.area === 'toolbox'
    ? { piece: origin.place.slot, pos, rot: move.rotation }
    : { from: name(origin.place.cell), pos, rot: move.rotation }
}

function hasPart(level: LevelFile, kinds: readonly string[]): boolean {
  return [...level.objects, ...level.toolbox].some((piece) => kinds.includes(piece.type))
}
