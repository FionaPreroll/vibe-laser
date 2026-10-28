import { describe, expect, it } from 'vitest'
import { GameSession, STABLE_TICKS } from '../game/session'
import { type LevelDefinition, puzzleOf, solutionSteps, TUTORIAL } from './levels'

/** Mines bounce at random, so every level is played with several seeds. */
const SEEDS = [1, 2, 3, 4, 5, 6, 7, 8]
/** A minute of ticks: about how long a player may look at a level before the first move. */
const THINKING_TICKS = 600

/** Plays the level's known solution, then lets the actors go on until the level is decided. */
function playSolution(level: LevelDefinition, seed: number): GameSession {
  const session = new GameSession(puzzleOf(level), undefined, seed)
  for (const step of solutionSteps(level)) {
    if ('wait' in step) {
      for (let tick = 0; tick < step.wait; tick++) session.tick()
    } else if (!session.execute(step)) {
      throw new Error(`The solution of ${level.id} takes a step the game refuses`)
    }
  }
  for (let tick = 0; tick <= STABLE_TICKS && session.state.value.phase !== 'solved'; tick++) {
    session.tick()
  }
  return session
}

const levels = TUTORIAL.map((level) => [level.id, level] as const)

describe('tutorial levels', () => {
  it('have unique ids and names in both languages', () => {
    expect(new Set(TUTORIAL.map((level) => level.id)).size).toBe(TUTORIAL.length)
    for (const level of TUTORIAL) {
      expect(level.name.en).not.toBe('')
      expect(level.name.de).not.toBe('')
    }
  })

  it.each(levels)('%s starts unsolved and stays so while the player thinks', (_, level) => {
    for (const seed of SEEDS) {
      const session = new GameSession(puzzleOf(level), undefined, seed)
      expect(session.state.value.phase).toBe('playing')
      for (let tick = 0; tick < THINKING_TICKS; tick++) session.tick()
      expect(session.state.value.phase).toBe('playing')
    }
  })

  it.each(levels)('%s is solved by its known solution, whatever the seed', (_, level) => {
    for (const seed of SEEDS) {
      expect(playSolution(level, seed).state.value.phase).toBe('solved')
    }
  })
})
