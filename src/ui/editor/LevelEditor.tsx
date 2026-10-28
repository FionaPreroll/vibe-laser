import { useEffect, useMemo, useRef, useState } from 'preact/hooks'
import type { Speaker } from '../../audio/director'
import { SLOTS } from '../../content/packs'
import { type LevelFile, levelSchema } from '../../content/schema'
import { EditorController } from '../../editor/controller'
import { locale, t } from '../../i18n'
import { type PackShelf, slotOf } from '../../persistence/packs'
import { downloadFile } from '../download'
import { FileButton } from '../FileButton'
import { navigate } from '../router'
import { Missing } from '../screens/SkillsScreen'
import { clipboard, drafts } from './clipboard'
import { EditorCanvas } from './EditorCanvas'
import {
  LevelPanel,
  PalettePanel,
  PiecePanel,
  ProblemsPanel,
  SolutionPanel,
  ToolPanel,
} from './panels'
import { type PackSource, sourceOf } from './sources'
import { TestRun } from './TestRun'

interface Props {
  readonly pack: string
  readonly skill: number
  readonly slot: number
  readonly shelf: PackShelf
  readonly speaker: Speaker
  /** Help or the settings are open over the editor. */
  readonly paused: boolean
  readonly onHelp: () => void
}

type Loaded = { readonly level: LevelFile | undefined } | { readonly failed: true }

/**
 * One slot of a pack in the editor, empty or holding a level. Each slot needs an editor of its
 * own, keyed by the slot, as the editor's undo history belongs to one level.
 */
export function LevelEditor({ pack: id, skill, slot, shelf, ...rest }: Props) {
  const source = sourceOf(id, shelf)
  const [loaded, setLoaded] = useState<Loaded>()
  useEffect(() => {
    let current = true
    sourceOf(id, shelf)
      ?.levels()
      .then(
        (levels) => current && setLoaded({ level: levels.get(slotOf(skill, slot)) }),
        (error: unknown) => {
          console.error('The level could not be loaded', error)
          if (current) setLoaded({ failed: true })
        },
      )
    return () => {
      current = false
    }
  }, [id, skill, slot, shelf])

  const inRange = skill <= (source?.file.skills.length ?? 0) && slot >= 1 && slot <= SLOTS
  if (source === undefined || !inRange) return <Missing />
  if (loaded === undefined) return <p class="screen">{t('loading')}</p>
  if (!('level' in loaded)) {
    return (
      <section class="screen">
        <p>{t('levelBroken')}</p>
      </section>
    )
  }
  return <Workbench source={source} skill={skill} slot={slot} saved={loaded.level} {...rest} />
}

interface WorkbenchProps extends Omit<Props, 'pack' | 'shelf'> {
  readonly source: PackSource
  /** The level saved in the slot, if there is one. */
  readonly saved: LevelFile | undefined
}

type Status = 'idle' | 'saved' | 'failed' | 'importFailed' | 'restored'

function Workbench({ source, skill, slot, saved, speaker, paused, onHelp }: WorkbenchProps) {
  const key = `${source.id}/${skill}/${slot}`
  const opened = useMemo(() => {
    const editor = new EditorController({ level: saved, packRules: source.file.rules })
    const draft = drafts.get(key)
    // Unsaved changes from an earlier visit come back as one step to undo.
    if (draft !== undefined) editor.replace(draft)
    return { editor, restored: draft !== undefined }
  }, [key, saved, source])
  const { editor } = opened
  const [testing, setTesting] = useState(false)
  const [exists, setExists] = useState(saved !== undefined)
  const [status, setStatus] = useState<Status>(opened.restored ? 'restored' : 'idle')
  const discard = useRef(false)
  const dirty = editor.dirty.value

  useEffect(
    () => () => {
      if (editor.dirty.value && !discard.current) drafts.set(key, editor.level.value)
      else drafts.delete(key)
    },
    [editor, key],
  )
  useEffect(() => {
    if (!dirty) return
    const warn = (event: BeforeUnloadEvent) => event.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  const toPack = () => navigate({ name: 'editPack', pack: source.id })
  const leave = () => {
    if (editor.dirty.value) {
      if (!confirm(t('confirmLeave'))) return
      discard.current = true
    }
    toPack()
  }
  const save = async () => {
    if (!editor.canSave.value) return
    try {
      await source.saveLevel(skill, slot, editor.finished())
      editor.markSaved()
      setExists(true)
      setStatus('saved')
    } catch (error) {
      console.error(error)
      setStatus('failed')
    }
  }
  const copied = clipboard.value
  const canSwap =
    copied !== undefined &&
    copied.pack === source.id &&
    (copied.skill !== skill || copied.slot !== slot) &&
    !dirty
  const swap = async () => {
    if (copied === undefined || !canSwap) return
    try {
      // The other slot as it is saved now, which may be newer than the copy.
      const there = (await source.levels()).get(slotOf(copied.skill, copied.slot))
      const here = exists ? editor.finished() : undefined
      if (there === undefined) await source.deleteLevel(skill, slot)
      else await source.saveLevel(skill, slot, there)
      if (here === undefined) await source.deleteLevel(copied.skill, copied.slot)
      else await source.saveLevel(copied.skill, copied.slot, here)
      clipboard.value = undefined
      if (there === undefined) {
        discard.current = true
        toPack()
        return
      }
      editor.replace(there)
      editor.markSaved()
      setStatus('saved')
    } catch (error) {
      console.error(error)
      setStatus('failed')
    }
  }
  const remove = async () => {
    if (!confirm(t('confirmDeleteLevel'))) return
    try {
      await source.deleteLevel(skill, slot)
      discard.current = true
      toPack()
    } catch (error) {
      console.error(error)
      setStatus('failed')
    }
  }
  const importFile = async (file: File) => {
    try {
      const parsed = levelSchema.safeParse(JSON.parse(await file.text()))
      if (!parsed.success) throw parsed.error
      editor.replace(parsed.data)
      setStatus('idle')
    } catch {
      setStatus('importFailed')
    }
  }

  const { geometry } = editor.scene.value
  const level = editor.level.value
  const skillName = source.file.skills[skill - 1]?.[locale.value] ?? ''
  const statusText = {
    idle: dirty ? t('unsaved') : '',
    saved: dirty ? t('unsaved') : t('saved'),
    failed: t('savingFailed'),
    importFailed: t('importLevelFailed'),
    restored: t('draftBack'),
  }[status]

  return (
    <div class="level-editor">
      <div class="editor-bar">
        <button type="button" onClick={leave}>
          {t('backToPack')}
        </button>
        <h2 class="level-heading">
          {t('levelSlot', {
            pack: source.file.title[locale.value],
            skill: skillName,
            number: slot,
          })}
        </h2>
        <span class="status" role="status">
          {statusText}
        </span>
      </div>
      <div class="editor-bar" role="toolbar" aria-label={t('actions')}>
        <button
          type="button"
          disabled={testing || !editor.canUndo.value}
          onClick={() => editor.undo()}
        >
          {t('undo')}
        </button>
        <button
          type="button"
          disabled={testing || !editor.canRedo.value}
          onClick={() => editor.redo()}
        >
          {t('redo')}
        </button>
        <button type="button" aria-pressed={testing} onClick={() => setTesting(!testing)}>
          {t('test')}
        </button>
        <button
          type="button"
          class="primary"
          disabled={testing || !editor.canSave.value}
          onClick={() => void save()}
        >
          {t('save')}
        </button>
        <button
          type="button"
          disabled={testing}
          onClick={() => {
            clipboard.value = { level: editor.finished(), pack: source.id, skill, slot }
          }}
        >
          {t('copyLevel')}
        </button>
        <button
          type="button"
          disabled={testing || copied === undefined}
          onClick={() => copied && editor.replace(copied.level)}
        >
          {t('pasteLevel')}
        </button>
        <button type="button" disabled={testing || !canSwap} onClick={() => void swap()}>
          {t('swapLevel')}
        </button>
        <button type="button" disabled={testing} onClick={() => editor.clear()}>
          {t('clearLevel')}
        </button>
        <button type="button" disabled={testing || !exists} onClick={() => void remove()}>
          {t('deleteLevel')}
        </button>
        <button
          type="button"
          disabled={testing || !editor.canSave.value}
          onClick={() =>
            downloadFile(
              `level_${String(slot).padStart(3, '0')}.json`,
              `${JSON.stringify(editor.finished(), null, 2)}\n`,
            )
          }
        >
          {t('exportLevel')}
        </button>
        <FileButton
          label={t('importLevel')}
          disabled={testing}
          onFile={(file) => void importFile(file)}
        />
      </div>
      {testing ? (
        <TestRun
          editor={editor}
          packRules={source.file.rules}
          speaker={speaker}
          paused={paused}
          onHelp={onHelp}
          onClose={() => setTesting(false)}
        />
      ) : (
        <div class="workbench">
          <div class="stage">
            <EditorCanvas
              key={`${geometry.columns}x${geometry.rows}x${geometry.toolboxSize}`}
              editor={editor}
              label={t('editorBoard', { columns: level.size[0], rows: level.size[1] })}
            />
            <p id="editor-hint" class="hint">
              {t('editorHint')}
            </p>
          </div>
          <aside class="editor-panels">
            <ToolPanel editor={editor} />
            <PalettePanel editor={editor} />
            <PiecePanel editor={editor} />
            <ProblemsPanel editor={editor} />
            <SolutionPanel editor={editor} />
            <LevelPanel editor={editor} />
          </aside>
        </div>
      )}
    </div>
  )
}
