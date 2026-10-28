import { expect, type Page } from '@playwright/test'

interface Layout {
  scale: number
  x: number
  y: number
  cell: number
  boardLeft: number
  toolboxLeft: number
  top: number
  toolboxColumns: number
}

/** Waits until PixiJS has mounted the board, which happens after the page has loaded. */
export async function boardReady(page: Page) {
  await expect(page.locator('.board')).toHaveAttribute('data-layout', /"scale"/)
}

/** Screen position of a board cell (column and row from 0) or a toolbox slot. */
export async function centerOf(page: Page, place: { cell: [number, number] } | { slot: number }) {
  await boardReady(page)
  const layout = JSON.parse(
    (await page.locator('.board').getAttribute('data-layout')) ?? '{}',
  ) as Layout
  const box = await page.locator('.board canvas').boundingBox()
  if (box === null) throw new Error('The canvas is not visible')
  const [x, y] =
    'slot' in place
      ? [
          layout.toolboxLeft + ((place.slot % layout.toolboxColumns) + 0.5) * layout.cell,
          layout.top + (Math.floor(place.slot / layout.toolboxColumns) + 0.5) * layout.cell,
        ]
      : [
          layout.boardLeft + (place.cell[0] + 0.5) * layout.cell,
          layout.top + (place.cell[1] + 0.5) * layout.cell,
        ]
  return { x: box.x + layout.x + x * layout.scale, y: box.y + layout.y + y * layout.scale }
}

/**
 * First Light's solution with the keyboard: carry the mirror from the first toolbox slot to B6
 * of a six-column board and turn it once to the left.
 */
export async function placeMirrorWithKeyboard(page: Page) {
  await boardReady(page)
  await page.locator('.board').focus()
  await page.keyboard.press('Enter')
  for (let step = 0; step < 7; step++) await page.keyboard.press('ArrowRight')
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('Enter')
}
