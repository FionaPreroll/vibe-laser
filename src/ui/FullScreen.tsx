import { signal } from '@preact/signals'
import { useEffect } from 'preact/hooks'
import { t } from '../i18n'
import { touchScreen } from './pointer'

/** Whether the game fills the whole screen, without the browser's bars. */
const fullScreen = signal(false)

function canGoFullScreen(): boolean {
  return typeof document !== 'undefined' && document.fullscreenEnabled === true
}

/**
 * Fills the screen and, where the browser allows, holds it in landscape, as Chrome on Android
 * does in full screen. Elsewhere the turn notice asks the player to turn the phone.
 */
export async function enterFullScreen(): Promise<void> {
  if (!canGoFullScreen()) return
  try {
    await document.documentElement.requestFullscreen({ navigationUI: 'hide' })
    // Not in the DOM types everywhere yet, and refused outside full screen and on desktops.
    const orientation = screen.orientation as ScreenOrientation & {
      lock?: (orientation: 'landscape') => Promise<void>
    }
    await orientation.lock?.('landscape').catch(() => {})
  } catch (error) {
    console.warn('Full screen is not possible', error)
  }
}

function useFullScreenState(): boolean {
  useEffect(() => {
    const update = () => {
      fullScreen.value = document.fullscreenElement !== null
    }
    update()
    document.addEventListener('fullscreenchange', update)
    return () => document.removeEventListener('fullscreenchange', update)
  }, [])
  return fullScreen.value
}

/** In the header on touch screens: on a phone on its side, the browser's bars take a lot of room. */
export function FullScreenButton() {
  const on = useFullScreenState()
  if (!touchScreen.value || !canGoFullScreen()) return null
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={() => (on ? void document.exitFullscreen() : void enterFullScreen())}
    >
      {t(on ? 'leaveFullScreen' : 'fullScreen')}
    </button>
  )
}

/**
 * Covers the game on a phone held upright, which leaves the board too little room; CSS shows it
 * only then. Where full screen is possible, its button turns the game sideways on its own.
 */
export function TurnNotice() {
  return (
    <div class="turn-notice">
      <svg class="turn-phone" viewBox="0 0 64 64" aria-hidden="true">
        <rect x="22" y="8" width="20" height="36" rx="3" />
        <path d="M14 50 a20 20 0 0 0 36 0" />
        <path d="M46 44 l4 6 l-7 1" />
      </svg>
      <h2>{t('turnTitle')}</h2>
      <p>{t('turnText')}</p>
      {canGoFullScreen() && (
        <button type="button" class="primary" onClick={() => void enterFullScreen()}>
          {t('fullScreen')}
        </button>
      )}
    </div>
  )
}
