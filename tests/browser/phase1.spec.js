const { test, expect } = require('@playwright/test')

test('owner signs in, persists settings and areas, refreshes, and signs out', async ({ page, context }) => {
  test.skip(!process.env.SMOKE_EMAIL || !process.env.SMOKE_PASSWORD,
    'Set SMOKE_EMAIL and SMOKE_PASSWORD for the Phase 1 authenticated browser flow.')

  await page.goto('/areas')
  await expect(page).toHaveURL(/\/login$/)
  await page.getByLabel('Email').fill(process.env.SMOKE_EMAIL)
  await page.getByLabel('Password').fill(process.env.SMOKE_PASSWORD)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Life Areas' })).toBeVisible()
  await expect(page.locator('section')).toHaveCount(10)

  const cookies = await context.cookies()
  const authCookie = cookies.find(cookie => cookie.name === 'Lifemaxing.Auth')
  expect(authCookie).toBeDefined()
  expect(authCookie.httpOnly).toBe(true)
  expect(authCookie.sameSite).toBe('Strict')
  expect(authCookie.expires).toBeGreaterThan(0)

  const fitness = page.getByRole('region', { name: /Fitness/ })
  await fitness.getByText('Edit Life Area', { exact: true }).click()
  const displayName = fitness.getByLabel('Display name')
  const updatedName = await displayName.inputValue() === 'Movement & Fitness'
    ? 'Movement & Fitness II'
    : 'Movement & Fitness'
  await displayName.fill(updatedName)
  await fitness.getByRole('button', { name: 'Save changes' }).click()
  await expect(fitness.getByText('Changes saved.')).toBeVisible()

  await page.getByRole('link', { name: 'Settings' }).click()
  const timeZone = page.getByLabel('Time zone')
  const useBudapest = await timeZone.inputValue() !== 'Europe/Budapest'
  const updatedTimeZone = useBudapest ? 'Europe/Budapest' : 'Europe/Oslo'
  const updatedLocale = useBudapest ? 'hu-HU' : 'nb-NO'
  await timeZone.fill(updatedTimeZone)
  await page.getByLabel('Locale').fill(updatedLocale)
  await page.getByRole('button', { name: 'Save settings' }).click()
  await expect(page.getByText('Settings saved.')).toBeVisible()
  await page.reload()
  await expect(page.getByLabel('Time zone')).toHaveValue(updatedTimeZone)

  const anotherPage = await context.newPage()
  await anotherPage.goto('/areas')
  await expect(anotherPage.getByRole('heading', { level: 1, name: 'Life Areas' })).toBeVisible()
  await anotherPage.getByText('Edit Life Area', { exact: true }).first().click()
  await expect(anotherPage.getByLabel('Display name').first()).toHaveValue(updatedName)
  await anotherPage.close()

  await page.getByRole('button', { name: 'Sign out' }).click()
  await expect(page).toHaveURL(/\/login$/)
  await page.goto('/areas')
  await expect(page).toHaveURL(/\/login$/)
})
