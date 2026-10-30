import { useEffect, useMemo, useState } from 'preact/hooks'
import { listen, type Speaker } from '../../audio/director'
import { puzzleOf, rulesOf } from '../../content/level'
import type { LevelFile } from '../../content/schema'
import { decodeLevel } from '../../content/share'
import { GameSession } from '../../game/session'
import { locale, names, t } from '../../i18n'
import type { PackShelf } from '../../persistence/packs'
import { BoardController } from '../../view/controller'
import { BoardCanvas } from '../BoardCanvas'
import { FailedDialog } from '../FailedDialog'
import { Hud } from '../Hud'
import { LevelIntro } from '../LevelIntro'
import { navigate } from '../router'
import { SolvedDialog } from '../SolvedDialog'

interface Props {
  /** The level as the link carries it. */
  readonly data: string
  readonly shelf: PackShelf
  readonly speaker: Speaker
  /** Help or the settings are open over the board. */
  readonly paused: boolean
  readonly reducedMotion: boolean
  readonly onHelp: () => void
}

type Loaded = { readonly level: LevelFile } | { readonly failed: true }

/** The pack that keeps levels from links: the first one with its title, or a new one. */
async function sharedPack(shelf: PackShelf) {
  const title = names('sharedPackTitle')
  const found = shelf.packs.value.find((pack) => pack.pack.title.en === title.en)
  if (found !== undefined) return found
  return shelf.create({
    version: 1,
    title,
    position: 1000,
    skills: [names('defaultSkill')],
    selectSkill: false,
  })
}

/**
 * A level from a link, played as it came. It counts towards no pack; once solved, players can
 * keep it in a pack of their own.
 */
export function SharedScreen({ data, shelf, speaker, paused, reducedMotion, onHelp }: Props) {
  const [loaded, setLoaded] = useState<Loaded>()
  const [kept, setKept] = useState<string>()
  useEffect(() => {
    let current = true
    decodeLevel(data).then(
      (level) => current && setLoaded({ level }),
      () => current && setLoaded({ failed: true }),
    )
    return () => {
      current = false
    }
  }, [data])

  const controller = useMemo(() => {
    if (loaded === undefined || !('level' in loaded)) return undefined
    return new BoardController(new GameSession(puzzleOf(loaded.level), rulesOf(loaded.level)))
  }, [loaded])
  useEffect(
    () => (controller ? listen(controller.session, speaker) : undefined),
    [controller, speaker],
  )
  useEffect(() => {
    if (controller === undefined) return
    controller.paused.value = paused
    controller.reducedMotion.value = reducedMotion
  }, [controller, paused, reducedMotion])

  if (loaded === undefined) return <p class="screen">{t('loading')}</p>
  const toPacks = () => navigate({ name: 'packs' })
  if (!('level' in loaded) || controller === undefined) {
    return (
      <section class="screen">
        <p>{t('sharedBroken')}</p>
        <button type="button" onClick={toPacks}>
          {t('packsTitle')}
        </button>
      </section>
    )
  }

  const { level } = loaded
  const name = level.name[locale.value]
  const { puzzle, phase } = controller.session.state.value
  const restart = () => {
    controller.select(undefined)
    controller.session.restart()
  }
  const keep = async () => {
    try {
      const pack = await sharedPack(shelf)
      const place = await shelf.addLevel(pack.id, level)
      const title = pack.pack.title[locale.value]
      setKept(
        place === undefined
          ? t('sharedFull', { pack: title })
          : t('sharedKept', { pack: title, skill: place.skill, slot: place.slot }),
      )
    } catch (error) {
      console.error(error)
      setKept(t('savingFailed'))
    }
  }
  return (
    <>
      <div class="shared-bar">
        <h2 class="level-heading">{t('sharedHeading', { name })}</h2>
        <button type="button" disabled={kept !== undefined} onClick={() => void keep()}>
          {t('sharedKeep')}
        </button>
        <span class="status" role="status">
          {kept ?? ''}
        </span>
      </div>
      {level.intro && <LevelIntro text={level.intro[locale.value]} />}
      <div class="play-area">
        <div class="stage">
          <BoardCanvas
            controller={controller}
            skin={undefined}
            label={t('board', { name, columns: puzzle.width, rows: puzzle.height })}
          />
        </div>
        <Hud controller={controller} onExit={toPacks} onHelp={onHelp} />
      </div>
      {phase === 'solved' && (
        <SolvedDialog
          onNext={undefined}
          onLevels={toPacks}
          onReplay={restart}
          text={t('sharedSolved')}
          levelsLabel={t('packsTitle')}
        />
      )}
      {phase === 'failed' && <FailedDialog onRestart={restart} onLevels={toPacks} />}
    </>
  )
}
