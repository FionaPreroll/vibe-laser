import type { ComponentChildren } from 'preact'
import { useEffect, useRef } from 'preact/hooks'
import { t } from '../i18n'

interface Props {
  readonly id: string
  readonly title: string
  readonly onClose: () => void
  readonly children: ComponentChildren
}

/** A dialog over the current screen, such as help or the settings; Escape closes it. */
export function Modal({ id, title, onClose, children }: Props) {
  const close = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    close.current?.focus()
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
