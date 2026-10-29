import { expect, type Page, test } from '@playwright/test'
import { boardReady, centerOf, placeMirrorWithKeyboard } from './board'

const FIRST_LEVEL = './#/play/tutorial/1/1'

/** Collects uncaught errors and console errors, so a broken start fails the test. */
function watchErrors(page: Page): string[] {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text())
  })
  return errors
}

test('opens the first level from the pack list without errors', async ({ page }) => {
  const errors = watchErrors(page)
  await page.goto('./')
  await page.getByRole('button', { name: /^Tutorial/ }).click()
  await page.getByRole('button', { name: /^1\. Mirrors/ }).click()
  await page.getByRole('button', { name: /^1\. First Light/ }).click()

  await expect(page.getByRole('heading', { name: 'Vibe Laser' })).toBeVisible()
  await expect(
    page.getByRole('application', { name: 'First Light: game board with 6 columns and 3 rows' }),
  ).toBeVisible()
  await expect(page.getByText(/^A laser fires a beam of its color/)).toBeVisible()
  const size = await page.locator('.board canvas').boundingBox()
  expect(size?.width).toBeGreaterThan(300)
  expect(size?.height).toBeGreaterThan(200)
  expect(errors).toEqual([])
})

test('solves the first level with the keyboard and moves on', async ({ page }) => {
  await page.goto(FIRST_LEVEL)
  await placeMirrorWithKeyboard(page)
  await page.keyboard.press('q')

  const dialog = page.getByRole('dialog', { name: 'Level solved' })
  await expect(dialog).toBeVisible()
  await dialog.getByRole('button', { name: 'Next unsolved level' }).click()
  await expect(page.getByRole('application', { name: /^Two Turns:/ })).toBeVisible()
})

test('solves the first level with the mouse', async ({ page }) => {
  await page.goto(FIRST_LEVEL)
  const mirror = await centerOf(page, { slot: 0 })
  const target = await centerOf(page, { cell: [5, 1] })
  await page.mouse.move(mirror.x, mirror.y)
  await page.mouse.down()
  await page.mouse.move(target.x, target.y, { steps: 12 })
  await page.mouse.up()
  // A left click turns the mirror one step to the left, which sends the beam north.
  await page.mouse.click(target.x, target.y)

  await expect(page.getByRole('dialog', { name: 'Level solved' })).toBeVisible()
})

test('lights the color dots for the piece under the mouse', async ({ page }) => {
  await page.goto(FIRST_LEVEL)
  const laser = await centerOf(page, { cell: [0, 1] })
  const free = await centerOf(page, { cell: [2, 1] })
  await page.mouse.move(laser.x, laser.y)
  await expect(
    page.getByRole('img', { name: 'Colors of the piece under the pointer: Red' }),
  ).toBeVisible()
  await page.mouse.move(free.x, free.y)
  await expect(
    page.getByRole('img', { name: 'Colors of the piece under the pointer: none' }),
  ).toBeVisible()
})

test('gives a hint and plays the solution in a Hints & Solutions pack', async ({ page }) => {
  const errors = watchErrors(page)
  await page.goto('./#/play/lightworks-hints/1/1')
  await boardReady(page)
  await page.getByRole('button', { name: 'Show a hint' }).click()
  await expect(page.locator('.solution-message')).toHaveText(
    'Next: Filter on A2, turned as the outline shows.',
  )
  await page.getByRole('button', { name: 'Show the solution' }).click()
  await expect(page.getByRole('dialog', { name: 'Level solved' })).toBeVisible({ timeout: 10_000 })
  expect(errors).toEqual([])
})

test('turns two beams with one bender, a part of the expansion packs', async ({ page }) => {
  const errors = watchErrors(page)
  await page.goto('./#/play/tutorial/4/1')
  const bender = await centerOf(page, { slot: 0 })
  const target = await centerOf(page, { cell: [2, 2] })
  await page.mouse.move(bender.x, bender.y)
  await page.mouse.down()
  await page.mouse.move(target.x, target.y, { steps: 12 })
  await page.mouse.up()

  await expect(page.getByRole('dialog', { name: 'Level solved' })).toBeVisible()
  expect(errors).toEqual([])
})

test('solves Switchboard by turning mirrors that stay where they are', async ({ page }) => {
  await page.goto('./#/play/lightworks/3/2')
  await expect(page.getByText(/^Nothing to place this time/)).toBeVisible()
  // C2 and E2 turn one step to the right, C5 one step and E5 three steps to the left.
  const turns: [[number, number], 'left' | 'right', number][] = [
    [[1, 2], 'right', 1],
    [[4, 2], 'left', 1],
    [[1, 4], 'right', 1],
    [[4, 4], 'left', 3],
  ]
  for (const [cell, button, times] of turns) {
    const mirror = await centerOf(page, { cell })
    for (let turn = 0; turn < times; turn++) await page.mouse.click(mirror.x, mirror.y, { button })
  }

  await expect(page.getByRole('dialog', { name: 'Level solved' })).toBeVisible()
})

test('undoes and redoes a move with the buttons', async ({ page }) => {
  await page.goto(FIRST_LEVEL)
  const undo = page.getByRole('button', { name: 'Undo' })
  const redo = page.getByRole('button', { name: 'Redo' })
  await expect(undo).toBeDisabled()

  await placeMirrorWithKeyboard(page)
  await expect(undo).toBeEnabled()
  await undo.click()
  await expect(undo).toBeDisabled()
  await expect(redo).toBeEnabled()
  await redo.click()
  await expect(redo).toBeDisabled()
  await expect(undo).toBeEnabled()
})

test('fails the level when an explosive goes off, until it starts again', async ({ page }) => {
  await page.goto('./#/play/tutorial/3/1')
  // The mirror in A1, turned to send the beam east, lights the explosive in A3.
  await boardReady(page)
  await page.locator('.board').focus()
  await page.keyboard.press('Enter')
  for (let step = 0; step < 2; step++) await page.keyboard.press('ArrowRight')
  await page.keyboard.press('Enter')
  for (let step = 0; step < 3; step++) await page.keyboard.press('e')

  const dialog = page.getByRole('alertdialog', { name: 'Explosion' })
  await expect(dialog).toBeVisible()
  await expect(page.getByRole('button', { name: 'Undo' })).toBeDisabled()
  await dialog.getByRole('button', { name: 'Start again' }).click()
  await expect(dialog).toBeHidden()
  await expect(page.getByRole('application', { name: /^Handle with Care:/ })).toBeVisible()
})

test('switches the interface to German and remembers it', async ({ page }) => {
  await page.goto(FIRST_LEVEL)
  await page.getByLabel('Language').selectOption('de')

  await expect(page.locator('html')).toHaveAttribute('lang', 'de')
  await expect(page.getByRole('button', { name: 'Rückgängig' })).toBeVisible()
  await page.reload()
  await expect(page.getByLabel('Sprache')).toHaveValue('de')
})

test.describe('with a German browser', () => {
  test.use({ locale: 'de-DE' })

  test('starts in German', async ({ page }) => {
    await page.goto(FIRST_LEVEL)
    await expect(
      page.getByRole('application', { name: 'Erstes Licht: Spielfeld mit 6 Spalten und 3 Zeilen' }),
    ).toBeVisible()
  })
})
