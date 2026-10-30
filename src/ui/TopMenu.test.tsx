// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/preact'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { TopMenu } from './TopMenu'

afterEach(cleanup)

describe('TopMenu', () => {
  it('opens its list, and closes it after a choice, a click outside or Escape', async () => {
    const onSettings = vi.fn()
    render(
      <TopMenu>
        <button type="button" onClick={onSettings}>
          Settings
        </button>
      </TopMenu>,
    )
    const toggle = screen.getByRole('button', { name: 'Menu' })
    const nav = document.getElementById('top-controls')
    const open = () => toggle.getAttribute('aria-expanded') === 'true'
    expect(open()).toBe(false)

    await act(() => {
      fireEvent.click(toggle)
    })
    expect(open()).toBe(true)
    expect(nav?.classList.contains('open')).toBe(true)
    await act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Settings' }))
    })
    expect(onSettings).toHaveBeenCalledOnce()
    expect(open()).toBe(false)

    await act(() => {
      fireEvent.click(toggle)
    })
    await act(() => {
      fireEvent.pointerDown(document.body)
    })
    expect(open()).toBe(false)

    await act(() => {
      fireEvent.click(toggle)
    })
    await act(() => {
      fireEvent.keyDown(window, { key: 'Escape' })
    })
    expect(open()).toBe(false)
  })
})
