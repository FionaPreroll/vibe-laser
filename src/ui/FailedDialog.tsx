import { useEffect, useRef } from 'preact/hooks'
import { t } from '../i18n'
import { useAfter } from './pause'

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
  const button = useRef<HTMLButtonElement>(null)
  const shown = useAfter(DELAY_MS)
  useEffect(() => {
    if (shown) button.current?.focus()
  }, [shown])

  if (!shown) return null
  return (
    <div class="dialog-backdrop">
      <div class="dialog" role="alertdialog" aria-modal="true" aria-labelledby="failed-title">
        <h2 id="failed-title">{t('failedTitle')}</h2>
        <p>{t('failedText')}</p>
        <div class="dialog-buttons">
          <button type="button" class="primary" ref={button} onClick={onRestart}>
            {t('startAgain')}
          </button>
          <button type="button" onClick={onLevels}>
            {leaveLabel ?? t('levelSelection')}
          </button>
        </div>
      </div>
    </div>
  )
}
