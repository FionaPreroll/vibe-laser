import type { ComponentChildren } from 'preact'
import { useEffect, useRef } from 'preact/hooks'
import { t } from '../i18n'

interface Props {
  readonly id: string
  readonly title: string
  readonly onClose: () => void
  readonly children: ComponentChildren
}

/**
 * A dialog over the current screen, such as help or the settings; Escape closes it. The focus
 * moves into it when it opens and returns to where it was when it closes.
 */
export function Modal({ id, title, onClose, children }: Props) {
  const close = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    const opener = document.activeElement
    close.current?.focus()
    return () => {
      if (opener instanceof HTMLElement) opener.focus()
    }
  }, [])
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div class="modal-backdrop">
      <div class="modal" role="dialog" aria-modal="true" aria-labelledby={`${id}-title`}>
        <header class="modal-header">
          <h2 id={`${id}-title`}>{title}</h2>
          <button type="button" ref={close} onClick={onClose}>
            {t('close')}
          </button>
        </header>
        <div class="modal-body">{children}</div>
      </div>
    </div>
  )
}
