// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/preact'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { LevelFile } from '../../content/schema'
import * as solution from '../../content/solution'
import { EditorController } from '../../editor/controller'
import { CommitField, NumberField } from './fields'
import {
  LevelPanel,
  PalettePanel,
  PiecePanel,
  ProblemsPanel,
  SolutionPanel,
  ToolPanel,
} from './panels'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

const board = (cell: number) => ({ area: 'board', cell }) as const
const slot = (index: number) => ({ area: 'toolbox', slot: index }) as const

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

const checkbox = (name: string) => screen.getByRole('checkbox', { name }) as HTMLInputElement

describe('CommitField', () => {
  it('hands on what was typed once the field is done, and follows outside changes', async () => {
    const onCommit = vi.fn()
    const { rerender } = render(<CommitField label="Name" value="Old" onCommit={onCommit} />)
    const field = screen.getByRole('textbox', { name: 'Name' }) as HTMLInputElement
    await act(() => {
      fireEvent.input(field, { target: { value: 'New' } })
    })
    expect(onCommit).not.toHaveBeenCalled()
    fireEvent.change(field, { target: { value: 'New' } })
    expect(onCommit).toHaveBeenCalledWith('New')
    rerender(<CommitField label="Name" value="Undone" onCommit={onCommit} />)
    await act(() => {})
    expect(field.value).toBe('Undone')
  })

  it('offers a text area for longer notes', () => {
    const onCommit = vi.fn()
    render(<CommitField label="Note" value="" multiline onCommit={onCommit} />)
    const area = screen.getByRole('textbox', { name: 'Note' })
    expect(area.tagName).toBe('TEXTAREA')
    fireEvent.change(area, { target: { value: 'Why' } })
    expect(onCommit).toHaveBeenCalledWith('Why')
  })
})

describe('NumberField', () => {
  it('hands on numbers and goes back to the value for anything else', async () => {
    const onCommit = vi.fn()
    render(<NumberField label="Rows" value={3} min={1} max={26} onCommit={onCommit} />)
    const field = screen.getByRole('spinbutton', { name: 'Rows' }) as HTMLInputElement
    fireEvent.change(field, { target: { value: '5' } })
    expect(onCommit).toHaveBeenCalledWith(5)
    await act(() => {
      fireEvent.change(field, { target: { value: '' } })
    })
    expect(onCommit).toHaveBeenCalledTimes(1)
    expect(field.value).toBe('3')
  })
})

describe('ToolPanel and PalettePanel', () => {
  it('choose the tool and the part to paint with', async () => {
    const editor = new EditorController({ level: FIRST_LIGHT })
    render(
      <>
        <ToolPanel editor={editor} />
        <PalettePanel editor={editor} />
      </>,
    )
    await act(() => {
      fireEvent.click(screen.getByRole('radio', { name: 'Eraser' }))
    })
    expect(editor.tool.value).toBe('erase')
    const hole = screen.getByRole('button', { name: 'Black hole (H)' })
    expect(hole.getAttribute('aria-pressed')).toBe('false')
    await act(() => {
      fireEvent.click(hole)
    })
    expect(editor.tool.value).toBe('paint')
    expect(editor.brush.value).toEqual({ type: 'blackHole' })
    expect(hole.getAttribute('aria-pressed')).toBe('true')
    expect(screen.getAllByRole('button')).toHaveLength(25)
  })
})

describe('PiecePanel', () => {
  it('asks for a place, then tells an empty one', async () => {
    const editor = new EditorController({ level: FIRST_LIGHT })
    render(<PiecePanel editor={editor} />)
    expect(screen.getByText(/Click a cell or a toolbox slot/)).toBeTruthy()
    await act(() => {
      editor.selected.value = board(8)
    })
    expect(screen.getByText(/B3 is empty/)).toBeTruthy()
    await act(() => {
      editor.selected.value = slot(3)
    })
    expect(screen.getByText(/toolbox slot 4 is empty/)).toBeTruthy()
  })

  it('switches the colors of a laser on and off', async () => {
    const editor = new EditorController({ level: FIRST_LIGHT })
    editor.selected.value = board(6)
    render(<PiecePanel editor={editor} />)
    expect(screen.getByText('Laser on B1')).toBeTruthy()
    expect([checkbox('Red').checked, checkbox('Green').checked]).toEqual([true, false])
    await act(() => {
      fireEvent.click(checkbox('Blue'))
    })
    expect(editor.pieceAt(board(6))?.rgb).toBe('rb')
    await act(() => {
      fireEvent.click(checkbox('Red'))
      fireEvent.click(checkbox('Blue'))
    })
    expect(editor.pieceAt(board(6))?.rgb).toBeUndefined()
  })

  it('switches the outer and the inner color of a complex apart', async () => {
    const editor = new EditorController({
      level: {
        ...FIRST_LIGHT,
        objects: [
          ...FIRST_LIGHT.objects,
          { type: 'complex', pos: 'C2', rot: 0, rgb: 'r', inner: 'g' },
        ],
      },
    })
    editor.selected.value = board(13)
    render(<PiecePanel editor={editor} />)
    expect(screen.getByText('Complex on C2')).toBeTruthy()
    const outer = within(screen.getByRole('group', { name: 'Outer color' }))
    const inner = within(screen.getByRole('group', { name: 'Inner color' }))
    expect((inner.getByRole('checkbox', { name: 'Green' }) as HTMLInputElement).checked).toBe(true)
    await act(() => {
      fireEvent.click(inner.getByRole('checkbox', { name: 'Blue' }))
      fireEvent.click(outer.getByRole('checkbox', { name: 'Green' }))
    })
    expect(editor.pieceAt(board(13))).toMatchObject({ rgb: 'rg', inner: 'gb' })
  })

  it('turns pieces and sets what players may do with them', async () => {
    const editor = new EditorController({ level: FIRST_LIGHT })
    editor.selected.value = board(6)
    render(<PiecePanel editor={editor} />)
    expect(screen.getByText('Direction: east')).toBeTruthy()
    await act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Rotate right' }))
    })
    expect(screen.getByText('Direction: south-east')).toBeTruthy()
    await act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Rotate left' }))
      fireEvent.click(screen.getByRole('button', { name: 'Rotate left' }))
    })
    expect(editor.pieceAt(board(6))?.rot).toBe(1)
    expect(checkbox('Players can move it').checked).toBe(false)
    await act(() => {
      fireEvent.click(checkbox('Players can move it'))
      fireEvent.click(checkbox('Players can turn it'))
    })
    expect(editor.pieceAt(board(6))).toMatchObject({ moveable: true, rotateable: true })
    await act(() => {
      fireEvent.click(checkbox('Players can move it'))
    })
    expect(editor.pieceAt(board(6))).not.toHaveProperty('moveable')
  })

  it('keeps toolbox pieces free by default, and parts without a direction unturnable', async () => {
    const editor = new EditorController({ level: FIRST_LIGHT })
    editor.put(slot(1), 'filter')
    render(<PiecePanel editor={editor} />)
    expect(checkbox('Players can move it').checked).toBe(true)
    expect(checkbox('Players can turn it').disabled).toBe(true)
    expect(screen.queryByText(/^Direction/)).toBeNull()
    await act(() => {
      fireEvent.click(checkbox('Players can move it'))
    })
    expect(editor.pieceAt(slot(1))).toMatchObject({ moveable: false })
    await act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Remove' }))
    })
    expect(editor.pieceAt(slot(1))).toBeUndefined()
  })

  it('lets actors head only their ways', async () => {
    const editor = new EditorController({ level: FIRST_LIGHT })
    editor.put(board(13), 'ship')
    render(<PiecePanel editor={editor} />)
    const heading = screen.getByRole('combobox', { name: 'Heading' }) as HTMLSelectElement
    expect([...heading.options].map((option) => option.textContent)).toEqual(['east', 'west'])
    await act(() => {
      fireEvent.change(heading, { target: { value: '6' } })
    })
    expect(editor.pieceAt(board(13))?.rot).toBe(6)
  })
})

describe('LevelPanel', () => {
  it('renames the level, writes its intro, notes it and resizes the board', async () => {
    const editor = new EditorController({ level: FIRST_LIGHT })
    render(<LevelPanel editor={editor} />)
    fireEvent.change(screen.getByRole('textbox', { name: 'Name (German)' }), {
      target: { value: ' Licht ' },
    })
    expect(editor.level.value.name.de).toBe('Licht')
    fireEvent.change(screen.getByRole('textbox', { name: 'Note for other authors' }), {
      target: { value: 'Mirrors' },
    })
    expect(editor.level.value.note).toBe('Mirrors')
    fireEvent.change(screen.getByRole('textbox', { name: 'Intro for players (English)' }), {
      target: { value: ' Mirrors turn light. ' },
    })
    fireEvent.change(screen.getByRole('textbox', { name: 'Intro for players (German)' }), {
      target: { value: 'Spiegel lenken Licht.' },
    })
    expect(editor.level.value.intro).toEqual({
      en: 'Mirrors turn light.',
      de: 'Spiegel lenken Licht.',
    })
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Columns' }), {
      target: { value: '8' },
    })
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Rows' }), { target: { value: '4' } })
    expect(editor.level.value.size).toEqual([8, 4])
    fireEvent.change(screen.getByRole('textbox', { name: 'Name (English)' }), {
      target: { value: 'Light' },
    })
    expect(editor.level.value.name.en).toBe('Light')
  })
})

describe('SolutionPanel', () => {
  it('tells whether the level has a solution that works, and forgets it', async () => {
    const editor = new EditorController({ level: FIRST_LIGHT })
    render(<SolutionPanel editor={editor} />)
    expect(screen.getByText('The solution solves the level.')).toBeTruthy()
    await act(() => {
      editor.setSolution([{ piece: 0, pos: 'C6', rot: 7 }])
    })
    expect(screen.getByText(/does not solve the level any more/)).toBeTruthy()
    await act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Forget the solution' }))
    })
    expect(screen.getByText(/No solution yet/)).toBeTruthy()
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('names the random seeds a level with mines was checked with', () => {
    vi.spyOn(solution, 'verifySolution').mockReturnValue({ solved: 8, tried: 8 })
    render(<SolutionPanel editor={new EditorController({ level: FIRST_LIGHT })} />)
    expect(
      screen.getByText('The solution solves the level with each of 8 random seeds.'),
    ).toBeTruthy()
  })
})

describe('ProblemsPanel', () => {
  it('lists problems in the player language and selects the place one is on', async () => {
    const editor = new EditorController({ level: FIRST_LIGHT })
    render(<ProblemsPanel editor={editor} />)
    expect(screen.getByText('None: the level can be saved.')).toBeTruthy()
    await act(() => {
      editor.change(board(6), { rgb: undefined })
      editor.rename('en', '')
    })
    const list = screen.getByRole('list')
    expect(
      within(list)
        .getAllByRole('listitem')
        .map((item) => item.textContent),
    ).toEqual([
      'The level needs a name in English and in German.',
      'B1: Laser needs a color.',
      'The solution does not solve the level.',
    ])
    await act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'B1: Laser needs a color.' }))
    })
    expect(editor.selected.value).toEqual(board(6))
  })

  it('shows warnings apart from what blocks saving', () => {
    vi.spyOn(solution, 'verifySolution').mockReturnValue({ solved: 3, tried: 8 })
    render(<ProblemsPanel editor={new EditorController({ level: FIRST_LIGHT })} />)
    const warning = screen.getByText(/only 3 of 8 random seeds/)
    expect(warning.className).toBe('warning')
  })
})
