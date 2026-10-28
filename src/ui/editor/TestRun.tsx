import { useEffect, useMemo, useRef } from 'preact/hooks'
import { listen, type Speaker } from '../../audio/director'
import { puzzleOf, rulesOf } from '../../content/level'
import { playSolution, recordMoves, recordSolution } from '../../content/solution'
import type { Rules } from '../../core/rules'
import type { EditorController } from '../../editor/controller'
import { GameSession } from '../../game/session'
import { t } from '../../i18n'
import { BoardController } from '../../view/controller'
import { BoardCanvas } from '../BoardCanvas'
import { FailedDialog } from '../FailedDialog'
import { Hud } from '../Hud'

interface Props {
  readonly editor: EditorController
  readonly packRules: Partial<Rules> | undefined
  readonly speaker: Speaker
  /** Help or the settings are open over the board. */
  readonly paused: boolean
  readonly onHelp: () => void
  readonly onClose: () => void
}

/**
 * Plays the level as it stands, as players will. Solved, the moves that solved it can become the
 * level's solution: where each piece was left, in the order of the last moves.
 */
export function TestRun({ editor, packRules, speaker, paused, onHelp, onClose }: Props) {
  const level = useMemo(() => editor.level.value, [editor])
  const start = useMemo(() => puzzleOf(level), [level])
  const controller = useMemo(
    () => new BoardController(new GameSession(start, rulesOf(level, packRules))),
    [start, level, packRules],
  )
  const recorder = useRef<ReturnType<typeof recordMoves>>(undefined)
  useEffect(() => {
    const recording = recordMoves(controller.session, start)
    recorder.current = recording
    const stopSound = listen(controller.session, speaker)
    return () => {
      recording.stop()
      stopSound()
    }
  }, [controller, start, speaker])
  useEffect(() => {
    controller.paused.value = paused
  }, [controller, paused])

  const { session } = controller
  const { phase, puzzle } = session.state.value
  const restart = () => {
    controller.select(undefined)
    session.restart()
  }
  const keep = () => {
    const steps = recordSolution(level, recorder.current?.moves ?? new Map())
    // Steps after the one that solved the level in a replay are not needed.
    const replay = new GameSession(puzzleOf(level), rulesOf(level, packRules))
    const used = playSolution(replay, { ...level, solution: steps })
    editor.setSolution(steps.slice(0, used ?? steps.length))
    onClose()
  }

  return (
    <>
      <div class="test-banner" role="status">
        <span>{t('testing')}</span>
        <button type="button" onClick={onClose}>
          {t('backToEditing')}
        </button>
      </div>
      <div class="stage">
        <BoardCanvas
          controller={controller}
          label={t('board', {
            name: level.name.en || t('editorTitle'),
            columns: puzzle.width,
            rows: puzzle.height,
          })}
        />
      </div>
      <Hud controller={controller} onExit={onClose} onHelp={onHelp} />
      {phase === 'solved' && <KeepDialog onKeep={keep} onReplay={restart} onClose={onClose} />}
      {phase === 'failed' && (
        <FailedDialog onRestart={restart} onLevels={onClose} leaveLabel={t('backToEditing')} />
      )}
    </>
  )
}

interface KeepProps {
  readonly onKeep: () => void
  readonly onReplay: () => void
  readonly onClose: () => void
}

function KeepDialog({ onKeep, onReplay, onClose }: KeepProps) {
  const first = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    first.current?.focus()
  }, [])
  return (
    <div class="dialog-backdrop">
      <div class="dialog" role="dialog" aria-modal="true" aria-labelledby="keep-title">
        <h2 id="keep-title">{t('solvedTitle')}</h2>
        <p>{t('keepSolutionText')}</p>
        <div class="dialog-buttons">
          <button type="button" class="primary" ref={first} onClick={onKeep}>
            {t('keepSolution')}
          </button>
          <button type="button" onClick={onReplay}>
            {t('playAgain')}
          </button>
          <button type="button" onClick={onClose}>
            {t('backToEditing')}
          </button>
        </div>
      </div>
    </div>
  )
}
