import { describe, expect, it } from 'vitest'
import {
  CELL,
  clampTransform,
  fitScene,
  gridOfPlace,
  MAX_ZOOM,
  pinchTransform,
  placeAt,
  placeCenter,
  placeOfGrid,
  refitTransform,
  sceneGeometry,
} from './layout'

// A 6 × 3 board with 6 toolbox slots, as in the first tutorial level.
const geometry = sceneGeometry(6, 3, 6)

describe('scene layout', () => {
  it('finds the place under the center of every cell and slot', () => {
    for (let cell = 0; cell < 18; cell++) {
      const place = { area: 'board', cell } as const
      expect(placeAt(geometry, placeCenter(geometry, place))).toEqual(place)
    }
    for (let slot = 0; slot < 6; slot++) {
      const place = { area: 'toolbox', slot } as const
      expect(placeAt(geometry, placeCenter(geometry, place))).toEqual(place)
    }
  })

  it('finds nothing in the gaps and outside', () => {
    const slot1 = placeCenter(geometry, { area: 'toolbox', slot: 1 })
    expect(placeAt(geometry, { x: slot1.x + CELL, y: slot1.y })).toBeUndefined()
    expect(placeAt(geometry, { x: -1, y: geometry.top + 1 })).toBeUndefined()
    expect(placeAt(geometry, { x: geometry.boardLeft + 1, y: geometry.top - 1 })).toBeUndefined()
    expect(
      placeAt(geometry, { x: geometry.boardLeft + 6 * CELL + 1, y: geometry.top + 1 }),
    ).toBeUndefined()
  })

  it('maps the keyboard grid onto toolbox and board', () => {
    expect(placeOfGrid(geometry, { column: -2, row: 0 })).toEqual({ area: 'toolbox', slot: 0 })
    expect(placeOfGrid(geometry, { column: -1, row: 2 })).toEqual({ area: 'toolbox', slot: 5 })
    expect(placeOfGrid(geometry, { column: 0, row: 0 })).toEqual({ area: 'board', cell: 0 })
    expect(placeOfGrid(geometry, { column: 5, row: 1 })).toEqual({ area: 'board', cell: 11 })
    expect(placeOfGrid(geometry, { column: -3, row: 0 })).toBeUndefined()
    expect(placeOfGrid(geometry, { column: 6, row: 0 })).toBeUndefined()
    expect(placeOfGrid(geometry, { column: 0, row: 3 })).toBeUndefined()
    expect(gridOfPlace(geometry, { area: 'toolbox', slot: 3 })).toEqual({ column: -1, row: 1 })
  })

  it('fits the scene into any screen without distortion', () => {
    const fit = fitScene(geometry, geometry.width * 2, geometry.height * 3)
    expect(fit.scale).toBe(2)
    expect(fit.x).toBe(0)
    expect(fit.y).toBe(geometry.height / 2)
  })
})

// The scene of `geometry` is 592 × 240 units, so a 592 × 240 screen fits it at scale 1.
const SCREEN = [592, 240] as const

describe('zoom and pan', () => {
  it('keeps the scene between its fitted size and MAX_ZOOM, and on the screen', () => {
    expect(clampTransform(geometry, ...SCREEN, { scale: 0.5, x: 70, y: -9 })).toEqual({
      scale: 1,
      x: 0,
      y: 0,
    })
    const near = clampTransform(geometry, ...SCREEN, { scale: 10, x: 100, y: -5000 })
    expect(near).toEqual({ scale: MAX_ZOOM, x: 0, y: 240 - 240 * MAX_ZOOM })
    // A wide screen fits the scene's width even zoomed in, and keeps it centered across.
    expect(clampTransform(geometry, 2000, 240, { scale: 2, x: 0, y: -100 })).toEqual({
      scale: 2,
      x: (2000 - 592 * 2) / 2,
      y: -100,
    })
  })

  it('zooms about the fingers and pans with them', () => {
    const start = fitScene(geometry, ...SCREEN)
    const middle = { x: 300, y: 120 }
    const spread = pinchTransform(
      geometry,
      ...SCREEN,
      start,
      [
        { x: 250, y: 120 },
        { x: 350, y: 120 },
      ],
      [
        { x: 200, y: 120 },
        { x: 400, y: 120 },
      ],
    )
    expect(spread.scale).toBe(2)
    // The scene point under the fingers stays under them.
    expect((middle.x - spread.x) / spread.scale).toBeCloseTo(middle.x)
    const moved = pinchTransform(
      geometry,
      ...SCREEN,
      spread,
      [
        { x: 200, y: 120 },
        { x: 400, y: 120 },
      ],
      [
        { x: 230, y: 130 },
        { x: 430, y: 130 },
      ],
    )
    expect(moved).toEqual({ scale: 2, x: spread.x + 30, y: spread.y + 10 })
    const pinchedIn = pinchTransform(
      geometry,
      ...SCREEN,
      start,
      [
        { x: 100, y: 120 },
        { x: 500, y: 120 },
      ],
      [
        { x: 290, y: 120 },
        { x: 310, y: 120 },
      ],
    )
    expect(pinchedIn).toEqual(start)
  })

  it('keeps the zoom and the middle of the view when the screen changes size', () => {
    expect(
      refitTransform(
        geometry,
        fitScene(geometry, ...SCREEN),
        { width: 592, height: 240 },
        {
          width: 800,
          height: 500,
        },
      ),
    ).toEqual(fitScene(geometry, 800, 500))
    const zoomed = { scale: 2, x: -296, y: -120 }
    const larger = refitTransform(
      geometry,
      zoomed,
      { width: 592, height: 240 },
      {
        width: 1184,
        height: 480,
      },
    )
    expect(larger).toEqual({ scale: 4, x: -592, y: -240 })
    const blank = { scale: 0, x: 0, y: 0 }
    expect(
      refitTransform(geometry, blank, { width: 0, height: 0 }, { width: 592, height: 240 }),
    ).toEqual(fitScene(geometry, ...SCREEN))
  })
})
