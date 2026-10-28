// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/preact'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { FailedDialog } from './FailedDialog'
import { SolvedDialog } from './SolvedDialog'

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('SolvedDialog', () => {
  it('offers the next level, focused, and another go', () => {
    const onNext = vi.fn()
    const onReplay = vi.fn()
    render(<SolvedDialog onNext={onNext} onReplay={onReplay} />)
    const dialog = screen.getByRole('dialog', { name: 'Level solved' })
    expect(dialog.textContent).toContain('Every coin is spinning.')
    const next = screen.getByRole('button', { name: 'Next level' })
    expect(document.activeElement).toBe(next)
    fireEvent.click(next)
    fireEvent.click(screen.getByRole('button', { name: 'Play again' }))
    expect(onNext).toHaveBeenCalledOnce()
    expect(onReplay).toHaveBeenCalledOnce()
  })

  it('says when that was the last level', () => {
    render(<SolvedDialog onNext={undefined} onReplay={() => {}} />)
    expect(screen.queryByRole('button', { name: 'Next level' })).toBeNull()
    expect(screen.getByText(/last level for now/)).toBeTruthy()
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Play again' }))
  })
})

describe('FailedDialog', () => {
  it('waits for the blast to fade, then offers a fresh start', async () => {
    vi.useFakeTimers()
    const onRestart = vi.fn()
    render(<FailedDialog onRestart={onRestart} />)
    expect(screen.queryByRole('alertdialog')).toBeNull()
    await act(() => {
      vi.advanceTimersByTime(900)
    })
    const dialog = screen.getByRole('alertdialog', { name: 'Explosion' })
    expect(dialog.textContent).toContain('undo cannot bring it back')
    const start = screen.getByRole('button', { name: 'Start again' })
    expect(document.activeElement).toBe(start)
    fireEvent.click(start)
    expect(onRestart).toHaveBeenCalledOnce()
  })
})
