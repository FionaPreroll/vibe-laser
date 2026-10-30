import { describe, expect, it } from 'vitest'
import { type LevelFile, levelSchema } from './schema'
import { decodeLevel, encodeLevel } from './share'

const level = levelSchema.parse({
  $schema: '../../../level.schema.json',
  version: 1,
  name: { en: 'Über the Top', de: 'Über alles' },
  note: 'for authors only',
  size: [6, 3],
  objects: [
    { type: 'coin', pos: 'A6', rgb: 'r' },
    { type: 'laser', pos: 'B1', rot: 2, rgb: 'r' },
  ],
  toolbox: [{ type: 'mirror', rot: 0 }],
  solution: [{ piece: 0, pos: 'B6', rot: 7 }],
})

describe('level links', () => {
  it('brings a level back from its link, without the author notes', async () => {
    const text = await encodeLevel(level)
    expect(text).toMatch(/^[A-Za-z0-9_-]+$/)
    const { note, $schema, ...rest } = level
    expect(note).toBeDefined()
    expect($schema).toBeDefined()
    expect(await decodeLevel(text)).toEqual(rest)
  })

  it('refuses text that holds no level', async () => {
    await expect(decodeLevel('not a level!')).rejects.toThrow(SyntaxError)
    await expect(decodeLevel('AAAA')).rejects.toThrow(SyntaxError)
    const notALevel = await encodeLevel({ version: 2 } as unknown as LevelFile)
    await expect(decodeLevel(notALevel)).rejects.toThrow(SyntaxError)
  })
})
