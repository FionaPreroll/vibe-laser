import { countSolved, levelsOf, library, type Pack } from '../../content/packs'
import { locale, t } from '../../i18n'
import { navigate } from '../router'

/** Where a pack opens: its skills, or its levels straight away when it has only one skill. */
export function openPack(pack: Pack): void {
  if (pack.file.selectSkill && pack.skills.length > 1) navigate({ name: 'skills', pack: pack.id })
  else navigate({ name: 'levels', pack: pack.id, skill: 1 })
}

export function PacksScreen({ solved }: { readonly solved: ReadonlySet<string> }) {
  return (
    <section class="screen" aria-labelledby="packs-title">
      <h2 id="packs-title">{t('packsTitle')}</h2>
      <ul class="cards">
        {library.value.map((pack) => {
          const levels = levelsOf(pack)
          return (
            <li key={pack.id}>
              <button type="button" class="card" onClick={() => openPack(pack)}>
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
