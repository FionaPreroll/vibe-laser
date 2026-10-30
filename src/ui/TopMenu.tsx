import type { ComponentChildren } from 'preact'
import { useEffect, useRef, useState } from 'preact/hooks'
import { t } from '../i18n'
import { Icon } from './icons'

/**
 * The header's buttons. Where they do not fit, as on a phone, CSS hides them behind a menu button
 * and shows them as a list when it is open. A choice, a click outside or Escape closes the list.
 */
export function TopMenu({ children }: { readonly children: ComponentChildren }) {
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const nav = useRef<HTMLElement>(null)
  useEffect(() => {
    // A button chosen, by click or key, closes the list; the language list stays for its choice.
    const onClick = (event: MouseEvent) => {
      if (event.target instanceof Element && event.target.closest('button')) setOpen(false)
    }
    const element = nav.current
    element?.addEventListener('click', onClick)
    return () => element?.removeEventListener('click', onClick)
  }, [])
  useEffect(() => {
    if (!open) return
    const onPointer = (event: PointerEvent) => {
      if (!(event.target instanceof Node && root.current?.contains(event.target))) setOpen(false)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointer)
    window.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      window.removeEventListener('keydown', onKey)
    }
  }, [open])
  return (
    <div class="top-menu" ref={root}>
      <button
        type="button"
        class="menu-toggle"
        aria-expanded={open}
        aria-controls="top-controls"
        onClick={() => setOpen(!open)}
      >
        <Icon name="menu" />
        <span>{t('menu')}</span>
      </button>
      <nav id="top-controls" class={open ? 'top-controls open' : 'top-controls'} ref={nav}>
        {children}
      </nav>
    </div>
  )
}
