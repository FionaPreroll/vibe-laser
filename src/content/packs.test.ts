import { describe, expect, it } from 'vitest'
import { GameSession } from '../game/session'
import { puzzleOf, rulesOf } from './level'
import {
  buildPacks,
  ContentError,
  findLevel,
  findPack,
  type Level,
  library,
  nextUnsolved,
  PACKS,
  packOfLevels,
  SLOTS,
  setCustomPacks,
} from './packs'
import type { LevelFile } from './schema'
import { replaySolution, SEEDS } from './solution'

/** A minute of ticks: about how long a player may look at a level before the first move. */
const THINKING_TICKS = 600
/** Ten seconds of thought before each move: no solution may hang on quick hands. */
const PONDERING_TICKS = 100

const entries = PACKS.flatMap((pack) =>
  pack.skills.flatMap((skill) => skill.levels.map((entry) => [entry.id, entry] as const)),
)

function sessionFor(level: Level, seed: number): GameSession {
  const pack = PACKS.find((candidate) => candidate.id === level.pack)
  return new GameSession(puzzleOf(level.file), rulesOf(level.file, pack?.file.rules), seed)
}

describe('built-in packs', () => {
  it('have titles in both languages and levels in every skill', () => {
    expect(PACKS.length).toBeGreaterThan(0)
    for (const pack of PACKS) {
      expect(pack.file.title.de).not.toBe('')
      for (const skill of pack.skills) expect(skill.levels.length).toBeGreaterThan(0)
    }
  })

  it.each(entries)('%s starts unsolved and stays so while the player thinks', async (_, entry) => {
    const level = await entry.load()
    expect(level.file.solution, 'a known solution').toBeDefined()
    for (const seed of SEEDS) {
      const session = sessionFor(level, seed)
      expect(session.state.value.phase).toBe('playing')
      for (let tick = 0; tick < THINKING_TICKS; tick++) session.tick()
      expect(session.state.value.phase).toBe('playing')
    }
  })

  it.each(entries)('%s is solved by its known solution, whatever the seed', async (_, entry) => {
    const level = await entry.load()
    const pack = PACKS.find((candidate) => candidate.id === level.pack)
    for (const seed of SEEDS) {
      const session = replaySolution(level.file, pack?.file.rules, seed)
      expect(session.state.value.phase, `seed ${seed}`).toBe('solved')
    }
  })
  it.each(entries)('%s is solved slowly too, with a pause before each move', async (_, entry) => {
    const level = await entry.load()
    const pack = PACKS.find((candidate) => candidate.id === level.pack)
    const slowly: LevelFile = {
      ...level.file,
      solution: level.file.solution?.flatMap((step) =>
        'wait' in step ? [step] : [{ wait: PONDERING_TICKS }, step],
      ),
    }
    for (const seed of SEEDS) {
      const session = replaySolution(slowly, pack?.file.rules, seed)
      expect(session.state.value.phase, `seed ${seed}`).toBe('solved')
    }
  })
})

describe('buildPacks', () => {
  const manifest = (position: number, skills = 1) => ({
    version: 1,
    title: { en: 'P', de: 'P' },
    position,
    skills: Array.from({ length: skills }, () => ({ en: 'S', de: 'S' })),
  })
  const level = {
    version: 1,
    name: { en: 'L', de: 'L' },
    size: [2, 1],
    objects: [
      { type: 'laser', pos: 'A1', rot: 2, rgb: 'r' },
      { type: 'coin', pos: 'A2', rgb: 'r' },
    ],
  }

  it('orders packs by position and levels by number, with ids from their paths', async () => {
    const packs = buildPacks(
      { '/packs/b/pack.json': manifest(2), '/packs/a/pack.json': manifest(1, 2) },
      {
        '/packs/a/levels/skill2/level_010.json': async () => level,
        '/packs/a/levels/skill2/level_002.json': async () => level,
      },
    )
    expect(packs.map((pack) => pack.id)).toEqual(['a', 'b'])
    expect(packs[0]?.skills[1]?.levels.map((entry) => entry.id)).toEqual(['a/2/2', 'a/2/10'])
    expect((await packs[0]?.skills[1]?.levels[0]?.load())?.file.name.en).toBe('L')
  })

  it('refuses files that do not fit their pack', () => {
    expect(() => buildPacks({ '/packs/x/other.json': manifest(1) }, {})).toThrow(ContentError)
    expect(() => buildPacks({ '/packs/x/pack.json': { version: 1 } }, {})).toThrow(/title/)
    const at = (path: string) => () =>
      buildPacks({ '/packs/x/pack.json': manifest(1) }, { [path]: async () => level })
    expect(at('/packs/x/levels/skill2/level_001.json')).toThrow(/outside the skills/)
    expect(at(`/packs/x/levels/skill1/level_0${SLOTS + 1}.json`)).toThrow(/outside the skills/)
    expect(at('/packs/y/levels/skill1/level_001.json')).toThrow(/outside the skills/)
  })

  it('reports every problem of a level file when it loads', async () => {
    const [pack] = buildPacks(
      { '/packs/x/pack.json': manifest(1) },
      { '/packs/x/levels/skill1/level_001.json': async () => ({ ...level, size: [1, 1] }) },
    )
    await expect(pack?.skills[0]?.levels[0]?.load()).rejects.toThrow(
      'objects[1].pos: A2 lies outside a 1 × 1 board',
    )
  })
})

describe('library', () => {
  const level: LevelFile = {
    version: 1,
    name: { en: 'Mine', de: 'Meins' },
    size: [3, 1],
    objects: [
      { type: 'laser', pos: 'A1', rot: 2, rgb: 'r' },
      { type: 'coin', pos: 'A3', rgb: 'r' },
    ],
    toolbox: [],
  }
  const pack = packOfLevels(
    'my-pack',
    {
      version: 1,
      title: { en: 'Mine', de: 'Meins' },
      position: 100,
      skills: [
        { en: 'One', de: 'Eins' },
        { en: 'Two', de: 'Zwei' },
      ],
      selectSkill: true,
    },
    { '1/3': level, '2/1': level, '1/1': level },
  )

  it('turns a pack made in the editor into one the game plays', async () => {
    expect(pack.skills.map((skill) => skill.levels.map((entry) => entry.id))).toEqual([
      ['my-pack/1/1', 'my-pack/1/3'],
      ['my-pack/2/1'],
    ])
    expect((await pack.skills[0]?.levels[1]?.load())?.file).toBe(level)
  })

  it('lists packs made in the editor after the built-in ones and finds their levels', () => {
    setCustomPacks([pack])
    try {
      expect(library.value.map((each) => each.id)).toEqual([
        ...PACKS.map((each) => each.id),
        'my-pack',
      ])
      expect(findPack('my-pack')).toBe(pack)
      expect(findLevel('my-pack/2/1')?.skill.number).toBe(2)
      expect(nextUnsolved('my-pack/1/3', new Set(['my-pack/1/1']))?.id).toBe('my-pack/2/1')
    } finally {
      setCustomPacks([])
    }
    expect(findPack('my-pack')).toBeUndefined()
  })
})
