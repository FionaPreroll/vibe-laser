import { expect, type Page, test } from '@playwright/test'
import { boardReady, centerOf, placeMirrorWithKeyboard } from './board'

/** Commits a field the way players do: type, then leave it. */
async function enter(page: Page, role: 'textbox' | 'spinbutton', name: string, value: string) {
  const field = page.getByRole(role, { name })
  await field.fill(value)
  await field.press('Tab')
}

async function newPack(page: Page, title: string) {
  await page.goto('./')
  await page.getByRole('button', { name: 'Level editor' }).click()
  await page.getByLabel('New pack').fill(title)
  await page.getByRole('button', { name: 'Create' }).click()
}

test('makes a level in a pack of its own look, tests it, and plays it from the pack list', async ({
  page,
}) => {
  await newPack(page, 'Mine')
  await page.getByRole('combobox', { name: 'Look' }).selectOption('neon')
  await page.getByRole('button', { name: 'Save pack settings' }).click()
  await expect(page.getByText('Saved', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: '1. Empty', exact: true }).click()
  await boardReady(page)
  await expect(page.locator('.board')).toHaveAttribute('data-art', 'neon')
  await enter(page, 'spinbutton', 'Columns', '6')
  await enter(page, 'spinbutton', 'Rows', '3')
  await enter(page, 'textbox', 'Name (English)', 'Corner')
  await enter(page, 'textbox', 'Name (German)', 'Ecke')
  await expect(page.getByRole('application', { name: /6 columns and 3 rows/ })).toBeVisible()

  // A part's key puts it where the pointer is; E turns it to the right.
  const b1 = await centerOf(page, { cell: [0, 1] })
  await page.mouse.click(b1.x, b1.y)
  await page.keyboard.press('l')
  await page.keyboard.press('e')
  await page.keyboard.press('e')
  const a6 = await centerOf(page, { cell: [5, 0] })
  await page.mouse.move(a6.x, a6.y)
  await page.keyboard.press('c')
  const slot = await centerOf(page, { slot: 0 })
  await page.mouse.move(slot.x, slot.y)
  await page.keyboard.press('m')
  await expect(page.getByText('None: the level can be saved.')).toBeVisible()

  await page.getByRole('button', { name: 'Test' }).click()
  await placeMirrorWithKeyboard(page)
  await page.keyboard.press('q')
  await page.getByRole('dialog', { name: 'Level solved' }).getByText('Keep as solution').click()
  await expect(page.getByText('The solution solves the level.')).toBeVisible()
  await page.getByRole('button', { name: 'Save', exact: true }).click()
  await expect(page.getByText('Saved', { exact: true })).toBeVisible()

  await page.reload()
  await expect(page.getByRole('textbox', { name: 'Name (English)' })).toHaveValue('Corner')
  await page.getByRole('link', { name: /Vibe Laser/ }).click()
  await page.getByRole('button', { name: /^Mine/ }).click()
  await page.getByRole('button', { name: '1. Corner' }).click()
  await expect(
    page.getByRole('application', { name: 'Corner: game board with 6 columns and 3 rows' }),
  ).toBeVisible()
  await expect(page.locator('.board')).toHaveAttribute('data-art', 'neon')
})

test('exports a pack and imports it as a copy', async ({ page }, testInfo) => {
  await newPack(page, 'Shared')
  const downloading = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export pack' }).click()
  const download = await downloading
  expect(download.suggestedFilename()).toBe('Shared.vlpack.json')
  const file = testInfo.outputPath('shared.vlpack.json')
  await download.saveAs(file)

  await page.getByRole('button', { name: 'Back' }).click()
  await page.getByLabel('Import a pack').setInputFiles(file)
  await page.getByRole('button', { name: 'Back' }).click()
  await expect(page.getByRole('button', { name: /^Shared/ })).toHaveCount(2)
})
