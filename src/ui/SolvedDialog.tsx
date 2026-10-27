import { useEffect, useRef } from 'preact/hooks'
import { t } from '../i18n'

interface Props {
  /** Absent after the last level. */
  readonly onNext: (() => void) | undefined
  readonly onReplay: () => void
}

/** Shown once every coin spins; the board stays locked behind it. */
export function SolvedDialog({ onNext, onReplay }: Props) {
  const first = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    first.current?.focus()
  }, [])

  return (
    <div class="dialog-backdrop">
      <div class="dialog" role="dialog" aria-modal="true" aria-labelledby="solved-title">
        <h2 id="solved-title">{t('solvedTitle')}</h2>
        <p>{onNext ? t('solvedText') : t('lastLevel')}</p>
        <div class="dialog-buttons">
          {onNext && (
            <button type="button" class="primary" ref={first} onClick={onNext}>
              {t('nextLevel')}
            </button>
          )}
          <button type="button" ref={onNext ? undefined : first} onClick={onReplay}>
            {t('playAgain')}
          </button>
        </div>
      </div>
    </div>
  )
}
