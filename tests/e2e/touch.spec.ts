import { expect, type Page, test } from '@playwright/test'
import { boardReady, centerOf } from './board'

test.use({ viewport: { width: 412, height: 915 }, hasTouch: true, isMobile: true })

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
