import {
  countSolved,
  findLevel,
  levelsOf,
  library,
  nextUnsolved,
  type Pack,
} from '../../content/packs'
import { selectScreenOf } from '../../content/schema'
import { locale, t } from '../../i18n'
import { navigate } from '../router'

/** Where a pack opens: its skills, or its levels straight away when it has only one skill. */
export function openPack(pack: Pack): void {
  if (pack.file.selectSkill && pack.skills.length > 1) navigate({ name: 'skills', pack: pack.id })
  else navigate({ name: 'levels', pack: pack.id, skill: 1 })
}

interface Props {
  readonly solved: ReadonlySet<string>
  /** The level played last, if any. */
  readonly last?: string
}

/**
 * Where Continue leads: the level played last while it is unsolved, else the next unsolved level
 * of its pack; nothing when that pack is done or no level was played yet.
 */
export function continueTo(last: string | undefined, solved: ReadonlySet<string>) {
  if (last === undefined) return undefined
  const id = solved.has(last) ? nextUnsolved(last, solved)?.id : last
  return id === undefined ? undefined : findLevel(id)
}

export function PacksScreen({ solved, last }: Props) {
  const next = continueTo(last, solved)
  return (
    <section class="screen" aria-labelledby="packs-title">
      {next && (
        <button
          type="button"
          class="primary continue"
          onClick={() => navigate({ name: 'play', level: next.entry.id })}
        >
          <span class="continue-label">{t('continue')}</span>
          <span class="continue-level">
            {t('continueLevel', {
              pack: next.pack.file.title[locale.value],
              skill: next.skill.name[locale.value],
              number: next.entry.number,
            })}
          </span>
        </button>
      )}
      <h2 id="packs-title">{t('packsTitle')}</h2>
      <ul class="cards">
        {library.value.map((pack) => {
          const levels = levelsOf(pack)
          return (
            <li key={pack.id}>
              <button type="button" class="card" onClick={() => openPack(pack)}>
                {/* The original gave every pack a picture of its own in the list. */}
                <span
                  class={`card-banner banner-${selectScreenOf(pack.file)}`}
                  aria-hidden="true"
                />
                <span class="card-title">{pack.file.title[locale.value]}</span>
                {pack.file.description && (
                  <span class="card-text">{pack.file.description[locale.value]}</span>
                )}
                <span class="card-progress">
                  {t('progress', { solved: countSolved(levels, solved), total: levels.length })}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
