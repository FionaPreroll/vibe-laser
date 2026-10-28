// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/preact'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { UpdateNotice } from './UpdateNotice'
import { pendingUpdate } from './updates'

afterEach(() => {
  cleanup()
  pendingUpdate.value = undefined
})

describe('UpdateNotice', () => {
  it('appears once a new version waits, and reloads into it when asked', async () => {
    render(<UpdateNotice />)
    expect(screen.queryByRole('status')).toBeNull()
    const apply = vi.fn()
    await act(() => {
      pendingUpdate.value = apply
    })
    expect(screen.getByRole('status').textContent).toContain('A new version of the game is ready.')
    fireEvent.click(screen.getByRole('button', { name: 'Reload now' }))
    expect(apply).toHaveBeenCalledOnce()
  })

  it('goes away for now when the player wants to finish first', async () => {
    pendingUpdate.value = vi.fn()
    render(<UpdateNotice />)
    await act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Later' }))
    })
    expect(screen.queryByRole('status')).toBeNull()
  })
})
