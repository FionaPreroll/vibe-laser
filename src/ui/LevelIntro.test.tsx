// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/preact'
import { afterEach, describe, expect, it } from 'vitest'
import { LevelIntro } from './LevelIntro'

afterEach(() => {
  cleanup()
  localStorage.clear()
})

const intro = () => document.querySelector('.level-intro')
const toggle = () => screen.getByRole('button')

describe('LevelIntro', () => {
  it('opens in full the first time, in one line after that, and opens again on a click', async () => {
    const { unmount } = render(<LevelIntro id="tutorial/1/1" text="Mirrors turn light." />)
    expect(intro()?.classList.contains('collapsed')).toBe(false)
    expect(toggle().textContent).toBe('Less')
    unmount()

    render(<LevelIntro id="tutorial/1/1" text="Mirrors turn light." />)
    expect(intro()?.classList.contains('collapsed')).toBe(true)
    expect(toggle().getAttribute('aria-expanded')).toBe('false')
    await act(() => {
      fireEvent.click(toggle())
    })
    expect(intro()?.classList.contains('collapsed')).toBe(false)
  })

  it('always opens in full without a level to remember it by', () => {
    render(<LevelIntro text="A shared level." />)
    cleanup()
    render(<LevelIntro text="A shared level." />)
    expect(intro()?.classList.contains('collapsed')).toBe(false)
  })
})
