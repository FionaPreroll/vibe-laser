// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/preact'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ProfileBook } from '../persistence/profiles'
import { memoryStore } from '../persistence/store'
import { FailedDialog } from './FailedDialog'
import { HelpDialog } from './HelpDialog'
import { Modal } from './Modal'
import { SettingsDialog } from './SettingsDialog'
import { SolvedDialog } from './SolvedDialog'

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('SolvedDialog', () => {
  it('lets the coins spin a moment, then offers the next unsolved level, focused', async () => {
    vi.useFakeTimers()
    const onNext = vi.fn()
    const onLevels = vi.fn()
    const onReplay = vi.fn()
    render(<SolvedDialog onNext={onNext} onLevels={onLevels} onReplay={onReplay} />)
    await act(() => {
      vi.advanceTimersByTime(1400)
    })
    expect(screen.queryByRole('dialog')).toBeNull()
    await act(() => {
      vi.advanceTimersByTime(100)
    })
    const dialog = screen.getByRole('dialog', { name: 'Level solved' })
    expect(dialog.textContent).toContain('Every coin is spinning.')
    const next = screen.getByRole('button', { name: 'Next unsolved level' })
    expect(document.activeElement).toBe(next)
    fireEvent.click(next)
    fireEvent.click(screen.getByRole('button', { name: 'Level selection' }))
    fireEvent.click(screen.getByRole('button', { name: 'Play again' }))
    expect(onNext).toHaveBeenCalledOnce()
    expect(onLevels).toHaveBeenCalledOnce()
    expect(onReplay).toHaveBeenCalledOnce()
  })

  it('says when every level of the pack is solved', async () => {
    vi.useFakeTimers()
    render(<SolvedDialog onNext={undefined} onLevels={() => {}} onReplay={() => {}} />)
    await act(() => {
      vi.advanceTimersByTime(1500)
    })
    expect(screen.queryByRole('button', { name: 'Next unsolved level' })).toBeNull()
    expect(screen.getByText(/every level of this pack is solved/)).toBeTruthy()
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Level selection' }))
  })
})

describe('SolvedDialog with moves', () => {
  it.each([
    [{ moves: 1, before: undefined }, 'Solved in 1 move.'],
    [{ moves: 4, before: 6 }, 'Solved in 4 moves. A new best! Before, it took you 6 moves.'],
    [{ moves: 4, before: 1 }, 'Solved in 4 moves. Your best is 1 move.'],
    [{ moves: 4, before: 4 }, 'Solved in 4 moves. Your best is 4 moves.'],
  ])('tells the moves of %o', async (record, text) => {
    vi.useFakeTimers()
    render(
      <SolvedDialog onNext={undefined} onLevels={() => {}} onReplay={() => {}} record={record} />,
    )
    await act(() => {
      vi.advanceTimersByTime(1500)
    })
    expect(document.querySelector('.solved-moves')?.textContent).toBe(text)
  })
})

describe('SolvedDialog put aside', () => {
  it.each([
    [
      'Escape',
      () => {
        fireEvent.keyDown(window, { key: 'Escape' })
      },
    ],
    [
      'a click on the backdrop',
      () => {
        const backdrop = document.querySelector('.dialog-backdrop') as HTMLElement
        fireEvent.pointerDown(backdrop)
        fireEvent.click(backdrop)
      },
    ],
  ])('steps aside after %s and comes back with its button', async (_, dismiss) => {
    vi.useFakeTimers()
    const onLevels = vi.fn()
    render(<SolvedDialog onNext={undefined} onLevels={onLevels} onReplay={() => {}} />)
    await act(() => {
      vi.advanceTimersByTime(1500)
    })
    await act(dismiss)
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(onLevels).not.toHaveBeenCalled()
    const again = screen.getByRole('button', { name: 'Level solved: show again' })
    expect(document.activeElement).toBe(again)
    await act(() => {
      fireEvent.click(again)
    })
    expect(screen.getByRole('dialog', { name: 'Level solved' })).toBeTruthy()
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Level selection' }))
  })

  it('stays open after a click inside it, or a drag that only ends outside', async () => {
    vi.useFakeTimers()
    render(<SolvedDialog onNext={undefined} onLevels={() => {}} onReplay={() => {}} />)
    await act(() => {
      vi.advanceTimersByTime(1500)
    })
    const dialog = screen.getByRole('dialog', { name: 'Level solved' })
    const backdrop = document.querySelector('.dialog-backdrop') as HTMLElement
    await act(() => {
      fireEvent.pointerDown(dialog)
      fireEvent.click(dialog)
      fireEvent.pointerDown(dialog)
      fireEvent.click(backdrop)
    })
    expect(screen.getByRole('dialog', { name: 'Level solved' })).toBeTruthy()
  })
})

describe('FailedDialog', () => {
  it('waits for the blast to fade, then offers a fresh start or the level selection', async () => {
    vi.useFakeTimers()
    const onRestart = vi.fn()
    const onLevels = vi.fn()
    render(<FailedDialog onRestart={onRestart} onLevels={onLevels} />)
    expect(screen.queryByRole('alertdialog')).toBeNull()
    await act(() => {
      vi.advanceTimersByTime(900)
    })
    const dialog = screen.getByRole('alertdialog', { name: 'Explosion' })
    expect(dialog.textContent).toContain('undo cannot bring it back')
    const start = screen.getByRole('button', { name: 'Start again' })
    expect(document.activeElement).toBe(start)
    fireEvent.click(start)
    fireEvent.click(screen.getByRole('button', { name: 'Level selection' }))
    expect(onRestart).toHaveBeenCalledOnce()
    expect(onLevels).toHaveBeenCalledOnce()
  })
})

describe('Modal', () => {
  it('takes the focus, closes with Escape or its button, and gives the focus back', async () => {
    const opener = document.createElement('button')
    document.body.append(opener)
    opener.focus()
    const onClose = vi.fn()
    const { unmount } = render(
      <Modal id="test" title="Notes" onClose={onClose}>
        <p>Some notes</p>
      </Modal>,
    )
    expect(screen.getByRole('dialog', { name: 'Notes' }).textContent).toContain('Some notes')
    const close = screen.getByRole('button', { name: 'Close' })
    expect(document.activeElement).toBe(close)
    fireEvent.keyDown(window, { key: 'Enter' })
    expect(onClose).not.toHaveBeenCalled()
    fireEvent.keyDown(window, { key: 'Escape' })
    fireEvent.click(close)
    expect(onClose).toHaveBeenCalledTimes(2)
    unmount()
    await waitFor(() => expect(document.activeElement).toBe(opener))
    opener.remove()
  })

  it('closes with a click on the backdrop, but not with one inside', () => {
    const onClose = vi.fn()
    render(
      <Modal id="test" title="Notes" onClose={onClose}>
        <p>Some notes</p>
      </Modal>,
    )
    const dialog = screen.getByRole('dialog', { name: 'Notes' })
    fireEvent.pointerDown(dialog)
    fireEvent.click(dialog)
    expect(onClose).not.toHaveBeenCalled()
    const backdrop = document.querySelector('.modal-backdrop') as HTMLElement
    fireEvent.pointerDown(backdrop)
    fireEvent.click(backdrop)
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('leaves the focus where the player put it when the screen behind it changes', () => {
    const modal = (onClose: () => void) => (
      <Modal id="test" title="Notes" onClose={onClose}>
        <input aria-label="Volume" />
      </Modal>
    )
    const { rerender } = render(modal(() => {}))
    const volume = screen.getByLabelText('Volume')
    volume.focus()
    const onClose = vi.fn()
    rerender(modal(onClose))
    expect(document.activeElement).toBe(volume)
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledOnce()
  })
})

describe('HelpDialog', () => {
  it('explains the goal, the controls and every part', () => {
    render(<HelpDialog onClose={() => {}} />)
    const dialog = screen.getByRole('dialog', { name: 'How to play' })
    expect(dialog.textContent).toContain('until every coin spins')
    expect(dialog.textContent).toContain('Ctrl+Z')
    const parts = [...dialog.querySelectorAll('dt')].map((term) => term.textContent)
    expect(parts).toHaveLength(25)
    expect(parts.slice(0, 3)).toEqual(['Laser', 'Coin', 'Anti-coin'])
    const wheel = screen.getByRole('img', { name: /red and green make yellow/ })
    expect(wheel.querySelectorAll('text')).toHaveLength(7)
    expect(parts.at(-1)).toBe('Complex')
  })
})

describe('SettingsDialog', () => {
  it('changes the volumes, motion and colors of the active profile', async () => {
    const book = await ProfileBook.open(memoryStore(), { name: 'Player' })
    render(<SettingsDialog book={book} onClose={() => {}} />)
    const sound = screen.getByLabelText('Sound effects') as HTMLInputElement
    const music = screen.getByLabelText('Music') as HTMLInputElement
    const motion = screen.getByLabelText('Reduce motion') as HTMLInputElement
    const colors = screen.getByRole('checkbox', { name: 'Color-blind mode' }) as HTMLInputElement
    expect([sound.value, music.value, motion.checked, colors.checked]).toEqual([
      '80',
      '50',
      false,
      false,
    ])
    expect(colors.getAttribute('aria-describedby')).toBe('color-blind-hint')
    const preview = screen.getByRole('checkbox', {
      name: 'Show where light would go',
    }) as HTMLInputElement
    expect(preview.checked).toBe(true)
    expect(preview.getAttribute('aria-describedby')).toBe('beam-preview-hint')
    const look = screen.getByLabelText('Look') as HTMLSelectElement
    expect([...look.options].map((option) => option.text)).toEqual([
      "Pack's choice",
      'Plain',
      'Neon',
    ])
    expect(look.value).toBe('pack')
    expect(look.getAttribute('aria-describedby')).toBe('art-hint')
    await act(() => {
      fireEvent.input(sound, { target: { value: '30' } })
      fireEvent.input(music, { target: { value: '0' } })
      fireEvent.click(motion)
      fireEvent.click(colors)
      fireEvent.click(preview)
      fireEvent.change(look, { target: { value: 'neon' } })
    })
    expect(book.active.value.settings).toEqual({
      soundVolume: 0.3,
      musicVolume: 0,
      reducedMotion: true,
      colorBlind: true,
      art: 'neon',
      beamPreview: false,
      vibration: true,
    })
    expect(motion.checked).toBe(true)
    expect(screen.getByLabelText('Language')).toBeTruthy()
  })

  it('offers vibration only on devices that can vibrate', async () => {
    const book = await ProfileBook.open(memoryStore(), { name: 'Player' })
    const { unmount } = render(<SettingsDialog book={book} onClose={() => {}} />)
    const has = 'vibrate' in navigator
    expect(screen.queryByLabelText('Vibrate as pieces go down and turn') !== null).toBe(has)
    unmount()
    Object.defineProperty(navigator, 'vibrate', { value: vi.fn(), configurable: true })
    try {
      render(<SettingsDialog book={book} onClose={() => {}} />)
      await act(() => {
        fireEvent.click(screen.getByLabelText('Vibrate as pieces go down and turn'))
      })
      expect(book.active.value.settings.vibration).toBe(false)
    } finally {
      Reflect.deleteProperty(navigator, 'vibrate')
    }
  })
})
