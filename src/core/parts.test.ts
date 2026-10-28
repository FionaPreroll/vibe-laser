import { describe, expect, it } from 'vitest'
import type { PartKind, Piece } from './board'
import { BLUE, CYAN, GREEN, PRIMARIES, type Primary, RED, WHITE, YELLOW } from './color'
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

/** Exits as [direction name, primary] for a beam of one primary traveling into a piece. */
function through(piece: Piece, travel: Name, primary: Primary, rules = DEFAULT_RULES) {
  return transfer(piece, NAMES.indexOf(travel) as Direction, primary, rules).map(
    (exit) => [NAMES[exit.direction], exit.primary] as const,
  )
}

const OTHERS = (...open: Name[]) => NAMES.filter((name) => !open.includes(name))

describe('refractor in rotation 0, a glass bar along the north–south line', () => {
  it.each<[string, Name, Name[]]>([
    ['straight into the north end leaves turned 45°', 'S', ['SE']],
    ['diagonally into the north end leaves straight', 'SE', ['S']],
    ['straight into the south end leaves turned 45°', 'N', ['NW']],
    ['diagonally into the south end leaves straight', 'NW', ['N']],
    ['the other diagonal into the north end stops', 'SW', []],
    ['the other diagonal into the south end stops', 'NE', []],
    ['the long side to the west stops', 'E', []],
    ['the long side to the east stops', 'W', []],
  ])('%s', (_, travel, out) => {
    expect(exits('refractor', 0, travel)).toEqual(out)
  })

  it('looks the same after half a turn', () => {
    for (const travel of NAMES)
      expect(exits('refractor', 4, travel)).toEqual(exits('refractor', 0, travel))
  })
})

describe('one-way in rotation 0, broad side facing south', () => {
  it('lets light through only straight from the broad side', () => {
    expect(exits('oneWay', 0, 'N')).toEqual(['N'])
    for (const travel of OTHERS('N')) expect(exits('oneWay', 0, travel)).toEqual([])
  })

  it('points the way of its rotation', () => {
    expect(exits('oneWay', 2, 'E')).toEqual(['E'])
    expect(exits('oneWay', 2, 'W')).toEqual([])
  })
})

describe('splitter in rotation 0, tip facing north', () => {
  it('splits light that hits the tip 90° to both sides', () => {
    expect(exits('splitter', 0, 'S')).toEqual(['E', 'W'])
  })

  it('stops light on every other side', () => {
    for (const travel of OTHERS('S')) expect(exits('splitter', 0, travel)).toEqual([])
  })
})

describe('threeway in rotation 0, flat side facing south', () => {
  it('splits light through the flat side out of both bevels', () => {
    expect(exits('threeway', 0, 'N')).toEqual(['NE', 'NW'])
  })

  it('sends light from either bevel out of the flat side', () => {
    expect(exits('threeway', 0, 'SW')).toEqual(['S'])
    expect(exits('threeway', 0, 'SE')).toEqual(['S'])
  })

  it('stops the rest', () => {
    for (const travel of OTHERS('N', 'SW', 'SE')) expect(exits('threeway', 0, travel)).toEqual([])
  })
})

describe('prism in rotation 0, entry side facing south', () => {
  const prism = { kind: 'prism', rotation: 0, color: 0 } as const

  it('sends red straight, green 45° and blue 90° to the right', () => {
    expect(through(prism, 'N', RED)).toEqual([['N', RED]])
    expect(through(prism, 'N', GREEN)).toEqual([['NE', GREEN]])
    expect(through(prism, 'N', BLUE)).toEqual([['E', BLUE]])
  })

  it('runs the same paths backwards, so the primaries leave as one beam', () => {
    expect(through(prism, 'S', RED)).toEqual([['S', RED]])
    expect(through(prism, 'SW', GREEN)).toEqual([['S', GREEN]])
    expect(through(prism, 'W', BLUE)).toEqual([['S', BLUE]])
  })

  it('stops each primary off its own path', () => {
    expect(through(prism, 'S', GREEN)).toEqual([])
    expect(through(prism, 'SW', BLUE)).toEqual([])
    expect(through(prism, 'E', RED)).toEqual([])
  })
})

describe('color converter in rotation 0, narrow side facing north', () => {
  const converter = { kind: 'colorConverter', rotation: 0, color: 0 } as const

  it('shifts red to green through the narrow side and to blue through the broad side', () => {
    expect(through(converter, 'S', RED)).toEqual([['S', GREEN]])
    expect(through(converter, 'S', GREEN)).toEqual([['S', BLUE]])
    expect(through(converter, 'S', BLUE)).toEqual([['S', RED]])
    expect(through(converter, 'N', RED)).toEqual([['N', BLUE]])
    expect(through(converter, 'N', BLUE)).toEqual([['N', GREEN]])
    expect(through(converter, 'N', GREEN)).toEqual([['N', RED]])
  })

  it('stops light from the sides', () => {
    for (const travel of OTHERS('N', 'S')) expect(through(converter, travel, RED)).toEqual([])
  })
})

describe('filter', () => {
  it('lets its own components through, from every direction', () => {
    const yellow = { kind: 'filter', rotation: 0, color: YELLOW } as const
    for (const travel of NAMES) {
      expect(through(yellow, travel, RED)).toEqual([[travel, RED]])
      expect(through(yellow, travel, GREEN)).toEqual([[travel, GREEN]])
      expect(through(yellow, travel, BLUE)).toEqual([])
    }
  })
})

describe('polarizer', () => {
  const eastBlue = { kind: 'polarizer', rotation: 2, color: BLUE } as const

  it('lets its color through only in its direction', () => {
    expect(through(eastBlue, 'E', BLUE)).toEqual([['E', BLUE]])
    expect(through(eastBlue, 'E', RED)).toEqual([])
    expect(through(eastBlue, 'W', BLUE)).toEqual([])
    expect(through(eastBlue, 'N', BLUE)).toEqual([])
  })

  it('also passes the opposite direction under the axis rule', () => {
    const axis = { ...DEFAULT_RULES, polarizer: 'axis' } as const
    expect(through(eastBlue, 'W', BLUE, axis)).toEqual([['W', BLUE]])
    expect(through(eastBlue, 'N', BLUE, axis)).toEqual([])
  })
})

describe('bender', () => {
  it('turns every beam 45° clockwise, whichever way it comes', () => {
    for (const travel of DIRECTIONS) {
      expect(exits('bender', 0, NAMES[travel] as Name)).toEqual([NAMES[(travel + 1) % 8]])
    }
  })
})

describe('splicer in rotation 0, narrow end facing north', () => {
  it('splits light through the narrow end three ways', () => {
    expect(exits('splicer', 0, 'S')).toEqual(['E', 'S', 'W'])
  })

  it('stops light at the sides and at the red end', () => {
    for (const travel of OTHERS('S')) expect(exits('splicer', 0, travel)).toEqual([])
  })
})

describe('prismirror in rotation 0, entry side facing south', () => {
  const prismirror = { kind: 'prismirror', rotation: 0, color: 0 } as const

  it('sends red straight, green 45° and blue 90° to the left', () => {
    expect(through(prismirror, 'N', RED)).toEqual([['N', RED]])
    expect(through(prismirror, 'N', GREEN)).toEqual([['NW', GREEN]])
    expect(through(prismirror, 'N', BLUE)).toEqual([['W', BLUE]])
  })

  it('runs the same paths backwards', () => {
    expect(through(prismirror, 'S', RED)).toEqual([['S', RED]])
    expect(through(prismirror, 'SE', GREEN)).toEqual([['S', GREEN]])
    expect(through(prismirror, 'E', BLUE)).toEqual([['S', BLUE]])
  })

  it('is the mirror image of a prism, east to west', () => {
    const prism = { kind: 'prism', rotation: 0, color: 0 } as const
    const mirror = (direction: Direction) => ((8 - direction) % 8) as Direction
    for (const travel of DIRECTIONS) {
      for (const primary of PRIMARIES) {
        const mirrored = transfer(prism, mirror(travel), primary, DEFAULT_RULES).map((exit) => ({
          ...exit,
          direction: mirror(exit.direction),
        }))
        expect(transfer(prismirror, travel, primary, DEFAULT_RULES)).toEqual(mirrored)
      }
    }
  })
})

describe('selector in rotation 0, flat end facing south and bevel facing north-east', () => {
  const green = { kind: 'selector', rotation: 0, color: GREEN } as const

  it('turns its color 45° clockwise at the flat end and lets the rest straight on', () => {
    expect(through(green, 'N', GREEN)).toEqual([['NE', GREEN]])
    expect(through(green, 'N', RED)).toEqual([['N', RED]])
    expect(through(green, 'N', BLUE)).toEqual([['N', BLUE]])
  })

  it('lets everything straight through the bevel unchanged', () => {
    for (const primary of PRIMARIES) expect(through(green, 'S', primary)).toEqual([['S', primary]])
  })

  it('sends its color from the bevel diagonally out of the flat end, and stops the rest', () => {
    expect(through(green, 'SW', GREEN)).toEqual([['S', GREEN]])
    expect(through(green, 'SW', RED)).toEqual([])
  })

  it('stops light from the sides', () => {
    for (const travel of OTHERS('N', 'S', 'SW')) {
      for (const primary of PRIMARIES) expect(through(green, travel, primary)).toEqual([])
    }
  })
})

describe('complex in rotation 0, a selector with an outer and an inner color', () => {
  const complex: Piece = { kind: 'complex', rotation: 0, color: RED, inner: GREEN }

  it('turns the outer color at the flat end, lets the inner color straight on, stops the rest', () => {
    expect(through(complex, 'N', RED)).toEqual([['NE', RED]])
    expect(through(complex, 'N', GREEN)).toEqual([['N', GREEN]])
    expect(through(complex, 'N', BLUE)).toEqual([])
  })

  it('lets only the inner color straight through the bevel', () => {
    expect(through(complex, 'S', GREEN)).toEqual([['S', GREEN]])
    expect(through(complex, 'S', RED)).toEqual([])
    expect(through(complex, 'S', BLUE)).toEqual([])
  })

  it('sends only the outer color from the bevel diagonally out of the flat end', () => {
    expect(through(complex, 'SW', RED)).toEqual([['S', RED]])
    expect(through(complex, 'SW', GREEN)).toEqual([])
  })

  it('turns a primary of both colors as part of the outer color', () => {
    const shared: Piece = { kind: 'complex', rotation: 0, color: YELLOW, inner: CYAN }
    expect(through(shared, 'N', GREEN)).toEqual([['NE', GREEN]])
    expect(through(shared, 'N', BLUE)).toEqual([['N', BLUE]])
  })

  it('acts as a selector when its inner color is white', () => {
    for (const rotation of DIRECTIONS) {
      const selector: Piece = { kind: 'selector', rotation, color: BLUE }
      const whiteInside: Piece = { kind: 'complex', rotation, color: BLUE, inner: WHITE }
      for (const travel of DIRECTIONS) {
        for (const primary of PRIMARIES) {
          expect(transfer(whiteInside, travel, primary, DEFAULT_RULES)).toEqual(
            transfer(selector, travel, primary, DEFAULT_RULES),
          )
        }
      }
    }
  })
})

describe('reversible parts', () => {
  const kinds: PartKind[] = [
    ...MIRRORS,
    'refractor',
    'threeway',
    'prism',
    'prismirror',
    'colorConverter',
    'filter',
    'coin',
  ]

  it('send every primary back the way it came when the beam is reversed', () => {
    for (const kind of kinds) {
      for (const rotation of DIRECTIONS) {
        const piece: Piece = { kind, rotation, color: WHITE }
        for (const travel of DIRECTIONS) {
          for (const primary of PRIMARIES) {
            for (const exit of transfer(piece, travel, primary, DEFAULT_RULES)) {
              const back = transfer(piece, opposite(exit.direction), exit.primary, DEFAULT_RULES)
              expect(back).toContainEqual({ direction: opposite(travel), primary })
            }
          }
        }
      }
    }
  })
})
