import { expect, type Page, test } from '@playwright/test'
import { placeMirrorWithKeyboard } from './board'

/** Solves the first level and goes back to the level selection. */
async function solveFirstLevel(page: Page) {
  await page.goto('./#/play/tutorial/1/1')
  await placeMirrorWithKeyboard(page)
  await page.keyboard.press('q')
  await page.getByRole('dialog', { name: 'Level solved' }).getByText('Level selection').click()
}

test('keeps solved levels after a reload', async ({ page }) => {
  await solveFirstLevel(page)
  const firstLevel = page.getByRole('button', { name: /^1\. First Light/ })
  await expect(firstLevel).toContainText('solved')
  await expect(page.getByRole('button', { name: /^2\. Two Turns/ })).not.toContainText('solved')

  await page.reload()
  await expect(firstLevel).toContainText('solved')
  await page.getByRole('button', { name: 'Back' }).click()
  await expect(page.getByRole('button', { name: /^1\. Mirrors/ })).toContainText('1 of 5 solved')
})

test('walks through the screens and back with the browser', async ({ page }) => {
  await page.goto('./')
  await page.getByRole('button', { name: /^Tutorial/ }).click()
  await page.getByRole('button', { name: /^3\. Hazards/ }).click()
  await expect(page.getByRole('heading', { name: 'Tutorial · Hazards' })).toBeVisible()
  await page.goBack()
  await expect(page.getByRole('heading', { name: 'Tutorial', exact: true })).toBeVisible()

  await page.getByRole('button', { name: 'About' }).click()
  await expect(page.getByRole('heading', { name: 'About Vibe Laser' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Unreleased' })).toBeVisible()
  await page.getByRole('link', { name: /Vibe Laser/ }).click()
  await expect(page.getByRole('heading', { name: 'Level packs' })).toBeVisible()
})

test('opens help and the settings over the game, and keeps the settings', async ({ page }) => {
  await page.goto('./#/play/tutorial/1/1')
  await page.getByRole('toolbar').getByRole('button', { name: 'Help' }).click()
  const help = page.getByRole('dialog', { name: 'How to play' })
  await expect(help.getByText('Fuel cell', { exact: true })).toBeAttached()
  await page.keyboard.press('Escape')
  await expect(help).toBeHidden()

  await page.getByRole('button', { name: 'Settings' }).click()
  const settings = page.getByRole('dialog', { name: 'Settings' })
  await settings.getByLabel('Reduce motion').check()
  await settings.getByLabel('Music').fill('20')
  await settings.getByRole('button', { name: 'Close' }).click()
  await expect(settings).toBeHidden()

  await page.reload()
  await page.getByRole('button', { name: 'Settings' }).click()
  await expect(page.getByLabel('Reduce motion')).toBeChecked()
  await expect(page.getByLabel('Music')).toHaveValue('20')
})

test('gives a new profile progress of its own', async ({ page }) => {
  await solveFirstLevel(page)
  await page.getByRole('button', { name: 'Profile: Player' }).click()
  await expect(page.getByText('playing now · 1 level solved')).toBeVisible()
  await page.getByLabel('New profile').fill('Fiona')
  await page.getByRole('button', { name: 'Create' }).click()
  await expect(page.getByRole('button', { name: 'Profile: Fiona' })).toBeVisible()

  await page.getByRole('link', { name: /Vibe Laser/ }).click()
  await expect(page.getByRole('button', { name: /^Tutorial/ })).toContainText('0 of 23 solved')
  await page.getByRole('button', { name: 'Profile: Fiona' }).click()
  await page.getByRole('button', { name: 'Play as Player' }).click()
  await expect(page.getByRole('button', { name: 'Profile: Player' })).toBeVisible()
})

test('exports a profile and imports it as a copy', async ({ page }, testInfo) => {
  await page.goto('./#/profiles')
  const downloading = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export' }).click()
  const download = await downloading
  expect(download.suggestedFilename()).toBe('vibe-laser-Player.json')
  const file = testInfo.outputPath('profile.json')
  await download.saveAs(file)

  await page.getByLabel('Import a profile').setInputFiles(file)
  await expect(page.getByRole('button', { name: 'Profile: Player (2)' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Play as Player', exact: true })).toBeVisible()
})
