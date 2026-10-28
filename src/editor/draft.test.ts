import { describe, expect, it } from 'vitest'
import { type LevelFile, levelSchema } from '../content/schema'
import {
  changePiece,
  clearLevel,
  finishLevel,
  movePiece,
  newLevel,
  noteLevel,
  openLevel,
  pieceAt,
  putPiece,
  removePiece,
  renameLevel,
  resizeLevel,
  rotatePiece,
  solveLevel,
} from './draft'

const board = (cell: number) => ({ area: 'board', cell }) as const
const slot = (index: number) => ({ area: 'toolbox', slot: index }) as const

/** A 4 × 2 board: a red laser in A1 firing east and a red coin in A4. */
function level(): LevelFile {
  return {
    ...newLevel(),
    name: { en: 'Test', de: 'Test' },
    size: [4, 2],
    objects: [
      { type: 'coin', pos: 'A4', rgb: 'r' },
      { type: 'laser', pos: 'A1', rot: 2, rgb: 'r' },
    ],
  }
}

describe('level drafts', () => {
  it('start empty, sixteen by eleven, without a name', () => {
    expect(newLevel()).toEqual({
      version: 1,
      name: { en: '', de: '' },
      size: [16, 11],
      objects: [],
      toolbox: [],
    })
  })

  it('open with one toolbox entry per piece and save with counts', () => {
    const opened = openLevel({
      ...level(),
      toolbox: [
        { type: 'mirror', count: 2 },
        { type: 'filter', rgb: 'g' },
      ],
    })
    expect(opened.toolbox).toEqual([
      { type: 'mirror' },
      { type: 'mirror' },
      { type: 'filter', rgb: 'g' },
    ])
    const saved = finishLevel({ ...opened, note: '  For testing  ' })
    expect(saved.toolbox).toEqual([
      { type: 'mirror', count: 2 },
      { type: 'filter', rgb: 'g' },
    ])
    expect(saved.objects.map((object) => object.pos)).toEqual(['A1', 'A4'])
    expect(saved.note).toBe('For testing')
    expect(finishLevel({ ...opened, note: '  ' })).not.toHaveProperty('note')
    expect(levelSchema.safeParse(saved).success).toBe(true)
  })

  it('save every built-in level just as it was written', () => {
    const written = import.meta.glob<string>('/packs/*/levels/skill*/level_*.json', {
      eager: true,
      query: '?raw',
      import: 'default',
    })
    expect(Object.keys(written).length).toBeGreaterThan(0)
    for (const text of Object.values(written)) {
      const file = levelSchema.parse(JSON.parse(text))
      expect(JSON.stringify(finishLevel(openLevel(file)))).toBe(JSON.stringify(JSON.parse(text)))
    }
  })

  it('put pieces on cells and slots, replacing what was there', () => {
    let draft = putPiece(level(), board(5), { type: 'mirror', rot: 3 })
    expect(pieceAt(draft, board(5))).toEqual({ type: 'mirror', rot: 3 })
    draft = putPiece(draft, board(5), { type: 'explosive', rot: undefined })
    expect(draft.objects).toHaveLength(3)
    expect(pieceAt(draft, board(5))).toEqual({ type: 'explosive' })
    draft = putPiece(draft, slot(7), { type: 'mirror' })
    draft = putPiece(draft, slot(9), { type: 'prism' })
    expect(draft.toolbox).toEqual([{ type: 'mirror' }, { type: 'prism' }])
    draft = putPiece(draft, slot(0), { type: 'splitter' })
    expect(pieceAt(draft, slot(0))).toEqual({ type: 'splitter' })
    expect(pieceAt(draft, slot(2))).toBeUndefined()
    expect(putPiece(draft, slot(0), { type: 'splitter' })).toBe(draft)
  })

  it('take pieces off, closing gaps in the toolbox', () => {
    const draft = { ...level(), toolbox: [{ type: 'mirror' }, { type: 'prism' }] } as LevelFile
    expect(removePiece(draft, board(0)).objects).toEqual([{ type: 'coin', pos: 'A4', rgb: 'r' }])
    expect(removePiece(draft, slot(0)).toolbox).toEqual([{ type: 'prism' }])
    expect(removePiece(draft, board(5))).toBe(draft)
  })

  it('move pieces to free cells and between board and toolbox', () => {
    const draft = { ...level(), toolbox: [{ type: 'mirror' }, { type: 'prism' }] } as LevelFile
    expect(movePiece(draft, board(0), board(4)).objects).toContainEqual({
      type: 'laser',
      pos: 'B1',
      rot: 2,
      rgb: 'r',
    })
    expect(movePiece(draft, board(0), board(3))).toBe(draft)
    expect(movePiece(draft, board(5), board(6))).toBe(draft)
    const fixed = changePiece(draft, board(0), { moveable: true })
    const stowed = movePiece(fixed, board(0), slot(0))
    expect(stowed.toolbox.at(-1)).toEqual({ type: 'laser', rot: 2, rgb: 'r' })
    const placed = movePiece(draft, slot(1), board(6))
    expect(placed.toolbox).toEqual([{ type: 'mirror' }])
    expect(pieceAt(placed, board(6))).toEqual({ type: 'prism' })
    expect(movePiece(draft, slot(0), slot(5)).toolbox).toEqual([
      { type: 'prism' },
      { type: 'mirror' },
    ])
    expect(movePiece(draft, slot(1), slot(1))).toBe(draft)
  })

  it('change properties and leave the level alone when nothing changes', () => {
    const draft = level()
    const green = changePiece(draft, board(3), { rgb: 'g' })
    expect(pieceAt(green, board(3))).toEqual({ type: 'coin', rgb: 'g' })
    expect(changePiece(draft, board(3), { rgb: 'r' })).toBe(draft)
    expect(changePiece(draft, board(5), { rgb: 'g' })).toBe(draft)
    const plain = changePiece(draft, board(0), { rgb: undefined })
    expect(pieceAt(plain, board(0))).toEqual({ type: 'laser', rot: 2 })
  })

  it('keep the inner color of a complex, after its outer color', () => {
    const draft = putPiece(level(), board(4), { type: 'complex', inner: 'g', rgb: 'r', rot: 1 })
    expect(Object.keys(pieceAt(draft, board(4)) ?? {})).toEqual(['type', 'rot', 'rgb', 'inner'])
    const blue = changePiece(draft, board(4), { inner: 'b' })
    expect(pieceAt(blue, board(4))).toEqual({ type: 'complex', rot: 1, rgb: 'r', inner: 'b' })
    expect(changePiece(blue, board(4), { inner: 'b' })).toBe(blue)
  })

  it('rotate parts, run actors round their headings and leave the others', () => {
    let draft = putPiece(level(), board(4), { type: 'ship', rot: 2 })
    draft = rotatePiece(draft, board(4), 1)
    expect(pieceAt(draft, board(4))?.rot).toBe(6)
    draft = rotatePiece(draft, board(4), 1)
    expect(pieceAt(draft, board(4))?.rot).toBe(2)
    draft = rotatePiece(draft, board(0), -3)
    expect(pieceAt(draft, board(0))?.rot).toBe(7)
    const coin = rotatePiece(draft, board(3), 1)
    expect(coin).toBe(draft)
    expect(rotatePiece(draft, board(0), 0)).toBe(draft)
    const slime = rotatePiece(putPiece(draft, board(5), { type: 'slime' }), board(5), -1)
    expect(pieceAt(slime, board(5))?.rot).toBe(6)
  })

  it('resize the board and take off what no longer fits', () => {
    const draft = level()
    const narrow = resizeLevel(draft, 3, 2)
    expect(narrow.size).toEqual([3, 2])
    expect(narrow.objects).toEqual([{ type: 'laser', pos: 'A1', rot: 2, rgb: 'r' }])
    expect(resizeLevel(draft, 99, 0).size).toEqual([32, 1])
    expect(resizeLevel(draft, Number.NaN, 30).size).toEqual([1, 26])
    expect(resizeLevel(draft, 4, 2)).toBe(draft)
  })

  it('rename, note, solve and clear', () => {
    const draft = level()
    expect(renameLevel(draft, 'de', 'Probe').name).toEqual({ en: 'Test', de: 'Probe' })
    expect(renameLevel(draft, 'en', 'Test')).toBe(draft)
    const noted = noteLevel(draft, 'Why')
    expect(noted.note).toBe('Why')
    expect(noteLevel(noted, '')).not.toHaveProperty('note')
    expect(noteLevel(draft, '')).toBe(draft)
    const solved = solveLevel(draft, [{ wait: 3 }])
    expect(solved.solution).toEqual([{ wait: 3 }])
    expect(solveLevel(solved, undefined)).not.toHaveProperty('solution')
    const cleared = clearLevel({ ...solved, toolbox: [{ type: 'mirror' }] })
    expect(cleared).toMatchObject({ objects: [], toolbox: [], size: [4, 2], name: draft.name })
    expect(cleared).not.toHaveProperty('solution')
  })
})
