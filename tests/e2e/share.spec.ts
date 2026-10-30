import { readFileSync } from 'node:fs'
import { expect, test } from '@playwright/test'
import { levelSchema } from '../../src/content/schema'
import { encodeLevel } from '../../src/content/share'
import { placeMirrorWithKeyboard } from './board'

const firstLight = levelSchema.parse(
  JSON.parse(readFileSync('packs/tutorial/levels/skill1/level_001.json', 'utf8')),
)

test('plays a level from a link and keeps it in a pack of shared levels', async ({ page }) => {
  await page.goto(`./#/level/${await encodeLevel(firstLight)}`)
  await expect(page.getByRole('heading', { name: 'Shared level · First Light' })).toBeVisible()
  await placeMirrorWithKeyboard(page)
  await page.keyboard.press('q')
  const dialog = page.getByRole('dialog', { name: 'Level solved' })
  await expect(dialog).toBeVisible()
  await dialog.getByRole('button', { name: 'Play again' }).click()

  await page.getByRole('button', { name: 'Add to my packs' }).click()
  await expect(page.getByText('Added to Shared levels, skill 1, level 1.')).toBeVisible()
  await page.getByRole('toolbar').getByRole('button', { name: 'Exit' }).click()
  await page.getByRole('button', { name: /^Shared levels/ }).click()
  await expect(page.getByRole('button', { name: /^1\. First Light/ })).toBeVisible()
})

test('says when a link holds no level', async ({ page }) => {
  await page.goto('./#/level/cut-off')
  await expect(page.getByText(/This link holds no level of this game/)).toBeVisible()
})
