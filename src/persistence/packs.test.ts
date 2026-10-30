import { describe, expect, it } from 'vitest'
import type { LevelFile, PackFile } from '../content/schema'
import { PackShelf } from './packs'
import { memoryStore } from './store'

const PACK: PackFile = {
  version: 1,
  title: { en: 'Mine', de: 'Meins' },
  position: 100,
  skills: [
    { en: 'Easy', de: 'Leicht' },
    { en: 'Hard', de: 'Schwer' },
  ],
  selectSkill: true,
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

async function shelf(store = memoryStore()) {
  let count = 0
  return PackShelf.open(store, { newId: () => `my-${++count}` })
}

describe('PackShelf', () => {
  it('adds a level in the first free slot, skill by skill, until the pack is full', async () => {
    const packs = await shelf()
    await packs.create(PACK)
    await packs.saveLevel('my-1', 1, 1, LEVEL)
    expect(await packs.addLevel('my-1', LEVEL)).toEqual({ skill: 1, slot: 2 })
    for (let slot = 3; slot <= 30; slot++) await packs.saveLevel('my-1', 1, slot, LEVEL)
    expect(await packs.addLevel('my-1', LEVEL)).toEqual({ skill: 2, slot: 1 })
    for (let slot = 2; slot <= 30; slot++) await packs.saveLevel('my-1', 2, slot, LEVEL)
    expect(await packs.addLevel('my-1', LEVEL)).toBeUndefined()
    await expect(packs.addLevel('my-9', LEVEL)).rejects.toThrow(RangeError)
  })

  it('starts empty and keeps packs and levels across openings', async () => {
    const store = memoryStore()
    const packs = await shelf(store)
    expect(packs.packs.value).toEqual([])
    const made = await packs.create(PACK)
    expect(made.id).toBe('my-1')
    await packs.saveLevel('my-1', 2, 17, LEVEL)
    const again = await shelf(store)
    expect(again.find('my-1')?.levels).toEqual({ '2/17': LEVEL })
  })

  it('updates, deletes levels and removes packs', async () => {
    const packs = await shelf()
    await packs.create(PACK)
    await packs.saveLevel('my-1', 1, 1, LEVEL)
    await packs.saveLevel('my-1', 2, 3, LEVEL)
    await packs.updatePack('my-1', { ...PACK, skills: [{ en: 'Only', de: 'Nur' }] })
    expect(Object.keys(packs.find('my-1')?.levels ?? {})).toEqual(['1/1'])
    await packs.deleteLevel('my-1', 1, 1)
    expect(packs.find('my-1')?.levels).toEqual({})
    await packs.remove('my-1')
    expect(packs.packs.value).toEqual([])
    await expect(packs.saveLevel('my-1', 1, 1, LEVEL)).rejects.toThrow(RangeError)
  })

  it('exports a pack as one file and imports it as a new pack', async () => {
    const packs = await shelf()
    await packs.create(PACK)
    await packs.saveLevel('my-1', 1, 2, LEVEL)
    const file = packs.exportPack('my-1')
    expect(JSON.parse(file)).toMatchObject({ format: 'vibe-laser-pack', version: 1 })
    const copy = await packs.importPack(file)
    expect(copy).toEqual({ id: 'my-2', pack: PACK, levels: { '1/2': LEVEL } })
    expect(() => packs.exportPack('my-9')).toThrow(RangeError)
  })

  it('refuses files that are no pack export', async () => {
    const packs = await shelf()
    await expect(packs.importPack('not json')).rejects.toThrow(SyntaxError)
    await expect(packs.importPack('{"format":"vibe-laser-profile"}')).rejects.toThrow(SyntaxError)
    const outside = { format: 'vibe-laser-pack', version: 1, pack: PACK, levels: { '3/1': LEVEL } }
    await expect(packs.importPack(JSON.stringify(outside))).rejects.toThrow(SyntaxError)
    expect(packs.packs.value).toEqual([])
  })

  it('starts empty on a record it cannot read, without overwriting it yet', async () => {
    const store = memoryStore({ packs: { version: 9 } })
    const packs = await PackShelf.open(store)
    expect(packs.packs.value).toEqual([])
    expect(await store.get('packs')).toEqual({ version: 9 })
    const made = await packs.create(PACK)
    expect(made.id).toMatch(/^my-[0-9a-f]{10}$/)
    await packs.saved()
    expect(await store.get('packs')).toMatchObject({ version: 1 })
  })
})
