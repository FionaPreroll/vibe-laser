import { useState } from 'preact/hooks'
import { t } from '../i18n'
import { exportBackup, parseBackup } from '../persistence/backup'
import type { PackShelf } from '../persistence/packs'
import type { ProfileBook } from '../persistence/profiles'
import { downloadFile } from './download'
import { FileButton } from './FileButton'

interface Props {
  readonly book: ProfileBook
  readonly shelf: PackShelf
  /** Asks before the backup replaces everything; window.confirm unless a test passes another. */
  readonly ask?: (question: string) => boolean
}

type Outcome = 'restored' | 'profileAdded' | 'failed' | undefined

/** The date of a day as in file names, 2026-11-23. */
function day(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/** Settings section that saves every profile and own pack to a file, and brings them back. */
export function SaveBackup({ book, shelf, ask = (question) => confirm(question) }: Props) {
  const [outcome, setOutcome] = useState<Outcome>()

  const download = () => {
    const now = new Date()
    downloadFile(`vibe-laser-backup-${day(now)}.json`, exportBackup(book, shelf, now))
  }

  const load = async (file: File) => {
    setOutcome(undefined)
    const text = await file.text()
    let backup: ReturnType<typeof parseBackup> | undefined
    try {
      backup = parseBackup(text)
    } catch {
      backup = undefined
    }
    if (backup === undefined) {
      // A single exported profile joins the others, as on the profiles screen.
      try {
        await book.importProfile(text)
        setOutcome('profileAdded')
      } catch {
        setOutcome('failed')
      }
      return
    }
    const question = t('confirmRestore', {
      profiles: backup.saves.profiles.length,
      packs: backup.packs.length,
    })
    if (!ask(question)) return
    await Promise.all([book.replace(backup.saves), shelf.replace(backup.packs)])
    setOutcome('restored')
  }

  return (
    <details class="bindings backup">
      <summary>{t('backupTitle')}</summary>
      <p class="hint">{t('backupHint')}</p>
      <div class="backup-buttons">
        <button type="button" onClick={download}>
          {t('exportBackup')}
        </button>
        <FileButton label={t('importBackup')} onFile={(file) => void load(file)} />
      </div>
      {outcome === 'restored' && <p role="status">{t('backupRestored')}</p>}
      {outcome === 'profileAdded' && <p role="status">{t('backupProfileAdded')}</p>}
      {outcome === 'failed' && <p role="alert">{t('backupFailed')}</p>}
    </details>
  )
}
