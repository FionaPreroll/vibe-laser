// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/preact'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { findLevel } from '../../content/packs'
import type { LevelFile, PackFile } from '../../content/schema'
import { decodeLevel } from '../../content/share'
import type { EditorController } from '../../editor/controller'
import { PackShelf } from '../../persistence/packs'
import { memoryStore } from '../../persistence/store'
import { mountBoard } from '../../view/board'
import type { BoardController } from '../../view/controller'
import { mountEditorBoard } from '../../view/editorBoard'
import { screen as shown } from '../router'
import { clipboard, drafts } from './clipboard'
import { LevelEditor } from './LevelEditor'

vi.mock('../../view/editorBoard', () => ({ mountEditorBoard: vi.fn() }))
vi.mock('../../view/board', () => ({ mountBoard: vi.fn() }))
const editorMount = vi.mocked(mountEditorBoard)
const gameMount = vi.mocked(mountBoard)

const PACK: PackFile = {
  version: 1,
  title: { en: 'Mine', de: 'Meins' },
  position: 100,
  skills: [{ en: 'Easy', de: 'Leicht' }],
  selectSkill: true,
}

/** First Light: a mirror in B6, turned to 7, sends the laser's beam north to the coin in A6. */
const FIRST_LIGHT: LevelFile = {
  version: 1,
  name: { en: 'First Light', de: 'Erstes Licht' },
  size: [6, 3],
  objects: [
    { type: 'coin', pos: 'A6', rgb: 'r' },
    { type: 'laser', pos: 'B1', rot: 2, rgb: 'r' },
  ],
  toolbox: [{ type: 'mirror', rot: 0 }],
}

let shelf: PackShelf
const speaker = { play: vi.fn() }

beforeEach(async () => {
  editorMount.mockReset()
  editorMount.mockResolvedValue({ destroy: () => {} })
  gameMount.mockReset()
  gameMount.mockResolvedValue({ destroy: () => {} })
  shelf = await PackShelf.open(memoryStore(), { newId: () => 'my-1' })
  await shelf.create(PACK)
  await shelf.saveLevel('my-1', 1, 1, FIRST_LIGHT)
})
afterEach(async () => {
  cleanup()
  // Preact runs the cleanups of effects a moment after unmounting.
  await new Promise((resolve) => setTimeout(resolve, 20))
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  drafts.clear()
  clipboard.value = undefined
  shown.value = { name: 'packs' }
})

function open(slot = 1, props: { paused?: boolean; onHelp?: () => void } = {}) {
  editorMount.mockClear()
  gameMount.mockClear()
  return render(
    <LevelEditor
      pack="my-1"
      skill={1}
      slot={slot}
      shelf={shelf}
      speaker={speaker}
      paused={props.paused ?? false}
      onHelp={props.onHelp ?? (() => {})}
    />,
  )
}

/** The editor the screen handed to the board it mounted last. */
async function editorShown(): Promise<EditorController> {
  await waitFor(() => expect(editorMount).toHaveBeenCalled())
  const editor = editorMount.mock.lastCall?.[1]
  if (editor === undefined) throw new Error('No editor board')
  return editor
}

async function testRun(): Promise<BoardController> {
  await waitFor(() => expect(gameMount).toHaveBeenCalled())
  const controller = gameMount.mock.lastCall?.[1]
  if (controller === undefined) throw new Error('No game board')
  return controller
}

const button = (name: string) => screen.getByRole('button', { name }) as HTMLButtonElement

async function click(name: string) {
  await act(() => {
    fireEvent.click(button(name))
  })
}

const status = () => screen.getAllByRole('status')[0]?.textContent

describe('LevelEditor', () => {
  it('says when there is no such slot', () => {
    render(
      <LevelEditor
        pack="my-1"
        skill={2}
        slot={1}
        shelf={shelf}
        speaker={speaker}
        paused={false}
        onHelp={() => {}}
      />,
    )
    expect(screen.getByText('There is no level here.')).toBeTruthy()
    cleanup()
    open(31)
    expect(screen.getByText('There is no level here.')).toBeTruthy()
  })

  it('starts an empty slot with a new level that cannot be saved yet', async () => {
    open(2)
    const editor = await editorShown()
    expect(editor.level.value.size).toEqual([16, 11])
    expect(button('Save').disabled).toBe(true)
    expect(button('Delete level').disabled).toBe(true)
    expect(screen.getByText('The level needs a name in English and in German.')).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Mine · Easy · Level 2' })).toBeTruthy()
  })

  it('saves a level once nothing is wrong with it', async () => {
    open(2)
    const editor = await editorShown()
    await act(() => {
      editor.replace(FIRST_LIGHT)
    })
    expect(status()).toBe('Unsaved changes')
    await click('Save')
    await waitFor(() => expect(status()).toBe('Saved'))
    expect(shelf.find('my-1')?.levels['1/2']).toEqual(FIRST_LIGHT)
    expect(button('Delete level').disabled).toBe(false)
  })

  it('says when saving does not work', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    open()
    await editorShown()
    vi.spyOn(shelf, 'saveLevel').mockRejectedValue(new Error('Quota'))
    await click('Save')
    await waitFor(() => expect(status()).toBe('Saving did not work.'))
  })

  it('copies a level into another slot, and swaps two slots', async () => {
    const other = { ...FIRST_LIGHT, name: { en: 'Other', de: 'Anders' } }
    await shelf.saveLevel('my-1', 1, 3, other)
    open(1)
    await editorShown()
    expect(button('Paste').disabled).toBe(true)
    await click('Copy')
    expect(clipboard.value?.slot).toBe(1)
    expect(button('Swap with the copied level').disabled).toBe(true)
    cleanup()

    open(2)
    const empty = await editorShown()
    await click('Paste')
    expect(empty.level.value.name.en).toBe('First Light')
    expect(button('Swap with the copied level').disabled).toBe(true)
    cleanup()

    open(3)
    const third = await editorShown()
    await click('Swap with the copied level')
    await waitFor(() => expect(third.level.value.name.en).toBe('First Light'))
    expect(shelf.find('my-1')?.levels['1/1']?.name.en).toBe('Other')
    expect(shelf.find('my-1')?.levels['1/3']?.name.en).toBe('First Light')
    expect(clipboard.value).toBeUndefined()
    expect(status()).toBe('Saved')
  })

  it('swaps into an empty slot and leaves for the pack', async () => {
    clipboard.value = { level: FIRST_LIGHT, pack: 'my-1', skill: 1, slot: 7 }
    open(1)
    await editorShown()
    await click('Swap with the copied level')
    await waitFor(() => expect(shown.value).toEqual({ name: 'editPack', pack: 'my-1' }))
    expect(Object.keys(shelf.find('my-1')?.levels ?? {})).toEqual(['1/7'])
  })

  it('clears the board, and deletes the level after asking', async () => {
    open()
    const editor = await editorShown()
    await click('Clear')
    expect(editor.level.value.objects).toEqual([])
    await click('Undo')
    expect(editor.level.value.objects).toHaveLength(2)
    await click('Redo')
    await click('Undo')
    const confirm = vi.fn().mockReturnValueOnce(false).mockReturnValueOnce(true)
    vi.stubGlobal('confirm', confirm)
    await click('Delete level')
    expect(shelf.find('my-1')?.levels['1/1']).toBeDefined()
    await click('Delete level')
    await waitFor(() => expect(shown.value).toEqual({ name: 'editPack', pack: 'my-1' }))
    expect(shelf.find('my-1')?.levels).toEqual({})
  })

  it('exports the level as a file and imports level files', async () => {
    let blob: Blob | undefined
    vi.spyOn(URL, 'createObjectURL').mockImplementation((made) => {
      blob = made as Blob
      return 'blob:level'
    })
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
    const names: string[] = []
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      names.push(this.download)
    })
    open()
    const editor = await editorShown()
    await click('Export')
    expect(names).toEqual(['level_001.json'])
    expect(JSON.parse(await (blob?.text() ?? ''))).toEqual(FIRST_LIGHT)

    const input = screen.getByLabelText('Import a level')
    await act(() => {
      fireEvent.change(input, { target: { files: [new File(['{}'], 'other.json')] } })
    })
    await waitFor(() => expect(status()).toBe('That file is no level of this game.'))
    const other = { ...FIRST_LIGHT, name: { en: 'Imported', de: 'Importiert' } }
    await act(() => {
      fireEvent.change(input, { target: { files: [new File([JSON.stringify(other)], 'x.json')] } })
    })
    await waitFor(() => expect(editor.level.value.name.en).toBe('Imported'))
    expect(status()).toBe('Unsaved changes')
  })

  it('copies a link that carries the level, or offers it to copy by hand', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } })
    open()
    await editorShown()
    await click('Share link')
    await waitFor(() => expect(status()).toBe('Link copied. Anyone who opens it plays this level.'))
    const link = new URL(writeText.mock.lastCall?.[0] as string)
    const data = link.hash.replace('#/level/', '')
    expect(await decodeLevel(data)).toEqual(FIRST_LIGHT)

    writeText.mockRejectedValue(new Error('not allowed'))
    const prompt = vi.fn()
    vi.stubGlobal('prompt', prompt)
    await click('Share link')
    await waitFor(() => expect(prompt).toHaveBeenCalled())
    expect(prompt.mock.lastCall?.[1]).toBe(link.href)
  })

  it('asks before leaving unsaved changes, and keeps them when the page leaves the editor', async () => {
    open()
    const editor = await editorShown()
    await act(() => {
      editor.rename('en', 'Changed')
    })
    const confirm = vi.fn().mockReturnValueOnce(false)
    vi.stubGlobal('confirm', confirm)
    await click('Back to the pack')
    expect(confirm).toHaveBeenCalledWith('Leave without saving your changes?')
    expect(shown.value).not.toEqual({ name: 'editPack', pack: 'my-1' })

    // Leaving by the header unmounts the editor; the changes wait for the next visit.
    cleanup()
    await waitFor(() => expect(drafts.has('my-1/1/1')).toBe(true))
    open()
    const again = await editorShown()
    expect(again.level.value.name.en).toBe('Changed')
    expect(status()).toBe('Your unsaved changes to this level are back.')
    again.undo()
    expect(again.level.value.name.en).toBe('First Light')
    again.redo()

    confirm.mockReturnValueOnce(true)
    await click('Back to the pack')
    expect(shown.value).toEqual({ name: 'editPack', pack: 'my-1' })
    cleanup()
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(drafts.has('my-1/1/1')).toBe(false)
  })

  it('warns before the page closes with unsaved changes', async () => {
    open()
    const editor = await editorShown()
    const close = () => {
      const event = new Event('beforeunload', { cancelable: true })
      window.dispatchEvent(event)
      return event.defaultPrevented
    }
    expect(close()).toBe(false)
    await act(() => {
      editor.rename('en', 'Changed')
    })
    expect(close()).toBe(true)
  })

  it('tests the level and keeps the moves that solved it as its solution', async () => {
    const onHelp = vi.fn()
    open(1, { onHelp })
    const editor = await editorShown()
    await click('Test')
    expect(screen.getByText(/^Testing/)).toBeTruthy()
    expect(button('Save').disabled).toBe(true)
    const controller = await testRun()
    await click('Help')
    expect(onHelp).toHaveBeenCalled()
    await act(() => {
      controller.session.execute({ kind: 'move', item: 2, to: { area: 'board', cell: 10 } })
      controller.session.execute({ kind: 'move', item: 2, to: { area: 'board', cell: 11 } })
      controller.session.execute({ kind: 'rotate', item: 2, steps: -1 })
    })
    expect(speaker.play).toHaveBeenCalledWith('place')
    expect(screen.queryByRole('dialog', { name: 'Level solved' })).toBeNull()
    await screen.findByRole('dialog', { name: 'Level solved' }, { timeout: 3000 })
    await click('Play again')
    expect(controller.session.state.value.phase).toBe('playing')
    await act(() => {
      controller.session.execute({ kind: 'move', item: 2, to: { area: 'board', cell: 11 } })
      controller.session.execute({ kind: 'rotate', item: 2, steps: -1 })
    })
    await screen.findByRole('button', { name: 'Keep as solution' }, { timeout: 3000 })
    await click('Keep as solution')
    expect(screen.queryByText(/^Testing/)).toBeNull()
    expect(editor.level.value.solution).toEqual([{ piece: 0, pos: 'B6', rot: 7 }])
    expect(screen.getByText('The solution solves the level.')).toBeTruthy()
  })

  it('draws the level in the look of its pack, while editing and while testing', async () => {
    await shelf.updatePack('my-1', { ...PACK, skin: 'neon' })
    open()
    await editorShown()
    expect(editorMount.mock.lastCall?.[2]).toMatchObject({ id: 'neon' })
    await click('Test')
    await testRun()
    expect(gameMount.mock.lastCall?.[2]).toMatchObject({ id: 'neon' })
  })

  it('shows the intro for players while testing', async () => {
    const intro = { en: 'Mirrors turn light.', de: 'Spiegel lenken Licht.' }
    await shelf.saveLevel('my-1', 1, 2, { ...FIRST_LIGHT, intro })
    open(2)
    await editorShown()
    await click('Test')
    await testRun()
    expect(screen.getByText('Mirrors turn light.')).toBeTruthy()
  })

  it('goes back to editing from a test, with Exit, the banner or the dialog', async () => {
    open()
    await editorShown()
    await click('Test')
    await testRun()
    await click('Exit')
    expect(screen.queryByText(/^Testing/)).toBeNull()
    await click('Test')
    await act(() => {
      fireEvent.click(screen.getAllByRole('button', { name: 'Back to editing' })[0] as Element)
    })
    expect(screen.queryByText(/^Testing/)).toBeNull()
  })

  it('keeps the level and its history when the screen renders again', async () => {
    const view = open()
    const editor = await editorShown()
    await act(() => {
      editor.rename('en', 'Changed')
    })
    view.rerender(
      <LevelEditor
        pack="my-1"
        skill={1}
        slot={1}
        shelf={shelf}
        speaker={speaker}
        paused={true}
        onHelp={() => {}}
      />,
    )
    await click('Save')
    await waitFor(() => expect(status()).toBe('Saved'))
    expect(editorMount).toHaveBeenCalledTimes(1)
    expect(editor.level.value.name.en).toBe('Changed')
    expect(editor.canUndo.value).toBe(true)
  })

  it('pauses a test while help or the settings are open', async () => {
    const view = open(1, { paused: true })
    await editorShown()
    await click('Test')
    const controller = await testRun()
    expect(controller.paused.value).toBe(true)
    view.rerender(
      <LevelEditor
        pack="my-1"
        skill={1}
        slot={1}
        shelf={shelf}
        speaker={speaker}
        paused={false}
        onHelp={() => {}}
      />,
    )
    await waitFor(() => expect(controller.paused.value).toBe(false))
  })

  it('offers a fresh start or the way back when a test explodes', async () => {
    const level = await findLevel('tutorial/3/1')?.entry.load()
    if (level === undefined) throw new Error('No level tutorial/3/1')
    await shelf.saveLevel('my-1', 1, 4, level.file)
    open(4)
    await editorShown()
    await click('Test')
    const controller = await testRun()
    await act(() => {
      // The mirror in A1, turned to send the beam east, lights the explosive in A3.
      controller.session.execute({ kind: 'move', item: 3, to: { area: 'board', cell: 0 } })
      controller.session.execute({ kind: 'rotate', item: 3, steps: 3 })
      for (let tick = 0; tick < 5; tick++) controller.session.tick()
    })
    const dialog = await screen.findByRole('alertdialog', { name: 'Explosion' }, { timeout: 2000 })
    expect(dialog.textContent).toContain('Back to editing')
    await act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Start again' }))
    })
    expect(controller.session.state.value.phase).toBe('playing')
    expect(dialog.isConnected).toBe(false)
  })

  it('says when a level cannot be loaded', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const entry = findLevel('tutorial/1/2')?.entry
    if (entry === undefined) throw new Error('No level tutorial/1/2')
    vi.spyOn(entry, 'load').mockRejectedValue(new Error('Broken'))
    render(
      <LevelEditor
        pack="tutorial"
        skill={1}
        slot={1}
        shelf={shelf}
        speaker={speaker}
        paused={false}
        onHelp={() => {}}
      />,
    )
    expect(await screen.findByText('This level could not be loaded.')).toBeTruthy()
  })
})
