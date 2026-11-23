// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { canKeepAwake, ScreenAwake } from './wakeLock'

/** A stand-in for navigator.wakeLock whose locks the test can drop, as browsers do. */
function fakeLocks(refuse = false) {
  const held: { released: boolean; release: () => Promise<void>; drop: () => void }[] = []
  const request = vi.fn(async () => {
    if (refuse) throw new DOMException('Not allowed', 'NotAllowedError')
    const listeners: (() => void)[] = []
    const sentinel = {
      released: false,
      addEventListener: (_: 'release', listener: () => void) => void listeners.push(listener),
      release: async () => sentinel.drop(),
      drop: () => {
        if (sentinel.released) return
        sentinel.released = true
        for (const listener of listeners) listener()
      },
    }
    held.push(sentinel)
    return sentinel
  })
  return { nav: { wakeLock: { request } } as unknown as Navigator, request, held }
}

let visibility: DocumentVisibilityState = 'visible'
Object.defineProperty(document, 'visibilityState', { get: () => visibility, configurable: true })

afterEach(() => {
  visibility = 'visible'
})

const settle = () => new Promise((resolve) => setTimeout(resolve, 0))

describe('ScreenAwake', () => {
  it('knows whether the browser can keep the screen on', () => {
    expect(canKeepAwake({} as Navigator)).toBe(false)
    expect(canKeepAwake(fakeLocks().nav)).toBe(true)
  })

  it('holds a lock while wanted and lets it go after', async () => {
    const { nav, request, held } = fakeLocks()
    const awake = new ScreenAwake(nav, document)
    awake.set(true)
    awake.set(true)
    await settle()
    expect(request).toHaveBeenCalledOnce()
    expect(awake.held).toBe(true)
    awake.set(false)
    expect(awake.held).toBe(false)
    expect(held[0]?.released).toBe(true)
    awake.dispose()
  })

  it('takes the lock again when the page shows after the browser dropped it', async () => {
    const { nav, request, held } = fakeLocks()
    const awake = new ScreenAwake(nav, document)
    awake.set(true)
    await settle()
    visibility = 'hidden'
    held[0]?.drop()
    document.dispatchEvent(new Event('visibilitychange'))
    await settle()
    expect(awake.held).toBe(false)
    expect(request).toHaveBeenCalledOnce()
    visibility = 'visible'
    document.dispatchEvent(new Event('visibilitychange'))
    await settle()
    expect(request).toHaveBeenCalledTimes(2)
    expect(awake.held).toBe(true)
    awake.dispose()
    document.dispatchEvent(new Event('visibilitychange'))
    await settle()
    expect(request).toHaveBeenCalledTimes(2)
  })

  it('lets a lock go that arrives after it stopped being wanted', async () => {
    const { nav, held } = fakeLocks()
    const awake = new ScreenAwake(nav, document)
    awake.set(true)
    awake.set(false)
    await settle()
    expect(held[0]?.released).toBe(true)
    expect(awake.held).toBe(false)
  })

  it('does nothing where browsers refuse or lack the lock', async () => {
    const refused = fakeLocks(true)
    const awake = new ScreenAwake(refused.nav, document)
    awake.set(true)
    await settle()
    expect(awake.held).toBe(false)
    const none = new ScreenAwake({} as Navigator, document)
    none.set(true)
    await settle()
    expect(none.held).toBe(false)
  })
})
