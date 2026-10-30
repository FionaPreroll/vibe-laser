import { describe, expect, it } from 'vitest'
import {
  ACTIONS,
  actionOfKey,
  combo,
  DEFAULT_BINDINGS,
  keyLabel,
  padLabel,
  rebind,
  resolveBindings,
} from './bindings'
import { PadReader, pressedButtons, REPEAT_DELAY_MS, REPEAT_MS } from './gamepad'

const press = (
  key: string,
  modifiers: Partial<Record<'ctrl' | 'shift' | 'alt', boolean>> = {},
) => ({
  key,
  ctrlKey: modifiers.ctrl ?? false,
  metaKey: false,
  shiftKey: modifiers.shift ?? false,
  altKey: modifiers.alt ?? false,
})

describe('key bindings', () => {
  it('writes key presses the same however they were typed', () => {
    expect(combo(press('q'))).toBe('Q')
    expect(combo(press('Q', { shift: true }))).toBe('Q')
    expect(combo(press(' '))).toBe('Space')
    expect(combo(press('z', { ctrl: true, shift: true }))).toBe('Ctrl+Shift+Z')
    expect(combo({ ...press('z'), metaKey: true })).toBe('Ctrl+Z')
    expect(combo(press('ArrowUp', { shift: true }))).toBe('Shift+ArrowUp')
    expect(combo(press('Shift', { shift: true }))).toBeUndefined()
  })

  it('finds the action of a key, and every action has a default key or a button', () => {
    expect(actionOfKey(DEFAULT_BINDINGS, press('e'))).toBe('rotateRight')
    expect(actionOfKey(DEFAULT_BINDINGS, press('Z', { ctrl: true, shift: true }))).toBe('redo')
    expect(actionOfKey(DEFAULT_BINDINGS, press('z'))).toBeUndefined()
    for (const action of ACTIONS) {
      expect(
        DEFAULT_BINDINGS.keys[action].length + DEFAULT_BINDINGS.pad[action].length,
      ).toBeGreaterThan(0)
    }
    const keys = ACTIONS.flatMap((action) => DEFAULT_BINDINGS.keys[action])
    const buttons = ACTIONS.flatMap((action) => DEFAULT_BINDINGS.pad[action])
    expect(new Set(keys).size).toBe(keys.length)
    expect(new Set(buttons).size).toBe(buttons.length)
  })

  it('puts changes over the defaults, and takes a rebound key from the action that had it', () => {
    const changed = rebind({}, 'keys', 'restart', 'Q')
    expect(changed.keys).toEqual({ restart: ['Q'], rotateLeft: [] })
    const resolved = resolveBindings({ ...changed, keys: { ...changed.keys, unknown: ['X'] } })
    expect(resolved.keys.restart).toEqual(['Q'])
    expect(resolved.keys.rotateLeft).toEqual([])
    expect(resolved.keys.undo).toEqual(['Ctrl+Z'])
    expect(rebind(changed, 'pad', 'undo', 0).pad).toEqual({ undo: [0], pickUp: [] })
  })

  it('names keys and buttons for players', () => {
    const names = { ctrl: 'Strg', space: 'Leertaste' }
    expect(keyLabel('Ctrl+Shift+Z', names)).toBe('Strg+Shift+Z')
    expect(keyLabel('ArrowLeft', names)).toBe('←')
    expect(keyLabel('Space', names)).toBe('Leertaste')
    expect(keyLabel('Escape', names)).toBe('Esc')
    expect([padLabel(0), padLabel(4), padLabel(14), padLabel(16)]).toEqual(['A', 'LB', 'D←', '#17'])
  })
})

describe('gamepad', () => {
  const pad = (pressed: number[], axes = [0, 0]) => ({
    buttons: Array.from({ length: 16 }, (_, index) => ({ pressed: pressed.includes(index) })),
    axes,
  })

  it('counts the left stick as the D-pad, on every connected pad', () => {
    expect(pressedButtons([null, pad([0], [-0.9, 0.2]), pad([3], [0, 0.8])])).toEqual(
      new Set([0, 14, 3, 13]),
    )
  })

  it('acts once per press, and repeats directions while they are held', () => {
    const reader = new PadReader()
    const read = (buttons: number[], now: number) =>
      reader.update(new Set(buttons), now, DEFAULT_BINDINGS)
    expect(read([0, 15], 0)).toEqual(['pickUp', 'right'])
    expect(read([0, 15], REPEAT_DELAY_MS - 1)).toEqual([])
    expect(read([0, 15], REPEAT_DELAY_MS)).toEqual(['right'])
    expect(read([0, 15], REPEAT_DELAY_MS + REPEAT_MS)).toEqual(['right'])
    expect(read([], REPEAT_DELAY_MS + REPEAT_MS + 1)).toEqual([])
    expect(read([0], REPEAT_DELAY_MS + REPEAT_MS + 2)).toEqual(['pickUp'])
    reader.hold(new Set([1]), 0)
    expect(read([1], 5000)).toEqual([])
  })
})
