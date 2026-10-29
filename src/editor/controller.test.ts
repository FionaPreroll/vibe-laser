import { describe, expect, it, vi } from 'vitest'
import type { LevelFile } from '../content/schema'
import * as solution from '../content/solution'
import { EditorController } from './controller'

const PLAIN = { ctrl: false, shift: false }
const board = (cell: number) => ({ area: 'board', cell }) as const
const slot = (index: number) => ({ area: 'toolbox', slot: index }) as const

/** First Light on a 6 × 3 board: a mirror in B6, turned to 7, sends the laser's beam to A6. */
const FIRST_LIGHT: LevelFile = {
  version: 1,
  name: { en: 'First Light', de: 'Erstes Licht' },
  size: [6, 3],
  objects: [
    { type: 'coin', pos: 'A6', rgb: 'r' },
    { type: 'laser', pos: 'B1', rot: 2, rgb: 'r' },
  ],
  toolbox: [{ type: 'mirror', rot: 0 }],
  solution: [{ piece: 0, pos: 'B6', rot: 7 }],
}

const keys = (editor: EditorController, ...pressed: string[]) => {
  for (const key of pressed) editor.handleKey(key, PLAIN)
}
const problemKeys = (editor: EditorController) => editor.problems.value.map((each) => each.key)

describe('EditorController', () => {
  it('starts on an empty level that still needs a name and a coin', () => {
    const editor = new EditorController()
    expect(editor.level.value.size).toEqual([16, 11])
    expect(problemKeys(editor)).toEqual(['noName', 'noCoin'])
    expect(editor.canSave.value).toBe(false)
    expect(editor.solution.value).toEqual({ kind: 'none' })
    expect(editor.dirty.value).toBe(false)
  })

  it('opens a level with a working solution, ready to save', () => {
    const editor = new EditorController({ level: FIRST_LIGHT })
    expect(editor.problems.value).toEqual([])
    expect(editor.canSave.value).toBe(true)
    expect(editor.solution.value).toEqual({ kind: 'works', solved: 1, tried: 1 })
    expect(editor.finished()).toEqual(FIRST_LIGHT)
  })

  it('selects, paints, clones and erases with its tools', () => {
    const editor = new EditorController({ level: FIRST_LIGHT })
    editor.use(board(3))
    expect(editor.selected.value).toEqual(board(3))
    expect(editor.level.value.objects).toHaveLength(2)

    editor.tool.value = 'paint'
    editor.use(board(3))
    expect(editor.pieceAt(board(3))).toEqual({ type: 'mirror', rot: 0 })

    editor.change(board(3), { rot: 5 })
    editor.tool.value = 'clone'
    expect(editor.use(board(14))).toBe(false)
    editor.use(board(3))
    expect(editor.tool.value).toBe('paint')
    editor.use(board(4))
    expect(editor.pieceAt(board(4))).toEqual({ type: 'mirror', rot: 5 })

    editor.tool.value = 'erase'
    editor.use(board(4))
    expect(editor.pieceAt(board(4))).toBeUndefined()
    expect(editor.dirty.value).toBe(true)
  })

  it('undoes a painted stroke as one step', () => {
    const editor = new EditorController({ level: FIRST_LIGHT })
    editor.tool.value = 'paint'
    editor.brush.value = { type: 'explosive' }
    editor.beginStroke()
    for (const cell of [12, 13, 14]) editor.stroke(board(cell))
    editor.endStroke()
    expect(editor.level.value.objects).toHaveLength(5)
    editor.undo()
    expect(editor.level.value.objects).toHaveLength(2)
    editor.redo()
    expect(editor.level.value.objects).toHaveLength(5)
    editor.tool.value = 'select'
    expect(editor.stroke(board(15))).toBe(false)
  })

  it('puts parts down with their keys where the focus is', () => {
    const editor = new EditorController({ level: FIRST_LIGHT })
    keys(editor, 'ArrowDown', 'ArrowDown', 'ArrowRight', 'h')
    expect(editor.pieceAt(board(13))).toEqual({ type: 'blackHole' })
    expect(editor.selected.value).toEqual(board(13))
    expect(editor.brush.value).toEqual({ type: 'blackHole' })
    expect(editor.keyboardActive.value).toBe(true)
    keys(editor, 'ArrowRight', 'm', 'e', 'e', 'Q')
    expect(editor.pieceAt(board(14))).toEqual({ type: 'mirror', rot: 1 })
    keys(editor, 'Delete')
    expect(editor.pieceAt(board(14))).toBeUndefined()
    expect(editor.handleKey('x', PLAIN)).toBe(false)
    expect(editor.handleKey('ArrowDown', PLAIN)).toBe(false)
    keys(editor, 'Escape')
    expect(editor.selected.value).toBeUndefined()
  })

  it('uses the tool on Enter and undoes with Ctrl+Z', () => {
    const editor = new EditorController({ level: FIRST_LIGHT })
    editor.tool.value = 'erase'
    keys(editor, 'ArrowDown', 'Enter')
    expect(editor.pieceAt(board(6))).toBeUndefined()
    expect(editor.handleKey('z', { ctrl: true, shift: false })).toBe(true)
    expect(editor.pieceAt(board(6))?.type).toBe('laser')
    expect(editor.handleKey('Z', { ctrl: true, shift: true })).toBe(true)
    expect(editor.handleKey('y', { ctrl: true, shift: false })).toBe(false)
    expect(editor.handleKey('s', { ctrl: true, shift: false })).toBe(false)
  })

  it('moves the focus with the pointer and keeps it on the board', () => {
    const editor = new EditorController({ level: FIRST_LIGHT })
    editor.keyboardActive.value = true
    editor.point(slot(1))
    expect(editor.focusedPlace()).toEqual(slot(1))
    expect(editor.keyboardActive.value).toBe(false)
    editor.point(board(17))
    editor.resize(2, 2)
    expect(editor.focusedPlace()).toEqual(board(0))
  })

  it('moves pieces, and the selection with them', () => {
    const editor = new EditorController({ level: FIRST_LIGHT })
    expect(editor.move(slot(0), board(11))).toBe(true)
    expect(editor.selected.value).toEqual(board(11))
    expect(editor.move(board(11), slot(4))).toBe(true)
    expect(editor.selected.value).toEqual(slot(0))
    editor.put(slot(1), 'prism')
    expect(editor.move(slot(0), slot(5))).toBe(true)
    expect(editor.selected.value).toEqual(slot(1))
    expect(editor.move(board(6), board(5))).toBe(false)
  })

  it('always leaves a free toolbox slot to paint into', () => {
    const editor = new EditorController({
      level: { ...FIRST_LIGHT, toolbox: [{ type: 'mirror', count: 6 }] },
    })
    expect(editor.scene.value.puzzle.toolboxSize).toBe(7)
    expect(editor.scene.value.geometry.toolboxRows).toBe(4)
    expect(editor.finished().toolbox).toEqual([{ type: 'mirror', count: 6 }])
  })

  it('shows the light of the level as it stands', () => {
    const editor = new EditorController({ level: FIRST_LIGHT })
    expect(editor.scene.value.state.spinning.size).toBe(0)
    editor.move(slot(0), board(11))
    editor.rotate(board(11), -1)
    expect(editor.scene.value.state.spinning.size).toBe(1)
    // The mirror left the toolbox, so the solution lost its piece too.
    expect(problemKeys(editor)).toEqual(['solutionFails', 'startsSolved'])
  })

  it('names problems with the place they are on', () => {
    const editor = new EditorController({ level: FIRST_LIGHT })
    editor.change(board(6), { rgb: undefined })
    expect(editor.problems.value).toContainEqual({
      key: 'needsColor',
      kind: 'laser',
      at: board(6),
      blocking: true,
    })
    editor.change(board(6), { rgb: 'g' })
    editor.put(slot(1), 'filter')
    editor.change(slot(1), { rgb: undefined })
    expect(editor.problems.value).toContainEqual({
      key: 'needsColor',
      kind: 'filter',
      at: slot(1),
      blocking: true,
    })
  })

  it('warns when light reaches an explosive at the start', () => {
    const editor = new EditorController({ level: FIRST_LIGHT })
    editor.put(board(9), 'explosive')
    expect(problemKeys(editor)).toEqual(['startsExploding', 'solutionFails'])
  })

  it('knows when the recorded solution no longer works, and can forget it', () => {
    const editor = new EditorController({ level: FIRST_LIGHT })
    editor.put(board(8), 'explosive')
    editor.erase(board(8))
    expect(editor.solution.value.kind).toBe('works')
    editor.put(board(10), 'filter')
    editor.change(board(10), { rgb: 'g' })
    expect(editor.solution.value).toEqual({ kind: 'fails' })
    expect(editor.canSave.value).toBe(false)
    editor.setSolution(undefined)
    expect(editor.solution.value).toEqual({ kind: 'none' })
    editor.setSolution([{ piece: 3, pos: 'B6', rot: 7 }])
    expect(editor.solution.value).toEqual({ kind: 'fails' })
    expect(problemKeys(editor)).toEqual(['solutionFails'])
  })

  it('says when a solution works with some random seeds only', () => {
    const verify = vi.spyOn(solution, 'verifySolution').mockReturnValue({ solved: 5, tried: 8 })
    const editor = new EditorController({ level: FIRST_LIGHT })
    expect(editor.problems.value).toEqual([
      { key: 'solutionShaky', solved: 5, tried: 8, blocking: false },
    ])
    expect(editor.canSave.value).toBe(true)
    verify.mockRestore()
  })

  it('renames, notes, resizes, clears and takes in other levels, all undoable', () => {
    const editor = new EditorController({ level: FIRST_LIGHT })
    editor.rename('de', '')
    expect(problemKeys(editor)).toEqual(['noName'])
    editor.rename('de', 'Erstes Licht')
    editor.setNote('For testing')
    expect(editor.level.value.note).toBe('For testing')
    editor.setIntro('en', 'Mirrors turn light.')
    expect(problemKeys(editor)).toEqual(['halfIntro'])
    editor.setIntro('de', 'Spiegel lenken Licht.')
    expect(problemKeys(editor)).toEqual([])
    expect(editor.level.value.intro).toEqual({
      en: 'Mirrors turn light.',
      de: 'Spiegel lenken Licht.',
    })
    editor.clear()
    expect(editor.level.value.objects).toEqual([])
    editor.undo()
    editor.replace({ ...FIRST_LIGHT, name: { en: 'Copy', de: 'Kopie' } })
    expect(editor.level.value.name.en).toBe('Copy')
    expect(editor.selected.value).toBeUndefined()
    editor.undo()
    expect(editor.level.value.name.en).toBe('First Light')
    expect(editor.canUndo.value).toBe(true)
  })

  it('remembers what was saved', () => {
    const editor = new EditorController({ level: FIRST_LIGHT })
    editor.rename('en', 'Light')
    expect(editor.dirty.value).toBe(true)
    editor.markSaved()
    expect(editor.dirty.value).toBe(false)
    editor.rename('en', 'First Light')
    editor.rename('en', 'Light')
    expect(editor.dirty.value).toBe(false)
  })

  it('reports what a level file may not hold, by its path', () => {
    const coin = { type: 'coin', pos: 'A6', rgb: 'r', shine: true } as LevelFile['objects'][number]
    const editor = new EditorController({
      level: { ...FIRST_LIGHT, objects: [coin, ...FIRST_LIGHT.objects.slice(1)] },
    })
    expect(editor.problems.value[0]).toEqual({ key: 'invalid', place: 'objects.0', blocking: true })
  })
})
