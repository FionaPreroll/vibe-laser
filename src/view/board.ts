import { Application, Container, Graphics, Text } from 'pixi.js'
import { columnName, rowName } from '../core/grid'

/** Logical size of one cell. The scene scales to fit its host, so this only sets proportions. */
const CELL = 64
/** Room for the column numbers above the board and the row letters to its left. */
const GUTTER = 40
const TILE_GAP = 4

const COLORS = {
  tile: 0x161b26,
  frame: 0x2a3246,
  label: 0x7d8799,
}

export interface BoardView {
  destroy(): void
}

/** Draws an empty board into `host` and keeps it fitted to the host's size. */
export async function mountBoard(
  host: HTMLElement,
  columns: number,
  rows: number,
): Promise<BoardView> {
  const app = new Application()
  await app.init({
    resizeTo: host,
    preference: 'webgl',
    antialias: true,
    autoDensity: true,
    resolution: window.devicePixelRatio,
    backgroundAlpha: 0,
  })
  host.appendChild(app.canvas)

  const scene = new Container()
  scene.addChild(drawTiles(columns, rows), ...drawLabels(columns, rows))
  app.stage.addChild(scene)

  const width = GUTTER + columns * CELL + TILE_GAP
  const height = GUTTER + rows * CELL + TILE_GAP
  const fitToHost = () => {
    const scale = Math.min(app.screen.width / width, app.screen.height / height)
    scene.scale.set(scale)
    scene.position.set(
      (app.screen.width - width * scale) / 2,
      (app.screen.height - height * scale) / 2,
    )
  }
  fitToHost()
  app.renderer.on('resize', fitToHost)

  return {
    destroy() {
      app.renderer.off('resize', fitToHost)
      app.destroy(true, { children: true })
    },
  }
}

function drawTiles(columns: number, rows: number): Graphics {
  const tiles = new Graphics()
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < columns; x++) {
      const left = GUTTER + x * CELL + TILE_GAP / 2
      const upper = GUTTER + y * CELL + TILE_GAP / 2
      tiles.roundRect(left, upper, CELL - TILE_GAP, CELL - TILE_GAP, 6)
    }
  }
  tiles.fill(COLORS.tile)
  tiles
    .roundRect(
      GUTTER - TILE_GAP,
      GUTTER - TILE_GAP,
      columns * CELL + 2 * TILE_GAP,
      rows * CELL + 2 * TILE_GAP,
      10,
    )
    .stroke({ width: 2, color: COLORS.frame })
  return tiles
}

function drawLabels(columns: number, rows: number): Text[] {
  const style = { fill: COLORS.label, fontFamily: 'system-ui, sans-serif', fontSize: 22 }
  const labels: Text[] = []
  for (let x = 0; x < columns; x++) {
    const label = new Text({ text: columnName(x), style, anchor: 0.5 })
    label.position.set(GUTTER + (x + 0.5) * CELL, GUTTER / 2)
    labels.push(label)
  }
  for (let y = 0; y < rows; y++) {
    const label = new Text({ text: rowName(y), style, anchor: 0.5 })
    label.position.set(GUTTER / 2, GUTTER + (y + 0.5) * CELL)
    labels.push(label)
  }
  return labels
}
