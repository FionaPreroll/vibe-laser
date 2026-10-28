import { signal } from '@preact/signals'

/** The screens, each with an address of its own after the # of the page's URL. */
export type Screen =
  | { readonly name: 'packs' }
  | { readonly name: 'skills'; readonly pack: string }
  | { readonly name: 'levels'; readonly pack: string; readonly skill: number }
  | { readonly name: 'play'; readonly level: string }
  | { readonly name: 'profiles' }
  | { readonly name: 'about' }
  | { readonly name: 'editor' }
  | { readonly name: 'editPack'; readonly pack: string }
  | {
      readonly name: 'editLevel'
      readonly pack: string
      readonly skill: number
      readonly slot: number
    }

const PACKS: Screen = { name: 'packs' }

/** The editor's screens, which load on demand. */
export type EditorScreen = Extract<Screen, { name: 'editor' | 'editPack' | 'editLevel' }>

export function isEditorScreen(screen: Screen): screen is EditorScreen {
  return screen.name === 'editor' || screen.name === 'editPack' || screen.name === 'editLevel'
}

/** The screen for an address such as "#/play/tutorial/1/3"; the pack list for anything else. */
export function parseHash(hash: string): Screen {
  const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean)
  const [first, second, third, fourth] = parts
  if (first === 'profiles' && parts.length === 1) return { name: 'profiles' }
  if (first === 'about' && parts.length === 1) return { name: 'about' }
  if (first === 'editor') return parseEditor(parts.slice(1))
  if (first === 'play' && parts.length === 4 && /^\d+\/\d+$/.test(`${third}/${fourth}`)) {
    return { name: 'play', level: parts.slice(1).join('/') }
  }
  if (first === 'packs' && second !== undefined && parts.length === 2) {
    return { name: 'skills', pack: second }
  }
  if (first === 'packs' && second !== undefined && parts.length === 3 && /^\d$/.test(third ?? '')) {
    return { name: 'levels', pack: second, skill: Number(third) }
  }
  return PACKS
}

/** The editor's screens: "#/editor", a pack as "#/editor/my-pack", a level as ".../2/17". */
function parseEditor(parts: readonly string[]): Screen {
  const [pack, skill, slot] = parts
  if (pack === undefined) return { name: 'editor' }
  if (parts.length === 1) return { name: 'editPack', pack }
  if (parts.length === 3 && /^[1-4]$/.test(skill ?? '') && /^\d{1,2}$/.test(slot ?? '')) {
    return { name: 'editLevel', pack, skill: Number(skill), slot: Number(slot) }
  }
  return PACKS
}

export function formatHash(screen: Screen): string {
  switch (screen.name) {
    case 'packs':
      return '#/'
    case 'skills':
      return `#/packs/${screen.pack}`
    case 'levels':
      return `#/packs/${screen.pack}/${screen.skill}`
    case 'play':
      return `#/play/${screen.level}`
    case 'profiles':
    case 'about':
    case 'editor':
      return `#/${screen.name}`
    case 'editPack':
      return `#/editor/${screen.pack}`
    case 'editLevel':
      return `#/editor/${screen.pack}/${screen.skill}/${screen.slot}`
  }
}

/** The screen on display; it follows the address, so the browser's back button works. */
export const screen = signal<Screen>(parseHash(globalThis.location?.hash ?? ''))

export function navigate(next: Screen): void {
  const hash = formatHash(next)
  if (location.hash !== hash) location.hash = hash
  screen.value = next
}

/** Follows changes of the address, such as the back button; returns how to stop. */
export function followAddress(): () => void {
  const update = () => {
    screen.value = parseHash(location.hash)
  }
  update()
  window.addEventListener('hashchange', update)
  return () => window.removeEventListener('hashchange', update)
}
