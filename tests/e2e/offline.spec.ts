import { expect, test } from '@playwright/test'

test('describes itself for installing, with icons that load', async ({ page }) => {
  await page.goto('./')
  const href = await page.locator('link[rel="manifest"]').getAttribute('href')
  const manifest = await page.evaluate(async (url) => (await fetch(url)).json(), href ?? '')
  expect(manifest).toMatchObject({ name: 'Vibe Laser', start_url: './', display: 'standalone' })
  for (const icon of manifest.icons as { src: string }[]) {
    const response = await page.request.get(new URL(icon.src, page.url()).href)
    expect(response.headers()['content-type'], icon.src).toBe('image/png')
  }
})

test('plays offline once the game has loaded', async ({ page, context }) => {
  await page.goto('./')
  // The first version of the worker takes over the page once it has kept every file.
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null)
  await context.setOffline(true)
  await page.reload()
  await page.getByRole('button', { name: /^Tutorial/ }).click()
  await page.getByRole('button', { name: /^2\. Optics/ }).click()
  await page.getByRole('button', { name: /^5\. Rainbow/ }).click()
  await expect(page.getByRole('application', { name: /^Rainbow:/ })).toBeVisible()
  await expect(page.locator('.board canvas')).toBeVisible()
})
