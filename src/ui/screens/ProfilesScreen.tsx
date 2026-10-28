import { useState } from 'preact/hooks'
import { t } from '../../i18n'
import type { Profile, ProfileBook } from '../../persistence/profiles'
import { navigate } from '../router'

/** Player profiles: who plays, a fresh profile, renaming, deleting, export and import. */
export function ProfilesScreen({ book }: { readonly book: ProfileBook }) {
  const [name, setName] = useState('')
  const [importFailed, setImportFailed] = useState(false)
  const { profiles, active } = book.data.value

  const importFile = async (file: File | undefined) => {
    if (file === undefined) return
    setImportFailed(false)
    try {
      await book.importProfile(await file.text())
    } catch {
      setImportFailed(true)
    }
  }

  return (
    <section class="screen" aria-labelledby="profiles-title">
      <button type="button" class="back" onClick={() => navigate({ name: 'packs' })}>
        {t('back')}
      </button>
      <h2 id="profiles-title">{t('profilesTitle')}</h2>
      <ul class="profiles">
        {profiles.map((profile) => (
          <ProfileRow
            key={profile.id}
            profile={profile}
            active={profile.id === active}
            book={book}
          />
        ))}
      </ul>
      <form
        class="new-profile"
        onSubmit={(event) => {
          event.preventDefault()
          if (name.trim() === '') return
          void book.create(name)
          setName('')
        }}
      >
        <label>
          <span>{t('newProfile')}</span>
          <input
            value={name}
            maxLength={40}
            placeholder={t('profileName')}
            onInput={(event) => setName(event.currentTarget.value)}
          />
        </label>
        <button type="submit">{t('create')}</button>
      </form>
      <label class="import">
        <span>{t('importProfile')}</span>
        <input
          type="file"
          accept="application/json,.json"
          onChange={(event) => {
            const input = event.currentTarget
            const file = input.files?.[0]
            // Cleared, so choosing the same file again still counts as a change.
            input.value = ''
            void importFile(file)
          }}
        />
      </label>
      {importFailed && <p role="alert">{t('importFailed')}</p>}
    </section>
  )
}

interface RowProps {
  readonly profile: Profile
  readonly active: boolean
  readonly book: ProfileBook
}

function ProfileRow({ profile, active, book }: RowProps) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(profile.name)

  const download = () => {
    const url = URL.createObjectURL(
      new Blob([book.exportProfile(profile.id)], { type: 'application/json' }),
    )
    const link = document.createElement('a')
    link.href = url
    link.download = `vibe-laser-${profile.name.replace(/[^\p{L}\p{N}]+/gu, '-')}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <li class={active ? 'profile active' : 'profile'}>
      {editing ? (
        <form
          onSubmit={(event) => {
            event.preventDefault()
            void book.rename(profile.id, name)
            setEditing(false)
          }}
        >
          <input
            aria-label={t('profileName')}
            value={name}
            maxLength={40}
            onInput={(event) => setName(event.currentTarget.value)}
          />
          <button type="submit">{t('save')}</button>
          <button type="button" onClick={() => setEditing(false)}>
            {t('cancel')}
          </button>
        </form>
      ) : (
        <>
          <span class="profile-name">{profile.name}</span>
          <span class="profile-info">
            {active ? `${t('playingNow')} · ` : ''}
            {profile.solved.length === 1
              ? t('solvedCountOne')
              : t('solvedCount', { count: profile.solved.length })}
          </span>
          <span class="profile-buttons">
            {!active && (
              <button type="button" onClick={() => void book.switchTo(profile.id)}>
                {t('playAs', { name: profile.name })}
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setName(profile.name)
                setEditing(true)
              }}
            >
              {t('rename')}
            </button>
            <button type="button" onClick={download}>
              {t('exportProfile')}
            </button>
            {book.data.value.profiles.length > 1 && (
              <button
                type="button"
                onClick={() => {
                  if (confirm(t('confirmRemove', { name: profile.name })))
                    void book.remove(profile.id)
                }}
              >
                {t('remove')}
              </button>
            )}
          </span>
        </>
      )}
    </li>
  )
}
