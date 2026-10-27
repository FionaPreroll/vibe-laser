import { useEffect, useRef, useState } from 'preact/hooks'
import { DEFAULT_COLUMNS, DEFAULT_ROWS } from '../core/grid'
import { t } from '../i18n'
import { type BoardView, mountBoard } from '../view/board'

/** Hosts the PixiJS canvas: the view mounts once and is destroyed with the component. */
export function BoardCanvas() {
  const host = useRef<HTMLDivElement>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    const element = host.current
    if (!element) return
    let view: BoardView | undefined
    let unmounted = false
    mountBoard(element, DEFAULT_COLUMNS, DEFAULT_ROWS).then(
      (mounted) => {
        if (unmounted) mounted.destroy()
        else view = mounted
      },
      (error: unknown) => {
        console.error('PixiJS could not start', error)
        if (!unmounted) setFailed(true)
      },
    )
    return () => {
      unmounted = true
      view?.destroy()
    }
  }, [])

  if (failed) return <p class="board-failed">{t('boardFailed')}</p>
  return (
    <div
      ref={host}
      class="board"
      role="img"
      aria-label={t('board', { columns: DEFAULT_COLUMNS, rows: DEFAULT_ROWS })}
    />
  )
}
