// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/preact'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { exportBackup } from '../persistence/backup'
import { PackShelf } from '../persistence/packs'
import { ProfileBook } from '../persistence/profiles'
import { memoryStore } from '../persistence/store'
import { SaveBackup } from './SaveBackup'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

async function saves(name: string) {
  const store = memoryStore()
  let count = 0
  const book = await ProfileBook.open(store, { name, newId: () => `${name}-${++count}` })
  const shelf = await PackShelf.open(store)
  return { book, shelf }
}

const input = () => screen.getByLabelText('Load a backup') as HTMLInputElement
const load = (text: string) =>
  act(() => void fireEvent.change(input(), { target: { files: [new File([text], 'b.json')] } }))

describe('SaveBackup', () => {
  it('saves a backup file named after the day', async () => {
    const { book, shelf } = await saves('Fiona')
    render(<SaveBackup book={book} shelf={shelf} />)
    const files: Blob[] = []
    vi.spyOn(URL, 'createObjectURL').mockImplementation((blob) => {
      files.push(blob as Blob)
      return 'blob:backup'
    })
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
    const downloads: string[] = []
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      downloads.push(this.download)
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save a backup' }))
    expect(downloads).toHaveLength(1)
    expect(downloads[0]).toMatch(/^laser-ray-backup-\d{4}-\d\d-\d\d\.json$/)
    expect(JSON.parse(await (files[0] as Blob).text())).toMatchObject({
      format: 'vibe-laser-backup',
      saves: { profiles: [{ name: 'Fiona' }] },
      packs: [],
    })
  })

  it('loads a backup in place of everything once the player agrees', async () => {
    const theirs = await saves('Fiona')
    await theirs.book.markSolved('tutorial/1/1')
    const backup = exportBackup(theirs.book, theirs.shelf)
    const { book, shelf } = await saves('Sam')
    const ask = vi.fn(() => false)
    const { rerender } = render(<SaveBackup book={book} shelf={shelf} ask={ask} />)
    await load(backup)
    await waitFor(() =>
      expect(ask).toHaveBeenCalledWith(
        'Replace every profile and your own packs here with those of the backup (profiles: 1, packs: 0)? What is not in the backup is lost.',
      ),
    )
    expect(book.active.value.name).toBe('Sam')
    expect(screen.queryByRole('status')).toBeNull()

    ask.mockReturnValue(true)
    rerender(<SaveBackup book={book} shelf={shelf} ask={ask} />)
    await load(backup)
    await waitFor(() => expect(book.active.value.name).toBe('Fiona'))
    expect(book.data.value).toEqual(theirs.book.data.value)
    expect((await screen.findByRole('status')).textContent).toBe('The backup is loaded.')
  })

  it('adds a single exported profile, and refuses other files', async () => {
    const theirs = await saves('Fiona')
    const { book, shelf } = await saves('Sam')
    const ask = vi.fn(() => true)
    render(<SaveBackup book={book} shelf={shelf} ask={ask} />)
    await load(theirs.book.exportProfile('Fiona-1'))
    await waitFor(() => expect(book.data.value.profiles).toHaveLength(2))
    expect(ask).not.toHaveBeenCalled()
    expect((await screen.findByRole('status')).textContent).toBe(
      'The file held one profile; it is added to the others.',
    )
    await load('{}')
    expect((await screen.findByRole('alert')).textContent).toBe(
      'That file is no backup of this game.',
    )
    expect(book.data.value.profiles).toHaveLength(2)
  })
})
