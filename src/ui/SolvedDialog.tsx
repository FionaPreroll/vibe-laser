import { useEffect, useRef } from 'preact/hooks'
import { t } from '../i18n'
import { useAfter } from './pause'

/** Long enough to watch the coins spin before the board goes behind the dialog. */
export const SOLVED_PAUSE_MS = 1500

interface Props {
  /** Absent once every level of the pack is solved. */
  readonly onNext: (() => void) | undefined
  readonly onLevels: () => void
  readonly onReplay: () => void
  /** Instead of the usual text and the way back to the level selection. */
  readonly text?: string
  readonly levelsLabel?: string
}

/** Shown a moment after every coin spins; the board stays locked behind it. */
export function SolvedDialog({ onNext, onLevels, onReplay, text, levelsLabel }: Props) {
  const first = useRef<HTMLButtonElement>(null)
  const shown = useAfter(SOLVED_PAUSE_MS)
  useEffect(() => {
    if (shown) first.current?.focus()
  }, [shown])

  if (!shown) return null
  return (
    <div class="dialog-backdrop">
      <div class="dialog" role="dialog" aria-modal="true" aria-labelledby="solved-title">
        <h2 id="solved-title">{t('solvedTitle')}</h2>
        <p>{text ?? (onNext ? t('solvedText') : t('packSolved'))}</p>
        <div class="dialog-buttons">
          {onNext && (
            <button type="button" class="primary" ref={first} onClick={onNext}>
              {t('nextUnsolved')}
            </button>
          )}
          <button type="button" ref={onNext ? undefined : first} onClick={onLevels}>
            {levelsLabel ?? t('levelSelection')}
          </button>
          <button type="button" onClick={onReplay}>
            {t('playAgain')}
          </button>
        </div>
      </div>
    </div>
  )
}
