import { countSolved, findPack } from '../../content/packs'
import { locale, t } from '../../i18n'
import { navigate } from '../router'

interface Props {
  readonly pack: string
  readonly solved: ReadonlySet<string>
}

export function SkillsScreen({ pack: id, solved }: Props) {
  const pack = findPack(id)
  if (pack === undefined) return <Missing />
  return (
    <section class="screen" aria-labelledby="skills-title">
      <button type="button" class="back" onClick={() => navigate({ name: 'packs' })}>
        {t('back')}
      </button>
      <h2 id="skills-title">{pack.file.title[locale.value]}</h2>
      <ul class="cards">
        {pack.skills.map((skill) => (
          <li key={skill.number}>
            <button
              type="button"
              class="card"
              onClick={() => navigate({ name: 'levels', pack: pack.id, skill: skill.number })}
            >
              <span class="card-title">
                {t('levelLabel', { number: skill.number, name: skill.name[locale.value] })}
              </span>
              <span class="card-progress">
                {t('progress', {
                  solved: countSolved(skill.levels, solved),
                  total: skill.levels.length,
                })}
              </span>
            </button>
          </li>
        ))}
      </ul>
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
