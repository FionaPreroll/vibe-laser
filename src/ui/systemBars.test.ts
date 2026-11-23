// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from 'vitest'
import { paintSystemBars } from './systemBars'

afterEach(() => {
  document.head.innerHTML = ''
  document.body.removeAttribute('style')
})

const themeColor = () =>
  document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')?.content

describe('paintSystemBars', () => {
  it("gives the bars the page's background", () => {
    document.head.innerHTML = '<meta name="theme-color" content="#000000">'
    document.body.style.backgroundColor = 'rgb(11, 14, 20)'
    paintSystemBars()
    expect(themeColor()).toBe('rgb(11, 14, 20)')
    expect(document.querySelectorAll('meta[name="theme-color"]')).toHaveLength(1)
  })

  it('adds the tag when the page has none', () => {
    document.body.style.backgroundColor = 'rgb(236, 248, 245)'
    paintSystemBars()
    expect(themeColor()).toBe('rgb(236, 248, 245)')
  })

  it('keeps the color it has while the page has no background yet', () => {
    document.head.innerHTML = '<meta name="theme-color" content="#0b0e14">'
    paintSystemBars()
    expect(themeColor()).toBe('#0b0e14')
  })
})
