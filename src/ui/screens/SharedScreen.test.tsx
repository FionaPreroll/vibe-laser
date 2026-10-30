// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/preact'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { LevelFile } from '../../content/schema'
import { encodeLevel } from '../../content/share'
import { PackShelf } from '../../persistence/packs'
import { memoryStore } from '../../persistence/store'
import { mountBoard } from '../../view/board'
import type { BoardController } from '../../view/controller'
import { screen as shown } from '../router'
import { SharedScreen } from './SharedScreen'

vi.mock('../../view/board', () => ({ mountBoard: vi.fn() }))
const gameMount = vi.mocked(mountBoard)

const FIRST_LIGHT: LevelFile = {
  version: 1,
  name: { en: 'First Light', de: 'Erstes Licht' },
  intro: { en: 'Turn the mirror.', de: 'Dreh den Spiegel.' },
  size: [6, 3],
  objects: [
    { type: 'coin', pos: 'A6', rgb: 'r' },
    { type: 'laser', pos: 'B1', rot: 2, rgb: 'r' },
  ],
  toolbox: [{ type: 'mirror', rot: 0 }],
}

let shelf: PackShelf
let count = 0

beforeEach(async () => {
  gameMount.mockReset()
  gameMount.mockResolvedValue({ destroy: () => {} })
  shelf = await PackShelf.open(memoryStore(), { newId: () => `my-${++count}` })
})
afterEach(async () => {
  cleanup()
  await new Promise((resolve) => setTimeout(resolve, 20))
  shown.value = { name: 'packs' }
})

async function open(data: string) {
  render(
    <SharedScreen
      data={data}
      shelf={shelf}
      speaker={{ play: vi.fn() }}
      paused={false}
      reducedMotion={false}
      onHelp={() => {}}
    />,
  )
}

async function controllerShown(): Promise<BoardController> {
  await waitFor(() => expect(gameMount).toHaveBeenCalled())
  const controller = gameMount.mock.lastCall?.[1]
  if (controller === undefined) throw new Error('No game board')
  return controller
}

describe('SharedScreen', () => {
  it('plays the level from the link and keeps it in a pack of shared levels', async () => {
    await open(await encodeLevel(FIRST_LIGHT))
    const controller = await controllerShown()
    expect(screen.getByRole('heading', { name: 'Shared level · First Light' })).toBeTruthy()
    expect(screen.getByText('Turn the mirror.')).toBeTruthy()

    act(() => {
      controller.session.execute({ kind: 'move', item: 2, to: { area: 'board', cell: 11 } })
      controller.session.execute({ kind: 'rotate', item: 2, steps: -1 })
    })
    expect(controller.session.state.value.phase).toBe('solved')
    await waitFor(() => expect(screen.getByRole('dialog', { name: 'Level solved' })).toBeTruthy(), {
      timeout: 3000,
    })

    await act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Add to my packs' }))
    })
    await waitFor(() =>
      expect(screen.getByText('Added to Shared levels, skill 1, level 1.')).toBeTruthy(),
    )
    expect(shelf.packs.value[0]?.pack.title).toEqual({ en: 'Shared levels', de: 'Geteilte Level' })
    expect(shelf.packs.value[0]?.levels['1/1']).toEqual(FIRST_LIGHT)
  })

  it('adds later levels to the same pack', async () => {
    const pack = await shelf.create({
      version: 1,
      title: { en: 'Shared levels', de: 'Geteilte Level' },
      position: 1000,
      skills: [{ en: 'Levels', de: 'Level' }],
      selectSkill: false,
    })
    await shelf.saveLevel(pack.id, 1, 1, FIRST_LIGHT)
    await open(await encodeLevel(FIRST_LIGHT))
    await controllerShown()
    await act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Add to my packs' }))
    })
    await waitFor(() =>
      expect(screen.getByText('Added to Shared levels, skill 1, level 2.')).toBeTruthy(),
    )
    expect(shelf.packs.value).toHaveLength(1)
  })

  it('says when the link holds no level, and leads back to the packs', async () => {
    shown.value = { name: 'about' }
    await open('cut-off')
    await waitFor(() => expect(screen.getByText(/This link holds no level/)).toBeTruthy())
    fireEvent.click(screen.getByRole('button', { name: 'Level packs' }))
    expect(shown.value).toEqual({ name: 'packs' })
  })
})
