import { t } from '../i18n'
import { type Action, bindings, gamepadConnected, keyLabel, padLabel } from '../view/bindings'

/** A key as players read it, with Ctrl and Space in their language. */
export function keyName(key: string): string {
  return keyLabel(key, { ctrl: t('keyCtrl'), space: t('keySpace') })
}

/** The first key of an action, and its controller button while a controller is connected. */
export function shortcutOf(action: Action): string | undefined {
  const { keys, pad } = bindings.value
  const names = []
  const key = keys[action][0]
  if (key !== undefined) names.push(keyName(key))
  const button = pad[action][0]
  if (gamepadConnected.value && button !== undefined) names.push(padLabel(button))
  return names.length === 0 ? undefined : names.join(' / ')
}

/** A button's tooltip: its name, and its shortcut after it. */
export function withShortcut(label: string, action: Action): string {
  const keys = shortcutOf(action)
  return keys === undefined ? label : t('withShortcut', { label, keys })
}

/** The keyboard part of the help, naming the keys the player chose. */
export function controlsText(): string {
  const { keys } = bindings.value
  const first = (action: Action) => {
    const key = keys[action][0]
    return key === undefined ? t('bindingNone') : keyName(key)
  }
  const move = (['up', 'left', 'down', 'right'] as const).map(first).join(' ')
  return t('controls', {
    move,
    pickUp: first('pickUp'),
    rotateLeft: first('rotateLeft'),
    rotateRight: first('rotateRight'),
    undo: first('undo'),
  })
}
