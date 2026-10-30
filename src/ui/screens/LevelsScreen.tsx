import { useEffect, useState } from 'preact/hooks'
import { findPack, type Level } from '../../content/packs'
import { selectScreenOf } from '../../content/schema'
import { locale, t, tn } from '../../i18n'
import { navigate } from '../router'
import { Missing } from './SkillsScreen'

interface Props {
  readonly pack: string
  readonly skill: number
  readonly solved: ReadonlySet<string>
  /** The fewest moves each level was solved in. */
  readonly best?: ReadonlyMap<string, number>
}

/** The levels of a skill, all open from the start, with a mark on the solved ones. */
export function LevelsScreen({ pack: id, skill: number, solved, best }: Props) {
  const pack = findPack(id)
  const skill = pack?.skills[number - 1]
  const [levels, setLevels] = useState<readonly Level[]>([])
  useEffect(() => {
    let current = true
    setLevels([])
    Promise.all((skill?.levels ?? []).map((entry) => entry.load())).then(
      (loaded) => current && setLevels(loaded),
      (error: unknown) => console.error('A level of this skill could not be loaded', error),
    )
    return () => {
      current = false
    }
  }, [skill])
  if (pack === undefined || skill === undefined) return <Missing />

  const many = pack.file.selectSkill && pack.skills.length > 1
  const theme = selectScreenOf(pack.file)
  return (
    <section class={`screen select-screen theme-${theme}`} aria-labelledby="levels-title">
      <button
        type="button"
        class="back"
        onClick={() =>
          many ? navigate({ name: 'skills', pack: pack.id }) : navigate({ name: 'packs' })
        }
      >
        {t('back')}
      </button>
      <p class="select-kicker">{t(`selectScreen.${theme}.kicker`)}</p>
      <h2 id="levels-title">
        {many
          ? `${pack.file.title[locale.value]} · ${skill.name[locale.value]}`
          : pack.file.title[locale.value]}
      </h2>
      <ol class="levels">
        {skill.levels.map((entry) => {
          const name = levels.find((level) => level.id === entry.id)?.file.name[locale.value]
          const done = solved.has(entry.id)
          const fewest = best?.get(entry.id)
          return (
            <li key={entry.id}>
              <button
                type="button"
                class={done ? 'level solved' : 'level'}
                onClick={() => navigate({ name: 'play', level: entry.id })}
              >
                <span>{name ? t('levelLabel', { number: entry.number, name }) : entry.number}</span>
                {done && (
                  <span class="mark">
                    {fewest === undefined ? t('solvedMark') : tn('solvedMarkBest', fewest)}
                  </span>
                )}
              </button>
            </li>
          )
        })}
      </ol>
    </section>
  )
}
