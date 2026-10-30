import type { ComponentChildren } from 'preact'
import { useEffect, useRef, useState } from 'preact/hooks'
import { t } from '../i18n'
import { useBackdropDismiss } from './backdrop'
import { useAfter } from './pause'

interface Props {
  readonly id: string
  /** `alertdialog` for news the player must not miss, such as an explosion. */
  readonly role?: 'dialog' | 'alertdialog'
  readonly title: string
  /** How long the board stays in view before the dialog appears. */
  readonly delayMs: number
  readonly children: ComponentChildren
}

/**
 * The dialog at the end of a level, low on the screen, with its first button focused. Escape or a
 * click on the backdrop puts it aside, so the player can look at the board; a small button brings
 * it back, since the board stays locked.
 */
export function EndDialog({ id, role = 'dialog', title, delayMs, children }: Props) {
  const shown = useAfter(delayMs)
  const [aside, setAside] = useState(false)
  const dialog = useRef<HTMLDivElement>(null)
  const reopen = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (!shown) return
    if (aside) reopen.current?.focus()
    else dialog.current?.querySelector('button')?.focus()
  }, [shown, aside])
  useEffect(() => {
    if (!shown || aside) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setAside(true)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [shown, aside])
  const backdrop = useBackdropDismiss(() => setAside(true))

  if (!shown) return null
  if (aside) {
    return (
      <button type="button" class="primary end-reopen" ref={reopen} onClick={() => setAside(false)}>
        {t('showResult', { title })}
      </button>
    )
  }
  const label = `${id}-title`
  const content = (
    <>
      <h2 id={label}>{title}</h2>
      {children}
    </>
  )
  return (
    <div class="dialog-backdrop" {...backdrop}>
      {role === 'alertdialog' ? (
        <div
          class="dialog"
          ref={dialog}
          role="alertdialog"
          aria-modal="true"
          aria-labelledby={label}
        >
          {content}
        </div>
      ) : (
        <div class="dialog" ref={dialog} role="dialog" aria-modal="true" aria-labelledby={label}>
          {content}
        </div>
      )}
    </div>
  )
}
