import { effect } from '@preact/signals-core'
import type { GameEvent, GameSession, Phase } from '../game/session'

export type Sound =
  | 'place'
  | 'turn'
  | 'coin'
  | 'solved'
  | 'blast'
  | 'failed'
  | 'shot'
  | 'eat'
  | 'collect'
  | 'swallow'

/** Anything that can play the game's sounds: the synthesizer, or a recorder in tests. */
export interface Speaker {
  play(sound: Sound): void
}

const EVENT_SOUNDS: Partial<Record<GameEvent['kind'], Sound>> = {
  ignited: 'blast',
  fired: 'shot',
  ate: 'eat',
  collected: 'collect',
  swallowed: 'swallow',
}

const PHASE_SOUNDS: Partial<Record<Phase, Sound>> = { solved: 'solved', failed: 'failed' }

/** Plays the sounds of a session: moves, coins that start to spin, blasts, and how it ends. */
export function listen(session: GameSession, speaker: Speaker): () => void {
  const stopEvents = session.onEvents((events) => {
    for (const event of events) {
      if (event.kind === 'command') {
        speaker.play(event.command.kind === 'rotate' ? 'turn' : 'place')
      } else {
        const sound = EVENT_SOUNDS[event.kind]
        if (sound !== undefined) speaker.play(sound)
      }
    }
  })
  let spinning = session.state.value.spinning
  let phase = session.state.value.phase
  const stopState = effect(() => {
    const state = session.state.value
    const started = [...state.spinning].some((id) => !spinning.has(id))
    if (started && state.phase !== 'solved') speaker.play('coin')
    if (state.phase !== phase) {
      const sound = PHASE_SOUNDS[state.phase]
      if (sound !== undefined) speaker.play(sound)
    }
    spinning = state.spinning
    phase = state.phase
  })
  return () => {
    stopEvents()
    stopState()
  }
}
