import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { describeIssues, levelSchema, packSchema, problemOf } from './schema'

/** The smallest level that passes: a red laser shining on a red coin. */
const LEVEL = {
  version: 1,
  name: { en: 'Test', de: 'Test' },
  size: [3, 1],
  objects: [
    { type: 'laser', pos: 'A1', rot: 2, rgb: 'r' },
    { type: 'coin', pos: 'A3', rgb: 'r' },
  ],
}

function problems(changes: Record<string, unknown>): string[] {
  const parsed = levelSchema.safeParse({ ...LEVEL, ...changes })
  return parsed.success ? [] : describeIssues(parsed.error)
}

describe('levelSchema', () => {
  it('accepts a small level and fills in an empty toolbox', () => {
    const parsed = levelSchema.parse(LEVEL)
    expect(parsed.toolbox).toEqual([])
  })

  it('names the place of every problem', () => {
    expect(problems({ objects: [...LEVEL.objects, { type: 'mirror', pos: 'L17' }] })).toEqual([
      'objects[2].pos: L17 lies outside a 3 × 1 board',
    ])
    expect(problems({ objects: [...LEVEL.objects, { type: 'mirror', pos: 'A1' }] })).toEqual([
      'objects[2].pos: A1 already holds objects[0]',
    ])
    expect(problems({ objects: [{ type: 'laser', pos: 'A1', rot: 2 }] })).toEqual([
      'objects[0].rgb: a laser needs a color',
      'objects: a level needs at least one coin',
    ])
  })

  it('checks colors, rotations and headings', () => {
    const add = (piece: object) =>
      problems({ objects: [...LEVEL.objects, { pos: 'A2', ...piece }] })
    expect(add({ type: 'mirror', rgb: 'g' })).toEqual(['objects[2].rgb: a mirror has no color'])
    expect(add({ type: 'filter', rgb: 'g', rot: 2 })).toEqual([
      'objects[2].rot: a filter does not rotate',
    ])
    expect(add({ type: 'ship', rot: 0 })).toEqual(['objects[2].rot: a ship cannot head that way'])
    expect(add({ type: 'coin', rgb: 'x' })).toEqual([
      'objects[2].rgb: expected color letters such as "rb"',
    ])
    expect(add({ type: 'unicorn' })[0]).toMatch(/^objects\[2\]\.type: /)
  })

  it('wants an inner color on a complex and nowhere else', () => {
    const add = (piece: object) =>
      problems({ objects: [...LEVEL.objects, { pos: 'A2', ...piece }] })
    expect(add({ type: 'complex', rot: 1, rgb: 'r', inner: 'gb' })).toEqual([])
    expect(add({ type: 'complex', rot: 1, rgb: 'r' })).toEqual([
      'objects[2].inner: a complex needs an inner color',
    ])
    expect(add({ type: 'selector', rot: 1, rgb: 'r', inner: 'g' })).toEqual([
      'objects[2].inner: a selector has no inner color',
    ])
    expect(add({ type: 'bender', rot: 1 })).toEqual(['objects[2].rot: a bender does not rotate'])
  })

  it('checks the toolbox and the solution against each other', () => {
    expect(
      problems({
        toolbox: [{ type: 'mirror', count: 2 }, { type: 'filter' }],
        solution: [{ piece: 3, pos: 'A2', rot: 0 }, { piece: 2, pos: 'A2', rot: 4 }, { wait: 5 }],
      }),
    ).toEqual([
      'toolbox[1].rgb: a filter needs a color',
      'solution[0].piece: the toolbox holds 3 pieces',
      'solution[1].rgb: a filter needs a color',
      'solution[1].rot: a filter does not rotate',
    ])
  })

  it('checks steps that move pieces from the board', () => {
    const objects = [
      ...LEVEL.objects,
      { type: 'mirror', pos: 'A2', rot: 1, rotateable: true },
      { type: 'filter', pos: 'A2', rgb: 'g' },
    ]
    expect(
      problems({
        size: [3, 2],
        objects: [...LEVEL.objects, { type: 'mirror', pos: 'A2', rot: 1, rotateable: true }],
        solution: [
          { from: 'A2', pos: 'A2', rot: 3 },
          { from: 'A2', pos: 'B2', rot: 1 },
          { from: 'A1', stow: true },
          { from: 'B1', pos: 'B2', rot: 0 },
          { from: 'A2', pos: 'C9', rot: 1 },
        ],
      }),
    ).toEqual([
      'solution[1]: a mirror cannot be moved',
      'solution[2]: a laser cannot be moved',
      'solution[3].from: B1 holds no piece at the start',
      'solution[4]: a mirror cannot be moved',
      'solution[4].pos: C9 lies outside a 3 × 2 board',
    ])
    expect(problems({ objects, toolbox: [], solution: [] })).toEqual([
      'objects[3].pos: A2 already holds objects[2]',
    ])
  })

  it('stops toolbox pieces the file fixes', () => {
    expect(
      problems({
        toolbox: [{ type: 'mirror', moveable: false, rotateable: false }],
        solution: [{ piece: 0, pos: 'A2', rot: 1 }],
      }),
    ).toEqual([
      'solution[0]: a mirror cannot be moved',
      'solution[0].rot: a mirror cannot be rotated',
    ])
  })

  it('gives every level problem a key for translated messages', () => {
    const parsed = levelSchema.safeParse({
      ...LEVEL,
      objects: [{ type: 'laser', pos: 'D1', rot: 2 }],
    })
    expect(parsed.success).toBe(false)
    const found = parsed.error?.issues.map(problemOf)
    expect(found).toEqual([
      { key: 'needsColor', kind: 'laser' },
      { key: 'outside', place: 'D1' },
      { key: 'noCoin' },
    ])
    const shape = levelSchema.safeParse({ ...LEVEL, version: 2 })
    expect(shape.error?.issues.map(problemOf)).toEqual([undefined])
  })

  it('counts coins in the toolbox too', () => {
    expect(
      problems({ objects: [LEVEL.objects[0]], toolbox: [{ type: 'coin', rgb: 'r' }] }),
    ).toEqual([])
  })

  it('refuses unknown fields and versions', () => {
    expect(problems({ colour: 'red' })).toEqual(['Unrecognized key: "colour"'])
    expect(problems({ version: 2 })[0]).toMatch(/^version: /)
  })
})

describe('packSchema', () => {
  it('accepts a pack and lets it select skills by default', () => {
    const pack = packSchema.parse({
      version: 1,
      title: { en: 'P', de: 'P' },
      position: 3,
      skills: [{ en: 'Easy', de: 'Leicht' }],
    })
    expect(pack.selectSkill).toBe(true)
  })

  it('allows at most four skills', () => {
    const skill = { en: 'S', de: 'S' }
    const parsed = packSchema.safeParse({
      version: 1,
      title: skill,
      position: 1,
      skills: [skill, skill, skill, skill, skill],
    })
    expect(parsed.success).toBe(false)
  })
})

describe('JSON Schema for editors', () => {
  // Generated: after changing a schema, run `pnpm schemas`.
  it('matches the level and pack schemas', async () => {
    await expect(json(levelSchema)).toMatchFileSnapshot('../../packs/level.schema.json')
    await expect(json(packSchema)).toMatchFileSnapshot('../../packs/pack.schema.json')
  })
})

function json(schema: z.ZodType): string {
  return `${JSON.stringify(z.toJSONSchema(schema, { io: 'input' }), null, 2)}\n`
}
