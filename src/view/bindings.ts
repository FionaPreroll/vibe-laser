import { signal } from '@preact/signals-core'

/** Everything a key or a controller button can do while a level is played. */
export const ACTIONS = [
  'up',
  'down',
  'left',
  'right',
  'pickUp',
  'cancel',
  'rotateLeft',
  'rotateRight',
  'undo',
  'redo',
  'restart',
  'cleanup',
  'speed',
  'help',
  'next',
  'exit',
] as const
export type Action = (typeof ACTIONS)[number]

/** Actions that drive the board itself; from the keyboard they need the board to have focus. */
export const BOARD_ACTIONS: ReadonlySet<Action> = new Set([
  'up',
  'down',
  'left',
  'right',
  'pickUp',
  'cancel',
  'rotateLeft',
  'rotateRight',
])

/** For each action its keys, written as `combo` writes them, and its controller buttons. */
export interface Bindings {
  readonly keys: Readonly<Record<Action, readonly string[]>>
  readonly pad: Readonly<Record<Action, readonly number[]>>
}

/** What a player changed; actions left out keep their defaults. */
export interface BindingOverrides {
  readonly keys?: Readonly<Record<string, readonly string[]>>
  readonly pad?: Readonly<Record<string, readonly number[]>>
}

/**
 * Buttons of the standard gamepad layout: A, B, X, Y, the shoulder buttons and triggers, Back,
 * Start, the two stick presses and the four directions of the D-pad.
 */
export const PAD_BUTTONS = [
  'A',
  'B',
  'X',
  'Y',
  'LB',
  'RB',
  'LT',
  'RT',
  'Back',
  'Start',
  'LS',
  'RS',
  'D↑',
  'D↓',
  'D←',
  'D→',
] as const

export const DEFAULT_BINDINGS: Bindings = {
  keys: {
    up: ['ArrowUp', 'W'],
    down: ['ArrowDown', 'S'],
    left: ['ArrowLeft', 'A'],
    right: ['ArrowRight', 'D'],
    pickUp: ['Enter', 'Space'],
    cancel: ['Escape'],
    rotateLeft: ['Q'],
    rotateRight: ['E'],
    undo: ['Ctrl+Z'],
    redo: ['Ctrl+Y', 'Ctrl+Shift+Z'],
    restart: ['R'],
    cleanup: ['C'],
    speed: ['F'],
    help: ['H'],
    next: ['N'],
    exit: [],
  },
  pad: {
    up: [12],
    down: [13],
    left: [14],
    right: [15],
    pickUp: [0],
    cancel: [1],
    rotateLeft: [4],
    rotateRight: [5],
    undo: [2],
    redo: [3],
    restart: [10],
    cleanup: [6],
    speed: [7],
    help: [9],
    next: [11],
    exit: [8],
  },
}

const isAction = (name: string): name is Action => (ACTIONS as readonly string[]).includes(name)

/** The defaults with the player's changes on top. */
export function resolveBindings(overrides: BindingOverrides): Bindings {
  const keys = { ...DEFAULT_BINDINGS.keys }
  const pad = { ...DEFAULT_BINDINGS.pad }
  for (const [name, value] of Object.entries(overrides.keys ?? {}))
    if (isAction(name) && value) keys[name] = value
  for (const [name, value] of Object.entries(overrides.pad ?? {}))
    if (isAction(name) && value) pad[name] = value
  return { keys, pad }
}

/**
 * Binds one key or button to an action, alone. Another action that had it lets go of it, so no
 * press does two things.
 */
export function rebind(
  overrides: BindingOverrides,
  kind: 'keys' | 'pad',
  action: Action,
  input: string | number,
): BindingOverrides {
  const current = resolveBindings(overrides)[kind] as Record<Action, readonly (string | number)[]>
  const changed: Record<string, readonly (string | number)[]> = { ...(overrides[kind] ?? {}) }
  for (const other of ACTIONS) {
    if (other !== action && current[other].includes(input))
      changed[other] = current[other].filter((bound) => bound !== input)
  }
  changed[action] = [input]
  return { ...overrides, [kind]: changed }
}

/** The players' bindings on every board. The active profile's settings set them. */
export const bindings = signal<Bindings>(DEFAULT_BINDINGS)

/** True while a controller is connected, so tooltips name its buttons too. */
export const gamepadConnected = signal(false)

interface KeyPress {
  readonly key: string
  readonly ctrlKey: boolean
  readonly metaKey: boolean
  readonly shiftKey: boolean
  readonly altKey: boolean
}

const MODIFIER_KEYS = new Set(['Control', 'Shift', 'Alt', 'Meta', 'AltGraph', 'CapsLock'])

/**
 * A key press as bindings write it, such as "Q", "Space", "ArrowLeft" or "Ctrl+Shift+Z";
 * undefined for a modifier alone. Shift counts only beside Ctrl or Alt or with a named key, since
 * Shift+Q is just a capital Q.
 */
export function combo(event: KeyPress): string | undefined {
  if (MODIFIER_KEYS.has(event.key)) return undefined
  const named = event.key.length > 1
  const key = event.key === ' ' ? 'Space' : named ? event.key : event.key.toUpperCase()
  const ctrl = event.ctrlKey || event.metaKey
  const parts = []
  if (ctrl) parts.push('Ctrl')
  if (event.altKey) parts.push('Alt')
  if (event.shiftKey && (ctrl || event.altKey || (named && key !== 'Space'))) parts.push('Shift')
  parts.push(key)
  return parts.join('+')
}

/** The action a key press is bound to, if any. */
export function actionOfKey(current: Bindings, event: KeyPress): Action | undefined {
  const pressed = combo(event)
  if (pressed === undefined) return undefined
  return ACTIONS.find((action) => current.keys[action].includes(pressed))
}

const ARROWS: Readonly<Record<string, string>> = {
  ArrowUp: '↑',
  ArrowDown: '↓',
  ArrowLeft: '←',
  ArrowRight: '→',
  Escape: 'Esc',
}

/** A combo for tooltips and settings, with arrows for the arrow keys; `names` translates words. */
export function keyLabel(key: string, names: { ctrl: string; space: string }): string {
  return key
    .split('+')
    .map((part) =>
      part === 'Ctrl' ? names.ctrl : part === 'Space' ? names.space : (ARROWS[part] ?? part),
    )
    .join('+')
}

/** A controller button's name, such as "A" or "LB"; numbers past the standard layout as "#17". */
export function padLabel(button: number): string {
  return PAD_BUTTONS[button] ?? `#${button + 1}`
}
