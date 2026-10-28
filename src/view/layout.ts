import type { Place } from '../core/level'

/** Size of one cell in scene units; the scene is scaled to its host afterwards. */
export const CELL = 64
/** Room for the column numbers above the board and the row letters to its left. */
export const GUTTER = 40
export const TOOLBOX_COLUMNS = 2
const TOOLBOX_GAP = 24
const MARGIN = 8

export interface Point {
  readonly x: number
  readonly y: number
}

/** Where the toolbox and the board sit in the scene, in scene units. */
export interface SceneGeometry {
  readonly columns: number
  readonly rows: number
  readonly toolboxSize: number
  readonly toolboxRows: number
  readonly toolboxLeft: number
  readonly boardLeft: number
  /** Upper edge of the cells and slots. */
  readonly top: number
  readonly width: number
  readonly height: number
}

/**
 * Keyboard grid over toolbox and board: columns -2 and -1 are the toolbox, 0 and up the board.
 */
export interface GridPoint {
  readonly column: number
  readonly row: number
}

export function sceneGeometry(columns: number, rows: number, toolboxSize: number): SceneGeometry {
  const toolboxRows = Math.max(1, Math.ceil(toolboxSize / TOOLBOX_COLUMNS))
  const toolboxLeft = MARGIN
  const boardLeft = toolboxLeft + TOOLBOX_COLUMNS * CELL + TOOLBOX_GAP + GUTTER
  return {
    columns,
    rows,
    toolboxSize,
    toolboxRows,
    toolboxLeft,
    boardLeft,
    top: GUTTER,
    width: boardLeft + columns * CELL + MARGIN,
    height: GUTTER + Math.max(rows, toolboxRows) * CELL + MARGIN,
  }
}

export function placeCenter(geometry: SceneGeometry, place: Place): Point {
  const { column, row } = gridOfPlace(geometry, place)
  const left =
    column < 0
      ? geometry.toolboxLeft + (column + TOOLBOX_COLUMNS) * CELL
      : geometry.boardLeft + column * CELL
  return { x: left + CELL / 2, y: geometry.top + (row + 0.5) * CELL }
}

/** The board cell or toolbox slot under a point in scene units, if any. */
export function placeAt(geometry: SceneGeometry, point: Point): Place | undefined {
  const row = Math.floor((point.y - geometry.top) / CELL)
  const boardColumn = Math.floor((point.x - geometry.boardLeft) / CELL)
  if (boardColumn >= 0) return placeOfGrid(geometry, { column: boardColumn, row })
  const slotColumn = Math.floor((point.x - geometry.toolboxLeft) / CELL)
  if (slotColumn < 0 || slotColumn >= TOOLBOX_COLUMNS) return undefined
  return placeOfGrid(geometry, { column: slotColumn - TOOLBOX_COLUMNS, row })
}

export function placeOfGrid(geometry: SceneGeometry, point: GridPoint): Place | undefined {
  const { column, row } = point
  if (!Number.isInteger(column) || !Number.isInteger(row) || row < 0) return undefined
  if (column < 0) {
    const slot = row * TOOLBOX_COLUMNS + column + TOOLBOX_COLUMNS
    return column >= -TOOLBOX_COLUMNS && slot < geometry.toolboxSize
      ? { area: 'toolbox', slot }
      : undefined
  }
  return column < geometry.columns && row < geometry.rows
    ? { area: 'board', cell: row * geometry.columns + column }
    : undefined
}

export function gridOfPlace(geometry: SceneGeometry, place: Place): GridPoint {
  return place.area === 'board'
    ? { column: place.cell % geometry.columns, row: Math.floor(place.cell / geometry.columns) }
    : {
        column: (place.slot % TOOLBOX_COLUMNS) - TOOLBOX_COLUMNS,
        row: Math.floor(place.slot / TOOLBOX_COLUMNS),
      }
}

/** Where the scene sits on the screen: its scale, and its offset in screen pixels. */
export interface Transform {
  readonly scale: number
  readonly x: number
  readonly y: number
}

/** How far players can zoom in, over the size that shows the whole scene. */
export const MAX_ZOOM = 4

/** Scale and offset that fit the whole scene into a screen, centered. */
export function fitScene(
  geometry: SceneGeometry,
  screenWidth: number,
  screenHeight: number,
): Transform {
  const scale = Math.max(0, Math.min(screenWidth / geometry.width, screenHeight / geometry.height))
  return {
    scale,
    x: (screenWidth - geometry.width * scale) / 2,
    y: (screenHeight - geometry.height * scale) / 2,
  }
}

/**
 * A zoomed or panned scene, kept in bounds: from its fitted size up to MAX_ZOOM times that, and
 * along each axis centered where it fits the screen and covering the screen where it does not.
 */
export function clampTransform(
  geometry: SceneGeometry,
  screenWidth: number,
  screenHeight: number,
  transform: Transform,
): Transform {
  const fit = fitScene(geometry, screenWidth, screenHeight).scale
  const scale = Math.min(Math.max(transform.scale, fit), fit * MAX_ZOOM)
  const along = (offset: number, size: number, screen: number) =>
    size <= screen ? (screen - size) / 2 : Math.min(0, Math.max(screen - size, offset))
  return {
    scale,
    x: along(transform.x, geometry.width * scale, screenWidth),
    y: along(transform.y, geometry.height * scale, screenHeight),
  }
}

/**
 * Where two fingers that started at `from` on a scene at `start` take it when they reach `to`:
 * it scales with the distance between them, and the scene point under their first midpoint
 * follows the midpoint. The result is kept in bounds.
 */
export function pinchTransform(
  geometry: SceneGeometry,
  screenWidth: number,
  screenHeight: number,
  start: Transform,
  from: readonly [Point, Point],
  to: readonly [Point, Point],
): Transform {
  const fit = fitScene(geometry, screenWidth, screenHeight).scale
  const spread = (points: readonly [Point, Point]) =>
    Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y)
  const middle = (points: readonly [Point, Point]) => ({
    x: (points[0].x + points[1].x) / 2,
    y: (points[0].y + points[1].y) / 2,
  })
  const ratio = spread(to) / Math.max(1, spread(from))
  const scale = Math.min(Math.max(start.scale * ratio, fit), fit * MAX_ZOOM)
  const before = middle(from)
  const after = middle(to)
  const point = { x: (before.x - start.x) / start.scale, y: (before.y - start.y) / start.scale }
  return clampTransform(geometry, screenWidth, screenHeight, {
    scale,
    x: after.x - point.x * scale,
    y: after.y - point.y * scale,
  })
}

/**
 * The same view on a screen of another size: as far zoomed in over the fitted size as before,
 * with the scene point in the middle of the screen still in the middle.
 */
export function refitTransform(
  geometry: SceneGeometry,
  transform: Transform,
  before: { readonly width: number; readonly height: number },
  after: { readonly width: number; readonly height: number },
): Transform {
  const fitBefore = fitScene(geometry, before.width, before.height).scale
  const fitAfter = fitScene(geometry, after.width, after.height)
  if (fitBefore <= 0 || transform.scale <= 0) return fitAfter
  const scale = fitAfter.scale * (transform.scale / fitBefore)
  const middle = {
    x: (before.width / 2 - transform.x) / transform.scale,
    y: (before.height / 2 - transform.y) / transform.scale,
  }
  return clampTransform(geometry, after.width, after.height, {
    scale,
    x: after.width / 2 - middle.x * scale,
    y: after.height / 2 - middle.y * scale,
  })
}
