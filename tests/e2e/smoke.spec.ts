import { expect, type Page, test } from '@playwright/test'

/** Collects uncaught errors and console errors, so a broken start fails the test. */
function watchErrors(page: Page): string[] {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text())
  })
  return errors
}

test('shows the title and an empty 16 × 11 board', async ({ page }) => {
  const errors = watchErrors(page)
  await page.goto('./')

  await expect(page.getByRole('heading', { name: 'Vibe Laser' })).toBeVisible()
  await expect(
    page.getByRole('img', { name: 'Empty game board with 16 columns and 11 rows' }),
  ).toBeVisible()
  const canvas = page.locator('.board canvas')
  await expect(canvas).toBeVisible()
  const size = await canvas.boundingBox()
  expect(size?.width).toBeGreaterThan(300)
  expect(size?.height).toBeGreaterThan(200)
  expect(errors).toEqual([])
})

test('switches the interface to German and remembers it', async ({ page }) => {
  await page.goto('./')
  await page.getByLabel('Language').selectOption('de')

  await expect(page.locator('html')).toHaveAttribute('lang', 'de')
  await expect(page.getByText('Lenke farbige Laserstrahlen auf jede Münze.')).toBeVisible()
  await page.reload()
  await expect(page.getByLabel('Sprache')).toHaveValue('de')
})

test.describe('with a German browser', () => {
  test.use({ locale: 'de-DE' })

  test('starts in German', async ({ page }) => {
    await page.goto('./')
    await expect(
      page.getByRole('img', { name: 'Leeres Spielfeld mit 16 Spalten und 11 Zeilen' }),
    ).toBeVisible()
  })
})
