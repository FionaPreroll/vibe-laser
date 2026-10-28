import { useEffect, useRef } from 'preact/hooks'
import { t } from '../i18n'

interface Props {
  /** Absent once every level of the pack is solved. */
  readonly onNext: (() => void) | undefined
  readonly onLevels: () => void
  readonly onReplay: () => void
}

/** Shown once every coin spins; the board stays locked behind it. */
export function SolvedDialog({ onNext, onLevels, onReplay }: Props) {
  const first = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    first.current?.focus()
  }, [])

  return (
    <div class="dialog-backdrop">
      <div class="dialog" role="dialog" aria-modal="true" aria-labelledby="solved-title">
        <h2 id="solved-title">{t('solvedTitle')}</h2>
        <p>{onNext ? t('solvedText') : t('packSolved')}</p>
        <div class="dialog-buttons">
          {onNext && (
            <button type="button" class="primary" ref={first} onClick={onNext}>
              {t('nextUnsolved')}
            </button>
          )}
          <button type="button" ref={onNext ? undefined : first} onClick={onLevels}>
            {t('levelSelection')}
          </button>
          <button type="button" onClick={onReplay}>
            {t('playAgain')}
          </button>
        </div>
      </div>
    </div>
  )
}
