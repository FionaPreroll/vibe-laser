// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/preact'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { findLevel } from '../../content/packs'
import type { LevelFile, PackFile } from '../../content/schema'
import { PackShelf } from '../../persistence/packs'
import { memoryStore } from '../../persistence/store'
import { screen as shown } from '../router'
import { EditorHome } from './EditorHome'
import { PackEditor } from './PackEditor'
import { builtInPacks, sourceOf } from './sources'

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
  name: { en: 'Corner', de: 'Ecke' },
  size: [3, 1],
  objects: [
    { type: 'laser', pos: 'A1', rot: 2, rgb: 'r' },
    { type: 'coin', pos: 'A3', rgb: 'r' },
  ],
  toolbox: [],
}

let shelf: PackShelf

beforeEach(async () => {
  let count = 0
  shelf = await PackShelf.open(memoryStore(), { newId: () => `my-${++count}` })
})
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

const button = (name: string | RegExp) => screen.getByRole('button', { name })

async function click(name: string | RegExp) {
  await act(() => {
    fireEvent.click(button(name))
  })
}

/** Catches files handed to the player for saving. */
function downloads() {
  const files: { name: string; text: Promise<string> }[] = []
  let blob: Blob | undefined
  vi.spyOn(URL, 'createObjectURL').mockImplementation((made) => {
    blob = made as Blob
    return 'blob:file'
  })
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
    this: HTMLAnchorElement,
  ) {
    files.push({ name: this.download, text: blob?.text() ?? Promise.resolve('') })
  })
  return files
}

describe('EditorHome', () => {
  it('lists the player packs with their levels and makes a new one', async () => {
    await shelf.create(PACK)
    await shelf.saveLevel('my-1', 1, 1, LEVEL)
    render(<EditorHome shelf={shelf} />)
    expect(button(/^Mine/).textContent).toContain('1 level')
    await act(() => {
      fireEvent.input(screen.getByRole('textbox', { name: 'New pack' }), {
        target: { value: '  ' },
      })
    })
    await click('Create')
    expect(shelf.packs.value).toHaveLength(1)
    await act(() => {
      fireEvent.input(screen.getByRole('textbox', { name: 'New pack' }), {
        target: { value: 'Second' },
      })
    })
    await click('Create')
    await waitFor(() => expect(shown.value).toEqual({ name: 'editPack', pack: 'my-2' }))
    expect(shelf.find('my-2')?.pack).toMatchObject({
      title: { en: 'Second', de: 'Second' },
      skills: [{ en: 'Levels', de: 'Level' }],
    })
    expect(button(/^Second/).textContent).toContain('0 levels')
  })

  it('imports a pack file and refuses other files', async () => {
    await shelf.create(PACK)
    render(<EditorHome shelf={shelf} />)
    const input = screen.getByLabelText('Import a pack')
    await act(() => {
      fireEvent.change(input, { target: { files: [new File(['{}'], 'other.json')] } })
    })
    expect(await screen.findByRole('alert')).toBeTruthy()
    const exported = new File([shelf.exportPack('my-1')], 'mine.vlpack.json')
    await act(() => {
      fireEvent.change(input, { target: { files: [exported] } })
    })
    await waitFor(() => expect(shown.value).toEqual({ name: 'editPack', pack: 'my-2' }))
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('offers the built-in packs while the dev server runs', async () => {
    render(<EditorHome shelf={shelf} />)
    expect(screen.getByText('No packs yet.')).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Built-in packs' })).toBeTruthy()
    await click(/^Tutorial/)
    expect(shown.value).toEqual({ name: 'editPack', pack: 'tutorial' })
    await click('Back')
    expect(shown.value).toEqual({ name: 'packs' })
    expect(builtInPacks().map((pack) => pack.id)).toContain('tutorial')
  })
})

describe('PackEditor', () => {
  it('shows the slots of each skill and opens one', async () => {
    await shelf.create(PACK)
    await shelf.saveLevel('my-1', 2, 3, LEVEL)
    render(<PackEditor pack="my-1" shelf={shelf} />)
    expect(screen.getByRole('heading', { name: 'Mine' })).toBeTruthy()
    expect(await screen.findByRole('button', { name: '1. Empty' })).toBeTruthy()
    expect(button('1. Easy').getAttribute('aria-pressed')).toBe('true')
    await click('2. Hard')
    expect(button('3. Corner')).toBeTruthy()
    await click('3. Corner')
    expect(shown.value).toEqual({ name: 'editLevel', pack: 'my-1', skill: 2, slot: 3 })
    await click('30. Empty')
    expect(shown.value).toEqual({ name: 'editLevel', pack: 'my-1', skill: 2, slot: 30 })
  })

  it('saves its settings once titles and skills have names', async () => {
    await shelf.create(PACK)
    render(<PackEditor pack="my-1" shelf={shelf} />)
    const german = screen.getByRole('textbox', { name: 'Title (German)' })
    await act(() => {
      fireEvent.input(german, { target: { value: '' } })
    })
    await click('Save pack settings')
    expect(screen.getByRole('status').textContent).toBe(
      'Every title, skill and description needs its English and its German text.',
    )
    await act(() => {
      fireEvent.input(screen.getByRole('textbox', { name: 'Title (German)' }), {
        target: { value: 'Meine' },
      })
      fireEvent.input(screen.getByRole('textbox', { name: 'Description (English)' }), {
        target: { value: 'Mirrors only' },
      })
      fireEvent.input(screen.getByRole('textbox', { name: 'Description (German)' }), {
        target: { value: 'Nur Spiegel' },
      })
      fireEvent.click(screen.getByRole('checkbox', { name: 'Players choose a skill first' }))
    })
    await click('Save pack settings')
    await waitFor(() => expect(screen.getByRole('status').textContent).toBe('Saved'))
    expect(shelf.find('my-1')?.pack).toMatchObject({
      title: { en: 'Mine', de: 'Meine' },
      description: { en: 'Mirrors only', de: 'Nur Spiegel' },
      selectSkill: false,
    })
    await act(() => {
      fireEvent.input(screen.getByRole('textbox', { name: 'Description (English)' }), {
        target: { value: '' },
      })
      fireEvent.input(screen.getByRole('textbox', { name: 'Description (German)' }), {
        target: { value: '' },
      })
    })
    await click('Save pack settings')
    await waitFor(() => expect(shelf.find('my-1')?.pack).not.toHaveProperty('description'))
  })

  it('adds skills up to four and removes the last, asking when it has levels', async () => {
    await shelf.create(PACK)
    await shelf.saveLevel('my-1', 2, 1, LEVEL)
    render(<PackEditor pack="my-1" shelf={shelf} />)
    await screen.findByRole('button', { name: '1. Empty' })
    await click('Add a skill')
    await click('Add a skill')
    expect(button('Add a skill')).toHaveProperty('disabled', true)
    expect(screen.getByRole('textbox', { name: 'Skill 4 (German)' })).toHaveProperty(
      'value',
      'Level',
    )
    await act(() => {
      fireEvent.input(screen.getByRole('textbox', { name: 'Skill 3 (English)' }), {
        target: { value: 'Third' },
      })
    })
    await click('Remove the last skill')
    await click('Remove the last skill')
    const confirm = vi.fn().mockReturnValueOnce(false).mockReturnValueOnce(true)
    vi.stubGlobal('confirm', confirm)
    await click('Remove the last skill')
    expect(confirm).toHaveBeenCalledWith('Remove skill 2 and its levels?')
    expect(screen.getByRole('textbox', { name: 'Skill 2 (English)' })).toBeTruthy()
    await click('Remove the last skill')
    expect(button('Remove the last skill')).toHaveProperty('disabled', true)
    await click('Save pack settings')
    await waitFor(() => expect(shelf.find('my-1')?.levels).toEqual({}))
  })

  it('exports the pack and deletes it after asking', async () => {
    await shelf.create(PACK)
    render(<PackEditor pack="my-1" shelf={shelf} />)
    const files = downloads()
    await click('Export pack')
    expect(files[0]?.name).toBe('Mine.vlpack.json')
    expect(JSON.parse(await (files[0]?.text ?? ''))).toMatchObject({ format: 'vibe-laser-pack' })
    const confirm = vi.fn().mockReturnValueOnce(false).mockReturnValueOnce(true)
    vi.stubGlobal('confirm', confirm)
    await click('Delete pack')
    expect(shelf.packs.value).toHaveLength(1)
    await click('Delete pack')
    await waitFor(() => expect(shelf.packs.value).toEqual([]))
    expect(shown.value).toEqual({ name: 'editor' })
  })

  it('edits built-in packs through the dev server, without export or delete', async () => {
    const fetch = vi.fn(async () => new Response(null, { status: 204 }))
    vi.stubGlobal('fetch', fetch)
    render(<PackEditor pack="tutorial" shelf={shelf} />)
    expect(await screen.findByRole('button', { name: '1. First Light' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Export pack' })).toBeNull()
    await click('Save pack settings')
    await waitFor(() => expect(screen.getByRole('status').textContent).toBe('Saved'))
    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('/__vibe-laser/packs/tutorial')
    const sent = JSON.parse(String(init.body))
    expect(Object.keys(sent)[0]).toBe('$schema')
    expect(sent).not.toHaveProperty('selectSkill')
  })

  it('says when saving does not work', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.stubGlobal('fetch', async () => new Response('no', { status: 500 }))
    render(<PackEditor pack="tutorial" shelf={shelf} />)
    await click('Save pack settings')
    await waitFor(() => expect(screen.getByRole('status').textContent).toBe('Saving did not work.'))
  })

  it('says when there is no such pack, and logs levels it cannot load', async () => {
    render(<PackEditor pack="my-9" shelf={shelf} />)
    expect(screen.getByText('There is no level here.')).toBeTruthy()
    cleanup()
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const entry = findLevel('tutorial/1/2')?.entry
    if (entry === undefined) throw new Error('No level tutorial/1/2')
    vi.spyOn(entry, 'load').mockRejectedValue(new Error('Broken'))
    render(<PackEditor pack="tutorial" shelf={shelf} />)
    await waitFor(() => expect(console.error).toHaveBeenCalled())
    expect(screen.getByText('Loading…')).toBeTruthy()
  })
})

describe('sources', () => {
  it('save levels of the player packs without a schema reference', async () => {
    await shelf.create(PACK)
    const source = sourceOf('my-1', shelf)
    await source?.saveLevel(1, 1, { $schema: 'x', ...LEVEL })
    expect(shelf.find('my-1')?.levels['1/1']).toEqual(LEVEL)
    await source?.deleteLevel(1, 1)
    expect(shelf.find('my-1')?.levels).toEqual({})
    await source?.savePack({ $schema: 'x', ...PACK })
    expect(shelf.find('my-1')?.pack).toEqual(PACK)
  })

  it('save built-in levels with the schema reference editors need', async () => {
    const fetch = vi.fn(async () => new Response(null, { status: 204 }))
    vi.stubGlobal('fetch', fetch)
    const source = sourceOf('tutorial', shelf)
    expect(source?.builtIn).toBe(true)
    await source?.saveLevel(1, 2, LEVEL)
    await source?.deleteLevel(1, 2)
    const [, init] = fetch.mock.calls[0] as unknown as [string, RequestInit]
    expect(JSON.parse(String(init.body)).$schema).toBe('../../../level.schema.json')
    expect((fetch.mock.calls[1] as unknown as [string, RequestInit])[1].method).toBe('DELETE')
    expect(sourceOf('nowhere', shelf)).toBeUndefined()
  })
})
