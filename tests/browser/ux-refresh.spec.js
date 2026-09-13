const { test, expect } = require('@playwright/test')
const fs = require('node:fs')

async function login(page) {
  await page.goto('/login')
  await page.getByLabel('Email').fill(process.env.SMOKE_EMAIL)
  await page.getByLabel('Password').fill(process.env.SMOKE_PASSWORD)
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await expect(page).toHaveURL(/\/today$/)
}
async function api(page, path, method = 'GET', body) {
  return page.evaluate(async ({ path, method, body }) => {
    const headers = { 'Content-Type': 'application/json', ClientActionId: crypto.randomUUID() }
    if (method !== 'GET') headers['X-CSRF-TOKEN'] = (await (await fetch('/api/v1/auth/csrf')).json()).requestToken
    const response = await fetch('/api/v1' + path, { method, headers, ...(body && { body: JSON.stringify(body) }) })
    if (!response.ok) throw new Error(`${method} ${path}: ${response.status}`)
    return response.status === 204 ? null : response.json()
  }, { path, method, body })
}

test('workspace surfaces support empty, populated and busy states at four widths', async ({ page }) => {
  test.setTimeout(180000)
  fs.mkdirSync('artifacts/ux-refresh', { recursive: true })
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  await login(page)
  async function capture(route, width, state) {
    await page.setViewportSize({ width, height: 1000 })
    await page.goto(route)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expect(page.getByText(/^Loading.*|^Checking your workspace/)).toHaveCount(0)
    await page.evaluate(() => document.fonts.ready)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.screenshot({ path: `artifacts/ux-refresh/${state}-${route.slice(1).replace(/[^a-z0-9-]/gi, '-')}-${width}.png`, fullPage: true })
  }
  for (const route of ['/areas', '/settings', '/tasks', '/habits', '/goals', '/activity', '/progress', '/rewards', '/focus'])
    await capture(route, 1440, 'empty')
  const today = await api(page, '/today')
  const areas = await api(page, '/areas')
  for (let index = 0; index < 28; index++) await api(page, '/tasks', 'POST', {
    title: ['Prepare the weekly project review', 'Plan meals for next week', 'Read the next chapter', 'Choose a weekend walking route'][index % 4] + ` · ${index + 1}`,
    lifeAreaId: areas[index % areas.length].id, plannedDate: index < 7 ? today.localDate : null,
    priority: index % 4 === 0 ? 'High' : 'Normal', tier: 'Small',
  })
  for (const title of ['Read for fifteen minutes', 'Take an afternoon walk', 'Review the day'])
    await api(page, '/habits', 'POST', { title, isActive: true, xpPerLog: 10, schedule: { pattern: 'Daily', effectiveFromDate: today.localDate } })
  for (const title of ['Finish the portfolio', 'Read twelve books'])
    await api(page, '/goals', 'POST', { title, state: 'Active' })
  await api(page, '/rewards', 'POST', { title: 'A film evening', requiredLevel: 1 })
  const tasks = await api(page, '/tasks')
  await api(page, `/tasks/${tasks.items[0].id}/complete`, 'POST', {})
  const mission = tasks.items.find(task => task.plannedDate)
  await api(page, '/daily-mission/' + today.localDate, 'PUT', { taskId: mission.id })
  await api(page, '/focus-sessions', 'POST', { taskId: mission.id })
  const goals = await api(page, '/goals')
  await api(page, `/goals/${goals.items[0].id}/progress`, 'POST', { note: 'Finished the first draft. Next: review the examples.' })
  await page.goto('/habits')
  await page.getByRole('button', { name: 'Log completion: Read for fifteen minutes', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Undo completion: Read for fifteen minutes', exact: true })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('button', { name: 'Undo completion: Read for fifteen minutes', exact: true })).toBeVisible()
  for (const width of [375, 768, 1440, 1920]) {
    for (const route of ['/areas', '/settings?section=preferences', '/settings?section=security', '/today', '/tasks', '/inbox', '/habits', '/goals', '/progress', '/activity', '/rewards', '/focus'])
      await capture(route, width, 'populated')
  }
  await page.goto('/tasks')
  await page.getByLabel('Search tasks').fill('no-such-fictional-task')
  await expect(page.getByText('No matching tasks')).toBeVisible()
  await page.goto('/settings?section=preferences')
  await page.route('**/api/v1/settings', route => route.fulfill({ status: 503, contentType: 'application/problem+json', body: '{}' }))
  await page.reload()
  await expect(page.getByRole('alert')).toContainText('Settings could not be loaded')
  await page.unroute('**/api/v1/settings')
  await page.getByRole('button', { name: 'Try again' }).click()
  await expect(page.getByLabel('Language', { exact: true })).toBeVisible()
  // The real loading state remains visible while the response is held.
  let release
  const hold = new Promise(resolve => { release = resolve })
  await page.route('**/api/v1/settings', async route => { await hold; await route.continue() })
  await page.reload({ waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('status')).toContainText('Loading settings')
  release()
  await expect(page.getByLabel('Language', { exact: true })).toBeVisible()
  await page.unroute('**/api/v1/settings')
  await page.setViewportSize({ width: 768, height: 1000 })
  await page.evaluate(() => { document.documentElement.style.fontSize = '200%' })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await expect(page.getByLabel('Language', { exact: true })).toBeVisible()
  await page.screenshot({ path: 'artifacts/ux-refresh/settings-text-200.png', fullPage: true })
  expect(errors).toEqual([])
})

test('languages persist and sign-out confirmations protect both session actions', async ({ page, browser }) => {
  await login(page)
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.goto('/settings?section=preferences')
  for (const [uiLanguage, save, heading] of [
    ['nb', 'Save settings', 'Innstillinger'], ['sv', 'Lagre innstillinger', 'Inställningar'],
    ['da', 'Spara inställningar', 'Indstillinger'], ['en', 'Gem indstillinger', 'Settings'],
  ]) {
    await page.locator('select[name="uiLanguage"]').selectOption(uiLanguage)
    await page.getByRole('button', { name: save, exact: true }).click()
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(heading)
    await page.reload()
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(heading)
    expect((await api(page, '/settings')).uiLanguage).toBe(uiLanguage)
  }
  // A separate browser context reads the saved server preference too.
  const other = await browser.newContext()
  try {
    const otherPage = await other.newPage()
    await login(otherPage)
    await otherPage.goto('/settings?section=preferences')
    await expect(otherPage.getByLabel('Language', { exact: true })).toHaveValue('en')
  } finally { await other.close() }
  let logoutRequests = 0
  page.on('request', request => { if (/\/auth\/logout(?:-everywhere)?$/.test(request.url())) logoutRequests++ })
  await page.getByRole('button', { name: 'Sign out', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Sign out of this device?' })
  await expect(dialog).toBeVisible()
  await expect(dialog.getByRole('button', { name: 'Stay signed in' })).toBeFocused()
  await page.screenshot({ path: 'artifacts/ux-refresh/sign-out-confirmation.png', fullPage: true })
  expect(logoutRequests).toBe(0)
  await page.keyboard.press('Escape')
  await expect(dialog).not.toBeVisible()
  await expect(page.getByRole('button', { name: 'Sign out', exact: true })).toBeFocused()
  await page.getByRole('button', { name: 'Sign out', exact: true }).click()
  await dialog.getByRole('button', { name: 'Stay signed in' }).click()
  expect(logoutRequests).toBe(0)
  await page.getByRole('button', { name: 'Sessions & security' }).click()
  await page.getByRole('button', { name: 'Sign out everywhere' }).click()
  const revoke = page.getByRole('dialog', { name: 'Sign out on all devices?' })
  await expect(revoke).toContainText('within one minute')
  await page.route('**/api/v1/auth/logout-everywhere', route => route.fulfill({ status: 503, contentType: 'application/problem+json', body: '{}' }))
  await revoke.getByRole('button', { name: 'Sign out everywhere' }).click()
  await expect(revoke.getByRole('alert')).toContainText('Could not sign out')
  await page.unroute('**/api/v1/auth/logout-everywhere')
  await revoke.getByRole('button', { name: 'Sign out everywhere' }).click()
  await expect(page).toHaveURL(/\/login$/)
})
