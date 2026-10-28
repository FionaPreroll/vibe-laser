// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/preact'
import { afterEach, describe, expect, it } from 'vitest'
import { setLocale } from '../i18n'
import { LanguageSwitch } from './LanguageSwitch'
import { PacksScreen } from './screens/PacksScreen'

afterEach(() => {
  cleanup()
  setLocale('en')
})

describe('LanguageSwitch', () => {
  it('names each language in itself and switches the interface', async () => {
    render(
      <>
        <LanguageSwitch />
        <PacksScreen solved={new Set()} />
      </>,
    )
    const select = screen.getByLabelText('Language') as HTMLSelectElement
    expect([...select.options].map((option) => option.textContent)).toEqual(['English', 'Deutsch'])
    await act(() => {
      fireEvent.change(select, { target: { value: 'de' } })
    })
    expect(screen.getByLabelText('Sprache')).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Level-Packs' })).toBeTruthy()
    expect(screen.getByRole('button', { name: /^Einführung/ })).toBeTruthy()
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
