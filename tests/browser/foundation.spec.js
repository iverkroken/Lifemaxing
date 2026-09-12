const { test, expect } = require('@playwright/test')

test('connects through the real API and database, then refreshes a client route', async ({ page }) => {
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto('/start')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Make room for what matters.')
  await expect(page.getByText('Connected', { exact: true })).toHaveCount(2)
  const statusResponse = page.waitForResponse(response => response.url().endsWith('/api/v1/system/status'))
  await page.getByRole('button', { name: 'Check again' }).click()
  expect(await (await statusResponse).json()).toEqual({ api: 'available', database: 'available' })
  await page.reload()
  await expect(page.getByText('Connected', { exact: true })).toHaveCount(2)
  for (const width of [375, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
    await expect(page.getByRole('button', { name: 'Check again' })).toBeVisible()
  }
  expect(errors).toEqual([])
})

test('unknown API routes return JSON instead of the app', async ({ request }) => {
  const response = await request.get('/api/v1/missing')
  expect(response.status()).toBe(404)
  expect(response.headers()['content-type']).toContain('application/problem+json')
  expect(await response.json()).toMatchObject({ status: 404, code: 'http_404' })
})
