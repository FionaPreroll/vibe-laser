import { describe, expect, it } from 'vitest'
import type { Piece } from '../core/board'
import { createPuzzle } from '../core/level'
import { parseBoard, parsePiece } from '../core/notation'
import { GameSession } from '../game/session'
import { listen, type Sound } from './director'

function piece(token: string): Piece {
  const parsed = parsePiece(token)
  if (parsed === undefined) throw new Error(token)
  return parsed
}

/** A session with a recorder that keeps the sounds it should play. */
function recorded(board: string, toolbox: string[] = []) {
  const session = new GameSession(createPuzzle(parseBoard(board), toolbox.map(piece)))
  const sounds: Sound[] = []
  const stop = listen(session, { play: (sound) => sounds.push(sound) })
  return { session, sounds, stop }
}

describe('listen', () => {
  it('clicks for moves, undo and Cleanup, and ticks for turns', () => {
    const { session, sounds } = recorded('L2r . . \n . . Cr', ['M0'])
    session.execute({ kind: 'move', item: 2, to: { area: 'board', cell: 0 + 3 } })
    session.execute({ kind: 'rotate', item: 2, steps: 1 })
    session.undo()
    session.cleanup()
    expect(sounds).toEqual(['place', 'turn', 'turn', 'place'])
  })

  it('chimes when a coin starts to spin, and plays a tune instead once all of them do', () => {
    const { session, sounds } = recorded('. . Cr . Cb \n L2r . . . . \n L2b . . . .', ['M0', 'M0'])
    // A mirror in B3, turned north-west, sends the red beam onto the red coin in A3.
    session.execute({ kind: 'move', item: 4, to: { area: 'board', cell: 7 } })
    session.execute({ kind: 'rotate', item: 4, steps: 7 })
    expect(sounds.toSorted()).toEqual(['coin', 'place', 'turn'])
    // One in C5 sends the blue beam up to the blue coin in A5, which solves the level.
    sounds.length = 0
    session.execute({ kind: 'move', item: 5, to: { area: 'board', cell: 14 } })
    session.execute({ kind: 'rotate', item: 5, steps: 7 })
    expect(session.state.value.phase).toBe('solved')
    expect(sounds.toSorted()).toEqual(['place', 'solved', 'turn'])
  })

  it('booms for a blast and sounds the failure once the chain is over', () => {
    const { session, sounds } = recorded('. . T \n L2r . .', ['M0'])
    session.execute({ kind: 'move', item: 2, to: { area: 'board', cell: 5 } })
    session.execute({ kind: 'rotate', item: 2, steps: 7 })
    session.tick()
    expect(sounds).toEqual(['place', 'turn', 'blast', 'failed'])
  })

  it('plays what actors do', () => {
    const { session, sounds } = recorded('SH2 . . T \n FC . . . \n Cr . . .')
    for (let tick = 0; tick < 4; tick++) session.tick()
    expect(sounds).toEqual(['collect', 'shot'])
    const slime = recorded('. T . \n . SL0 . \n Cr . .')
    for (let tick = 0; tick < 12; tick++) slime.session.tick()
    expect(slime.sounds).toEqual(['eat'])
    const hole = recorded('SH2 H . \n . . . \n Cr . .')
    for (let tick = 0; tick < 4; tick++) hole.session.tick()
    expect(hole.sounds).toEqual(['swallow'])
  })

  it('falls silent once stopped', () => {
    const { session, sounds, stop } = recorded('L2r . . \n . . Cr', ['M0'])
    stop()
    session.execute({ kind: 'move', item: 2, to: { area: 'board', cell: 3 } })
    expect(sounds).toEqual([])
  })
})
