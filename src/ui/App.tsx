import { useMemo, useState } from 'preact/hooks'
import { type LevelDefinition, puzzleOf, TUTORIAL } from '../content/levels'
import { GameSession } from '../game/session'
import { locale, t } from '../i18n'
import { BoardController } from '../view/controller'
import { BoardCanvas } from './BoardCanvas'
import { FailedDialog } from './FailedDialog'
import { Hud } from './Hud'
import { LanguageSwitch } from './LanguageSwitch'
import { LevelPicker } from './LevelPicker'
import { SolvedDialog } from './SolvedDialog'

function levelAt(index: number): LevelDefinition {
  const level = TUTORIAL[index] ?? TUTORIAL[0]
  if (level === undefined) throw new Error('There are no levels')
  return level
}

export function App() {
  const [index, setIndex] = useState(0)
  const level = levelAt(index)
  const controller = useMemo(() => new BoardController(new GameSession(puzzleOf(level))), [level])
  const { session } = controller
  const { puzzle, phase } = session.state.value
  const name = level.name[locale.value]
  const hasNext = index + 1 < TUTORIAL.length
  const restart = () => {
    controller.select(undefined)
    session.restart()
  }

  return (
    <div class="shell">
      <header class="top-bar">
        <div>
          <h1>{t('appTitle')}</h1>
          <p class="tagline">{t('tagline')}</p>
        </div>
        <div class="top-controls">
          <LevelPicker levels={TUTORIAL} index={index} onSelect={setIndex} />
          <LanguageSwitch />
        </div>
      </header>
      <main class="stage">
        <BoardCanvas
          key={level.id}
          controller={controller}
          label={t('board', { name, columns: puzzle.width, rows: puzzle.height })}
        />
      </main>
      <Hud controller={controller} />
      {phase === 'solved' && (
        <SolvedDialog onNext={hasNext ? () => setIndex(index + 1) : undefined} onReplay={restart} />
      )}
      {phase === 'failed' && <FailedDialog onRestart={restart} />}
    </div>
  )
}
