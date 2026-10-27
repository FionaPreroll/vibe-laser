import { describe, expect, it } from 'vitest'
import {
  CELL,
  fitScene,
  gridOfPlace,
  placeAt,
  placeCenter,
  placeOfGrid,
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
