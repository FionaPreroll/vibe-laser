import { describe, expect, it } from 'vitest'
import type { Command } from '../core/commands'
import { itemById } from '../core/level'
import { GameSession } from '../game/session'
import { puzzleOf, rulesOf } from './level'
import { findLevel } from './packs'
import { type LevelFile, levelSchema } from './schema'
import {
  type LastMove,
  playSolution,
  recordSolution,
  replaySolution,
  verifySolution,
} from './solution'

/** First Light: a red laser in B1 firing east; a mirror in B6 turned to 7 sends the beam to A6. */
function firstLight(changes: Partial<LevelFile> = {}): LevelFile {
  return levelSchema.parse({
    version: 1,
    name: { en: 'First Light', de: 'Erstes Licht' },
    size: [6, 3],
    objects: [
      { type: 'coin', pos: 'A6', rgb: 'r' },
      { type: 'laser', pos: 'B1', rot: 2, rgb: 'r' },
    ],
    toolbox: [{ type: 'mirror', rot: 0 }],
    solution: [{ piece: 0, pos: 'B6', rot: 7 }],
    ...changes,
  })
}

function sessionOf(level: LevelFile, seed = 1): GameSession {
  return new GameSession(puzzleOf(level), rulesOf(level), seed)
}

async function tutorial(id: string): Promise<LevelFile> {
  const level = await findLevel(id)?.entry.load()
  if (level === undefined) throw new Error(`No level ${id}`)
  return level.file
}

/** Runs commands on a session and notes the last move of each piece, as the editor's test does. */
function recorder(session: GameSession) {
  const moves = new Map<number, LastMove>()
  const run = (command: Command) => {
    expect(session.execute(command)).toBe(true)
    const ids = command.kind === 'batch' ? [] : [command.item]
    for (const id of ids) {
      const item = itemById(session.state.value.puzzle, id)
      if (item === undefined) continue
      moves.delete(id)
      moves.set(id, { tick: session.ticks, place: item.place, rotation: item.piece.rotation })
    }
  }
  return { moves, run }
}

describe('playSolution', () => {
  it('places toolbox pieces and turns them', () => {
    const level = firstLight()
    const session = sessionOf(level)
    expect(playSolution(session, level)).toBe(1)
    expect(session.state.value.phase).toBe('solved')
  })

  it('stops once the level is solved', () => {
    const level = firstLight({
      solution: [
        { piece: 0, pos: 'B6', rot: 7 },
        { piece: 0, pos: 'C6', rot: 0 },
      ],
    })
    expect(playSolution(sessionOf(level), level)).toBe(1)
  })

  it('reports a step the game refuses', () => {
    const level = firstLight({ solution: [{ piece: 0, pos: 'B1', rot: 7 }] })
    expect(playSolution(sessionOf(level), level)).toBeUndefined()
    // Past the checks: nothing starts on C3.
    const gone = { ...firstLight(), solution: [{ from: 'C3', pos: 'B6', rot: 7 }] }
    expect(playSolution(sessionOf(gone), gone)).toBeUndefined()
  })

  it('turns and moves pieces that start on the board', () => {
    const turned = firstLight({
      objects: [
        { type: 'coin', pos: 'A6', rgb: 'r' },
        { type: 'laser', pos: 'B1', rot: 2, rgb: 'r' },
        { type: 'mirror', pos: 'B6', rot: 0, rotateable: true },
      ],
      toolbox: [],
      solution: [{ from: 'B6', pos: 'B6', rot: 7 }],
    })
    const session = sessionOf(turned)
    expect(playSolution(session, turned)).toBe(1)
    expect(session.state.value.phase).toBe('solved')

    const moved = firstLight({
      objects: [
        { type: 'coin', pos: 'A6', rgb: 'r' },
        { type: 'laser', pos: 'B1', rot: 2, rgb: 'r' },
        { type: 'mirror', pos: 'C3', rot: 7, moveable: true },
      ],
      toolbox: [],
      solution: [{ from: 'C3', pos: 'B6', rot: 7 }],
    })
    expect(replaySolution(moved, undefined, 1).state.value.phase).toBe('solved')
  })

  it('stows a piece from the board in the toolbox', () => {
    const blocked = firstLight({
      objects: [
        { type: 'coin', pos: 'B6', rgb: 'r' },
        { type: 'laser', pos: 'B1', rot: 2, rgb: 'r' },
        { type: 'filter', pos: 'B3', rgb: 'g', moveable: true },
      ],
      toolbox: [],
      solution: [
        { from: 'B3', stow: true },
        { from: 'B3', stow: true },
      ],
    })
    const session = sessionOf(blocked)
    expect(playSolution(session, blocked)).toBe(1)
    expect(session.state.value.phase).toBe('solved')
  })

  it('waits for actors where the solution says so', async () => {
    const level = await tutorial('tutorial/3/2')
    const session = sessionOf(level)
    expect(playSolution(session, level)).toBe(2)
    expect(session.ticks).toBe(20)
  })
})

describe('verifySolution', () => {
  it('tries one seed without mines and eight with them', async () => {
    expect(verifySolution(firstLight())).toEqual({ solved: 1, tried: 1 })
    expect(verifySolution(await tutorial('tutorial/3/3'))).toEqual({ solved: 8, tried: 8 })
  })

  it('counts a solution that does not solve the level as failed', () => {
    expect(verifySolution(firstLight({ solution: [{ piece: 0, pos: 'C6', rot: 7 }] }))).toEqual({
      solved: 0,
      tried: 1,
    })
    expect(verifySolution(firstLight({ solution: undefined })).solved).toBe(0)
  })
})

describe('recordSolution', () => {
  it('keeps where each piece ended, in the order of the last moves', () => {
    const level = firstLight({
      toolbox: [{ type: 'mirror', rot: 0, count: 2 }],
      solution: undefined,
    })
    const session = sessionOf(level)
    const { moves, run } = recorder(session)
    run({ kind: 'move', item: 2, to: { area: 'board', cell: 11 } })
    run({ kind: 'move', item: 3, to: { area: 'board', cell: 14 } })
    run({ kind: 'move', item: 3, to: { area: 'toolbox', slot: 3 } })
    run({ kind: 'rotate', item: 2, steps: -1 })
    const steps = recordSolution(level, moves)
    expect(steps).toEqual([{ piece: 0, pos: 'B6', rot: 7 }])
    expect(verifySolution({ ...level, solution: steps })).toEqual({ solved: 1, tried: 1 })
  })

  it('records pieces that start on the board', () => {
    const level = firstLight({
      objects: [
        { type: 'coin', pos: 'B6', rgb: 'r' },
        { type: 'laser', pos: 'B1', rot: 2, rgb: 'r' },
        { type: 'filter', pos: 'B3', rgb: 'g', moveable: true },
        { type: 'mirror', pos: 'C2', rot: 1, rotateable: true, moveable: true },
      ],
      toolbox: [],
      solution: undefined,
    })
    const session = sessionOf(level)
    const { moves, run } = recorder(session)
    const [filter, mirror] = [1, 3]
    run({ kind: 'rotate', item: mirror, steps: 1 })
    run({ kind: 'move', item: mirror, to: { area: 'board', cell: 14 } })
    run({ kind: 'move', item: filter, to: { area: 'toolbox', slot: 0 } })
    expect(recordSolution(level, moves)).toEqual([
      { from: 'C2', pos: 'C3', rot: 2 },
      { from: 'B3', stow: true },
    ])
  })

  it('waits where actors make the timing matter', async () => {
    const level = await tutorial('tutorial/3/2')
    const session = sessionOf(level)
    const { moves, run } = recorder(session)
    for (let tick = 0; tick < 20; tick++) session.tick()
    const mirror = 4
    run({ kind: 'move', item: mirror, to: { area: 'board', cell: 0 } })
    run({ kind: 'rotate', item: mirror, steps: 3 })
    expect(session.state.value.phase).toBe('solved')
    expect(recordSolution(level, moves)).toEqual(level.solution)
  })
})
