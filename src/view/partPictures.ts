import { Application, Container, Graphics, Rectangle } from 'pixi.js'
import type { Board, PartKind } from '../core/board'
import { createPuzzle } from '../core/level'
import { trace } from '../core/trace'
import type { ArtPack } from './art/types'
import { BeamLayer } from './beams'
import { ColorLabelLayer } from './colorLabels'
import { CELL, placeCenter, type SceneGeometry } from './layout'
import { PieceLayer } from './pieces'

/** A board of cells alone, without toolbox, gutters or margins. */
export function boardGeometry(columns: number, rows: number): SceneGeometry {
  return {
    columns,
    rows,
    toolboxSize: 0,
    toolboxRows: 1,
    toolboxLeft: 0,
    boardLeft: 0,
    top: 0,
    width: columns * CELL,
    height: rows * CELL,
  }
}

/**
 * The pieces, tiles and beams of a board, as the game draws them. The beams go on `beams`, which
 * the caller may reuse from board to board.
 */
export function boardScene(
  board: Board,
  art: ArtPack,
  split: boolean,
  beams = new BeamLayer(),
): Container {
  const geometry = boardGeometry(board.width, board.height)
  const puzzle = createPuzzle(board, [])
  const scene = new Container()
  for (let cell = 0; cell < board.cells.length; cell++) {
    const { x, y } = placeCenter(geometry, { area: 'board', cell })
    scene.addChild(new Graphics(art.tile)).position.set(x, y)
  }
  beams.show(trace(board).light, geometry, split)
  const pieces = new PieceLayer(art)
  pieces.show(puzzle, new Set(), geometry)
  const labels = new ColorLabelLayer()
  labels.show(puzzle, geometry, split)
  scene.addChild(beams, pieces, labels)
  return scene
}

/**
 * Pictures of small boards, as PNG data URLs, drawn by one renderer that goes once they are done,
 * so the help holds no WebGL context of its own. `split` draws them in color-blind mode.
 */
export async function drawBoards(
  boards: ReadonlyMap<PartKind, Board>,
  art: ArtPack,
  split: boolean,
): Promise<Map<PartKind, string>> {
  const app = new Application()
  await app.init({ width: CELL, height: CELL, preference: 'webgl', backgroundAlpha: 0 })
  // One beam layer for every board, so that its texture is made once.
  const beams = new BeamLayer()
  try {
    const pictures = new Map<PartKind, string>()
    for (const [kind, board] of boards) {
      const scene = boardScene(board, art, split, beams)
      const frame = new Rectangle(0, 0, board.width * CELL, board.height * CELL)
      pictures.set(kind, await app.renderer.extract.base64({ target: scene, frame }))
      scene.removeChild(beams)
      scene.destroy({ children: true })
    }
    return pictures
  } finally {
    beams.destroy({ children: true })
    app.destroy()
  }
}
