// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/preact'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { findLevel, type Pack } from '../../content/packs'
import { ProfileBook } from '../../persistence/profiles'
import { memoryStore } from '../../persistence/store'
import { screen as shown } from '../router'
import { AboutScreen, renderChangelog } from './AboutScreen'
import { LevelsScreen } from './LevelsScreen'
import { openPack, PacksScreen } from './PacksScreen'
import { ProfilesScreen } from './ProfilesScreen'
import { SkillsScreen } from './SkillsScreen'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

const button = (name: string | RegExp) => screen.getByRole('button', { name })

describe('PacksScreen', () => {
  it('lists the packs with their progress and opens one', () => {
    render(<PacksScreen solved={new Set(['tutorial/1/1', 'tutorial/3/2'])} />)
    const tutorial = button(/^Tutorial/)
    expect(tutorial.textContent).toContain('Every part of the game, one level at a time.')
    expect(tutorial.textContent).toContain('2 of 23 solved')
    fireEvent.click(tutorial)
    expect(shown.value).toEqual({ name: 'skills', pack: 'tutorial' })
  })

  it('shows each pack with a banner in the style of its selection screen', () => {
    render(<PacksScreen solved={new Set()} />)
    const banner = (name: RegExp) => button(name).querySelector('.card-banner')?.className
    expect(banner(/^Tutorial/)).toBe('card-banner banner-school')
    expect(banner(/^Lightworks/)).toBe('card-banner banner-lab')
  })

  it('opens a pack without a choice of skills at its levels', () => {
    const pack = (skills: number, selectSkill: boolean): Pack => {
      const names = Array.from({ length: skills }, () => ({ en: 'Any', de: 'Alle' }))
      return {
        id: 'extra',
        file: {
          version: 1,
          title: { en: 'Extra', de: 'Extra' },
          position: 2,
          skills: names,
          selectSkill,
        },
        skills: names.map((name, index) => ({ number: index + 1, name, levels: [] })),
      }
    }
    openPack(pack(1, true))
    expect(shown.value).toEqual({ name: 'levels', pack: 'extra', skill: 1 })
    openPack(pack(3, true))
    expect(shown.value).toEqual({ name: 'skills', pack: 'extra' })
    openPack(pack(3, false))
    expect(shown.value).toEqual({ name: 'levels', pack: 'extra', skill: 1 })
  })
})

describe('SkillsScreen', () => {
  it('lists the skills of a pack with their progress', () => {
    render(<SkillsScreen pack="tutorial" solved={new Set(['tutorial/2/1'])} onHelp={() => {}} />)
    expect(screen.getByRole('heading', { name: 'Tutorial' })).toBeTruthy()
    expect(button(/^1\. Mirrors/).textContent).toContain('0 of 5 solved')
    expect(button(/^2\. Optics/).textContent).toContain('1 of 8 solved')
    fireEvent.click(button(/^3\. Hazards/))
    expect(shown.value).toEqual({ name: 'levels', pack: 'tutorial', skill: 3 })
    fireEvent.click(button('Back'))
    expect(shown.value).toEqual({ name: 'packs' })
  })

  it("shows the skills on the pack's own selection screen, with its own help button", () => {
    const solved = new Set(['tutorial/1/1', 'tutorial/1/2', 'tutorial/1/3', 'tutorial/1/4'])
    solved.add('tutorial/1/5').add('tutorial/2/1')
    const onHelp = vi.fn()
    const { container } = render(<SkillsScreen pack="tutorial" solved={solved} onHelp={onHelp} />)
    expect(container.querySelector('section')?.className).toBe('screen select-screen theme-school')
    expect(screen.getByText('Lesson book')).toBeTruthy()
    expect(screen.getByText('Every part of the game, one level at a time.')).toBeTruthy()
    // A skill solved through lights its lamp; the meters fill with the solved levels.
    const lamp = (name: RegExp) =>
      button(name).querySelector('.select-lamp')?.getAttribute('data-on')
    expect([lamp(/^1\. Mirrors/), lamp(/^2\. Optics/)]).toEqual(['true', 'false'])
    const meter = (name: RegExp) =>
      (button(name).querySelector('.select-meter > span') as HTMLElement | null)?.style.width
    expect([meter(/^1\. Mirrors/), meter(/^2\. Optics/)]).toEqual(['100%', '12.5%'])
    fireEvent.click(button('Instructions'))
    expect(onHelp).toHaveBeenCalledOnce()
  })

  it('shows packs without a choice of screen in the laboratory', () => {
    render(<SkillsScreen pack="lightworks" solved={new Set()} onHelp={() => {}} />)
    expect(screen.getByText('Laboratory of light')).toBeTruthy()
    expect(button('Operating manual')).toBeTruthy()
  })

  it('says when there is no such pack', () => {
    render(<SkillsScreen pack="missing" solved={new Set()} onHelp={() => {}} />)
    expect(screen.getByText('There is no level here.')).toBeTruthy()
  })
})

describe('LevelsScreen', () => {
  it('names the levels once they are loaded and marks the solved ones', async () => {
    const { container } = render(
      <LevelsScreen pack="tutorial" skill={1} solved={new Set(['tutorial/1/2'])} />,
    )
    expect(screen.getByRole('heading', { name: 'Tutorial · Mirrors' })).toBeTruthy()
    expect(container.querySelector('section')?.classList.contains('theme-school')).toBe(true)
    expect(screen.getByText('Lesson book')).toBeTruthy()
    expect(await screen.findByRole('button', { name: '1. First Light' })).toBeTruthy()
    const solved = button(/^2\. Two Turns/)
    expect(solved.classList.contains('solved')).toBe(true)
    expect(within(solved).getByText('solved')).toBeTruthy()
    fireEvent.click(button('1. First Light'))
    expect(shown.value).toEqual({ name: 'play', level: 'tutorial/1/1' })
    fireEvent.click(button('Back'))
    expect(shown.value).toEqual({ name: 'skills', pack: 'tutorial' })
  })

  it('shows the numbers alone when the levels cannot be loaded', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const entry = findLevel('tutorial/3/2')?.entry
    if (entry === undefined) throw new Error('No level tutorial/3/2')
    vi.spyOn(entry, 'load').mockRejectedValue(new Error('Broken file'))
    render(<LevelsScreen pack="tutorial" skill={3} solved={new Set()} />)
    await waitFor(() => expect(console.error).toHaveBeenCalled())
    expect(button('1')).toBeTruthy()
    expect(button('5')).toBeTruthy()
  })

  it('says when there is no such skill', () => {
    render(<LevelsScreen pack="tutorial" skill={7} solved={new Set()} />)
    expect(screen.getByText('There is no level here.')).toBeTruthy()
  })
})

describe('ProfilesScreen', () => {
  /** A book with a profile for each name; the last one is active. */
  async function bookOf(...names: string[]): Promise<ProfileBook> {
    let count = 0
    const book = await ProfileBook.open(memoryStore(), {
      name: names[0] ?? 'Player',
      newId: () => `profile-${++count}`,
    })
    for (const name of names.slice(1)) await book.create(name)
    return book
  }

  const rowOf = (name: string) => {
    const row = screen.getByText(name).closest('li')
    if (row === null) throw new Error(`No row for ${name}`)
    return within(row)
  }

  it('shows who plays now and how far each profile got, and switches', async () => {
    const book = await bookOf('Fiona', 'Sam')
    await book.markSolved('tutorial/1/1')
    render(<ProfilesScreen book={book} />)
    expect(rowOf('Sam').getByText('playing now · 1 level solved')).toBeTruthy()
    expect(rowOf('Fiona').getByText('0 levels solved')).toBeTruthy()
    expect(rowOf('Sam').queryByRole('button', { name: /^Play as/ })).toBeNull()
    await act(() => {
      fireEvent.click(rowOf('Fiona').getByRole('button', { name: 'Play as Fiona' }))
    })
    expect(book.active.value.name).toBe('Fiona')
    expect(rowOf('Fiona').getByText('playing now · 0 levels solved')).toBeTruthy()
  })

  it('creates a profile with a name and plays as it', async () => {
    const book = await bookOf('Fiona')
    render(<ProfilesScreen book={book} />)
    const name = screen.getByLabelText('New profile') as HTMLInputElement
    await act(() => {
      fireEvent.click(button('Create'))
    })
    expect(book.data.value.profiles).toHaveLength(1)
    await act(() => {
      fireEvent.input(name, { target: { value: 'Kim' } })
    })
    await act(() => {
      fireEvent.click(button('Create'))
    })
    expect(book.active.value.name).toBe('Kim')
    expect(name.value).toBe('')
  })

  it('renames a profile, starting from its name each time', async () => {
    const book = await bookOf('Fiona')
    render(<ProfilesScreen book={book} />)
    await act(() => {
      fireEvent.click(button('Rename'))
    })
    const field = screen.getByLabelText('Name') as HTMLInputElement
    expect(field.value).toBe('Fiona')
    await act(() => {
      fireEvent.input(field, { target: { value: 'Fi' } })
    })
    await act(() => {
      fireEvent.click(button('Save'))
    })
    expect(book.active.value.name).toBe('Fi')

    await act(() => {
      fireEvent.click(button('Rename'))
    })
    await act(() => {
      fireEvent.input(screen.getByLabelText('Name'), { target: { value: 'Nobody' } })
    })
    await act(() => {
      fireEvent.click(button('Cancel'))
    })
    expect(book.active.value.name).toBe('Fi')
    await act(() => {
      fireEvent.click(button('Rename'))
    })
    expect((screen.getByLabelText('Name') as HTMLInputElement).value).toBe('Fi')
  })

  it('deletes a profile after asking, but never the last one', async () => {
    const book = await bookOf('Fiona', 'Sam')
    render(<ProfilesScreen book={book} />)
    const confirm = vi.fn().mockReturnValueOnce(false).mockReturnValueOnce(true)
    vi.stubGlobal('confirm', confirm)
    await act(() => {
      fireEvent.click(rowOf('Fiona').getByRole('button', { name: 'Delete' }))
    })
    expect(confirm).toHaveBeenCalledWith('Delete the profile Fiona and all its progress?')
    expect(book.data.value.profiles).toHaveLength(2)
    await act(() => {
      fireEvent.click(rowOf('Fiona').getByRole('button', { name: 'Delete' }))
    })
    expect(book.data.value.profiles.map((profile) => profile.name)).toEqual(['Sam'])
    expect(screen.queryByRole('button', { name: 'Delete' })).toBeNull()
  })

  it('exports a profile as a JSON file named after it', async () => {
    const book = await bookOf('Kim & Co')
    render(<ProfilesScreen book={book} />)
    const files: Blob[] = []
    vi.spyOn(URL, 'createObjectURL').mockImplementation((blob) => {
      files.push(blob as Blob)
      return 'blob:profile'
    })
    const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
    const downloads: string[] = []
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      downloads.push(`${this.download} ${this.href}`)
    })
    fireEvent.click(button('Export'))
    expect(downloads).toEqual(['vibe-laser-Kim-Co.json blob:profile'])
    expect(revoke).toHaveBeenCalledWith('blob:profile')
    expect(JSON.parse(await (files[0] as Blob).text())).toMatchObject({
      format: 'vibe-laser-profile',
      profile: { name: 'Kim & Co' },
    })
  })

  it('imports an exported profile and refuses other files', async () => {
    const book = await bookOf('Fiona')
    render(<ProfilesScreen book={book} />)
    const input = screen.getByLabelText('Import a profile') as HTMLInputElement
    const exported = new File([book.exportProfile('profile-1')], 'fiona.json')
    await act(() => {
      fireEvent.change(input, { target: { files: [exported] } })
    })
    await waitFor(() => expect(book.active.value.name).toBe('Fiona (2)'))
    expect(screen.queryByRole('alert')).toBeNull()
    await act(() => {
      fireEvent.change(input, { target: { files: [new File(['{}'], 'other.json')] } })
    })
    expect(await screen.findByRole('alert')).toBeTruthy()
    expect(screen.getByRole('alert').textContent).toBe('That file is no profile export.')
    expect(book.data.value.profiles).toHaveLength(2)
  })
})

describe('AboutScreen', () => {
  it('shows the version and what has changed', () => {
    render(<AboutScreen />)
    expect(screen.getByRole('heading', { name: 'About Vibe Laser' })).toBeTruthy()
    expect(screen.getByText(/^Version \d+\.\d+\.\d+/)).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Unreleased' })).toBeTruthy()
    fireEvent.click(button('Back'))
    expect(shown.value).toEqual({ name: 'packs' })
  })

  it('renders headings, paragraphs and lists, and links as their text', () => {
    const { container } = render(
      <div>
        {renderChangelog(
          [
            '# Changelog',
            '',
            'Kept as in [Keep a Changelog](https://keepachangelog.com/) with `code`.',
            '',
            '## [Unreleased]',
            '',
            '### Added',
            '',
            '- Lasers',
            '- Coins',
            '## [0.1.0] - 2026-11-01',
            '',
            '[Unreleased]: https://example.com/compare',
          ].join('\n'),
        )}
      </div>,
    )
    expect(container.innerHTML).toBe(
      '<div><p>Kept as in Keep a Changelog with code.</p><h3>Unreleased</h3><h4>Added</h4>' +
        '<ul><li>Lasers</li><li>Coins</li></ul><h3>0.1.0 - 2026-11-01</h3></div>',
    )
  })
})
