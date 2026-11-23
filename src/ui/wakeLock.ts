/** The parts of the Screen Wake Lock API the game uses. */
interface Sentinel {
  readonly released: boolean
  release(): Promise<void>
  addEventListener(type: 'release', listener: () => void): void
}

interface Locks {
  request(type: 'screen'): Promise<Sentinel>
}

/** Whether this browser can keep the screen on. */
export function canKeepAwake(nav: Navigator = navigator): boolean {
  return 'wakeLock' in nav
}

/**
 * Keeps the screen on while wanted. Browsers drop the lock when the page is hidden, so it is taken
 * again once the page shows. Browsers without the API, and refused requests, change nothing.
 */
export class ScreenAwake {
  readonly #locks: Locks | undefined
  readonly #doc: Document
  #wanted = false
  #sentinel: Sentinel | undefined
  #requesting = false

  constructor(nav: Navigator = navigator, doc: Document = document) {
    this.#locks = (nav as Navigator & { wakeLock?: Locks }).wakeLock
    this.#doc = doc
    doc.addEventListener('visibilitychange', this.#onVisibility)
  }

  get held(): boolean {
    return this.#sentinel !== undefined && !this.#sentinel.released
  }

  set(wanted: boolean): void {
    this.#wanted = wanted
    if (wanted) void this.#take()
    else this.#let()
  }

  dispose(): void {
    this.#doc.removeEventListener('visibilitychange', this.#onVisibility)
    this.set(false)
  }

  readonly #onVisibility = () => {
    if (this.#wanted && this.#doc.visibilityState === 'visible') void this.#take()
  }

  async #take(): Promise<void> {
    if (this.#locks === undefined || this.held || this.#requesting) return
    if (this.#doc.visibilityState !== 'visible') return
    this.#requesting = true
    try {
      const sentinel = await this.#locks.request('screen')
      sentinel.addEventListener('release', () => {
        if (this.#sentinel === sentinel) this.#sentinel = undefined
      })
      this.#sentinel = sentinel
      // Unwanted while the request ran, as when the player left the level at once.
      if (!this.#wanted) this.#let()
    } catch {
      // Refused, as on low battery: the screen dims as usual.
    } finally {
      this.#requesting = false
    }
  }

  #let(): void {
    const sentinel = this.#sentinel
    this.#sentinel = undefined
    if (sentinel !== undefined && !sentinel.released) void sentinel.release().catch(() => {})
  }
}
