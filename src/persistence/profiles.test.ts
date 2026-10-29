import { describe, expect, it, vi } from 'vitest'
import { DEFAULT_SETTINGS, migrate, ProfileBook } from './profiles'
import { type KeyValueStore, memoryStore } from './store'

function ids() {
  let next = 0
  return () => `id-${++next}`
}

async function open(store: KeyValueStore = memoryStore(), persist = vi.fn(async () => true)) {
  const book = await ProfileBook.open(store, { name: 'Player', persist, newId: ids() })
  return { book, store, persist }
}

describe('ProfileBook', () => {
  it('starts with one profile and saves it', async () => {
    const { book, store } = await open()
    expect(book.active.value).toEqual({
      id: 'id-1',
      name: 'Player',
      solved: [],
      settings: DEFAULT_SETTINGS,
    })
    expect(await store.get('save')).toEqual(book.data.value)
  })

  it('takes the settings for new profiles from the options', async () => {
    const book = await ProfileBook.open(memoryStore(), {
      name: 'Spieler',
      settings: { reducedMotion: true },
    })
    expect(book.active.value.settings.reducedMotion).toBe(true)
    expect(book.active.value.name).toBe('Spieler')
  })

  it('reads its saves back', async () => {
    const { book, store } = await open()
    await book.markSolved('tutorial/1/1')
    const again = await ProfileBook.open(store, { name: 'Player' })
    expect(again.solved.value).toEqual(new Set(['tutorial/1/1']))
  })

  it('reads saves from before color-blind mode with the mode switched off', async () => {
    const settings = { soundVolume: 0.2, musicVolume: 0.1, reducedMotion: true }
    const profile = { id: 'fiona', name: 'Fiona', solved: [], settings }
    const { book } = await open(
      memoryStore({ save: { version: 1, active: 'fiona', profiles: [profile] } }),
    )
    expect(book.active.value.settings).toEqual({ ...settings, colorBlind: false, art: 'pack' })
  })

  it('starts afresh when the saves cannot be read', async () => {
    const { book } = await open(memoryStore({ save: { version: 7, junk: true } }))
    expect(book.data.value.profiles).toHaveLength(1)
    expect(migrate({ version: 1, active: 'gone', profiles: [book.active.value] })).toBeUndefined()
  })

  it('marks levels solved once and asks the browser to keep the saves after the first', async () => {
    const { book, persist } = await open()
    await book.markSolved('tutorial/1/1')
    await book.markSolved('tutorial/1/1')
    await book.markSolved('tutorial/1/2')
    expect(book.active.value.solved).toEqual(['tutorial/1/1', 'tutorial/1/2'])
    expect(persist).toHaveBeenCalledOnce()
  })

  it('changes settings', async () => {
    const { book, store } = await open()
    await book.updateSettings({ musicVolume: 0 })
    expect(book.active.value.settings).toEqual({ ...DEFAULT_SETTINGS, musicVolume: 0 })
    expect(migrate(await store.get('save'))?.profiles[0]?.settings.musicVolume).toBe(0)
  })

  it('keeps separate progress per profile', async () => {
    const { book } = await open()
    await book.markSolved('tutorial/1/1')
    const second = await book.create('Fiona')
    expect(book.active.value.id).toBe(second.id)
    expect(book.solved.value.size).toBe(0)
    await book.switchTo('id-1')
    expect(book.solved.value.has('tutorial/1/1')).toBe(true)
    await book.switchTo('nobody')
    expect(book.active.value.id).toBe('id-1')
  })

  it('gives profiles names of their own', async () => {
    const { book } = await open()
    expect((await book.create('Player')).name).toBe('Player (2)')
    expect((await book.create('  ')).name).toBe('Player (3)')
    await book.rename('id-1', '  Fiona  ')
    await book.rename('id-1', '   ')
    expect(book.data.value.profiles[0]?.name).toBe('Fiona')
  })

  it('removes profiles but never the last one', async () => {
    const { book } = await open()
    expect(await book.remove('id-1')).toBe(false)
    const second = await book.create('Fiona')
    expect(await book.remove(second.id)).toBe(true)
    expect(book.active.value.id).toBe('id-1')
    expect(await book.remove('nobody')).toBe(false)
  })

  it('exports a profile and imports it under a new id and a free name', async () => {
    const { book } = await open()
    await book.markSolved('tutorial/1/3')
    const file = book.exportProfile('id-1')
    const imported = await book.importProfile(file)
    expect(imported).toMatchObject({ name: 'Player (2)', solved: ['tutorial/1/3'] })
    expect(imported.id).not.toBe('id-1')
    expect(book.active.value.id).toBe(imported.id)
    expect(() => book.exportProfile('nobody')).toThrow(RangeError)
  })

  it('refuses files that are no profile export', async () => {
    const { book } = await open()
    await expect(book.importProfile('not json')).rejects.toThrow('The file is no profile export')
    await expect(book.importProfile('{"format":"other"}')).rejects.toThrow(
      'The file is no profile export',
    )
  })

  it('saves in order, and a failed save does not stop the next', async () => {
    const values: unknown[] = []
    let fail = true
    const store: KeyValueStore = {
      get: async () => undefined,
      set: async (_, value) => {
        if (fail) {
          fail = false
          throw new Error('disk full')
        }
        values.push(value)
      },
    }
    await expect(ProfileBook.open(store, { name: 'Player' })).rejects.toThrow('disk full')
    const book = await ProfileBook.open(store, { name: 'Player' })
    const first = book.updateSettings({ soundVolume: 0.1 })
    const second = book.updateSettings({ soundVolume: 0.2 })
    await Promise.all([first, second, book.saved()])
    expect(values.at(-1)).toMatchObject({ profiles: [{ settings: { soundVolume: 0.2 } }] })
  })
})
