import { describe, expect, it } from 'vitest'
import type { Command } from '../core/commands'
import { GameSession } from '../game/session'
import { puzzleOf, rulesOf } from './level'
import { findLevel } from './packs'
import { type LevelFile, levelSchema } from './schema'
import {
  nextHint,
  parOf,
  playSolution,
  playStep,
  recordMoves,
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

/** Runs commands on a session while recordMoves notes the last move of each piece. */
function recorder(level: LevelFile) {
  const start = puzzleOf(level)
  const session = new GameSession(start, rulesOf(level), 1)
  const { moves, stop } = recordMoves(session, start)
  const run = (command: Command) => expect(session.execute(command)).toBe(true)
  return { session, moves, run, stop }
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
    expect(playSolution(session, level)).toBe(3)
    expect(session.ticks).toBe(40)
  })
})

describe('parOf', () => {
  it('counts the moves of the known solution as a player makes them', () => {
    // One move to B6, one turn to the left.
    expect(parOf(firstLight())).toBe(2)
    expect(parOf(firstLight({ solution: [{ piece: 0, pos: 'B6', rot: 5 }] }))).toBeUndefined()
    expect(parOf(firstLight({ solution: undefined }))).toBeUndefined()
  })

  it('has a par for every built-in level', async () => {
    for (const id of ['tutorial/3/2', 'lightworks/1/1', 'strange-light/3/6']) {
      const found = findLevel(id)
      const level = await found?.entry.load()
      if (level === undefined) throw new Error(`No level ${id}`)
      expect(parOf(level.file, found?.pack.file.rules)).toBeGreaterThan(0)
    }
  })
})

describe('nextHint', () => {
  it('names the first move the board does not show yet, and nothing once it shows them all', () => {
    const level = firstLight()
    const session = sessionOf(level)
    const B6 = { area: 'board', cell: 11 } as const
    expect(nextHint(level, session.state.value.puzzle)).toEqual({
      index: 0,
      item: 2,
      place: B6,
      rotation: 7,
      afterWait: false,
    })
    // On its cell but not yet turned, the mirror still needs the hint.
    session.execute({ kind: 'move', item: 2, to: B6 })
    expect(nextHint(level, session.state.value.puzzle)?.place).toEqual(B6)
    session.execute({ kind: 'rotate', item: 2, steps: -1 })
    expect(nextHint(level, session.state.value.puzzle)).toBeUndefined()
  })

  it('says when a move waits for the actors, and starts at the step it is given', async () => {
    const level = await tutorial('tutorial/3/2')
    const session = sessionOf(level)
    expect(playStep(session, level, 0)).toBe(true)
    expect(nextHint(level, session.state.value.puzzle)).toMatchObject({ index: 2, afterWait: true })
    expect(nextHint(level, session.state.value.puzzle, 3)).toBeUndefined()
    // A wait is no move to play.
    expect(playStep(session, level, 1)).toBe(false)
    expect(playStep(session, level, 9)).toBe(false)
  })

  it('sends a piece back into a free toolbox slot when the solution stows it', () => {
    const level = firstLight({
      objects: [
        { type: 'coin', pos: 'B6', rgb: 'r' },
        { type: 'laser', pos: 'B1', rot: 2, rgb: 'r' },
        { type: 'filter', pos: 'B3', rgb: 'g', moveable: true },
      ],
      toolbox: [],
      solution: [{ from: 'B3', stow: true }],
    })
    const session = sessionOf(level)
    expect(nextHint(level, session.state.value.puzzle)).toEqual({
      index: 0,
      item: 1,
      place: { area: 'toolbox', slot: 0 },
      rotation: 0,
      afterWait: false,
    })
    expect(playStep(session, level, 0)).toBe(true)
    expect(nextHint(level, session.state.value.puzzle)).toBeUndefined()
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
    const { moves, run } = recorder(level)
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
    const { moves, run } = recorder(level)
    const [filter, mirror] = [1, 3]
    run({ kind: 'rotate', item: mirror, steps: 1 })
    run({ kind: 'move', item: mirror, to: { area: 'board', cell: 14 } })
    run({ kind: 'move', item: filter, to: { area: 'toolbox', slot: 0 } })
    expect(recordSolution(level, moves)).toEqual([
      { from: 'C2', pos: 'C3', rot: 2 },
      { from: 'B3', stow: true },
    ])
  })

  it('notes moves of a batch, forgets them on a restart, and stops noting', () => {
    const level = firstLight({
      toolbox: [{ type: 'mirror', rot: 0, count: 2 }],
      solution: undefined,
    })
    const { session, moves, run, stop } = recorder(level)
    run({
      kind: 'batch',
      commands: [
        { kind: 'move', item: 2, to: { area: 'board', cell: 11 } },
        { kind: 'move', item: 3, to: { area: 'board', cell: 14 } },
      ],
    })
    expect([...moves.keys()]).toEqual([2, 3])
    session.restart()
    expect(moves.size).toBe(0)
    stop()
    run({ kind: 'move', item: 2, to: { area: 'board', cell: 11 } })
    expect(moves.size).toBe(0)
  })

  it('waits where actors make the timing matter', async () => {
    // Hungry Slime: turn the beam up at B2, let the slime eat the explosive, then A2.
    const level = await tutorial('tutorial/3/2')
    const { session, moves, run } = recorder(level)
    const [first, second] = session.state.value.puzzle.items
      .filter((item) => item.place.area === 'toolbox')
      .map((item) => item.id)
    if (first === undefined || second === undefined) throw new Error('No mirrors')
    run({ kind: 'move', item: first, to: { area: 'board', cell: 6 } })
    run({ kind: 'rotate', item: first, steps: -1 })
    for (let tick = 0; tick < 40; tick++) session.tick()
    run({ kind: 'move', item: second, to: { area: 'board', cell: 1 } })
    run({ kind: 'rotate', item: second, steps: 3 })
    expect(session.state.value.phase).toBe('solved')
    expect(recordSolution(level, moves)).toEqual(level.solution)
  })
})
