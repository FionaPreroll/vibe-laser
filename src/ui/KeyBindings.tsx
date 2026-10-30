import { useEffect, useState } from 'preact/hooks'
import { t } from '../i18n'
import type { ProfileBook } from '../persistence/profiles'
import {
  ACTIONS,
  type Action,
  type BindingOverrides,
  combo,
  padLabel,
  rebind,
  resolveBindings,
} from '../view/bindings'
import { nextPadButton } from '../view/gamepad'
import { keyName } from './shortcuts'

type Kind = 'keys' | 'pad'

interface Waiting {
  readonly kind: Kind
  readonly action: Action
}

const copy = <T,>(record: Readonly<Record<string, readonly T[]>> = {}) =>
  Object.fromEntries(Object.entries(record).map(([action, inputs]) => [action, [...inputs]]))

/**
 * The table of keys and controller buttons in the settings. A click on a field waits for the next
 * key or button, which then does that action, and only that one.
 */
export function KeyBindings({ book }: { readonly book: ProfileBook }) {
  const { settings } = book.active.value
  const overrides: BindingOverrides = { keys: settings.keyBindings, pad: settings.padBindings }
  const current = resolveBindings(overrides)
  const [waiting, setWaiting] = useState<Waiting | undefined>(undefined)

  const save = (next: BindingOverrides) =>
    void book.updateSettings({ keyBindings: copy(next.keys), padBindings: copy(next.pad) })

  useEffect(() => {
    if (waiting === undefined) return
    const bind = (input: string | number) => {
      setWaiting(undefined)
      save(rebind(overrides, waiting.kind, waiting.action, input))
    }
    if (waiting.kind === 'pad') return nextPadButton(bind)
    // Ahead of everything else, so Escape binds instead of closing the settings.
    const onKey = (event: KeyboardEvent) => {
      event.preventDefault()
      event.stopImmediatePropagation()
      const pressed = combo(event)
      if (pressed !== undefined) bind(pressed)
    }
    window.addEventListener('keydown', onKey, { capture: true })
    return () => window.removeEventListener('keydown', onKey, { capture: true })
  })

  const field = (kind: Kind, action: Action) => {
    const names =
      kind === 'keys' ? current.keys[action].map(keyName) : current.pad[action].map(padLabel)
    const shown = names.length === 0 ? t('bindingNone') : names.join(' / ')
    const isWaiting = waiting?.kind === kind && waiting.action === action
    const name = t(`action.${action}`)
    return (
      <button
        type="button"
        class={isWaiting ? 'binding waiting' : 'binding'}
        aria-label={t(kind === 'keys' ? 'bindingKeyFor' : 'bindingPadFor', {
          action: name,
          current: shown,
        })}
        aria-pressed={isWaiting}
        onClick={() => setWaiting(isWaiting ? undefined : { kind, action })}
      >
        {isWaiting ? t(kind === 'keys' ? 'bindingWaitKey' : 'bindingWaitPad') : shown}
      </button>
    )
  }

  return (
    <details class="bindings">
      <summary>{t('bindingsTitle')}</summary>
      <p class="hint">{t('bindingsHint')}</p>
      <table>
        <thead>
          <tr>
            <th scope="col">{t('bindingAction')}</th>
            <th scope="col">{t('bindingKey')}</th>
            <th scope="col">{t('bindingPad')}</th>
          </tr>
        </thead>
        <tbody>
          {ACTIONS.map((action) => (
            <tr key={action}>
              <th scope="row">{t(`action.${action}`)}</th>
              <td>{field('keys', action)}</td>
              <td>{field('pad', action)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <button
        type="button"
        onClick={() => {
          setWaiting(undefined)
          save({})
        }}
      >
        {t('bindingsReset')}
      </button>
    </details>
  )
}
