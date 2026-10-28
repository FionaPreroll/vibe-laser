// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('./ui/App', () => ({ App: () => <p>The game</p> }))

afterEach(() => {
  document.body.innerHTML = ''
  vi.resetModules()
})

describe('main', () => {
  it('renders the app into #app and keeps the page language in step', async () => {
    document.body.innerHTML = '<div id="app"></div>'
    const { setLocale } = await import('./i18n')
    setLocale('en')
    await import('./main')
    expect(document.getElementById('app')?.textContent).toBe('The game')
    expect(document.documentElement.lang).toBe('en')
    setLocale('de')
    expect(document.documentElement.lang).toBe('de')
    setLocale('en')
  })

  it('fails loudly without an #app element', async () => {
    await expect(import('./main')).rejects.toThrow('index.html has no #app element')
  })
})
