import { useEffect, useRef, useState } from 'preact/hooks'
import { t } from '../i18n'
import { type BoardView, mountBoard } from '../view/board'
import type { BoardController } from '../view/controller'

interface Props {
  readonly controller: BoardController
  readonly label: string
}

/** Hosts the PixiJS canvas for one controller; the view mounts once and is destroyed with it. */
export function BoardCanvas({ controller, label }: Props) {
  const host = useRef<HTMLDivElement>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    const element = host.current
    if (!element) return
    let view: BoardView | undefined
    let unmounted = false
    mountBoard(element, controller).then(
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
  }, [controller])

  if (failed) return <p class="board-failed">{t('boardFailed')}</p>
  return (
    <div
      ref={host}
      class="board"
      role="application"
      aria-label={label}
      aria-describedby="controls-hint"
    />
  )
}
