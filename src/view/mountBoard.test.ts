// @vitest-environment happy-dom
import type { Container, FederatedPointerEvent } from 'pixi.js'
import { Point } from 'pixi.js'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { puzzleOf } from '../content/level'
import { findLevel } from '../content/packs'
import { itemById, type Place } from '../core/level'
import { GameSession } from '../game/session'
import { mountBoard } from './board'
import { BoardController } from './controller'
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
})

async function mount(id = 'tutorial/1/1') {
  const level = await findLevel(id)?.entry.load()
  if (level === undefined) throw new Error(`No level ${id}`)
  const controller = new BoardController(new GameSession(puzzleOf(level.file)))
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
  it('puts a canvas into its host and reports the layout for browser tests', async () => {
    const { host } = await mount()
    expect(host.querySelector('canvas')).toBeTruthy()
    const layout = JSON.parse(host.dataset.layout ?? '{}')
    expect(layout.cell).toBe(64)
    expect(layout.scale).toBeGreaterThan(0)
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

  it('lets a finger wobble more than a mouse before it drags', async () => {
    const { controller, scene, screenAt, finger } = await mount()
    scene.emit('pointerdown', finger(1, screenAt(SLOT)))
    scene.emit('globalpointermove', finger(1, screenAt(SLOT, 8)))
    scene.emit('pointerup', finger(1, screenAt(SLOT, 8)))
    expect(controller.selected.value).toBe(MIRROR)
    controller.select(undefined)
    scene.emit('pointerdown', finger(1, screenAt(SLOT)))
    scene.emit('globalpointermove', finger(1, screenAt(SLOT, 20)))
    scene.emit('globalpointermove', finger(1, screenAt(B6)))
    scene.emit('pointerup', finger(1, screenAt(B6)))
    expect(itemById(controller.session.state.value.puzzle, MIRROR)?.place).toEqual(B6)
    expect(controller.selected.value).toBe(MIRROR)
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

  it('runs the clock and plays effects for what happens', async () => {
    const { controller, tick, scene } = await mount('tutorial/3/1')
    controller.session.execute({ kind: 'move', item: 3, to: { area: 'board', cell: 0 } })
    controller.session.execute({ kind: 'rotate', item: 3, steps: 3 })
    expect(controller.session.state.value.phase).toBe('exploding')
    const effects = scene.children[3] as Container
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
    const { controller, tick, scene } = await mount('tutorial/3/2')
    const slimeIndex = () =>
      controller.session.state.value.puzzle.items.findIndex((item) => item.piece.kind === 'slime')
    const slime = (scene.children[2] as Container).children[slimeIndex()]
    const start = { x: slime?.x, y: slime?.y }
    // One slime step, with the clock moved by hand so no time passes for the gliding.
    controller.session.advance(800)
    const place = controller.session.state.value.puzzle.items[slimeIndex()]?.place
    if (place === undefined) throw new Error('The slime is gone')
    const target = placeCenter(controller.geometry, place)
    expect(target).not.toEqual(start)
    tick(0)
    expect({ x: slime?.x, y: slime?.y }).toEqual(start)
    controller.reducedMotion.value = true
    tick(0)
    expect({ x: slime?.x, y: slime?.y }).toEqual(target)
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
