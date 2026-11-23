import { effect, signal } from '@preact/signals'

/** The worker that tools/serviceWorker.ts writes next to index.html. */
const WORKER = './sw.js'
const HOUR = 60 * 60 * 1000

/**
 * A new version of the game that is installed and waits to take over: calling it lets the new
 * version in and reloads the page.
 */
export const pendingUpdate = signal<(() => void) | undefined>(undefined)

/**
 * Whether the player asked to hear of new versions while they play, from the settings. Off, a new
 * version comes in quietly the next time the game starts.
 */
export const watchUpdates = signal(false)

/**
 * Registers the service worker that keeps the game for offline play.
 *
 * - A version that is already waiting when the page loads takes over at once, before anything is
 *   played, so updates arrive at the latest with the next start.
 * - A version that arrives while the game runs waits, so it never swaps the game out under a level
 *   in progress. With `watchUpdates` on, a notice offers it, and the game looks for one every hour
 *   and whenever it comes back to the foreground, as installed apps do on phones.
 */
export async function registerServiceWorker(
  container: ServiceWorkerContainer | undefined = navigator.serviceWorker,
  reload: () => void = () => location.reload(),
  page?: Document,
): Promise<void> {
  if (container === undefined) return
  const shown = page ?? document
  let registration: ServiceWorkerRegistration
  try {
    registration = await container.register(WORKER)
  } catch (error) {
    console.warn('The game cannot be kept for offline play', error)
    return
  }
  // A worker that waits while another one serves the page is a new version. The very first one
  // takes over by itself.
  const takeOver = (waiting: ServiceWorker) => {
    container.addEventListener('controllerchange', () => reload(), { once: true })
    waiting.postMessage('skipWaiting')
  }
  const waitingVersion = () =>
    container.controller === null ? undefined : (registration.waiting ?? undefined)
  const early = waitingVersion()
  if (early !== undefined) {
    takeOver(early)
    return
  }
  const offer = () => {
    const waiting = waitingVersion()
    pendingUpdate.value =
      waiting !== undefined && watchUpdates.value ? () => takeOver(waiting) : undefined
  }
  registration.addEventListener('updatefound', () => {
    const installing = registration.installing
    installing?.addEventListener('statechange', () => {
      if (installing.state === 'installed') offer()
    })
  })
  const look = () => {
    if (!watchUpdates.value) return
    registration.update().catch(() => {
      // Offline or unreachable: the next look will do.
    })
  }
  setInterval(look, HOUR)
  shown.addEventListener('visibilitychange', () => {
    if (shown.visibilityState === 'visible') look()
  })
  // Switching the setting on looks right away and offers a version that already waits; switching
  // it off takes the notice away.
  effect(() => {
    offer()
    look()
  })
}
