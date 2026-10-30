// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/preact'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { findLevel, findPack, levelsOf } from '../content/packs'
import { playSolution } from '../content/solution'
import { DEFAULT_SETTINGS, type SaveData } from '../persistence/profiles'
import { type KeyValueStore, memoryStore } from '../persistence/store'
import { mountBoard } from '../view/board'
import type { BoardController } from '../view/controller'
import { beamPreview, chosenArt, colorBlind } from '../view/display'
import { App, type Audio } from './App'
import { navigate } from './router'

vi.mock('../view/board', () => ({ mountBoard: vi.fn() }))
const mount = vi.mocked(mountBoard)

beforeEach(() => {
  mount.mockReset()
  mount.mockResolvedValue({ destroy: () => {} })
})
afterEach(() => {
  colorBlind.value = false
  beamPreview.value = true
  chosenArt.value = 'pack'
  cleanup()
  vi.restoreAllMocks()
})

/** Opens the game at an address, with saves in memory and a speaker that stays silent. */
async function start(hash = '#/', store: KeyValueStore = memoryStore()) {
  location.hash = hash
  const audio = {
    play: vi.fn(),
    unlock: vi.fn(),
    setVolumes: vi.fn(),
    useSounds: vi.fn(),
  } satisfies Audio
  render(<App store={store} audio={audio} />)
  await screen.findByRole('heading', { name: 'Vibe Laser' })
  return { audio, store }
}

/** The controller the play screen handed to the board it mounted last. */
/** The solved dialog, which appears a moment after every coin starts to spin. */
const solvedDialog = () => screen.findByRole('dialog', { name: 'Level solved' }, { timeout: 3000 })

async function mounted(): Promise<BoardController> {
  await waitFor(() => expect(mount).toHaveBeenCalled())
  const controller = mount.mock.lastCall?.[1]
  if (controller === undefined) throw new Error('No board mounted')
  return controller
}

async function solve(controller: BoardController, id: string) {
  const level = await findLevel(id)?.entry.load()
  if (level === undefined) throw new Error(`No level ${id}`)
  await act(() => {
    playSolution(controller.session, level.file)
  })
}

async function solvedIn(store: KeyValueStore): Promise<string[]> {
  const save = (await store.get('save')) as SaveData
  return save.profiles.find((profile) => profile.id === save.active)?.solved ?? []
}

const button = (name: string | RegExp) => screen.getByRole('button', { name })

async function click(name: string | RegExp) {
  await act(() => {
    fireEvent.click(button(name))
  })
}

describe('App', () => {
  it('opens on the pack list once the saves are loaded', async () => {
    location.hash = ''
    render(
      <App
        store={memoryStore()}
        audio={{ play() {}, unlock() {}, setVolumes() {}, useSounds() {} }}
      />,
    )
    expect(screen.getByText('Loading…')).toBeTruthy()
    expect(await screen.findByRole('heading', { name: 'Level packs' })).toBeTruthy()
    expect(button(/^Tutorial/).textContent).toContain('0 of 23 solved')
    expect(button('Profile: Player')).toBeTruthy()
  })

  it('walks from a pack through its skills and levels into a game and back', async () => {
    await start()
    await click(/^Tutorial/)
    expect(screen.getByRole('heading', { name: 'Tutorial' })).toBeTruthy()
    expect(button(/^2\. Optics/).textContent).toContain('0 of 8 solved')
    await click(/^1\. Mirrors/)
    expect(screen.getByRole('heading', { name: 'Tutorial · Mirrors' })).toBeTruthy()
    await screen.findByRole('button', { name: '1. First Light' })
    await click('1. First Light')
    expect(location.hash).toBe('#/play/tutorial/1/1')
    expect(
      await screen.findByRole('application', {
        name: 'First Light: game board with 6 columns and 3 rows',
      }),
    ).toBeTruthy()
    expect(
      screen.getByRole('heading', { name: 'Tutorial · Mirrors · 1. First Light' }),
    ).toBeTruthy()

    await click('Exit')
    expect(screen.getByRole('heading', { name: 'Tutorial · Mirrors' })).toBeTruthy()
    await click('Back')
    expect(screen.getByRole('heading', { name: 'Tutorial' })).toBeTruthy()
    await click('Back')
    expect(screen.getByRole('heading', { name: 'Level packs' })).toBeTruthy()
  })

  it('saves a solved level and moves on to the next unsolved one, unsolved', async () => {
    const { store } = await start('#/play/tutorial/1/1')
    await solve(await mounted(), 'tutorial/1/1')
    const dialog = await solvedDialog()
    expect(within(dialog).getByText('Solved in 2 moves.')).toBeTruthy()
    await waitFor(async () => expect(await solvedIn(store)).toEqual(['tutorial/1/1']))
    await act(() => {
      fireEvent.click(within(dialog).getByRole('button', { name: 'Next unsolved level' }))
    })
    expect(await screen.findByRole('application', { name: /^Two Turns:/ })).toBeTruthy()
    expect(screen.queryByRole('dialog')).toBeNull()

    await click('Exit')
    const levels = await screen.findAllByRole('button', { name: /^\d\. / })
    expect(levels.map((level) => level.textContent)).toEqual([
      '1. First Lightsolved · best 2 moves',
      '2. Two Turns',
      '3. Meeting Point',
      '4. Dark Coin',
      '5. Through the Slit',
    ])
    expect(await solvedIn(store)).toEqual(['tutorial/1/1'])
  })

  it('tells players above the board what the level is about', async () => {
    await start('#/play/tutorial/1/1')
    await mounted()
    expect(screen.getByText(/^A laser fires a beam of its color/)).toBeTruthy()
  })

  it('plays a solved level again, or goes back to the level selection', async () => {
    await start('#/play/tutorial/1/1')
    const controller = await mounted()
    await solve(controller, 'tutorial/1/1')
    await solvedDialog()
    await click('Play again')
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(controller.session.state.value.phase).toBe('playing')
    await solve(controller, 'tutorial/1/1')
    await solvedDialog()
    await click('Level selection')
    expect(screen.getByRole('heading', { name: 'Tutorial · Mirrors' })).toBeTruthy()
  })

  it('says so once every level of the pack is solved', async () => {
    const tutorial = findPack('tutorial')
    if (tutorial === undefined) throw new Error('No tutorial pack')
    const solved = levelsOf(tutorial)
      .map((level) => level.id)
      .filter((id) => id !== 'tutorial/1/1')
    const store = memoryStore({
      save: {
        version: 1,
        active: 'fiona',
        profiles: [{ id: 'fiona', name: 'Fiona', solved, settings: DEFAULT_SETTINGS }],
      },
    })
    await start('#/play/tutorial/1/1', store)
    expect(button('Profile: Fiona')).toBeTruthy()
    await solve(await mounted(), 'tutorial/1/1')
    await solvedDialog()
    expect(screen.getByText(/every level of this pack is solved/)).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Next unsolved level' })).toBeNull()
  })

  it('offers a fresh start after an explosion', async () => {
    await start('#/play/tutorial/3/1')
    const controller = await mounted()
    await act(() => {
      // The mirror in A1, turned to send the beam east, lights the explosive in A3.
      controller.session.execute({ kind: 'move', item: 3, to: { area: 'board', cell: 0 } })
      controller.session.execute({ kind: 'rotate', item: 3, steps: 3 })
      for (let tick = 0; tick < 5; tick++) controller.session.tick()
    })
    expect(controller.session.state.value.phase).toBe('failed')
    const again = await screen.findByRole('button', { name: 'Start again' }, { timeout: 2000 })
    await act(() => {
      fireEvent.click(again)
    })
    expect(controller.session.state.value.phase).toBe('playing')
  })

  it('pauses the game while help or the settings are open', async () => {
    await start('#/play/tutorial/1/1')
    const controller = await mounted()
    const toolbar = screen.getByRole('toolbar')
    await act(() => {
      fireEvent.click(within(toolbar).getByRole('button', { name: 'Help' }))
    })
    expect(screen.getByRole('dialog', { name: 'How to play' })).toBeTruthy()
    expect(controller.paused.value).toBe(true)
    await act(() => {
      fireEvent.keyDown(window, { key: 'Escape' })
    })
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(controller.paused.value).toBe(false)
    await act(() => {
      fireEvent.click(within(screen.getByRole('banner')).getByRole('button', { name: 'Help' }))
    })
    expect(controller.paused.value).toBe(true)
    await click('Close')

    await click('Settings')
    expect(controller.paused.value).toBe(true)
    await act(() => {
      fireEvent.click(screen.getByLabelText('Reduce motion'))
    })
    expect(controller.reducedMotion.value).toBe(true)
    await click('Close')
    expect(controller.paused.value).toBe(false)
  })

  it('switches color-blind mode on every board with the setting of the profile', async () => {
    await start('#/play/tutorial/1/1')
    expect(colorBlind.value).toBe(false)
    await click('Settings')
    await act(() => {
      fireEvent.click(screen.getByRole('checkbox', { name: 'Color-blind mode' }))
    })
    await waitFor(() => expect(colorBlind.value).toBe(true))
  })

  it('switches the beam preview on every board with the setting of the profile', async () => {
    await start('#/play/tutorial/1/1')
    expect(beamPreview.value).toBe(true)
    await click('Settings')
    await act(() => {
      fireEvent.click(screen.getByRole('checkbox', { name: 'Show where light would go' }))
    })
    await waitFor(() => expect(beamPreview.value).toBe(false))
  })

  it('draws the board anew in the look of the profile', async () => {
    await start('#/play/tutorial/1/1')
    await waitFor(() => expect(mount).toHaveBeenCalledOnce())
    expect(mount.mock.calls[0]?.[2]).toMatchObject({ id: 'flat' })
    await click('Settings')
    await act(() => {
      fireEvent.change(screen.getByLabelText('Look'), { target: { value: 'neon' } })
    })
    await waitFor(() => expect(mount).toHaveBeenCalledTimes(2))
    expect(mount.mock.calls[1]?.[2]).toMatchObject({ id: 'neon' })
    expect(chosenArt.value).toBe('neon')
  })

  it('draws the levels of a pack in its skin, unless the player chose a look', async () => {
    const level = await findLevel('tutorial/1/1')?.entry.load()
    const pack = {
      version: 1,
      title: { en: 'Glow', de: 'Glühen' },
      position: 100,
      skills: [{ en: 'All', de: 'Alle' }],
      selectSkill: true,
      skin: 'neon',
    }
    const store = memoryStore({
      packs: { version: 1, packs: [{ id: 'my-glow', pack, levels: { '1/1': level?.file } }] },
    })
    await start('#/play/my-glow/1/1', store)
    await waitFor(() => expect(mount).toHaveBeenCalledOnce())
    expect(mount.mock.calls[0]?.[2]).toMatchObject({ id: 'neon' })
    await click('Settings')
    await act(() => {
      fireEvent.change(screen.getByLabelText('Look'), { target: { value: 'flat' } })
    })
    await waitFor(() => expect(mount).toHaveBeenCalledTimes(2))
    expect(mount.mock.calls[1]?.[2]).toMatchObject({ id: 'flat' })
  })

  it('plays each pack in its own sounds, on its screens and in its levels', async () => {
    const { audio } = await start('#/play/tutorial/1/1')
    expect(audio.useSounds).toHaveBeenLastCalledWith('school')
    await act(() => navigate({ name: 'skills', pack: 'lightworks' }))
    expect(audio.useSounds).toHaveBeenLastCalledWith('lab')
    await act(() => navigate({ name: 'levels', pack: 'tutorial', skill: 2 }))
    expect(audio.useSounds).toHaveBeenLastCalledWith('school')
    await act(() => navigate({ name: 'packs' }))
    expect(audio.useSounds).toHaveBeenLastCalledWith('lab')
  })

  it('offers hints and the solution in a Hints & Solutions pack only', async () => {
    await start('#/play/lightworks-hints/1/1')
    expect(await screen.findByRole('button', { name: 'Show a hint' })).toBeTruthy()
    expect(
      screen.getByRole('heading', { name: /^Lightworks: Hints & Solutions · Light Work/ }),
    ).toBeTruthy()
    await act(() => navigate({ name: 'play', level: 'lightworks/1/1' }))
    await screen.findByRole('heading', { name: /^Lightworks · Light Work/ })
    expect(screen.queryByRole('button', { name: 'Show a hint' })).toBeNull()
  })

  it('plays the sounds of the game at the volumes of the profile', async () => {
    const { audio } = await start('#/play/tutorial/1/1')
    await waitFor(() => expect(audio.setVolumes).toHaveBeenLastCalledWith(0.8, 0.5))
    fireEvent.pointerDown(window)
    fireEvent.keyDown(window, { key: 'a' })
    expect(audio.unlock).toHaveBeenCalledTimes(2)
    const controller = await mounted()
    await act(() => {
      controller.move(2, { area: 'board', cell: 0 })
    })
    expect(audio.play).toHaveBeenCalledWith('place')
    await click('Settings')
    await act(() => {
      fireEvent.input(screen.getByLabelText('Music'), { target: { value: '20' } })
    })
    expect(audio.setVolumes).toHaveBeenLastCalledWith(0.8, 0.2)
  })

  it('keeps progress in memory when the browser does not let the game save', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const blocked: KeyValueStore = {
      get: () => Promise.reject(new Error('IndexedDB is off')),
      set: () => Promise.reject(new Error('IndexedDB is off')),
    }
    await start('#/', blocked)
    expect(screen.getByText(/does not let the game save/)).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Level packs' })).toBeTruthy()
    expect(console.warn).toHaveBeenCalled()
  })

  it('opens the profiles and the about page from the header, and the title leads home', async () => {
    await start()
    await click('Profile: Player')
    expect(screen.getByRole('heading', { name: 'Profiles' })).toBeTruthy()
    await click('About')
    expect(screen.getByRole('heading', { name: 'About Vibe Laser' })).toBeTruthy()
    // The browser follows the link to the address of the pack list.
    expect(screen.getByRole('link', { name: /Vibe Laser/ }).getAttribute('href')).toBe('#/')
  })

  it('lists packs made in the editor and plays their levels', async () => {
    const level = await findLevel('tutorial/1/1')?.entry.load()
    const store = memoryStore({
      packs: {
        version: 1,
        packs: [
          {
            id: 'my-pack',
            pack: {
              version: 1,
              title: { en: 'My Pack', de: 'Mein Pack' },
              position: 100,
              skills: [{ en: 'All', de: 'Alle' }],
              selectSkill: true,
            },
            levels: { '1/4': level?.file },
          },
        ],
      },
    })
    await start('#/', store)
    expect((await screen.findByRole('button', { name: /^My Pack/ })).textContent).toContain(
      '0 of 1 solved',
    )
    await click(/^My Pack/)
    await screen.findByRole('button', { name: '4. First Light' })
    await click('4. First Light')
    expect(location.hash).toBe('#/play/my-pack/1/4')
    await solve(await mounted(), 'my-pack/1/4')
    await waitFor(async () => expect(await solvedIn(store)).toEqual(['my-pack/1/4']))
  })

  it('opens the level editor from the header, loading it on demand', async () => {
    await start()
    await click('Level editor')
    expect(screen.getByText('Loading…')).toBeTruthy()
    expect(await screen.findByRole('heading', { name: 'Level editor' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Your packs' })).toBeTruthy()
  })

  it('follows the address, as with the back button', async () => {
    await start()
    await act(() => {
      location.hash = '#/packs/tutorial/3'
      window.dispatchEvent(new HashChangeEvent('hashchange'))
    })
    expect(screen.getByRole('heading', { name: 'Tutorial · Hazards' })).toBeTruthy()
  })

  it('says when there is no level at an address', async () => {
    await start('#/play/tutorial/9/9')
    expect(screen.getByText('There is no level here.')).toBeTruthy()
    await click('Back')
    expect(screen.getByRole('heading', { name: 'Level packs' })).toBeTruthy()
  })

  it('says when a level cannot be loaded', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const entry = findLevel('tutorial/1/2')?.entry
    if (entry === undefined) throw new Error('No level tutorial/1/2')
    vi.spyOn(entry, 'load').mockRejectedValue(new Error('Broken file'))
    await start('#/play/tutorial/1/2')
    expect(await screen.findByText('This level could not be loaded.')).toBeTruthy()
    expect(mount).not.toHaveBeenCalled()
  })
})
