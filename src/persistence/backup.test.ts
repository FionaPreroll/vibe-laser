import { describe, expect, it } from 'vitest'
import type { LevelFile, PackFile } from '../content/schema'
import { exportBackup, parseBackup } from './backup'
import { PackShelf } from './packs'
import { ProfileBook } from './profiles'
import { memoryStore } from './store'

const PACK: PackFile = {
  version: 1,
  title: { en: 'Mine', de: 'Meins' },
  position: 100,
  skills: [{ en: 'Easy', de: 'Leicht' }],
  selectSkill: false,
}

const LEVEL: LevelFile = {
  version: 1,
  name: { en: 'Test', de: 'Test' },
  size: [3, 1],
  objects: [
    { type: 'laser', pos: 'A1', rot: 2, rgb: 'r' },
    { type: 'coin', pos: 'A3', rgb: 'r' },
  ],
  toolbox: [],
}

async function saves() {
  const store = memoryStore()
  let count = 0
  const book = await ProfileBook.open(store, { name: 'Player', newId: () => `id-${++count}` })
  const shelf = await PackShelf.open(store, { newId: () => `my-${++count}` })
  return { store, book, shelf }
}

describe('backups', () => {
  it('carries every profile and own pack to another browser, in place of what was there', async () => {
    const here = await saves()
    await here.book.markSolved('tutorial/1/1', 3)
    await here.book.create('Fiona')
    await here.book.updateSettings({ wakeLock: 'always' })
    const pack = await here.shelf.create(PACK)
    await here.shelf.saveLevel(pack.id, 1, 1, LEVEL)
    const text = exportBackup(here.book, here.shelf, new Date('2026-11-23T12:00:00Z'))
    expect(JSON.parse(text)).toMatchObject({
      format: 'vibe-laser-backup',
      version: 1,
      created: '2026-11-23T12:00:00.000Z',
    })

    const there = await saves()
    await there.book.create('Someone else')
    await there.shelf.create({ ...PACK, title: { en: 'Theirs', de: 'Ihres' } })
    const backup = parseBackup(text)
    await Promise.all([there.book.replace(backup.saves), there.shelf.replace(backup.packs)])
    expect(there.book.data.value).toEqual(here.book.data.value)
    expect(there.shelf.packs.value).toEqual(here.shelf.packs.value)
    expect(there.book.active.value.name).toBe('Fiona')

    // Saved, so the next visit opens the backup's saves too.
    await Promise.all([there.book.saved(), there.shelf.saved()])
    const reopened = await ProfileBook.open(there.store, { name: 'Player' })
    expect(reopened.data.value).toEqual(here.book.data.value)
    const shelf = await PackShelf.open(there.store)
    expect(shelf.packs.value).toEqual(here.shelf.packs.value)
  })

  it('refuses files that are no backup, and changes nothing', async () => {
    const { book, shelf } = await saves()
    const good = JSON.parse(exportBackup(book, shelf))
    expect(() => parseBackup('not json')).toThrow(SyntaxError)
    expect(() => parseBackup('null')).toThrow(SyntaxError)
    expect(() => parseBackup(book.exportProfile('id-1'))).toThrow(SyntaxError)
    expect(() => parseBackup(JSON.stringify({ ...good, version: 2 }))).toThrow(SyntaxError)
    expect(() => parseBackup(JSON.stringify({ ...good, saves: { version: 1 } }))).toThrow(
      SyntaxError,
    )
    const twice = { ...good.saves, profiles: [...good.saves.profiles, ...good.saves.profiles] }
    expect(() => parseBackup(JSON.stringify({ ...good, saves: twice }))).toThrow(SyntaxError)
    const pack = { id: 'my-1', pack: PACK, levels: {} }
    expect(() => parseBackup(JSON.stringify({ ...good, packs: [pack, pack] }))).toThrow(SyntaxError)
    expect(() => parseBackup(JSON.stringify({ ...good, packs: [{ id: 'bad' }] }))).toThrow(
      SyntaxError,
    )
    await expect(book.replace({ version: 1, active: 'gone', profiles: [] })).rejects.toThrow(
      SyntaxError,
    )
    expect(book.data.value.profiles).toHaveLength(1)
  })

  it('reads backups without packs as having none', async () => {
    const { book, shelf } = await saves()
    const { packs: _, ...rest } = JSON.parse(exportBackup(book, shelf))
    expect(parseBackup(JSON.stringify(rest)).packs).toEqual([])
  })
})
