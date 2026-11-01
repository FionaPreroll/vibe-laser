import { expect, type Page, test } from '@playwright/test'
import { boardReady, centerOf } from '../e2e/board'
import { playSolution } from './play'

/**
 * Each test keeps one picture of the README in docs/screenshots/. Spinning coins and sparks differ
 * from run to run, so a picture is taken again only once more of it changes than they do.
 */
const shot = (page: Page, name: string) =>
  expect(page).toHaveScreenshot(`${name}.png`, { maxDiffPixelRatio: 0.01, scale: 'device' })

/** Puts the solved dialog aside, so the spinning coins and the beams are in view. */
async function putDialogAside(page: Page) {
  await expect(page.getByRole('dialog', { name: 'Level solved' })).toBeVisible()
  await page.mouse.click(4, 300)
  await expect(page.getByRole('dialog', { name: 'Level solved' })).toBeHidden()
}

test.describe('on a desktop', () => {
  test.use({ viewport: { width: 1440, height: 900 }, locale: 'en-US' })

  test('level packs', async ({ page }) => {
    await page.goto('./')
    await expect(page.getByRole('heading', { name: 'Level packs' })).toBeVisible()
    await shot(page, 'packs')
  })

  test('skills of Lightworks', async ({ page }) => {
    await page.goto('./#/packs/lightworks')
    await expect(page.getByRole('heading', { name: 'Lightworks', exact: true })).toBeVisible()
    await page.waitForTimeout(500)
    await shot(page, 'skills')
  })

  test('a solved level', async ({ page }) => {
    await page.goto('./#/play/sea-of-colors/1/2')
    await boardReady(page)
    await playSolution(page, 'sea-of-colors/1/2')
    await putDialogAside(page)
    await page.waitForTimeout(1500)
    await shot(page, 'solved')
  })

  test('the preview of a carried piece', async ({ page }) => {
    await page.goto('./#/play/glass-maze/3/5')
    await boardReady(page)
    await playSolution(page, 'glass-maze/3/5', { count: 2, hold: true })
    await page.waitForTimeout(500)
    await shot(page, 'preview')
  })

  test('explosives in the Neon look of Powder Keg', async ({ page }) => {
    await page.goto('./#/play/powder-keg/3/6')
    await boardReady(page)
    await playSolution(page, 'powder-keg/3/6', { count: 2 })
    await page.waitForTimeout(500)
    await shot(page, 'neon')
  })

  test('a hint', async ({ page }) => {
    await page.goto('./#/play/lightworks-hints/3/1')
    await boardReady(page)
    await page.getByRole('button', { name: 'Show a hint' }).click()
    await expect(page.locator('.solution-message')).toHaveText(/^Next:/)
    await page.waitForTimeout(500)
    await shot(page, 'hint')
  })

  test('color-blind mode', async ({ page }) => {
    await page.goto('./#/play/strange-light/2/6')
    await boardReady(page)
    await page.getByRole('button', { name: 'Settings' }).click()
    const settings = page.getByRole('dialog', { name: 'Settings' })
    await settings.getByLabel('Color-blind mode').check()
    await settings.getByRole('button', { name: 'Close' }).click()
    await playSolution(page, 'strange-light/2/6')
    await putDialogAside(page)
    await page.waitForTimeout(1500)
    await shot(page, 'color-blind')
  })

  test('the level editor', async ({ page }) => {
    await page.goto('./')
    await page.getByRole('button', { name: 'Level editor' }).click()
    await page.getByLabel('New pack').fill('My levels')
    await page.getByRole('button', { name: 'Create' }).click()
    await page.getByRole('button', { name: '1. Empty', exact: true }).click()
    await boardReady(page)
    for (const [name, value] of [
      ['Columns', '9'],
      ['Rows', '6'],
    ] as const) {
      await page.getByRole('spinbutton', { name }).fill(value)
      await page.getByRole('spinbutton', { name }).press('Tab')
    }
    await expect(page.getByRole('application', { name: /9 columns and 6 rows/ })).toBeVisible()
    // A part's key puts it where the pointer is; E turns it to the right.
    const paint = async (cell: [number, number], key: string, turns = 0) => {
      const place = await centerOf(page, { cell })
      await page.mouse.click(place.x, place.y)
      await page.keyboard.press(key)
      for (let turn = 0; turn < turns; turn++) await page.keyboard.press('e')
    }
    await paint([0, 2], 'l', 2)
    await paint([4, 2], 'p', 2)
    await paint([8, 4], 'c')
    await paint([4, 0], 't')
    await paint([6, 5], 'h')
    await paint([2, 4], 'g', 2)
    const slot = await centerOf(page, { slot: 0 })
    await page.mouse.move(slot.x, slot.y)
    await page.keyboard.press('m')
    await page.mouse.move(4, 4)
    await page.getByText('Tool', { exact: true }).scrollIntoViewIfNeeded()
    await page.waitForTimeout(500)
    await shot(page, 'editor')
  })
})

test.describe('on a phone on its side', () => {
  test.use({
    viewport: { width: 915, height: 412 },
    deviceScaleFactor: 2,
    hasTouch: true,
    isMobile: true,
    locale: 'en-US',
  })

  test('a level', async ({ page }) => {
    await page.goto('./#/play/sea-of-colors/2/4')
    await boardReady(page)
    await playSolution(page, 'sea-of-colors/2/4', { count: 2 })
    await page.waitForTimeout(500)
    await shot(page, 'phone')
  })
})
