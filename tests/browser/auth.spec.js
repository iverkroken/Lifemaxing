const { test, expect, chromium } = require('@playwright/test')
const fs = require('node:fs')
const path = require('node:path')

test('login keeps failures recoverable, supports keyboard capture and explicit session choice', async ({ page, context }) => {
  await page.goto('/today')
  await expect(page).toHaveURL(/\/login$/)
  await expect(page.getByLabel('Email')).toHaveAttribute('autocomplete', 'username')
  await expect(page.getByLabel('Password')).toHaveAttribute('autocomplete', 'current-password')
  await expect(page.getByRole('checkbox')).not.toBeChecked()
  for (const width of [375, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await expect(page.getByRole('button', { name: 'Sign in', exact: true })).toBeVisible()
  }
  await page.getByLabel('Email').fill(process.env.SMOKE_EMAIL)
  await page.getByLabel('Password').fill(process.env.SMOKE_PASSWORD)
  await page.getByRole('button', { name: 'Show password' }).focus()
  await page.keyboard.press('Enter')
  await expect(page.getByLabel('Password')).toHaveAttribute('type', 'text')
  await page.getByRole('button', { name: 'Hide password' }).click()
  await page.route('**/api/v1/auth/login', route => route.fulfill({ status: 503, contentType: 'application/problem+json', body: '{}' }))
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('temporarily unavailable')
  await page.unroute('**/api/v1/auth/login')
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await expect(page).toHaveURL(/\/today$/)
  const cookie = (await context.cookies()).find(item => item.name === 'Lifemaxing.Auth')
  expect(Boolean(cookie)).toBe(true)
  expect(cookie.expires).toBe(-1)
  expect(cookie.httpOnly).toBe(true)
  expect(cookie.sameSite).toBe('Strict')
  await page.route('**/api/v1/auth/me', route => route.abort())
  await page.reload()
  await expect(page.getByRole('alert')).toContainText('could not check your session')
  await expect(page).toHaveURL(/\/today$/)
  await page.unroute('**/api/v1/auth/me')
  await page.getByRole('button', { name: 'Try again', exact: true }).click()
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
})

test('actual Chromium profile restart preserves only the opted-in login', async () => {
  test.setTimeout(60000)
  fs.mkdirSync('artifacts', { recursive: true })
  for (const rememberMe of [false, true]) {
    const profile = fs.mkdtempSync(path.resolve('artifacts/auth-profile-'))
    const options = { headless: true, baseURL: process.env.SMOKE_BASE_URL }
    let browser = await chromium.launchPersistentContext(profile, options)
    try {
      let page = await browser.newPage()
      await page.goto('/login')
      await page.getByLabel('Email').fill(process.env.SMOKE_EMAIL)
      await page.getByLabel('Password').fill(process.env.SMOKE_PASSWORD)
      if (rememberMe) await page.getByRole('checkbox').check()
      await page.getByRole('button', { name: 'Sign in', exact: true }).click()
      await expect(page).toHaveURL(/\/today$/)
      const cookie = (await browser.cookies()).find(item => item.name === 'Lifemaxing.Auth')
      expect(rememberMe ? cookie.expires > Date.now() / 1000 : cookie.expires === -1).toBe(true)
      await browser.close()
      browser = await chromium.launchPersistentContext(profile, options)
      page = await browser.newPage()
      await page.goto('/today')
      await expect(page).toHaveURL(rememberMe ? /\/today$/ : /\/login$/)
      if (rememberMe) {
        await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
        // Persist only the profile path, never exported cookie/storage values.
        fs.writeFileSync('artifacts/auth-restart-profile.json', JSON.stringify({ profile }))
      }
    } finally { await browser.close() }
  }
})
