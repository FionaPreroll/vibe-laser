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

/** Scale and offset that fit the whole scene into a screen, centered. */
export function fitScene(
  geometry: SceneGeometry,
  screenWidth: number,
  screenHeight: number,
): { scale: number; x: number; y: number } {
  const scale = Math.max(0, Math.min(screenWidth / geometry.width, screenHeight / geometry.height))
  return {
    scale,
    x: (screenWidth - geometry.width * scale) / 2,
    y: (screenHeight - geometry.height * scale) / 2,
  }
}
