import { useState } from 'preact/hooks'
import { levelsOf, type Pack } from '../../content/packs'
import type { PackFile } from '../../content/schema'
import { locale, names, t } from '../../i18n'
import type { PackShelf } from '../../persistence/packs'
import { FileButton } from '../FileButton'
import { navigate } from '../router'
import { builtInPacks } from './sources'

/** A fresh pack with one skill, listed after the built-in ones. */
function newPackFile(title: string): PackFile {
  return {
    version: 1,
    title: { en: title, de: title },
    position: 100,
    skills: [names('defaultSkill')],
    selectSkill: true,
  }
}

function countText(count: number): string {
  return count === 1 ? t('levelCountOne') : t('levelCount', { count })
}

/** The editor's start: the player's own packs, a new pack, an import, and in development the built-in packs. */
export function EditorHome({ shelf }: { readonly shelf: PackShelf }) {
  const [title, setTitle] = useState('')
  const [importFailed, setImportFailed] = useState(false)
  const packs = shelf.packs.value
  const builtIn = builtInPacks()

  const create = async () => {
    const name = title.trim()
    if (name === '') return
    const made = await shelf.create(newPackFile(name))
    setTitle('')
    navigate({ name: 'editPack', pack: made.id })
  }
  const importFile = async (file: File) => {
    setImportFailed(false)
    try {
      const made = await shelf.importPack(await file.text())
      navigate({ name: 'editPack', pack: made.id })
    } catch {
      setImportFailed(true)
    }
  }

  return (
    <section class="screen" aria-labelledby="editor-title">
      <button type="button" class="back" onClick={() => navigate({ name: 'packs' })}>
        {t('back')}
      </button>
      <h2 id="editor-title">{t('editorTitle')}</h2>
      <p class="intro">{t('editorIntro')}</p>
      <h3>{t('myPacks')}</h3>
      {packs.length === 0 && <p class="hint">{t('noPacks')}</p>}
      <ul class="cards">
        {packs.map((pack) => (
          <li key={pack.id}>
            <button
              type="button"
              class="card"
              onClick={() => navigate({ name: 'editPack', pack: pack.id })}
            >
              <span class="card-title">{pack.pack.title[locale.value]}</span>
              <span class="card-progress">{countText(Object.keys(pack.levels).length)}</span>
            </button>
          </li>
        ))}
      </ul>
      <form
        class="new-profile"
        onSubmit={(event) => {
          event.preventDefault()
          void create()
        }}
      >
        <label>
          <span>{t('newPack')}</span>
          <input
            value={title}
            maxLength={60}
            placeholder={t('packTitle')}
            onInput={(event) => setTitle(event.currentTarget.value)}
          />
        </label>
        <button type="submit">{t('create')}</button>
      </form>
      <FileButton label={t('importPack')} onFile={(file) => void importFile(file)} />
      {importFailed && <p role="alert">{t('importPackFailed')}</p>}
      {builtIn.length > 0 && <BuiltIn packs={builtIn} />}
    </section>
  )
}

function BuiltIn({ packs }: { readonly packs: readonly Pack[] }) {
  return (
    <>
      <h3>{t('builtInPacks')}</h3>
      <p class="hint">{t('builtInNote')}</p>
      <ul class="cards">
        {packs.map((pack) => (
          <li key={pack.id}>
            <button
              type="button"
              class="card"
              onClick={() => navigate({ name: 'editPack', pack: pack.id })}
            >
              <span class="card-title">{pack.file.title[locale.value]}</span>
              <span class="card-progress">{countText(levelsOf(pack).length)}</span>
            </button>
          </li>
        ))}
      </ul>
    </>
  )
}
