import { afterEach, describe, expect, it, vi } from 'vitest'
import { pendingUpdate, registerServiceWorker, watchUpdates } from './updates'

class FakeWorker extends EventTarget {
  state = 'installing'
  readonly postMessage = vi.fn()
}

class FakeRegistration extends EventTarget {
  waiting: FakeWorker | null = null
  installing: FakeWorker | null = null
  readonly update = vi.fn(async () => {})

  /** A new version arrives and installs, as browsers report it. */
  arrive(worker = new FakeWorker()): FakeWorker {
    this.installing = worker
    this.dispatchEvent(new Event('updatefound'))
    this.installing = null
    this.waiting = worker
    worker.state = 'installed'
    worker.dispatchEvent(new Event('statechange'))
    return worker
  }
}

/** A browser's service workers, with a page that an older worker serves or none. */
function browser(served: boolean) {
  const registration = new FakeRegistration()
  const container = Object.assign(new EventTarget(), {
    controller: served ? {} : null,
    register: vi.fn(async () => registration),
  })
  const reload = vi.fn()
  const page = Object.assign(new EventTarget(), { visibilityState: 'visible' })
  const start = () =>
    registerServiceWorker(
      container as unknown as ServiceWorkerContainer,
      reload,
      page as unknown as Document,
    )
  return { registration, container, reload, page, start }
}

afterEach(() => {
  pendingUpdate.value = undefined
  watchUpdates.value = false
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('registerServiceWorker', () => {
  it('does nothing in browsers without service workers', async () => {
    await registerServiceWorker(undefined)
    expect(pendingUpdate.value).toBeUndefined()
  })

  it('registers the worker, and lets the first version take over by itself', async () => {
    const { registration, container, start } = browser(false)
    await start()
    expect(container.register).toHaveBeenCalledWith('./sw.js')
    registration.arrive()
    expect(pendingUpdate.value).toBeUndefined()
  })

  it('offers a new version while playing, and reloads once it has taken over', async () => {
    watchUpdates.value = true
    const { registration, container, reload, start } = browser(true)
    await start()
    const worker = registration.arrive()
    pendingUpdate.value?.()
    expect(worker.postMessage).toHaveBeenCalledWith('skipWaiting')
    expect(reload).not.toHaveBeenCalled()
    container.dispatchEvent(new Event('controllerchange'))
    container.dispatchEvent(new Event('controllerchange'))
    expect(reload).toHaveBeenCalledOnce()
  })

  it('keeps a new version quiet until the next start unless the player asked to hear of it', async () => {
    const { registration, start } = browser(true)
    await start()
    const worker = registration.arrive()
    expect(pendingUpdate.value).toBeUndefined()
    expect(worker.postMessage).not.toHaveBeenCalled()
    watchUpdates.value = true
    pendingUpdate.value?.()
    expect(worker.postMessage).toHaveBeenCalledWith('skipWaiting')
    watchUpdates.value = false
    expect(pendingUpdate.value).toBeUndefined()
  })

  it('lets a version that was already waiting take over as the page loads', async () => {
    const { registration, container, reload, start } = browser(true)
    const worker = new FakeWorker()
    registration.waiting = worker
    await start()
    expect(worker.postMessage).toHaveBeenCalledWith('skipWaiting')
    container.dispatchEvent(new Event('controllerchange'))
    expect(reload).toHaveBeenCalledOnce()
    expect(pendingUpdate.value).toBeUndefined()
  })

  it('carries on without offline play when the worker cannot register', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { container, start } = browser(false)
    container.register.mockRejectedValueOnce(new Error('blocked'))
    await start()
    expect(warn).toHaveBeenCalledOnce()
  })

  it('looks for a new version only when asked, then every hour, even when that fails', async () => {
    vi.useFakeTimers()
    const { registration, start } = browser(true)
    await start()
    await vi.advanceTimersByTimeAsync(60 * 60 * 1000)
    expect(registration.update).not.toHaveBeenCalled()
    registration.update.mockRejectedValueOnce(new Error('offline'))
    watchUpdates.value = true
    expect(registration.update).toHaveBeenCalledOnce()
    await vi.advanceTimersByTimeAsync(60 * 60 * 1000)
    expect(registration.update).toHaveBeenCalledTimes(2)
  })

  it('looks for a new version when the game comes back to the screen', async () => {
    watchUpdates.value = true
    const { registration, page, start } = browser(true)
    await start()
    registration.update.mockClear()
    page.visibilityState = 'hidden'
    page.dispatchEvent(new Event('visibilitychange'))
    expect(registration.update).not.toHaveBeenCalled()
    page.visibilityState = 'visible'
    page.dispatchEvent(new Event('visibilitychange'))
    expect(registration.update).toHaveBeenCalledOnce()
  })
})
