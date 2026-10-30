import { useState } from 'preact/hooks'
import { t } from '../i18n'

const SEEN_KEY = 'vibe-laser.seenIntros'

/** Levels whose intro this browser has shown in full; a convenience, so failures only forget. */
function seenIntros(): Set<string> {
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(SEEN_KEY) ?? '[]')
    return new Set(Array.isArray(stored) ? stored.filter((id) => typeof id === 'string') : [])
  } catch {
    return new Set()
  }
}

function markSeen(id: string): void {
  try {
    const seen = seenIntros()
    if (seen.has(id)) return
    seen.add(id)
    localStorage.setItem(SEEN_KEY, JSON.stringify([...seen]))
  } catch {
    // Without storage the intro simply opens in full again next time.
  }
}

interface Props {
  readonly text: string
  /** The level, to open its intro in full only the first time; without one it always opens. */
  readonly id?: string
}

/**
 * What a level tells players before they start. Read once, it shrinks to one line the next time,
 * to leave the board more room, and a button opens it again.
 */
export function LevelIntro({ text, id }: Props) {
  const [open, setOpen] = useState(() => {
    const first = id === undefined || !seenIntros().has(id)
    if (id !== undefined) markSeen(id)
    return first
  })
  return (
    <div class={open ? 'level-intro' : 'level-intro collapsed'}>
      <p class="intro-text">{text}</p>
      <button
        type="button"
        class="link intro-toggle"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        {t(open ? 'introLess' : 'introMore')}
      </button>
    </div>
  )
}
