import { countSolved, findPack } from '../../content/packs'
import { selectScreenOf } from '../../content/schema'
import { locale, t } from '../../i18n'
import { navigate } from '../router'

interface Props {
  readonly pack: string
  readonly solved: ReadonlySet<string>
  readonly onHelp: () => void
}

/**
 * The skills of a pack, on the pack's own selection screen, as in the original: Deluxe's
 * laboratory console with its intensities and its operations manual, Classic's menu, and others.
 */
export function SkillsScreen({ pack: id, solved, onHelp }: Props) {
  const pack = findPack(id)
  if (pack === undefined) return <Missing />
  const theme = selectScreenOf(pack.file)
  return (
    <section class={`screen select-screen theme-${theme}`} aria-labelledby="skills-title">
      <button type="button" class="back" onClick={() => navigate({ name: 'packs' })}>
        {t('back')}
      </button>
      <header class="select-head">
        <p class="select-kicker">{t(`selectScreen.${theme}.kicker`)}</p>
        <h2 id="skills-title">{pack.file.title[locale.value]}</h2>
        {pack.file.description && <p class="select-text">{pack.file.description[locale.value]}</p>}
      </header>
      <ul class="select-skills">
        {pack.skills.map((skill) => {
          const done = countSolved(skill.levels, solved)
          const total = skill.levels.length
          return (
            <li key={skill.number}>
              <button
                type="button"
                class="select-skill"
                onClick={() => navigate({ name: 'levels', pack: pack.id, skill: skill.number })}
              >
                <span
                  class="select-lamp"
                  data-on={total > 0 && done === total}
                  aria-hidden="true"
                />
                <span class="select-skill-name">
                  {t('levelLabel', { number: skill.number, name: skill.name[locale.value] })}
                </span>
                <span class="select-meter" aria-hidden="true">
                  <span style={{ width: `${total === 0 ? 0 : (100 * done) / total}%` }} />
                </span>
                <span class="select-progress">{t('progress', { solved: done, total })}</span>
              </button>
            </li>
          )
        })}
      </ul>
      <div class="select-actions">
        <button type="button" onClick={onHelp}>
          {t(`selectScreen.${theme}.help`)}
        </button>
      </div>
    </section>
  )
}

export function Missing() {
  return (
    <section class="screen">
      <button type="button" class="back" onClick={() => navigate({ name: 'packs' })}>
        {t('back')}
      </button>
      <p>{t('levelMissing')}</p>
    </section>
  )
}
