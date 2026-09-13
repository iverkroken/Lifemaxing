const { test, expect, chromium } = require('@playwright/test')
const fs = require('node:fs')

test('remembered login survives both API restart and browser process restart', async () => {
  test.skip(process.env.SMOKE_RESTART !== '1', 'Run after isolated API restart.')
  const { profile } = JSON.parse(fs.readFileSync('artifacts/auth-restart-profile.json', 'utf8'))
  const browser = await chromium.launchPersistentContext(profile, { headless: true, baseURL: process.env.SMOKE_BASE_URL })
  try {
    const page = await browser.newPage()
    await page.goto('/today')
    await expect(page).toHaveURL(/\/today$/)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await page.goto('/settings')
    await page.getByRole('navigation', { name: 'Settings', exact: true }).getByRole('button', { name: 'Sessions & security' }).click()
    await page.getByRole('button', { name: 'Sign out everywhere' }).click()
    await page.getByRole('dialog', { name: 'Sign out on all devices?' }).getByRole('button', { name: 'Sign out everywhere' }).click()
    await expect(page).toHaveURL(/\/login$/)
  } finally { await browser.close() }
})
