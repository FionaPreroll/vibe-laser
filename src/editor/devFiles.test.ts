import { afterEach, describe, expect, it, vi } from 'vitest'
import type { LevelFile } from '../content/schema'
import { DEV_FILES, deleteLevelFile, ENDPOINT, saveLevelFile, savePackFile } from './devFiles'

afterEach(() => {
  vi.unstubAllGlobals()
})

const LEVEL = { version: 1 } as LevelFile

describe('devFiles', () => {
  it('is on while Vite serves in development, as in tests', () => {
    expect(DEV_FILES).toBe(true)
  })

  it('sends levels and pack settings as JSON to the dev server', async () => {
    const fetch = vi.fn(
      async (_url: string, _init: RequestInit) => new Response(null, { status: 204 }),
    )
    vi.stubGlobal('fetch', fetch)
    await saveLevelFile('tutorial', 2, 5, LEVEL)
    await deleteLevelFile('tutorial', 2, 5)
    await savePackFile('tutorial', {
      version: 1,
      title: { en: 'T', de: 'T' },
      position: 1,
      skills: [],
    })
    expect(fetch.mock.calls.map(([url, init]) => [url, init.method])).toEqual([
      [`${ENDPOINT}/tutorial/2/5`, 'PUT'],
      [`${ENDPOINT}/tutorial/2/5`, 'DELETE'],
      [`${ENDPOINT}/tutorial`, 'PUT'],
    ])
    const first = fetch.mock.calls[0]?.[1]
    expect(first?.body).toBe(JSON.stringify(LEVEL))
    expect(first?.headers).toEqual({ 'Content-Type': 'application/json' })
  })

  it('reports what the dev server refused', async () => {
    vi.stubGlobal('fetch', async () => new Response('objects: no coin', { status: 422 }))
    await expect(saveLevelFile('tutorial', 1, 1, LEVEL)).rejects.toThrow(
      'The development server refused: 422 objects: no coin',
    )
  })
})
