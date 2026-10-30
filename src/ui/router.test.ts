// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest'
import { followAddress, formatHash, navigate, parseHash, type Screen, screen } from './router'

const SCREENS: Screen[] = [
  { name: 'packs' },
  { name: 'skills', pack: 'tutorial' },
  { name: 'levels', pack: 'tutorial', skill: 2 },
  { name: 'play', level: 'tutorial/2/5' },
  { name: 'shared', data: 'q1Y-_x' },
  { name: 'profiles' },
  { name: 'about' },
  { name: 'editor' },
  { name: 'editPack', pack: 'my-pack' },
  { name: 'editLevel', pack: 'my-pack', skill: 4, slot: 30 },
]

describe('router', () => {
  it.each(SCREENS)('gives $name an address of its own', (each) => {
    expect(parseHash(formatHash(each))).toEqual(each)
  })

  it('reads addresses with or without the slash', () => {
    expect(parseHash('#/play/tutorial/1/3')).toEqual({ name: 'play', level: 'tutorial/1/3' })
    expect(parseHash('#packs/tutorial/')).toEqual({ name: 'skills', pack: 'tutorial' })
    expect(parseHash('')).toEqual({ name: 'packs' })
  })

  it.each([
    '#/nowhere',
    '#/play/tutorial/1',
    '#/play/tutorial/one/2',
    '#/packs/tutorial/12',
    '#/packs',
    '#/about/more',
    '#/level',
    '#/editor/my-pack/5/1',
    '#/editor/my-pack/1',
    '#/editor/my-pack/1/100',
  ])('shows the pack list for %s', (hash) => {
    expect(parseHash(hash)).toEqual({ name: 'packs' })
  })

  it('moves to a screen and its address, and follows the address back', () => {
    const stop = followAddress()
    navigate({ name: 'about' })
    expect(location.hash).toBe('#/about')
    expect(screen.value).toEqual({ name: 'about' })
    location.hash = '#/profiles'
    window.dispatchEvent(new HashChangeEvent('hashchange'))
    expect(screen.value).toEqual({ name: 'profiles' })
    stop()
    location.hash = '#/'
    window.dispatchEvent(new HashChangeEvent('hashchange'))
    expect(screen.value).toEqual({ name: 'profiles' })
  })
})
