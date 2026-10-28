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
  const layout = JSON.parse(host.dataset.layout ?? '{}') as { scale: number; x: number; y: number }
  /** A pointer event over a place on the board or in the toolbox, nudged by some pixels. */
  const at = (place: Place, button = 0, nudge = 0) => {
    const center = placeCenter(controller.geometry, place)
    const global = new Point(
      layout.x + center.x * layout.scale + nudge,
      layout.y + center.y * layout.scale,
    )
    return { global, button } as unknown as FederatedPointerEvent
  }
  const key = (key: string, init: KeyboardEventInit = {}) =>
    window.dispatchEvent(new KeyboardEvent('keydown', { key, cancelable: true, ...init }))
  const tick = (deltaMS: number) => {
    for (const callback of app?.ticker.callbacks ?? []) callback({ deltaMS })
  }
  return { controller, host, view, scene, at, key, tick, app }
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
