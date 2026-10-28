import { expect, type Page, test } from '@playwright/test'

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

interface Layout {
  scale: number
  x: number
  y: number
  cell: number
  boardLeft: number
  toolboxLeft: number
  top: number
  toolboxColumns: number
}

/** Waits until PixiJS has mounted the board, which happens after the page has loaded. */
async function boardReady(page: Page) {
  await expect(page.locator('.board')).toHaveAttribute('data-layout', /"scale"/)
}

/** Screen position of a board cell (column and row from 0) or a toolbox slot. */
async function centerOf(page: Page, place: { cell: [number, number] } | { slot: number }) {
  await boardReady(page)
  const layout = JSON.parse(
    (await page.locator('.board').getAttribute('data-layout')) ?? '{}',
  ) as Layout
  const box = await page.locator('.board canvas').boundingBox()
  if (box === null) throw new Error('The canvas is not visible')
  const [x, y] =
    'slot' in place
      ? [
          layout.toolboxLeft + ((place.slot % layout.toolboxColumns) + 0.5) * layout.cell,
          layout.top + (Math.floor(place.slot / layout.toolboxColumns) + 0.5) * layout.cell,
        ]
      : [
          layout.boardLeft + (place.cell[0] + 0.5) * layout.cell,
          layout.top + (place.cell[1] + 0.5) * layout.cell,
        ]
  return { x: box.x + layout.x + x * layout.scale, y: box.y + layout.y + y * layout.scale }
}

/** First level: carry the mirror from the toolbox to B6 and turn it once to the left. */
async function placeMirrorWithKeyboard(page: Page) {
  await boardReady(page)
  await page.locator('.board').focus()
  await page.keyboard.press('Enter')
  for (let step = 0; step < 7; step++) await page.keyboard.press('ArrowRight')
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('Enter')
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
