import { useCallback, useEffect, useRef, useState } from 'preact/hooks'
import { t } from '../i18n'
import type { BoardView } from '../view/board'
import type { BoardController } from '../view/controller'

interface HostProps {
  /** Puts a board into the host; it is destroyed when the host goes or `mount` changes. */
  readonly mount: (host: HTMLElement) => Promise<BoardView>
  readonly label: string
  /** The id of the text that explains the controls. */
  readonly describedBy: string
}

/** Hosts a PixiJS board in an element the keyboard can focus. */
export function CanvasHost({ mount, label, describedBy }: HostProps) {
  const host = useRef<HTMLDivElement>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    const element = host.current
    if (!element) return
    let view: BoardView | undefined
    let unmounted = false
    mount(element).then(
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
  }, [mount])

  if (failed) return <p class="board-failed">{t('boardFailed')}</p>
  return (
    <div
      ref={host}
      class="board"
      role="application"
      aria-label={label}
      aria-describedby={describedBy}
    />
  )
}

interface Props {
  readonly controller: BoardController
  readonly label: string
}

/**
 * The game's board for one controller; the view mounts once and is destroyed with it. The board
 * and PixiJS load with the first level, so the menus before it come up without them.
 */
export function BoardCanvas({ controller, label }: Props) {
  const mount = useCallback(
    async (element: HTMLElement) => (await import('../view/board')).mountBoard(element, controller),
    [controller],
  )
  return <CanvasHost mount={mount} label={label} describedBy="controls-hint" />
}
