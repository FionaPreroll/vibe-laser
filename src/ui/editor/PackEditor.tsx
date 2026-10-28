import { useEffect, useState } from 'preact/hooks'
import { SLOTS } from '../../content/packs'
import { type LevelFile, type Names, type PackFile, packSchema } from '../../content/schema'
import { locale, names, t } from '../../i18n'
import type { PackShelf } from '../../persistence/packs'
import { slotOf } from '../../persistence/packs'
import { downloadFile, fileName } from '../download'
import { navigate } from '../router'
import { Missing } from '../screens/SkillsScreen'
import { type PackSource, sourceOf } from './sources'

interface Props {
  readonly pack: string
  readonly shelf: PackShelf
}

/** A pack in the editor: its settings, its skills with 30 slots each, export and delete. */
export function PackEditor({ pack: id, shelf }: Props) {
  // Reading the shelf here re-renders the screen whenever the player's packs change.
  const custom = shelf.find(id)
  const source = sourceOf(id, shelf)
  const [skill, setSkill] = useState(1)
  const [levels, setLevels] = useState<ReadonlyMap<string, LevelFile>>()
  useEffect(() => {
    let current = true
    source?.levels().then(
      (loaded) => current && setLevels(loaded),
      (error: unknown) => console.error('The levels of this pack could not be loaded', error),
    )
    return () => {
      current = false
    }
  }, [custom ?? id])

  if (source === undefined) return <Missing />
  const shown = Math.min(skill, source.file.skills.length)
  return (
    <section class="screen pack-editor" aria-labelledby="pack-editor-title">
      <button type="button" class="back" onClick={() => navigate({ name: 'editor' })}>
        {t('back')}
      </button>
      <h2 id="pack-editor-title">{source.file.title[locale.value]}</h2>
      <fieldset class="tabs">
        <legend class="visually-hidden">{t('skillsLabel')}</legend>
        {source.file.skills.map((name, index) => (
          <button
            key={index}
            type="button"
            aria-pressed={index + 1 === shown}
            onClick={() => setSkill(index + 1)}
          >
            {t('skillTab', { number: index + 1, name: name[locale.value] })}
          </button>
        ))}
      </fieldset>
      {levels === undefined ? (
        <p class="hint">{t('loading')}</p>
      ) : (
        <ol class="levels slots">
          {Array.from({ length: SLOTS }, (_, index) => {
            const number = index + 1
            const level = levels.get(slotOf(shown, number))
            return (
              <li key={number}>
                <button
                  type="button"
                  class={level ? 'level' : 'level empty'}
                  onClick={() =>
                    navigate({ name: 'editLevel', pack: source.id, skill: shown, slot: number })
                  }
                >
                  {level
                    ? t('levelLabel', { number, name: level.name[locale.value] })
                    : t('emptySlot', { number })}
                </button>
              </li>
            )
          })}
        </ol>
      )}
      <PackSettings key={source.id} source={source} levels={levels} />
      {!source.builtIn && (
        <div class="dialog-buttons pack-actions">
          <button
            type="button"
            onClick={() =>
              downloadFile(
                `${fileName(source.file.title.en)}.vlpack.json`,
                shelf.exportPack(source.id),
              )
            }
          >
            {t('exportPack')}
          </button>
          <button
            type="button"
            onClick={() => {
              if (!confirm(t('confirmDeletePack', { name: source.file.title[locale.value] })))
                return
              void shelf.remove(source.id)
              navigate({ name: 'editor' })
            }}
          >
            {t('deletePack')}
          </button>
        </div>
      )}
    </section>
  )
}

interface SettingsProps {
  readonly source: PackSource
  readonly levels: ReadonlyMap<string, LevelFile> | undefined
}

/** Title, description and skills of a pack, saved together. */
function PackSettings({ source, levels }: SettingsProps) {
  const [file, setFile] = useState<PackFile>(source.file)
  const [status, setStatus] = useState<'idle' | 'saved' | 'invalid' | 'failed'>('idle')
  const change = (next: PackFile) => {
    setFile(next)
    setStatus('idle')
  }
  const setName = (names: Names, locale: 'en' | 'de', value: string): Names => ({
    ...names,
    [locale]: value,
  })
  const description = file.description ?? { en: '', de: '' }
  const setDescription = (locale: 'en' | 'de', value: string) => {
    const next = setName(description, locale, value)
    const { description: _, ...rest } = file
    change(next.en === '' && next.de === '' ? rest : { ...rest, description: next })
  }
  const removeSkill = () => {
    const last = file.skills.length
    const used = [...(levels?.keys() ?? [])].some((key) => key.startsWith(`${last}/`))
    if (used && !confirm(t('confirmRemoveSkill', { number: last }))) return
    change({ ...file, skills: file.skills.slice(0, -1) })
  }
  const save = async () => {
    const parsed = packSchema.safeParse(file)
    if (!parsed.success) {
      setStatus('invalid')
      return
    }
    try {
      await source.savePack(parsed.data)
      setStatus('saved')
    } catch (error) {
      console.error(error)
      setStatus('failed')
    }
  }

  return (
    <form
      class="pack-settings"
      onSubmit={(event) => {
        event.preventDefault()
        void save()
      }}
    >
      <h3>{t('packSettings')}</h3>
      <div class="field-pair">
        <TextField
          label={t('titleEn')}
          value={file.title.en}
          onInput={(value) => change({ ...file, title: setName(file.title, 'en', value) })}
        />
        <TextField
          label={t('titleDe')}
          value={file.title.de}
          onInput={(value) => change({ ...file, title: setName(file.title, 'de', value) })}
        />
      </div>
      <div class="field-pair">
        <TextField
          label={t('descriptionEn')}
          value={description.en}
          onInput={(value) => setDescription('en', value)}
        />
        <TextField
          label={t('descriptionDe')}
          value={description.de}
          onInput={(value) => setDescription('de', value)}
        />
      </div>
      {file.skills.map((skill, index) => {
        const setSkill = (locale: 'en' | 'de', value: string) =>
          change({
            ...file,
            skills: file.skills.map((each, at) =>
              at === index ? setName(each, locale, value) : each,
            ),
          })
        return (
          <div class="field-pair" key={index}>
            <TextField
              label={t('skillNameEn', { number: index + 1 })}
              value={skill.en}
              onInput={(value) => setSkill('en', value)}
            />
            <TextField
              label={t('skillNameDe', { number: index + 1 })}
              value={skill.de}
              onInput={(value) => setSkill('de', value)}
            />
          </div>
        )
      })}
      <div class="dialog-buttons">
        <button
          type="button"
          disabled={file.skills.length >= 4}
          onClick={() => change({ ...file, skills: [...file.skills, names('defaultSkill')] })}
        >
          {t('addSkill')}
        </button>
        <button type="button" disabled={file.skills.length <= 1} onClick={removeSkill}>
          {t('removeSkill')}
        </button>
      </div>
      <label class="check">
        <input
          type="checkbox"
          checked={file.selectSkill}
          onChange={(event) => change({ ...file, selectSkill: event.currentTarget.checked })}
        />
        <span>{t('selectSkillLabel')}</span>
      </label>
      <div class="dialog-buttons">
        <button type="submit" class="primary">
          {t('savePack')}
        </button>
        <span class="status" role="status">
          {status === 'saved' && t('saved')}
          {status === 'invalid' && t('namesNeeded')}
          {status === 'failed' && t('savingFailed')}
        </span>
      </div>
    </form>
  )
}

interface FieldProps {
  readonly label: string
  readonly value: string
  readonly onInput: (value: string) => void
}

function TextField({ label, value, onInput }: FieldProps) {
  return (
    <label class="field">
      <span>{label}</span>
      <input
        type="text"
        value={value}
        maxLength={60}
        onInput={(event) => onInput(event.currentTarget.value)}
      />
    </label>
  )
}
