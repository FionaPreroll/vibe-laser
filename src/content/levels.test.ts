import { describe, expect, it } from 'vitest'
import { GameSession } from '../game/session'
import { puzzleOf, solutionCommands, TUTORIAL } from './levels'

describe('tutorial levels', () => {
  it('have unique ids and names in both languages', () => {
    expect(new Set(TUTORIAL.map((level) => level.id)).size).toBe(TUTORIAL.length)
    for (const level of TUTORIAL) {
      expect(level.name.en).not.toBe('')
      expect(level.name.de).not.toBe('')
    }
  })

  it.each(TUTORIAL.map((level) => [level.id, level] as const))(
    '%s starts unsolved and its known solution solves it',
    (_, level) => {
      const session = new GameSession(puzzleOf(level))
      expect(session.state.value.phase).toBe('playing')
      for (const command of solutionCommands(level)) {
        expect(session.execute(command)).toBe(true)
      }
      expect(session.state.value.phase).toBe('solved')
    },
  )
})
