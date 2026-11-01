import { expect, type Page, test } from '@playwright/test'
import { placeMirrorWithKeyboard } from './board'

/** How far the board's canvas reaches below the top of the button bar; at most 0 when it fits. */
async function overlap(page: Page): Promise<number> {
  const canvas = await page.locator('.board canvas').boundingBox()
  const hud = await page.locator('.hud').boundingBox()
  if (canvas === null || hud === null) throw new Error('The board or the button bar is missing')
  return canvas.y + canvas.height - hud.y
}

test.describe('on a laptop screen', () => {
  test.use({ viewport: { width: 1280, height: 800 } })

  test('shrinks the board when the button bar grows after a solve', async ({ page }) => {
    await page.goto('./#/play/tutorial/1/1')
    await placeMirrorWithKeyboard(page)
    await page.keyboard.press('q')
    await expect(page.getByRole('button', { name: 'Next unsolved level' }).first()).toBeVisible()
    await expect.poll(() => overlap(page)).toBeLessThanOrEqual(0)
  })
})

test.describe('on a phone on its side', () => {
  test.use({ viewport: { width: 915, height: 412 }, hasTouch: true, isMobile: true })

  test('keeps the moves and par inside the button bar', async ({ page }) => {
    await page.goto('./#/play/sea-of-colors/2/4')
    const moves = page.locator('.moves')
    await expect(moves).toContainText(/par\s11/)
    const fits = await moves.evaluate((element) => {
      const hud = element.closest('.hud')?.getBoundingClientRect()
      const box = element.getBoundingClientRect()
      return (
        hud !== undefined && box.right <= hud.right && element.scrollWidth <= element.clientWidth
      )
    })
    expect(fits).toBe(true)
  })
})
