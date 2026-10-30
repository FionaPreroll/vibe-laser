import { effect, untracked } from '@preact/signals'
import { useEffect, useMemo, useState } from 'preact/hooks'
import { listen, type Speaker } from '../../audio/director'
import { puzzleOf, rulesOf } from '../../content/level'
import { findLevel, type Level, nextUnsolved } from '../../content/packs'
import { GameSession } from '../../game/session'
import { locale, t } from '../../i18n'
import type { ProfileBook } from '../../persistence/profiles'
import { BoardController } from '../../view/controller'
import { BoardCanvas } from '../BoardCanvas'
import { FailedDialog } from '../FailedDialog'
import { Hud } from '../Hud'
import { LevelIntro } from '../LevelIntro'
import { navigate } from '../router'
import { SolutionBar } from '../SolutionBar'
import { SolvedDialog } from '../SolvedDialog'
import { Missing } from './SkillsScreen'

interface Props {
  readonly level: string
  readonly book: ProfileBook
  readonly speaker: Speaker
  /** Help or the settings are open over the board. */
  readonly paused: boolean
  readonly onHelp: () => void
}

type Loaded = { readonly level: Level } | { readonly failed: true }

/**
 * One level in play: the board, the button bar and the dialogs for its end. The game belongs to
 * one level, so each level needs a screen of its own, keyed by the level.
 */
export function PlayScreen({ level: id, book, speaker, paused, onHelp }: Props) {
  const found = findLevel(id)
  const [loaded, setLoaded] = useState<Loaded>()
  const [record, setRecord] = useState<{ moves: number; before: number | undefined }>()
  useEffect(() => {
    let current = true
    setLoaded(undefined)
    found?.entry.load().then(
      (level) => current && setLoaded({ level }),
      (error: unknown) => {
        console.error(error)
        if (current) setLoaded({ failed: true })
      },
    )
    return () => {
      current = false
    }
  }, [found?.entry])

  const controller = useMemo(() => {
    if (loaded === undefined || !('level' in loaded)) return undefined
    const { file } = loaded.level
    return new BoardController(
      new GameSession(puzzleOf(file), rulesOf(file, found?.pack.file.rules)),
    )
  }, [loaded, found?.pack])

  useEffect(
    () => (controller ? listen(controller.session, speaker) : undefined),
    [controller, speaker],
  )
  useEffect(
    () =>
      controller &&
      effect(() => {
        // Only the game decides; saving reads the profile, which must not run this again.
        if (controller.session.state.value.phase === 'solved') {
          untracked(() => {
            // With the solution at hand, moves prove nothing, so such packs keep no best.
            const moves = found?.pack.file.showsSolutions
              ? undefined
              : controller.session.moves.value
            setRecord(moves === undefined ? undefined : { moves, before: book.best.value.get(id) })
            void book.markSolved(id, moves)
          })
        }
      }),
    [controller, book, id, found?.pack],
  )
  useEffect(() => {
    if (found !== undefined) void book.markPlayed(id)
  }, [book, id, found])
  const reducedMotion = book.active.value.settings.reducedMotion
  useEffect(() => {
    if (controller === undefined) return
    controller.paused.value = paused
    controller.reducedMotion.value = reducedMotion
  }, [controller, paused, reducedMotion])

  if (found === undefined) return <Missing />
  if (loaded === undefined) return <p class="screen">{t('loading')}</p>
  if (!('level' in loaded) || controller === undefined) {
    return (
      <section class="screen">
        <p>{t('levelBroken')}</p>
      </section>
    )
  }

  const { pack, skill, entry } = found
  const { name: names, intro } = loaded.level.file
  const name = names[locale.value]
  const { puzzle, phase } = controller.session.state.value
  const toLevels = () => navigate({ name: 'levels', pack: pack.id, skill: skill.number })
  const restart = () => {
    controller.select(undefined)
    controller.session.restart()
  }
  const next = phase === 'solved' ? nextUnsolved(id, book.solved.value) : undefined
  return (
    <>
      <h2 class="level-heading">
        {t('levelHeading', {
          pack: pack.file.title[locale.value],
          skill: skill.name[locale.value],
          number: entry.number,
          name,
        })}
      </h2>
      {intro && <LevelIntro id={id} text={intro[locale.value]} />}
      {pack.file.showsSolutions && (loaded.level.file.solution?.length ?? 0) > 0 && (
        <SolutionBar controller={controller} level={loaded.level.file} />
      )}
      <div class="play-area">
        <div class="stage">
          <BoardCanvas
            controller={controller}
            skin={pack.file.skin}
            label={t('board', { name, columns: puzzle.width, rows: puzzle.height })}
          />
        </div>
        <Hud controller={controller} onExit={toLevels} onHelp={onHelp} />
      </div>
      {phase === 'solved' && (
        <SolvedDialog
          onNext={next && (() => navigate({ name: 'play', level: next.id }))}
          onLevels={toLevels}
          onReplay={restart}
          record={record}
        />
      )}
      {phase === 'failed' && <FailedDialog onRestart={restart} onLevels={toLevels} />}
    </>
  )
}
