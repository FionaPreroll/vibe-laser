// @vitest-environment happy-dom
import type { Container, FederatedPointerEvent, Graphics } from 'pixi.js'
import { Point } from 'pixi.js'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { puzzleOf } from '../content/level'
import { findLevel } from '../content/packs'
import { createPuzzle, itemById, type Place, type Puzzle } from '../core/level'
import { parseBoard, parsePiece } from '../core/notation'
import { GameSession } from '../game/session'
import { bindings, DEFAULT_BINDINGS, gamepadConnected, resolveBindings } from './bindings'
import { LONG_PRESS_MS, mountBoard, TOUCH_LIFT } from './board'
import { BoardController } from './controller'
import { beamPreview, colorBlind } from './display'
import { placeCenter } from './layout'

// No WebGL here: a stand-in Application keeps PixiJS's real scene graph without a renderer.
const fakes = vi.hoisted(() => ({
  apps: [] as {
    stage: Container
    ticker: { callbacks: ((ticker: { deltaMS: number }) => void)[] }
  }[],
}))
vi.mock('pixi.js', async (importOriginal) => {
  const pixi = await importOriginal<typeof import('pixi.js')>()
  class Application {
    readonly stage = new pixi.Container()
    readonly screen = { width: 900, height: 600 }
    readonly canvas = document.createElement('canvas')
    readonly renderer = { on: vi.fn(), off: vi.fn() }
    readonly ticker = {
      callbacks: [] as ((ticker: { deltaMS: number }) => void)[],
      add(callback: (ticker: { deltaMS: number }) => void) {
        this.callbacks.push(callback)
      },
    }
    readonly destroy = vi.fn()
    constructor() {
      fakes.apps.push(this)
    }
    async init() {}
  }
  return { ...pixi, Application }
})

afterEach(() => {
  document.body.innerHTML = ''
  fakes.apps.length = 0
  colorBlind.value = false
  beamPreview.value = true
})

async function puzzleOfLevel(id: string): Promise<Puzzle> {
  const level = await findLevel(id)?.entry.load()
  if (level === undefined) throw new Error(`No level ${id}`)
  return puzzleOf(level.file)
}

/** Mounts a built-in level by its id, or a puzzle of its own. */
async function mount(level: string | Puzzle = 'tutorial/1/1') {
  const puzzle = typeof level === 'string' ? await puzzleOfLevel(level) : level
  const controller = new BoardController(new GameSession(puzzle))
  const host = document.createElement('div')
  document.body.append(host)
  const view = await mountBoard(host, controller)
  const app = fakes.apps.at(-1)
  const scene = app?.stage.children[0] as Container
  const layout = () =>
    JSON.parse(host.dataset.layout ?? '{}') as { scale: number; x: number; y: number }
  /** Where a place is on the screen, nudged to the right by some pixels. */
  const screenAt = (place: Place, nudge = 0) => {
    const { scale, x, y } = layout()
    const center = placeCenter(controller.geometry, place)
    return new Point(x + center.x * scale + nudge, y + center.y * scale)
  }
  /** A pointer event over a place on the board or in the toolbox, nudged by some pixels. */
  const at = (place: Place, button = 0, nudge = 0) =>
    ({ global: screenAt(place, nudge), button }) as unknown as FederatedPointerEvent
  /** A finger on the screen, by its pointer id. */
  const finger = (id: number, global: Point) =>
    ({ global, button: 0, pointerType: 'touch', pointerId: id }) as unknown as FederatedPointerEvent
  const key = (key: string, init: KeyboardEventInit = {}) =>
    window.dispatchEvent(new KeyboardEvent('keydown', { key, cancelable: true, ...init }))
  const tick = (deltaMS: number) => {
    for (const callback of app?.ticker.callbacks ?? []) callback({ deltaMS })
  }
  return { controller, host, view, scene, at, screenAt, finger, layout, key, tick, app }
}

const SLOT: Place = { area: 'toolbox', slot: 0 }
const B6: Place = { area: 'board', cell: 11 }
const B1: Place = { area: 'board', cell: 6 }
const MIRROR = 2

describe('mountBoard', () => {
  it('puts a canvas into its host and reports the layout and the art for browser tests', async () => {
    const { host } = await mount()
    expect(host.querySelector('canvas')).toBeTruthy()
    const layout = JSON.parse(host.dataset.layout ?? '{}')
    expect(layout.cell).toBe(64)
    expect(layout.scale).toBeGreaterThan(0)
    expect(host.dataset.art).toBe('flat')
    expect(host.tabIndex).toBe(0)
  })

  it('rotates a piece left on a left click and right on a right click', async () => {
    const { controller, scene, at } = await mount()
    const rotation = () => itemById(controller.session.state.value.puzzle, MIRROR)?.piece.rotation
    scene.emit('pointerdown', at(SLOT))
    scene.emit('pointerup', at(SLOT))
    expect(rotation()).toBe(7)
    scene.emit('pointerdown', at(SLOT, 2))
    scene.emit('pointerup', at(SLOT, 2))
    expect(rotation()).toBe(0)
    expect(controller.selected.value).toBe(MIRROR)
  })

  it('treats a small wiggle as a click', async () => {
    const { controller, scene, at } = await mount()
    scene.emit('pointerdown', at(SLOT))
    scene.emit('globalpointermove', at(SLOT, 0, 3))
    scene.emit('pointerup', at(SLOT, 0, 3))
    expect(itemById(controller.session.state.value.puzzle, MIRROR)?.piece.rotation).toBe(7)
  })

  it('drags a piece from the toolbox onto the board', async () => {
    const { controller, scene, at } = await mount()
    scene.emit('pointerdown', at(SLOT))
    scene.emit('globalpointermove', at(SLOT, 0, 20))
    expect(scene.cursor).toBe('grabbing')
    scene.emit('globalpointermove', at(B6))
    scene.emit('pointerup', at(B6))
    expect(itemById(controller.session.state.value.puzzle, MIRROR)?.place).toEqual(B6)
  })

  it('leaves a piece where it was when it is dropped on a taken cell', async () => {
    const { controller, scene, at } = await mount()
    scene.emit('pointerdown', at(SLOT))
    scene.emit('globalpointermove', at(B1))
    scene.emit('pointerupoutside', at(B1))
    expect(itemById(controller.session.state.value.puzzle, MIRROR)?.place).toEqual(SLOT)
  })

  it('does not drag fixed pieces', async () => {
    const { controller, scene, at } = await mount()
    scene.emit('pointerdown', at(B1))
    scene.emit('globalpointermove', at(B6))
    scene.emit('pointerup', at(B6))
    expect(itemById(controller.session.state.value.puzzle, 1)?.place).toEqual(B1)
  })

  it('shows what the pointer can do with the piece under it', async () => {
    const { scene, at } = await mount()
    scene.emit('globalpointermove', at(SLOT))
    expect(scene.cursor).toBe('grab')
    scene.emit('globalpointermove', at(B1))
    expect(scene.cursor).toBe('default')
  })

  it('tells the color dots what the mouse points at, but not what a finger touches', async () => {
    const { controller, host, scene, at, screenAt, finger } = await mount()
    const kind = () => controller.inspected.value?.kind
    scene.emit('globalpointermove', at(B1))
    expect(controller.hovered.value).toEqual(B1)
    expect(kind()).toBe('laser')
    // While a piece is dragged, the dots keep showing it; dropped, it is under the mouse.
    scene.emit('pointerdown', at(SLOT))
    scene.emit('globalpointermove', at(SLOT, 0, 20))
    scene.emit('globalpointermove', at(B6))
    expect(kind()).toBe('mirror')
    host.querySelector('canvas')?.dispatchEvent(new Event('pointerleave'))
    expect(kind()).toBe('mirror')
    scene.emit('pointerup', at(B6))
    expect(controller.hovered.value).toEqual(B6)
    expect(kind()).toBe('mirror')
    host.querySelector('canvas')?.dispatchEvent(new Event('pointerleave'))
    expect(controller.hovered.value).toBeUndefined()
    scene.emit('pointerdown', finger(1, screenAt(B1)))
    scene.emit('globalpointermove', finger(1, screenAt(B1, 4)))
    scene.emit('pointerup', finger(1, screenAt(B1, 4)))
    expect(controller.hovered.value).toBeUndefined()
    // A tap selects the laser, and the dots show the selected piece.
    expect(kind()).toBe('laser')
  })

  it('shows faintly where light would go while a piece is carried, and nothing changes', async () => {
    const { controller, scene, at } = await mount()
    const beams = scene.children[1] as Container
    const lines = () => beams.children.filter((sprite) => sprite.visible).length
    const B3: Place = { area: 'board', cell: 8 }
    const before = lines()
    scene.emit('pointerdown', at(SLOT))
    scene.emit('globalpointermove', at(SLOT, 0, 20))
    scene.emit('globalpointermove', at(B3))
    expect(beams.alpha).toBeLessThan(1)
    const previewed = lines()
    expect(previewed).not.toBe(before)
    expect(itemById(controller.session.state.value.puzzle, MIRROR)?.place).toEqual(SLOT)
    // The mirror cannot go down on the laser, so the light would stay as it is.
    scene.emit('globalpointermove', at(B1))
    expect([beams.alpha, lines()]).toEqual([1, before])
    scene.emit('globalpointermove', at(B3))
    scene.emit('pointerup', at(B3))
    expect([beams.alpha, lines()]).toEqual([1, previewed])
  })

  it('previews the light for a piece lifted with the keyboard, in the frame', async () => {
    const { host, scene, key } = await mount()
    const beams = scene.children[1] as Container
    host.dispatchEvent(new FocusEvent('focus'))
    key('Enter')
    for (let step = 0; step < 4; step++) key('ArrowRight')
    key('ArrowDown')
    expect(beams.alpha).toBeLessThan(1)
    key('Escape')
    expect(beams.alpha).toBe(1)
    host.dispatchEvent(new FocusEvent('blur'))
  })

  it('rings the explosives the light would reach, and shows nothing with the setting off', async () => {
    // The mirror in the toolbox points north-west: in B3 it would send the beam into A3.
    const mirror = parsePiece('M7')
    if (mirror === undefined) throw new Error('No mirror')
    const puzzle = createPuzzle(parseBoard('.   .   T   T \n L2r .   .   .'), [mirror])
    const { scene, at } = await mount(puzzle)
    const beams = scene.children[1] as Container
    const overlay = scene.children[5] as Graphics
    const strokes = () =>
      overlay.context.instructions.filter((instruction) => instruction.action === 'stroke').length
    const B3: Place = { area: 'board', cell: 6 }
    scene.emit('pointerdown', at(SLOT))
    scene.emit('globalpointermove', at(SLOT, 0, 20))
    scene.emit('globalpointermove', at(B3))
    const warned = strokes()
    beamPreview.value = false
    scene.emit('globalpointermove', at(B3))
    expect(beams.alpha).toBe(1)
    // The ring around the explosive in A3 is gone, the rest of the overlay stays.
    expect(strokes()).toBe(warned - 1)
  })

  it('shows a hinted piece where it goes, turned as it should be, until it is there', async () => {
    const { controller, scene } = await mount()
    const hints = scene.children[7] as Container
    expect(hints.children).toHaveLength(0)
    controller.hint.value = { item: MIRROR, place: B6, rotation: 7 }
    expect(hints.children).toHaveLength(1)
    expect(hints.children[0]?.rotation).toBeCloseTo((7 * Math.PI) / 4)
    expect(hints.children[0]?.alpha).toBe(0.5)
    // On its cell but not yet turned, the mirror still shows the hint.
    controller.move(MIRROR, B6)
    expect(hints.children).toHaveLength(1)
    controller.rotate(MIRROR, -1)
    expect(hints.children).toHaveLength(0)
  })

  it('writes colors as letters and splits beams in color-blind mode', async () => {
    const { scene } = await mount()
    const labels = scene.children[3] as Container
    const beams = scene.children[1] as Container
    const lines = () => beams.children.filter((sprite) => sprite.visible).length
    expect(labels.children).toHaveLength(0)
    const plain = lines()
    colorBlind.value = true
    // The red laser and the red coin.
    expect(labels.children).toHaveLength(2)
    expect(lines()).toBe(plain)
    colorBlind.value = false
    expect(labels.children).toHaveLength(0)
  })

  it('selects with a tap, moves to a tapped free cell, and turns with a second tap', async () => {
    const { controller, scene, screenAt, finger } = await mount()
    const tap = (place: Place) => {
      scene.emit('pointerdown', finger(1, screenAt(place)))
      scene.emit('pointerup', finger(1, screenAt(place)))
    }
    tap(SLOT)
    expect(controller.selected.value).toBe(MIRROR)
    expect(itemById(controller.session.state.value.puzzle, MIRROR)?.piece.rotation).toBe(0)
    tap(B6)
    expect(itemById(controller.session.state.value.puzzle, MIRROR)?.place).toEqual(B6)
    tap(B6)
    expect(controller.session.state.value.phase).toBe('solved')
  })

  it('turns a piece right when a finger rests on it, and only once', async () => {
    vi.useFakeTimers()
    try {
      const { controller, scene, screenAt, finger } = await mount()
      const rotation = () => itemById(controller.session.state.value.puzzle, MIRROR)?.piece.rotation
      scene.emit('pointerdown', finger(1, screenAt(SLOT)))
      vi.advanceTimersByTime(LONG_PRESS_MS - 1)
      expect(rotation()).toBe(0)
      vi.advanceTimersByTime(1)
      expect(rotation()).toBe(1)
      scene.emit('pointerup', finger(1, screenAt(SLOT)))
      expect(rotation()).toBe(1)
      expect(controller.selected.value).toBe(MIRROR)

      // A finger that sets off dragging turns nothing.
      scene.emit('pointerdown', finger(1, screenAt(SLOT)))
      scene.emit('globalpointermove', finger(1, screenAt(SLOT, 20)))
      vi.advanceTimersByTime(LONG_PRESS_MS)
      scene.emit('pointerup', finger(1, screenAt(SLOT, 20)))
      expect(rotation()).toBe(1)
    } finally {
      vi.useRealTimers()
    }
  })

  it('lets a finger wobble more than a mouse before it drags', async () => {
    const { controller, scene, screenAt, finger } = await mount()
    scene.emit('pointerdown', finger(1, screenAt(SLOT)))
    scene.emit('globalpointermove', finger(1, screenAt(SLOT, 8)))
    scene.emit('pointerup', finger(1, screenAt(SLOT, 8)))
    expect(controller.selected.value).toBe(MIRROR)
    controller.select(undefined)
    scene.emit('pointerdown', finger(1, screenAt(SLOT)))
    scene.emit('globalpointermove', finger(1, screenAt(SLOT, 20)))
    // The piece floats above the finger, so the finger goes down below where it should land.
    const below = screenAt(B6)
    below.y += TOUCH_LIFT
    scene.emit('globalpointermove', finger(1, below))
    scene.emit('pointerup', finger(1, below))
    expect(itemById(controller.session.state.value.puzzle, MIRROR)?.place).toEqual(B6)
    expect(controller.selected.value).toBe(MIRROR)
  })

  it('puts a piece carried by a finger down above the finger, not under it', async () => {
    const { controller, scene, screenAt, finger } = await mount()
    scene.emit('pointerdown', finger(1, screenAt(SLOT)))
    scene.emit('globalpointermove', finger(1, screenAt(SLOT, 20)))
    const near = screenAt(B6)
    scene.emit('globalpointermove', finger(1, near))
    scene.emit('pointerup', finger(1, near))
    expect(itemById(controller.session.state.value.puzzle, MIRROR)?.place).not.toEqual(B6)
  })

  it('zooms with two fingers, and pans a zoomed board with one', async () => {
    const { controller, scene, screenAt, finger, layout } = await mount()
    const fitted = layout()
    const middle = screenAt({ area: 'board', cell: 8 })
    const left = (by: number) => new Point(middle.x - by, middle.y)
    const right = (by: number) => new Point(middle.x + by, middle.y)
    // One finger on an empty cell of a fitted board does nothing.
    scene.emit('pointerdown', finger(1, left(0)))
    scene.emit('globalpointermove', finger(1, left(40)))
    scene.emit('pointerup', finger(1, left(40)))
    expect(layout()).toEqual(fitted)

    scene.emit('pointerdown', finger(1, left(20)))
    scene.emit('pointerdown', finger(2, right(20)))
    scene.emit('globalpointermove', finger(1, left(40)))
    scene.emit('globalpointermove', finger(2, right(40)))
    scene.emit('pointerup', finger(2, right(40)))
    const zoomed = layout()
    expect(zoomed.scale).toBeCloseTo(fitted.scale * 2)
    // The finger still down neither taps nor pans.
    scene.emit('globalpointermove', finger(1, left(100)))
    scene.emit('pointerup', finger(1, left(100)))
    expect(layout()).toEqual(zoomed)
    expect(controller.selected.value).toBeUndefined()

    scene.emit('pointerdown', finger(3, middle))
    scene.emit('globalpointermove', finger(3, new Point(middle.x + 30, middle.y + 5)))
    scene.emit('pointerup', finger(3, new Point(middle.x + 30, middle.y + 5)))
    expect(layout()).toMatchObject({ scale: zoomed.scale, x: zoomed.x + 30, y: zoomed.y + 5 })
  })

  it('drops a dragged piece back when a second finger comes down', async () => {
    const { controller, scene, screenAt, finger } = await mount()
    scene.emit('pointerdown', finger(1, screenAt(SLOT)))
    scene.emit('globalpointermove', finger(1, screenAt(B6)))
    scene.emit('pointerdown', finger(2, screenAt(B1)))
    scene.emit('pointercancel', finger(2, screenAt(B1)))
    scene.emit('pointerup', finger(1, screenAt(B6)))
    expect(itemById(controller.session.state.value.puzzle, MIRROR)?.place).toEqual(SLOT)
  })

  it('plays the level with the keyboard while the board has the focus', async () => {
    const { controller, host, key } = await mount()
    key('Enter')
    expect(controller.lifted.value).toBeUndefined()
    host.dispatchEvent(new FocusEvent('focus'))
    expect(key('Enter')).toBe(false)
    expect(controller.lifted.value).toBe(MIRROR)
    for (let step = 0; step < 7; step++) key('ArrowRight')
    key('ArrowDown')
    key('Enter')
    key('q')
    expect(controller.session.state.value.phase).toBe('solved')
    host.dispatchEvent(new FocusEvent('blur'))
  })

  it('undoes with Ctrl+Z anywhere but in a text field', async () => {
    const { controller, scene, at, key } = await mount()
    scene.emit('pointerdown', at(SLOT))
    scene.emit('pointerup', at(SLOT))
    const input = document.createElement('input')
    document.body.append(input)
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, bubbles: true }))
    expect(controller.session.canUndo.value).toBe(true)
    key('z', { ctrlKey: true })
    expect(controller.session.canUndo.value).toBe(false)
  })

  it('follows the keys the player chose, and screen-wide ones need no focus', async () => {
    const { controller, host, key } = await mount()
    bindings.value = resolveBindings({ keys: { pickUp: ['X'], restart: ['T'] } })
    try {
      host.dispatchEvent(new FocusEvent('focus'))
      key('Enter')
      expect(controller.lifted.value).toBeUndefined()
      key('x')
      expect(controller.lifted.value).toBe(MIRROR)
      host.dispatchEvent(new FocusEvent('blur'))
      key('ArrowRight')
      expect(controller.focus.value).toEqual({ column: -2, row: 0 })
      controller.session.execute({ kind: 'rotate', item: MIRROR, steps: 1 })
      key('t', { repeat: true })
      expect(controller.session.moves.value).toBe(1)
      key('t')
      expect(controller.session.moves.value).toBe(0)
      expect(controller.lifted.value).toBeUndefined()
    } finally {
      bindings.value = DEFAULT_BINDINGS
    }
  })

  it('plays with a controller, one step per press, but not while paused', async () => {
    const pad = { buttons: [] as { pressed: boolean }[], axes: [0, 0] }
    const press = (...buttons: number[]) => {
      pad.buttons = Array.from({ length: 16 }, (_, index) => ({ pressed: buttons.includes(index) }))
    }
    const frames = () => new Promise((resolve) => setTimeout(resolve, 60))
    press()
    Object.defineProperty(navigator, 'getGamepads', { value: () => [pad], configurable: true })
    try {
      const { controller } = await mount()
      press(0)
      await frames()
      expect(controller.lifted.value).toBe(MIRROR)
      expect(controller.keyboardActive.value).toBe(true)
      press()
      await frames()
      press(15)
      await frames()
      expect(controller.focus.value).toEqual({ column: -1, row: 0 })
      press()
      controller.paused.value = true
      await frames()
      press(1)
      await frames()
      controller.paused.value = false
      await frames()
      // B was held through the pause, so it counts only once it is let go and pressed again.
      expect(controller.lifted.value).toBe(MIRROR)
      expect(gamepadConnected.value).toBe(true)
    } finally {
      Reflect.deleteProperty(navigator, 'getGamepads')
    }
  })

  it('runs the clock and plays effects for what happens', async () => {
    const { controller, tick, scene } = await mount('tutorial/3/1')
    controller.session.execute({ kind: 'move', item: 3, to: { area: 'board', cell: 0 } })
    controller.session.execute({ kind: 'rotate', item: 3, steps: 3 })
    expect(controller.session.state.value.phase).toBe('exploding')
    const effects = scene.children[4] as Container
    expect(effects.children.length).toBeGreaterThan(0)
    tick(200)
    expect(controller.session.state.value.phase).toBe('failed')
    tick(1000)
    expect(effects.children).toHaveLength(0)
  })

  it('stands still while help or the settings are open', async () => {
    const { controller, host, key, tick } = await mount('tutorial/3/1')
    controller.session.execute({ kind: 'move', item: 3, to: { area: 'board', cell: 0 } })
    controller.session.execute({ kind: 'rotate', item: 3, steps: 3 })
    controller.paused.value = true
    tick(1000)
    expect(controller.session.state.value.phase).toBe('exploding')
    host.dispatchEvent(new FocusEvent('focus'))
    const focus = controller.focus.value
    expect(key('ArrowRight')).toBe(true)
    expect(controller.focus.value).toEqual(focus)
    controller.paused.value = false
    tick(200)
    expect(controller.session.state.value.phase).toBe('failed')
  })

  it('lets actors jump instead of glide when motion is reduced', async () => {
    // In Event Horizon the ship paces back and forth from the start.
    const { controller, tick, scene } = await mount('tutorial/3/4')
    const shipIndex = () =>
      controller.session.state.value.puzzle.items.findIndex((item) => item.piece.kind === 'ship')
    const ship = (scene.children[2] as Container).children[shipIndex()]
    const start = { x: ship?.x, y: ship?.y }
    // One ship step, with the clock moved by hand so no time passes for the gliding.
    controller.session.advance(400)
    const place = controller.session.state.value.puzzle.items[shipIndex()]?.place
    if (place === undefined) throw new Error('The ship is gone')
    const target = placeCenter(controller.geometry, place)
    expect(target).not.toEqual(start)
    tick(0)
    expect({ x: ship?.x, y: ship?.y }).toEqual(start)
    controller.reducedMotion.value = true
    tick(0)
    expect({ x: ship?.x, y: ship?.y }).toEqual(target)
  })

  it('keeps the browser menu off the canvas and stops listening once destroyed', async () => {
    const { host, view, key, controller, app } = await mount()
    const menu = new MouseEvent('contextmenu', { cancelable: true })
    host.querySelector('canvas')?.dispatchEvent(menu)
    expect(menu.defaultPrevented).toBe(true)
    view.destroy()
    expect(app?.stage).toBeTruthy()
    host.dispatchEvent(new FocusEvent('focus'))
    key('Enter')
    expect(controller.lifted.value).toBeUndefined()
  })
})
