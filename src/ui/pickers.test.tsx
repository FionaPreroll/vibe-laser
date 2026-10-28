// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/preact'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { TUTORIAL } from '../content/levels'
import { setLocale } from '../i18n'
import { LanguageSwitch } from './LanguageSwitch'
import { LevelPicker } from './LevelPicker'

afterEach(() => {
  cleanup()
  setLocale('en')
})

describe('LevelPicker', () => {
  it('numbers every level and reports the one chosen', () => {
    const onSelect = vi.fn()
    render(<LevelPicker levels={TUTORIAL} index={0} onSelect={onSelect} />)
    const select = screen.getByLabelText('Level') as HTMLSelectElement
    expect(select.options).toHaveLength(TUTORIAL.length)
    expect(select.options[1]?.textContent).toBe('2. Two Turns')
    fireEvent.change(select, { target: { value: '4' } })
    expect(onSelect).toHaveBeenCalledWith(4)
  })
})

describe('LanguageSwitch', () => {
  it('names each language in itself and switches the interface', async () => {
    render(
      <>
        <LanguageSwitch />
        <LevelPicker levels={TUTORIAL} index={0} onSelect={() => {}} />
      </>,
    )
    const select = screen.getByLabelText('Language') as HTMLSelectElement
    expect([...select.options].map((option) => option.textContent)).toEqual(['English', 'Deutsch'])
    await act(() => {
      fireEvent.change(select, { target: { value: 'de' } })
    })
    expect(screen.getByLabelText('Sprache')).toBeTruthy()
    expect((screen.getByLabelText('Level') as HTMLSelectElement).options[0]?.textContent).toBe(
      '1. Erstes Licht',
    )
    expect(localStorage.getItem('vibe-laser.locale')).toBe('de')
  })

  it('ignores values that are no language', async () => {
    render(<LanguageSwitch />)
    const select = screen.getByLabelText('Language') as HTMLSelectElement
    await act(() => {
      fireEvent.change(select, { target: { value: 'xx' } })
    })
    expect(screen.getByLabelText('Language')).toBeTruthy()
  })
})
