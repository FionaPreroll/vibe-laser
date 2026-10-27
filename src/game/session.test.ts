import { describe, expect, it } from 'vitest'
import type { Piece } from '../core/board'
import { boardOf, createPuzzle, type Place } from '../core/level'
import { formatBoard, parseBoard, parsePiece } from '../core/notation'
import { GameSession } from './session'

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
