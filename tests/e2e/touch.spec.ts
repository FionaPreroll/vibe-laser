import { expect, type Page, test } from '@playwright/test'
import { boardReady, centerOf } from './board'

// A phone on its side, as the game asks to be played.
test.use({ viewport: { width: 915, height: 412 }, hasTouch: true, isMobile: true })

/** The board's current scale on the screen, as the stage reports it for tests. */
async function scale(page: Page): Promise<number> {
  const layout = await page.locator('.board').getAttribute('data-layout')
  return (JSON.parse(layout ?? '{}') as { scale: number }).scale
}

test('solves the first level with taps: select, move, turn', async ({ page }) => {
  await page.goto('./#/play/tutorial/1/1')
  await expect(page.locator('#controls-hint')).toContainText('tap a piece and then a free place')
  const mirror = await centerOf(page, { slot: 0 })
  const target = await centerOf(page, { cell: [5, 1] })
  await page.touchscreen.tap(mirror.x, mirror.y)
  await expect(page.getByRole('button', { name: 'Rotate left' })).toBeEnabled()
  await page.touchscreen.tap(target.x, target.y)
  await page.touchscreen.tap(target.x, target.y)
  await expect(page.getByRole('dialog', { name: 'Level solved' })).toBeVisible()
})

test('zooms the board with two fingers', async ({ page }) => {
  await page.goto('./#/play/tutorial/1/1')
  await boardReady(page)
  const fitted = await scale(page)
  const middle = await centerOf(page, { cell: [2, 1] })
  const fingers = (spread: number) => [
    { x: middle.x - spread, y: middle.y, id: 1 },
    { x: middle.x + spread, y: middle.y, id: 2 },
  ]
  // Playwright's touchscreen has one finger; Chrome's own touch events have as many as needed.
  const client = await page.context().newCDPSession(page)
  await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: fingers(20) })
  for (const spread of [30, 40, 50]) {
    await client.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: fingers(spread),
    })
  }
  await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await expect.poll(() => scale(page)).toBeCloseTo(fitted * 2.5)
})

test('puts the button bar beside the board on a phone on its side', async ({ page }) => {
  await page.goto('./#/play/tutorial/1/1')
  await boardReady(page)
  const board = await page.locator('.board').boundingBox()
  const bar = await page.getByRole('toolbar').boundingBox()
  if (board === null || bar === null) throw new Error('board or button bar not shown')
  expect(bar.x).toBeGreaterThanOrEqual(board.x + board.width)
  expect(bar.y).toBeLessThan(board.y + board.height / 2)
  await expect(page.getByRole('heading', { name: 'Turn your phone' })).toBeHidden()
})

test('asks to turn a phone held upright', async ({ page }) => {
  await page.setViewportSize({ width: 412, height: 915 })
  await page.goto('./#/play/tutorial/1/1')
  await expect(page.getByRole('heading', { name: 'Turn your phone' })).toBeVisible()
  await page.setViewportSize({ width: 915, height: 412 })
  await expect(page.getByRole('heading', { name: 'Turn your phone' })).toBeHidden()
})

test('puts the button bar left of the board for left hands', async ({ page }) => {
  await page.goto('./#/play/tutorial/1/1')
  await page.getByRole('button', { name: 'Menu' }).click()
  await page.getByRole('button', { name: 'Settings' }).click()
  await page.getByLabel('Buttons on the left, for left hands').check()
  await page.getByRole('button', { name: 'Close' }).click()
  await boardReady(page)
  const board = await page.locator('.board').boundingBox()
  const bar = await page.getByRole('toolbar').boundingBox()
  if (board === null || bar === null) throw new Error('board or button bar not shown')
  expect(bar.x + bar.width).toBeLessThanOrEqual(board.x)
})
