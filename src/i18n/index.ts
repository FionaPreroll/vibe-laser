import { signal } from '@preact/signals'
import { format } from './format'
import { detectLocale, isLocale, type Locale } from './locale'
import { de, en, type MessageKey } from './messages'

export { isLocale, LOCALES, type Locale } from './locale'
export type { MessageKey } from './messages'

const catalogs: Record<Locale, Record<MessageKey, string>> = { en, de }

// Until player profiles exist, the language choice lives in localStorage.
const STORAGE_KEY = 'vibe-laser.locale'

function storedLocale(): Locale | undefined {
  try {
    const value = localStorage.getItem(STORAGE_KEY)
    return isLocale(value) ? value : undefined
  } catch {
    return undefined
  }
}

/** The interface language. Components that call t() re-render when it changes. */
export const locale = signal<Locale>(storedLocale() ?? detectLocale(navigator.languages))

export function setLocale(next: Locale): void {
  locale.value = next
  try {
    localStorage.setItem(STORAGE_KEY, next)
  } catch {
    // Storage can be blocked, for example in private windows; the choice then lasts for this visit.
  }
}

/** Text in the current language, with {placeholders} filled from params. */
export function t(key: MessageKey, params?: Readonly<Record<string, string | number>>): string {
  return format(catalogs[locale.value][key], params)
}
