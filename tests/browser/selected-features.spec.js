const { test, expect } = require('@playwright/test')
const fs = require('node:fs')
const path = require('node:path')
const root = process.env.VISUAL_ARTIFACT_ROOT || 'artifacts/selected-features'

async function login(page, email = process.env.SMOKE_EMAIL, password = process.env.SMOKE_PASSWORD) {
  await page.goto('/login')
  await page.getByLabel('Email', { exact: false }).fill(email)
  await page.getByLabel('Password', { exact: false }).fill(password)
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await expect(page).toHaveURL(/\/today$/, { timeout: 15000 })
}
async function ready(page) {
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await expect(page.getByText(/^Loading.*|^Checking your workspace/)).toHaveCount(0)
  await page.evaluate(() => document.fonts.ready)
}
async function api(page, route, method = 'GET', body) {
  return page.evaluate(async ({ route, method, body }) => {
    const headers = { 'Content-Type': 'application/json', ClientActionId: crypto.randomUUID() }
    if (method !== 'GET') headers['X-CSRF-TOKEN'] = (await (await fetch('/api/v1/auth/csrf')).json()).requestToken
    const response = await fetch(`/api/v1${route}`, { method, headers, ...(body !== undefined && { body: JSON.stringify(body) }) })
    if (!response.ok) throw new Error(`${method} ${route} returned ${response.status}`)
    return response.status === 204 ? null : response.json()
  }, { route, method, body })
}
function findMail(email, subject) {
  const directory = process.env.LIFEMAXING_TEST_MAILBOX
  if (!directory || !fs.existsSync(directory)) return undefined
  return fs.readdirSync(directory).map(name => JSON.parse(fs.readFileSync(path.join(directory, name), 'utf8')))
    .find(message => message.To === email && message.Subject.includes(subject))?.Link
}
async function screenshot(page, name) {
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({ path: `${root}/${name}.png`, fullPage: true, animations: 'disabled' })
}

test('registration, deliberate verification, recovery and password change work through the private mailbox', async ({ page }) => {
  test.setTimeout(90000)
  const email = `browser-signup-${Date.now()}@example.test`
  const firstPassword = 'A fictional first passphrase 749'
  const resetPassword = 'A fictional recovered passphrase 638'
  const finalPassword = 'A fictional changed passphrase 527'
  await page.goto('/signup')
  await page.getByLabel(/^Email/).fill(email)
  await page.getByLabel(/^Password /).fill(firstPassword)
  await page.getByLabel(/^Confirm password/).fill(firstPassword)
  await page.getByRole('button', { name: 'Create account', exact: true }).click()
  await expect(page.getByRole('status')).toContainText('local development mailbox')
  await expect.poll(() => Boolean(findMail(email, 'Confirm'))).toBe(true)
  await page.goto(findMail(email, 'Confirm'))
  await expect(page).toHaveURL(/\/verify-email$/)
  await expect(page.getByRole('button', { name: 'Verify email' })).toBeVisible()
  await page.getByRole('button', { name: 'Verify email' }).click()
  await expect(page.getByRole('status')).toContainText('Your email is verified')
  await login(page, email, firstPassword)
  expect((await api(page, '/areas')).length).toBe(10)
  await api(page, '/auth/logout', 'POST')
  await page.goto('/forgot-password')
  await page.getByLabel(/^Email/).fill(email)
  await page.getByRole('button', { name: 'Request reset link' }).click()
  await expect(page.getByRole('status')).toContainText('If an eligible account exists')
  await expect.poll(() => Boolean(findMail(email, 'Reset'))).toBe(true)
  await page.goto(findMail(email, 'Reset'))
  await expect(page).toHaveURL(/\/reset-password$/)
  await page.getByLabel(/^Password /).fill(resetPassword)
  await page.getByLabel(/^Confirm password/).fill(resetPassword)
  await page.getByRole('button', { name: 'Reset password', exact: true }).click()
  await expect(page.getByRole('status')).toContainText('Your password has been reset')
  await login(page, email, resetPassword)
  await page.goto('/settings?section=security')
  await page.getByLabel(/^Current password/).fill(resetPassword)
  await page.getByLabel(/^New password/).fill(finalPassword)
  await page.getByLabel(/^Confirm password/).fill(finalPassword)
  await page.getByRole('button', { name: 'Change password', exact: true }).click()
  await expect(page).toHaveURL(/\/login\?password=changed$/)
  await expect(page.getByRole('status')).toContainText('Your password has changed')
  await login(page, email, finalPassword)
})

test('planning modes preserve real work across reload and search opens the selected owned result', async ({ page, browserName }) => {
  await login(page)
  const day = await api(page, '/today')
  const task = await api(page, '/tasks', 'POST', { title: 'Aster manuscript review', plannedDate: day.localDate })
  await api(page, `/daily-mission/${day.localDate}`, 'PUT', { taskId: task.id })
  await api(page, '/habits', 'POST', { title: 'Read a few thoughtful pages', pattern: 'Daily', effectiveFromDate: day.localDate })
  const before = await api(page, '/today')
  for (const mode of ['Simple', 'ThreeThreeThree', 'FocusedDay', 'Custom']) {
    await page.goto('/today')
    const modeControl = page.getByLabel('Planning mode', { exact: true })
    await expect(modeControl).toBeEnabled()
    await modeControl.selectOption(mode)
    await expect.poll(async () => (await api(page, '/settings')).planningMode).toBe(mode)
    await page.reload()
    await expect(modeControl).toHaveValue(mode)
    const after = await api(page, '/today')
    expect(after.tasks.map(item => item.id)).toEqual(before.tasks.map(item => item.id))
    expect(after.habits.map(item => item.id)).toEqual(before.habits.map(item => item.id))
    await page.getByRole('link', { name: 'Open your day' }).click()
    for (const width of [1440, 768, 390]) {
      await page.setViewportSize({ width, height: 900 })
      await screenshot(page, `${browserName}-planning-${mode}-${width}`)
    }
  }
  await page.getByRole('button', { name: 'Search', exact: true }).click()
  const search = page.getByRole('dialog').getByLabel('Search your workspace')
  await search.fill('Aster manuscript')
  await expect(page.getByRole('dialog').getByRole('button', { name: /Aster manuscript review/ })).toBeVisible()
  await search.press('ArrowDown')
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(new RegExp(`/tasks/${task.id}$`))
  await api(page, '/settings', 'PATCH', { planningMode: 'FocusedDay' })
})

test('Finance subscriptions create, edit, cancel and reactivate with separate currency totals', async ({ page, browserName }) => {
  await login(page)
  await page.goto('/areas')
  await page.locator('section[data-area="finance"]').getByRole('heading').getByRole('link').click()
  await expect(page).toHaveURL(/\/areas\/finance$/)
  await page.getByRole('link', { name: 'Open subscriptions', exact: true }).click()
  await expect(page).toHaveURL(/\/areas\/finance\/subscriptions$/)
  await page.getByRole('button', { name: 'Add subscription', exact: true }).click()
  let dialog = page.getByRole('dialog')
  await dialog.getByLabel(/^Subscription name/).fill('Fictional reading membership')
  await dialog.getByLabel(/^Category/).fill('Learning')
  await dialog.getByLabel(/^Price/).fill('12.50')
  await dialog.getByLabel(/^Currency/).selectOption('EUR')
  await dialog.getByRole('button', { name: 'Add subscription', exact: true }).click()
  await expect(dialog).not.toBeVisible()
  let records = await api(page, '/finance/subscriptions')
  const saved = records.items.find(item => item.name === 'Fictional reading membership')
  expect(saved.price).toBe(12.5)
  await api(page, '/finance/subscriptions', 'POST', { name: 'Fictional storage plan', category: 'Tools', price: 5, currency: 'USD', billingInterval: 'Monthly', startDate: records.localDate, nextBillingDate: records.localDate })
  await page.reload()
  await ready(page)
  records = await api(page, '/finance/subscriptions')
  expect(records.totals.map(item => item.currency).sort()).toEqual(['EUR', 'USD'])
  for (const theme of ['light', 'dark']) {
    await api(page, '/settings', 'PATCH', { theme })
    await page.reload()
    await ready(page)
    for (const width of [1440, 1280, 1024, 768, 430, 390]) {
      await page.setViewportSize({ width, height: 900 })
      await screenshot(page, `${browserName}-subscriptions-${theme}-${width}`)
    }
  }
  await page.getByRole('button', { name: 'Fictional reading membership', exact: true }).first().click()
  dialog = page.getByRole('dialog')
  await dialog.getByLabel(/^Price/).fill('15.00')
  await screenshot(page, `${browserName}-subscription-editor-390`)
  await dialog.getByRole('button', { name: 'Save subscription' }).click()
  await expect(dialog).not.toBeVisible()
  expect((await api(page, `/finance/subscriptions/${saved.id}`)).price).toBe(15)
  const membership = page.getByRole('listitem').filter({ has: page.getByRole('heading', { name: 'Fictional reading membership', exact: true }) })
  await membership.getByRole('button', { name: 'Mark cancelled' }).click()
  await expect.poll(async () => (await api(page, `/finance/subscriptions/${saved.id}`)).status).toBe('Cancelled')
  await page.getByLabel('Subscription list').selectOption('Cancelled')
  await page.getByRole('button', { name: 'Mark active' }).click()
  await expect.poll(async () => (await api(page, `/finance/subscriptions/${saved.id}`)).status).toBe('Active')
  await api(page, '/settings', 'PATCH', { theme: 'light' })
})

test('public account pages reflow with honest disconnected provider states', async ({ page, browserName }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  for (const route of ['/login', '/signup', '/forgot-password', '/resend-verification', '/reset-password', '/verify-email']) {
    await page.goto(route)
    await ready(page)
    for (const theme of ['light', 'dark']) {
      await page.getByLabel('Theme', { exact: true }).selectOption(theme)
      for (const width of [1440, 1280, 1024, 768, 430, 390]) {
        await page.setViewportSize({ width, height: 900 })
        await screenshot(page, `${browserName}-auth-${route.slice(1)}-${theme}-${width}`)
      }
    }
    if (['/login', '/signup'].includes(route)) {
      await expect(page.getByRole('button', { name: 'Continue with Google' })).toBeDisabled()
      await expect(page.getByRole('button', { name: 'Continue with Apple' })).toBeDisabled()
    }
    await page.evaluate(() => { document.documentElement.style.fontSize = '200%' })
    await screenshot(page, `${browserName}-auth-${route.slice(1)}-large-text`)
  }
})
