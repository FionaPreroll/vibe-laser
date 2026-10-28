// @vitest-environment happy-dom
import type { Container, FederatedPointerEvent } from 'pixi.js'
import { Point } from 'pixi.js'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { LevelFile } from '../content/schema'
import type { Place } from '../core/level'
import { EditorController } from '../editor/controller'
import { mountEditorBoard } from './editorBoard'
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

const LEVEL: LevelFile = {
  version: 1,
  name: { en: 'First Light', de: 'Erstes Licht' },
  size: [6, 3],
  objects: [
    { type: 'coin', pos: 'A6', rgb: 'r' },
    { type: 'laser', pos: 'B1', rot: 2, rgb: 'r' },
  ],
  toolbox: [{ type: 'mirror', rot: 0 }],
}

const board = (cell: number): Place => ({ area: 'board', cell })
const SLOT: Place = { area: 'toolbox', slot: 0 }

async function mount(level: LevelFile = LEVEL) {
  const editor = new EditorController({ level })
  const host = document.createElement('div')
  document.body.append(host)
  const view = await mountEditorBoard(host, editor)
  const app = fakes.apps.at(-1)
  const scene = app?.stage.children[0] as Container
  const layout = JSON.parse(host.dataset.layout ?? '{}') as { scale: number; x: number; y: number }
  const { geometry } = editor.scene.value
  /** A pointer event over a place on the board or in the toolbox, nudged by some pixels. */
  const at = (place: Place, button = 0, nudge = 0) => {
    const center = placeCenter(geometry, place)
    const global = new Point(
      layout.x + center.x * layout.scale + nudge,
      layout.y + center.y * layout.scale,
    )
    return { global, button } as unknown as FederatedPointerEvent
  }
  const click = (place: Place, button = 0) => {
    scene.emit('pointerdown', at(place, button))
    scene.emit('pointerup', at(place, button))
  }
  const key = (key: string, init: KeyboardEventInit = {}) =>
    window.dispatchEvent(new KeyboardEvent('keydown', { key, cancelable: true, ...init }))
  const focus = () => host.dispatchEvent(new FocusEvent('focus'))
  return { editor, host, view, scene, at, click, key, focus, app }
}

describe('mountEditorBoard', () => {
  it('draws the level into its host and reports the layout', async () => {
    const { host, scene } = await mount()
    expect(host.querySelector('canvas')).toBeTruthy()
    expect(host.tabIndex).toBe(0)
    const pieces = scene.children[2] as Container
    expect(pieces.children).toHaveLength(3)
  })

  it('selects with a click and turns pieces right with a right click', async () => {
    const { editor, click } = await mount()
    click(board(6))
    expect(editor.selected.value).toEqual(board(6))
    click(board(6), 2)
    expect(editor.pieceAt(board(6))?.rot).toBe(3)
    click(board(2), 1)
    expect(editor.selected.value).toEqual(board(6))
  })

  it('paints and erases along a stroke, undone as one step', async () => {
    const { editor, scene, at } = await mount()
    editor.tool.value = 'paint'
    editor.brush.value = { type: 'explosive' }
    scene.emit('pointerdown', at(board(12)))
    scene.emit('globalpointermove', at(board(12), 0, 5))
    scene.emit('globalpointermove', at(board(13)))
    scene.emit('globalpointermove', at(board(14)))
    scene.emit('pointerup', at(board(14)))
    expect(editor.level.value.objects).toHaveLength(5)
    editor.undo()
    expect(editor.level.value.objects).toHaveLength(2)

    editor.tool.value = 'erase'
    scene.emit('pointerdown', at(board(5)))
    scene.emit('globalpointermove', at(board(6)))
    scene.emit('pointerupoutside', at(board(6)))
    expect(editor.level.value.objects).toHaveLength(0)
    editor.undo()
    expect(editor.level.value.objects).toHaveLength(2)
  })

  it('drags pieces with Select, between board and toolbox', async () => {
    const { editor, scene, at } = await mount()
    scene.emit('pointerdown', at(SLOT))
    scene.emit('globalpointermove', at(SLOT, 0, 20))
    expect(scene.cursor).toBe('grabbing')
    scene.emit('globalpointermove', at(board(11)))
    scene.emit('pointerup', at(board(11)))
    expect(editor.pieceAt(board(11))?.type).toBe('mirror')
    expect(editor.selected.value).toEqual(board(11))

    scene.emit('pointerdown', at(board(11)))
    scene.emit('globalpointermove', at(board(6)))
    scene.emit('pointerup', at(board(6)))
    expect(editor.pieceAt(board(11))?.type).toBe('mirror')
  })

  it('does not drag with other tools or from empty places', async () => {
    const { editor, scene, at } = await mount()
    scene.emit('pointerdown', at(board(12)))
    scene.emit('globalpointermove', at(board(13)))
    scene.emit('pointerup', at(board(13)))
    expect(editor.level.value.objects).toHaveLength(2)
    editor.tool.value = 'clone'
    scene.emit('pointerdown', at(board(6)))
    expect(editor.tool.value).toBe('paint')
    scene.emit('globalpointermove', at(board(7)))
    scene.emit('pointerup', at(board(7)))
    expect(editor.pieceAt(board(7))).toBeUndefined()
    scene.emit('pointerdown', at(board(7)))
    scene.emit('pointerup', at(board(7)))
    expect(editor.pieceAt(board(7))?.type).toBe('laser')
  })

  it('shows what the pointer would do and lets keys act where it is', async () => {
    const { editor, scene, at, key, focus } = await mount()
    scene.emit('globalpointermove', at(board(6)))
    expect(scene.cursor).toBe('grab')
    scene.emit('globalpointermove', at(board(12)))
    expect(scene.cursor).toBe('default')
    editor.tool.value = 'clone'
    scene.emit('globalpointermove', at(board(13)))
    expect(scene.cursor).toBe('copy')
    expect(editor.focusedPlace()).toEqual(board(13))
    expect(key('h')).toBe(true)
    focus()
    expect(key('h')).toBe(false)
    expect(editor.pieceAt(board(13))?.type).toBe('blackHole')
    expect(key('h', { ctrlKey: true })).toBe(true)
    expect(key('x')).toBe(true)
  })

  it('takes the keyboard while it has the focus, and undo anywhere but in text fields', async () => {
    const { editor, key, focus } = await mount()
    focus()
    key('ArrowDown')
    key('m')
    expect(editor.pieceAt(board(6))?.type).toBe('mirror')
    const input = document.createElement('input')
    document.body.append(input)
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, bubbles: true }))
    expect(editor.pieceAt(board(6))?.type).toBe('mirror')
    expect(key('z', { ctrlKey: true })).toBe(false)
    expect(editor.pieceAt(board(6))?.type).toBe('laser')
    expect(key('y', { ctrlKey: true })).toBe(false)
    expect(key('y', { ctrlKey: true })).toBe(true)
    expect(key(' ')).toBe(false)
  })

  it('spins lit coins and stops listening once destroyed', async () => {
    const { editor, view, key, focus, app } = await mount()
    editor.move(SLOT, board(11))
    editor.rotate(board(11), -1)
    for (const callback of app?.ticker.callbacks ?? []) callback({ deltaMS: 16 })
    view.destroy()
    focus()
    key('h')
    expect(editor.pieceAt(board(0))).toBeUndefined()
  })

  it('waits for a new board once the level needs another layout', async () => {
    const { editor, scene } = await mount()
    const pieces = scene.children[2] as Container
    editor.resize(8, 3)
    editor.put(board(7), 'mirror')
    expect(pieces.children).toHaveLength(3)
  })
})
