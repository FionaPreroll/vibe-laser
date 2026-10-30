import { expect, test } from '@playwright/test'
import { boardReady } from './board'

test('shows each pack on a selection screen of its own', async ({ page }) => {
  await page.goto('./')
  await page.getByRole('button', { name: /^Tutorial/ }).click()
  await expect(page.locator('.select-screen')).toHaveClass(/theme-school/)
  await expect(page.getByText('Lesson book')).toBeVisible()
  await page.getByRole('button', { name: 'Back' }).click()

  await page
    .getByRole('button', { name: /^Lightworks/ })
    .first()
    .click()
  await expect(page.locator('.select-screen')).toHaveClass(/theme-lab/)
  await expect(page.getByText('Laboratory of light')).toBeVisible()
  await expect(page.getByRole('button', { name: /^3\. Crossfire/ })).toBeVisible()
})

test('previews the light while a piece is carried, unless switched off', async ({ page }) => {
  await page.goto('./#/play/tutorial/3/1')
  await boardReady(page)
  const board = page.locator('.board')
  await expect(board).toHaveAttribute('data-preview', 'off')

  // Carry the mirror from the toolbox onto A1 with the keyboard, without putting it down.
  await board.focus()
  await page.keyboard.press('Enter')
  for (let step = 0; step < 2; step++) await page.keyboard.press('ArrowRight')
  await expect(board).toHaveAttribute('data-preview', /^\d+$/)
  await page.keyboard.press('Escape')
  await expect(board).toHaveAttribute('data-preview', 'off')

  await page.getByRole('button', { name: 'Settings' }).click()
  const settings = page.getByRole('dialog', { name: 'Settings' })
  await settings.getByLabel('Show where light would go').uncheck()
  await settings.getByRole('button', { name: 'Close' }).click()
  await board.focus()
  await page.keyboard.press('Enter')
  for (let step = 0; step < 2; step++) await page.keyboard.press('ArrowRight')
  await expect(page.getByRole('application', { name: /^Handle with Care:/ })).toBeVisible()
  await expect(board).toHaveAttribute('data-preview', 'off')
})
