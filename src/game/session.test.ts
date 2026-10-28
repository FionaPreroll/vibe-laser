import { describe, expect, it } from 'vitest'
import { cellByName, type Piece } from '../core/board'
import { boardOf, createPuzzle, type Place } from '../core/level'
import { formatBoard, parseBoard, parsePiece } from '../core/notation'
import { type GameEvent, GameSession, STABLE_TICKS, TICK_MS } from './session'

function piece(token: string): Piece {
  const parsed = parsePiece(token)
  if (parsed === undefined) throw new Error(`"${token}" is no piece`)
  return parsed
}

// The laser in B1 fires east; a mirror in B3, rotation 7, sends the beam north onto the coin in A3.
const BOARD = `
  .   .   Cr
  L2r .   .
`
const MIRROR = 2
const B3: Place = { area: 'board', cell: 5 }
const A1: Place = { area: 'board', cell: 0 }

function newSession(): GameSession {
  return new GameSession(createPuzzle(parseBoard(BOARD), [piece('M0')]))
}

function board(session: GameSession): string {
  return formatBoard(boardOf(session.state.value.puzzle))
}

describe('GameSession', () => {
  it('starts unsolved, with nothing to undo or redo', () => {
    const session = newSession()
    expect(session.state.value.phase).toBe('playing')
    expect(session.canUndo.value).toBe(false)
    expect(session.canRedo.value).toBe(false)
  })

  it('undoes and redoes moves', () => {
    const session = newSession()
    expect(session.execute({ kind: 'move', item: MIRROR, to: B3 })).toBe(true)
    expect(board(session)).toBe('.   .   Cr\nL2r .   M0')
    expect(session.canUndo.value).toBe(true)

    expect(session.undo()).toBe(true)
    expect(board(session)).toBe('.   .   Cr\nL2r .   .')
    expect(session.canUndo.value).toBe(false)
    expect(session.canRedo.value).toBe(true)

    expect(session.redo()).toBe(true)
    expect(board(session)).toBe('.   .   Cr\nL2r .   M0')
    expect(session.canRedo.value).toBe(false)
  })

  it('forgets the redo history after a new move', () => {
    const session = newSession()
    session.execute({ kind: 'move', item: MIRROR, to: B3 })
    session.undo()
    session.execute({ kind: 'move', item: MIRROR, to: A1 })
    expect(session.canRedo.value).toBe(false)
  })

  it('refuses moves the rules forbid', () => {
    const session = newSession()
    expect(session.execute({ kind: 'move', item: 0, to: B3 })).toBe(false)
    expect(session.canUndo.value).toBe(false)
  })

  it('locks the level once every coin spins', () => {
    const session = newSession()
    session.execute({ kind: 'move', item: MIRROR, to: B3 })
    expect(session.execute({ kind: 'rotate', item: MIRROR, steps: -1 })).toBe(true)
    expect(session.state.value.phase).toBe('solved')
    expect(session.state.value.spinning).toEqual(new Set([0]))
    expect(session.execute({ kind: 'rotate', item: MIRROR, steps: 1 })).toBe(false)
    expect(session.undo()).toBe(false)
    expect(session.canUndo.value).toBe(false)
  })

  it('restarts from the beginning without history', () => {
    const session = newSession()
    session.execute({ kind: 'move', item: MIRROR, to: B3 })
    session.execute({ kind: 'rotate', item: MIRROR, steps: -1 })
    session.restart()
    expect(session.state.value.phase).toBe('playing')
    expect(board(session)).toBe('.   .   Cr\nL2r .   .')
    expect(session.canUndo.value).toBe(false)
  })

  it('cleans up unlit pieces as one undoable step', () => {
    const session = newSession()
    session.execute({ kind: 'move', item: MIRROR, to: A1 })
    expect(session.cleanup()).toBe(true)
    expect(board(session)).toBe('.   .   Cr\nL2r .   .')
    expect(session.undo()).toBe(true)
    expect(board(session)).toBe('M0  .   Cr\nL2r .   .')
    expect(session.cleanup()).toBe(true)
    expect(session.cleanup()).toBe(false)
  })

  it('keeps a level open while coins wait in the toolbox', () => {
    const session = new GameSession(createPuzzle(parseBoard('L2r . .'), [piece('Cr')]))
    expect(session.state.value.phase).toBe('playing')
    session.execute({ kind: 'move', item: 1, to: { area: 'board', cell: 2 } })
    expect(session.state.value.phase).toBe('solved')
  })
})

describe('GameSession with hazards and actors', () => {
  const cell = (session: GameSession, name: string) =>
    cellByName(boardOf(session.state.value.puzzle), name)
  const ticks = (session: GameSession, count: number) => {
    for (let tick = 0; tick < count; tick++) session.tick()
  }

  it('sets off an explosive a move lights; the chain spreads tick by tick, then the level fails', () => {
    // The mirror in B3, turned north-west, sends the beam onto the explosive in A3.
    const session = new GameSession(
      createPuzzle(parseBoard('.   .   T   T \n L2r .   .   .'), [piece('M0')]),
    )
    const events: GameEvent[] = []
    session.onEvents((batch) => events.push(...batch))
    session.execute({ kind: 'move', item: 3, to: { area: 'board', cell: cell(session, 'B3') } })
    expect(session.state.value.phase).toBe('playing')
    session.execute({ kind: 'rotate', item: 3, steps: -1 })
    expect(session.state.value.phase).toBe('exploding')
    expect(events.at(-1)).toEqual({ kind: 'ignited', cells: [cell(session, 'A3')] })
    expect(session.canUndo.value).toBe(false)
    expect(session.execute({ kind: 'rotate', item: 3, steps: 1 })).toBe(false)

    session.tick()
    expect(board(session)).toBe('.   .   .   T\nL2r .   .   .')
    expect(session.state.value.phase).toBe('exploding')
    session.tick()
    expect(board(session)).toBe('.   .   .   .\nL2r .   .   .')
    expect(session.state.value.phase).toBe('failed')
    expect(events.filter((event) => event.kind === 'exploded')).toHaveLength(2)

    session.restart()
    expect(session.state.value.phase).toBe('playing')
    expect(board(session)).toBe('.   .   T   T\nL2r .   .   .')
  })

  it('fails the level when a mine runs into an explosive', () => {
    const session = new GameSession(createPuzzle(parseBoard('MI2 T'), []))
    ticks(session, 4)
    expect(session.state.value.phase).toBe('exploding')
    session.tick()
    expect(board(session)).toBe('. .')
    expect(session.state.value.phase).toBe('failed')
  })

  describe('with a mine about', () => {
    // The beam along row B fences the mine into rows C and D. A mirror in B4, turned north-west,
    // lights the coin in A4.
    const start = () =>
      new GameSession(
        createPuzzle(parseBoard('. . . Cr \n L2r . . . \n . . . . \n MI2 . . .'), [piece('M7')]),
      )
    const solve = (session: GameSession) =>
      session.execute({ kind: 'move', item: 3, to: { area: 'board', cell: cell(session, 'B4') } })

    it('counts the level as solved only after the board has held for a while', () => {
      const session = start()
      solve(session)
      expect(session.state.value.phase).toBe('stabilizing')
      ticks(session, STABLE_TICKS - 1)
      expect(session.state.value.phase).toBe('stabilizing')
      expect(session.state.value.stable).toBe(STABLE_TICKS - 1)
      session.tick()
      expect(session.state.value.phase).toBe('solved')
    })

    it('goes back to playing when a coin stops in the meantime', () => {
      const session = start()
      solve(session)
      ticks(session, 10)
      session.execute({ kind: 'rotate', item: 3, steps: 1 })
      expect(session.state.value.phase).toBe('playing')
      expect(session.state.value.stable).toBe(0)
      session.execute({ kind: 'rotate', item: 3, steps: -1 })
      expect(session.state.value).toMatchObject({ phase: 'stabilizing', stable: 0 })
    })
  })

  it('runs one tick per 100 ms of real time', () => {
    const session = new GameSession(createPuzzle(parseBoard('SH2 . .'), []))
    expect(session.advance(350)).toBe(3)
    expect(board(session)).toBe('SH2 .   .')
    expect(session.advance(50)).toBe(1)
    expect(board(session)).toBe('.   SH2 .')
    expect(TICK_MS).toBe(100)
  })

  it('drops undo entries for pieces a slime has eaten', () => {
    const session = new GameSession(
      createPuzzle(parseBoard('. . . \n . . . \n . SL0 .'), [piece('M0')]),
    )
    session.execute({ kind: 'move', item: 1, to: { area: 'board', cell: cell(session, 'A2') } })
    ticks(session, 16)
    expect(board(session)).toBe(formatBoard(parseBoard('. . . \n . . . \n . . .')))
    expect(session.undo()).toBe(false)
    expect(session.canUndo.value).toBe(false)
  })
})
