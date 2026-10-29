import { effect } from '@preact/signals'
import { useEffect, useMemo, useRef, useState } from 'preact/hooks'
import type { LevelFile } from '../content/schema'
import { type Hint, nextHint, playStep } from '../content/solution'
import { cellName } from '../core/grid'
import { itemById } from '../core/level'
import { TICK_MS } from '../game/session'
import { t } from '../i18n'
import type { BoardController } from '../view/controller'

/** The pause between the moves of a solution that plays itself, so players can follow it. */
export const SOLUTION_STEP_MS = 900

interface Props {
  readonly controller: BoardController
  readonly level: LevelFile
}

/**
 * Help in a Hints & Solutions pack, the original's IsSolved packs: a hint shows where the next
 * piece of the level's known solution goes, and the solution plays itself from the start, one
 * move at a time, waiting for slimes, mines and ships where it has to.
 */
export function SolutionBar({ controller, level }: Props) {
  const { session } = controller
  // Hints go forward through the solution, so a piece it moves twice does not send them back.
  const [from, setFrom] = useState(0)
  const [message, setMessage] = useState('')
  const [playing, setPlaying] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  /** True while the solution restarts the level itself, which must not stop it. */
  const replaying = useRef(false)
  const start = useMemo(() => session.state.value.puzzle, [session])

  const stop = () => {
    clearTimeout(timer.current)
    timer.current = undefined
    setPlaying(false)
  }
  useEffect(
    () =>
      effect(() => {
        // Only a restart brings back the very puzzle the level started with; the player's stops
        // a solution that plays.
        if (session.state.value.puzzle !== start) return
        setFrom(0)
        controller.hint.value = undefined
        if (replaying.current) return
        clearTimeout(timer.current)
        timer.current = undefined
        setPlaying(false)
        setMessage('')
      }),
    [session, start, controller],
  )
  useEffect(
    () => () => {
      clearTimeout(timer.current)
      controller.hint.value = undefined
    },
    [controller],
  )

  const hintText = (hint: Hint): string => {
    const item = itemById(session.state.value.puzzle, hint.item)
    const part = item === undefined ? '' : t(`parts.${item.piece.kind}`)
    if (hint.place.area === 'toolbox') return t('hintStow', { part })
    const width = level.size[0]
    const cell = cellName({ x: hint.place.cell % width, y: Math.floor(hint.place.cell / width) })
    return t(hint.afterWait ? 'hintPlaceAfterWait' : 'hintPlace', { part, cell })
  }

  const showHint = () => {
    const hint = nextHint(level, session.state.value.puzzle, from)
    controller.hint.value = hint && { item: hint.item, place: hint.place, rotation: hint.rotation }
    if (hint === undefined) {
      setMessage(t('hintDone'))
      return
    }
    setFrom(hint.index)
    setMessage(hintText(hint))
  }

  const showSolution = () => {
    stop()
    controller.select(undefined)
    replaying.current = true
    session.restart()
    replaying.current = false
    setPlaying(true)
    setMessage(t('solutionPlaying'))
    const steps = level.solution ?? []
    const run = (index: number) => {
      const step = steps[index]
      if (step === undefined || !session.canPlay.value) {
        stop()
        return
      }
      if ('wait' in step) {
        // The game's own clock decides, so a pause for help or settings does not cut the wait.
        const until = session.ticks + step.wait
        const check = () => {
          if (session.ticks >= until) run(index + 1)
          else timer.current = setTimeout(check, TICK_MS)
        }
        check()
        return
      }
      if (!playStep(session, level, index)) {
        stop()
        setMessage('')
        return
      }
      if (index + 1 >= steps.length || !session.canPlay.value) stop()
      else timer.current = setTimeout(() => run(index + 1), SOLUTION_STEP_MS)
    }
    timer.current = setTimeout(() => run(0), SOLUTION_STEP_MS)
  }

  const canPlay = session.canPlay.value
  return (
    <div class="solution-bar">
      <div class="solution-buttons" role="toolbar" aria-label={t('solutionHelp')}>
        <button type="button" disabled={playing || !canPlay} onClick={showHint}>
          {t('showHint')}
        </button>
        {playing ? (
          <button
            type="button"
            onClick={() => {
              stop()
              setMessage('')
            }}
          >
            {t('stopSolution')}
          </button>
        ) : (
          <button type="button" disabled={!canPlay} onClick={showSolution}>
            {t('showSolution')}
          </button>
        )}
      </div>
      <p class="solution-message" role="status">
        {message}
      </p>
    </div>
  )
}
