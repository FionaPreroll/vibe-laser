import { describe, expect, it } from 'vitest'
import type { PartKind } from './board'
import { BLUE, RED } from './color'
import { DIRECTIONS, type Direction, opposite } from './direction'
import { transfer } from './parts'
import { DEFAULT_RULES } from './rules'

const NAMES = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'] as const
type Name = (typeof NAMES)[number]

/** Exit directions, by name, of a red beam traveling `travel` into the part. */
function exits(kind: PartKind, rotation: Direction, travel: Name): Name[] {
  const piece = { kind, rotation, color: 0 } as const
  return transfer(piece, NAMES.indexOf(travel) as Direction, RED, DEFAULT_RULES).map(
    (exit) => NAMES[exit.direction],
  )
}

const MIRRORS: PartKind[] = ['mirror', 'doubleMirror', 'slitMirror']

describe('mirror family in rotation 0, reflecting side facing north', () => {
  it.each<[string, Name, Name[], Name[], Name[]]>([
    // case, travel, mirror, double mirror, slit mirror
    ['head-on onto the front goes straight back', 'S', ['N'], ['N'], ['N']],
    ['45° onto the front turns 90°', 'SE', ['NE'], ['NE'], ['NE']],
    ['45° onto the front from the other side', 'SW', ['NW'], ['NW'], ['NW']],
    ['along the surface passes only the slit', 'E', [], [], ['E']],
    ['along the surface the other way', 'W', [], [], ['W']],
    ['head-on onto the back reflects only on double mirrors', 'N', [], ['S'], ['S']],
    ['45° onto the back', 'NE', [], ['SE'], ['SE']],
    ['45° onto the back from the other side', 'NW', [], ['SW'], ['SW']],
  ])('%s', (_, travel, mirror, doubleMirror, slitMirror) => {
    expect(exits('mirror', 0, travel)).toEqual(mirror)
    expect(exits('doubleMirror', 0, travel)).toEqual(doubleMirror)
    expect(exits('slitMirror', 0, travel)).toEqual(slitMirror)
  })
})

describe('rotated mirrors', () => {
  it('rotation 1 faces north-east, with the mirror line running from north-west to south-east', () => {
    expect(exits('mirror', 1, 'S')).toEqual(['E'])
    expect(exits('mirror', 1, 'W')).toEqual(['N'])
    expect(exits('mirror', 1, 'SW')).toEqual(['NE'])
    expect(exits('mirror', 1, 'N')).toEqual([])
    expect(exits('mirror', 1, 'NW')).toEqual([])
  })

  it('rotation 2 faces east, with a vertical mirror line', () => {
    expect(exits('mirror', 2, 'W')).toEqual(['E'])
    expect(exits('mirror', 2, 'NW')).toEqual(['NE'])
    expect(exits('mirror', 2, 'N')).toEqual([])
    expect(exits('mirror', 2, 'E')).toEqual([])
  })

  it('a double mirror looks the same after half a turn', () => {
    for (const travel of NAMES) {
      expect(exits('doubleMirror', 5, travel)).toEqual(exits('doubleMirror', 1, travel))
    }
  })

  it('every mirror sends light back the way it came when the beam is reversed', () => {
    for (const kind of MIRRORS) {
      for (const rotation of DIRECTIONS) {
        for (const travel of DIRECTIONS) {
          const piece = { kind, rotation, color: 0 } as const
          for (const exit of transfer(piece, travel, RED, DEFAULT_RULES)) {
            const back = transfer(piece, opposite(exit.direction), RED, DEFAULT_RULES)
            expect(back.map((reversed) => reversed.direction)).toEqual([opposite(travel)])
          }
        }
      }
    }
  })
})

describe('other parts', () => {
  it('keeps the primary of the beam', () => {
    const piece = { kind: 'doubleMirror', rotation: 3, color: 0 } as const
    expect(transfer(piece, 0, BLUE, DEFAULT_RULES)).toEqual([{ direction: 2, primary: BLUE }])
  })

  it('lets beams run through empty cells, coins and anti-coins', () => {
    expect(transfer(undefined, 3, RED, DEFAULT_RULES)).toEqual([{ direction: 3, primary: RED }])
    for (const kind of ['coin', 'antiCoin'] as const) {
      const piece = { kind, rotation: 0, color: 0 } as const
      expect(transfer(piece, 5, RED, DEFAULT_RULES)).toEqual([{ direction: 5, primary: RED }])
    }
  })

  it('stops beams at lasers, unless the rules let them pass', () => {
    const laser = { kind: 'laser', rotation: 0, color: RED } as const
    expect(transfer(laser, 2, BLUE, DEFAULT_RULES)).toEqual([])
    expect(transfer(laser, 2, BLUE, { ...DEFAULT_RULES, beamIntoLaser: 'pass' })).toEqual([
      { direction: 2, primary: BLUE },
    ])
  })
})
