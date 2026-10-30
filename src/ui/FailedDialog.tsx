import { t } from '../i18n'
import { EndDialog } from './EndDialog'

/** Long enough to watch the last blast of the chain reaction fade. */
const DELAY_MS = 900

interface Props {
  readonly onRestart: () => void
  readonly onLevels: () => void
  /** What the second button says; the level selection unless the editor tests a level. */
  readonly leaveLabel?: string
}

/** Shown once an explosion chain has ended; only a fresh start helps. */
export function FailedDialog({ onRestart, onLevels, leaveLabel }: Props) {
  return (
    <EndDialog id="failed" role="alertdialog" title={t('failedTitle')} delayMs={DELAY_MS}>
      <p>{t('failedText')}</p>
      <div class="dialog-buttons">
        <button type="button" class="primary" onClick={onRestart}>
          {t('startAgain')}
        </button>
        <button type="button" onClick={onLevels}>
          {leaveLabel ?? t('levelSelection')}
        </button>
      </div>
    </EndDialog>
  )
}
