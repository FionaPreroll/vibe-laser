import { ACTIONS, type Action, type Bindings, gamepadConnected } from './bindings'

/** A direction held down moves on after this long, then again every REPEAT_MS. */
export const REPEAT_DELAY_MS = 350
export const REPEAT_MS = 120
/** How far a stick must lean before it counts as a direction. */
export const STICK_THRESHOLD = 0.5

const DIRECTIONS: ReadonlySet<Action> = new Set(['up', 'down', 'left', 'right'])

/** What the poll needs of a gamepad: the Gamepad API's buttons and axes. */
export interface PadState {
  readonly buttons: readonly { readonly pressed: boolean }[]
  readonly axes: readonly number[]
}

/** The buttons pressed on any connected pad, the left stick counting as the D-pad. */
export function pressedButtons(pads: readonly (PadState | null)[]): Set<number> {
  const pressed = new Set<number>()
  for (const pad of pads) {
    if (pad === null) continue
    pad.buttons.forEach((button, index) => {
      if (button.pressed) pressed.add(index)
    })
    const [x = 0, y = 0] = pad.axes
    if (y < -STICK_THRESHOLD) pressed.add(12)
    if (y > STICK_THRESHOLD) pressed.add(13)
    if (x < -STICK_THRESHOLD) pressed.add(14)
    if (x > STICK_THRESHOLD) pressed.add(15)
  }
  return pressed
}

/**
 * Turns button presses into actions, one per press, and repeats directions while held. Feed it
 * the pressed buttons and the time at every frame.
 */
export class PadReader {
  #held = new Map<number, number>()

  update(pressed: ReadonlySet<number>, now: number, current: Bindings): Action[] {
    const actions: Action[] = []
    for (const button of [...this.#held.keys()]) if (!pressed.has(button)) this.#held.delete(button)
    for (const button of pressed) {
      const action = ACTIONS.find((candidate) => current.pad[candidate].includes(button))
      const due = this.#held.get(button)
      if (due === undefined) {
        this.#held.set(button, now + REPEAT_DELAY_MS)
        if (action) actions.push(action)
      } else if (action && DIRECTIONS.has(action) && now >= due) {
        this.#held.set(button, now + REPEAT_MS)
        actions.push(action)
      }
    }
    return actions
  }

  /** Forgets what is held, so buttons held through a pause count only once they are let go. */
  hold(pressed: ReadonlySet<number>, now: number): void {
    for (const button of pressed) this.#held.set(button, now + Number.POSITIVE_INFINITY)
  }
}

function readPads(): readonly (PadState | null)[] {
  if (typeof navigator.getGamepads !== 'function') return []
  try {
    return [...navigator.getGamepads()]
  } catch {
    // Browsers can refuse the Gamepad API, for example in frames without permission.
    return []
  }
}

/**
 * Polls the connected controllers once per frame and hands their actions on. While `paused`
 * says so, presses are swallowed. Returns a function that stops it.
 */
export function watchGamepads(
  current: () => Bindings,
  paused: () => boolean,
  onAction: (action: Action) => void,
): () => void {
  const reader = new PadReader()
  let frame = 0
  const poll = (now: number) => {
    const pads = readPads()
    gamepadConnected.value = pads.some((pad) => pad !== null)
    const pressed = pressedButtons(pads)
    if (paused()) reader.hold(pressed, now)
    else for (const action of reader.update(pressed, now, current())) onAction(action)
    frame = requestAnimationFrame(poll)
  }
  frame = requestAnimationFrame(poll)
  return () => cancelAnimationFrame(frame)
}

/** Waits for the next press of a button on any controller, for rebinding. */
export function nextPadButton(onButton: (button: number) => void): () => void {
  let frame = 0
  let before: Set<number> | undefined
  const poll = () => {
    const pressed = pressedButtons(readPads())
    const fresh = before && [...pressed].find((button) => !before?.has(button))
    if (fresh !== undefined) return onButton(fresh)
    before = pressed
    frame = requestAnimationFrame(poll)
  }
  frame = requestAnimationFrame(poll)
  return () => cancelAnimationFrame(frame)
}
