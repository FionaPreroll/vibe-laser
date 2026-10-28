// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const KEY = 'vibe-laser.locale'

/** A fresh copy of the module, which reads the stored or browser language when it loads. */
async function load() {
  vi.resetModules()
  return import('./index')
}

beforeEach(() => localStorage.clear())
afterEach(() => vi.restoreAllMocks())

describe('i18n', () => {
  it('starts in the stored language', async () => {
    localStorage.setItem(KEY, 'de')
    const { locale, t } = await load()
    expect(locale.value).toBe('de')
    expect(t('undo')).toBe('Rückgängig')
  })

  it('otherwise starts in the browser language', async () => {
    vi.spyOn(navigator, 'languages', 'get').mockReturnValue(['de-AT', 'en'])
    const { locale } = await load()
    expect(locale.value).toBe('de')
  })

  it('ignores stored values that are no language', async () => {
    localStorage.setItem(KEY, 'klingon')
    vi.spyOn(navigator, 'languages', 'get').mockReturnValue(['en-GB'])
    const { locale } = await load()
    expect(locale.value).toBe('en')
  })

  it('switches the language, fills in placeholders and remembers the choice', async () => {
    const { locale, setLocale, t } = await load()
    setLocale('de')
    expect(locale.value).toBe('de')
    expect(t('board', { name: 'Knick', columns: 5, rows: 4 })).toBe(
      'Knick: Spielfeld mit 5 Spalten und 4 Zeilen',
    )
    expect(localStorage.getItem(KEY)).toBe('de')
  })

  it('keeps working when storage is blocked', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    vi.spyOn(navigator, 'languages', 'get').mockReturnValue(['en'])
    const { locale, setLocale } = await load()
    expect(locale.value).toBe('en')
    setLocale('de')
    expect(locale.value).toBe('de')
  })
})
