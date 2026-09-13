const { test, expect } = require('@playwright/test')
const fs = require('node:fs')

test('reference pages: empty, realistic and busy days on four widths', async ({ page }) => {
  test.skip(!process.env.REFERENCE_STAGE, 'Run with run-isolated.ps1 -ReferenceStage before or after.')
  test.setTimeout(120000)
  const stage = process.env.REFERENCE_STAGE
  const folder = `artifacts/reference-${stage}`
  fs.mkdirSync(folder, { recursive: true })
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  async function capture(name) {
    await expect(page.getByText(/^Loading.*|^Checking your workspace/)).toHaveCount(0)
    for (const width of [375, 768, 1440, 1920]) {
      await page.setViewportSize({ width, height: 1000 })
      await page.evaluate(() => document.fonts.ready)
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
      await page.screenshot({ path: `${folder}/${name}-${width}.png`, fullPage: true })
    }
  }
  await page.goto('/login')
  await capture('login')
  await page.getByLabel('Email').fill(process.env.SMOKE_EMAIL)
  await page.getByLabel('Password').fill(process.env.SMOKE_PASSWORD)
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Today', exact: true })).toBeVisible()
  async function api(path, method = 'GET', body) {
    const result = await page.evaluate(async ({ path, method, body }) => {
      const headers = { 'Content-Type': 'application/json', ClientActionId: crypto.randomUUID() }
      if (method !== 'GET') headers['X-CSRF-TOKEN'] = (await (await fetch('/api/v1/auth/csrf')).json()).requestToken
      const response = await fetch('/api/v1' + path, { method, headers, ...(body && { body: JSON.stringify(body) }) })
      return { status: response.status, data: response.status === 204 ? null : await response.json() }
    }, { path, method, body })
    expect(result.status, `${method} ${path}`).toBeLessThan(300)
    return result.data
  }
  for (const route of ['/progress', '/activity', '/rewards', '/focus-sessions/active']) await api(route)
  await expect(page.getByRole('progressbar')).toBeVisible()
  await capture('today-empty')
  const date = (await api('/today')).localDate
  const area = (await api('/areas')).find(item => item.key === 'career')
  const goal = await api('/goals', 'POST', { title: 'Publish the portfolio', lifeAreaId: area.id, kind: 'Qualitative' })
  const mission = await api('/tasks', 'POST', { title: 'Finish the portfolio case study', details: 'Write the outcome, choose three examples and send the draft for review.', plannedDate: date, tier: 'Large', priority: 'High', estimateMinutes: 45, lifeAreaId: area.id, goalId: goal.id })
  await api('/daily-mission/' + date, 'PUT', { taskId: mission.id })
  for (const title of ['Review tomorrow’s reading', 'Plan meals for the week']) await api('/tasks', 'POST', { title, plannedDate: date, estimateMinutes: 20 })
  await api('/tasks', 'POST', { title: 'Book a bike service' })
  for (const title of ['Read for 15 minutes', 'Take a walk', 'Review the day']) await api('/habits', 'POST', { title })
  await page.reload()
  await expect(page.getByRole('link', { name: mission.title, exact: true })).toBeVisible()
  await expect(page.getByText('Read for 15 minutes', { exact: true })).toBeVisible()
  await capture('today-small')
  for (const title of ['Send the project update', 'Collect references for the next draft', 'Review the monthly budget', 'Prepare workshop notes', 'Order replacement bike lights', 'Reply to the study group', 'Read the course summary', 'Organize the project folder', 'Choose a weekend route']) {
    await api('/tasks', 'POST', { title, plannedDate: date, priority: 'Normal' })
  }
  await api('/tasks', 'POST', { title: 'Return the library book', dueDate: date, priority: 'High' })
  await page.reload()
  await expect(page.getByText('Choose a weekend route', { exact: true })).toBeVisible()
  await capture('today-busy')
  if (stage === 'after') {
    await page.getByRole('button', { name: 'Start focus', exact: true }).click()
    await expect(page).toHaveURL(/\/focus$/)
    await expect(page.getByRole('region', { name: 'Current focus' })).toBeVisible()
    expect((await api('/focus-sessions/active')).session.taskId).toBe(mission.id)
    const session = (await api('/focus-sessions/active')).session
    await api(`/focus-sessions/${session.id}/stop`, 'POST', { outcome: 'Stopped', completeTask: false })
    await page.goto('/today')
    await page.getByRole('button', { name: 'Complete mission', exact: true }).click()
    await expect(page.getByText('Mission completed.')).toBeVisible()
    await expect(page.getByRole('status').filter({ hasText: '+100 XP' })).toBeVisible()
    await page.getByRole('button', { name: 'Reopen mission' }).click()
    await expect(page.getByRole('status').filter({ hasText: '-100 XP' })).toBeVisible()
    const log = page.getByRole('button', { name: 'Log completion: Read for 15 minutes', exact: true })
    await log.click()
    await expect(page.getByRole('button', { name: 'Undo completion: Read for 15 minutes' })).toHaveAttribute('aria-pressed', 'true')
    await page.getByRole('button', { name: 'Undo completion: Read for 15 minutes' }).click()
    await expect(log).toHaveAttribute('aria-pressed', 'false')
    await page.route('**/api/v1/progress', route => route.fulfill({ status: 503, contentType: 'application/problem+json', body: '{}' }))
    await page.reload()
    await expect(page.getByRole('alert')).toContainText('Progress could not be loaded')
    await expect(page.getByRole('progressbar')).toHaveCount(0)
    await page.unroute('**/api/v1/progress')
    await page.getByRole('button', { name: 'Try again' }).click()
    await expect(page.getByRole('progressbar')).toBeVisible()
    await page.setViewportSize({ width: 1440, height: 1000 })
    await page.evaluate(() => { document.documentElement.style.fontSize = '200%' })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    const taskText = page.getByRole('link', { name: 'Choose a weekend route', exact: true })
    expect((await taskText.boundingBox()).width).toBeGreaterThan(200)
    await page.screenshot({ path: `${folder}/today-text-200.png`, fullPage: true })
    await page.evaluate(() => { document.documentElement.style.fontSize = '' })
    const tomorrow = new Date(date + 'T12:00:00Z'); tomorrow.setUTCDate(tomorrow.getUTCDate() + 1)
    const nextDate = tomorrow.toISOString().slice(0, 10)
    await page.getByLabel('Plan date').fill(nextDate)
    await expect(page.getByRole('heading', { name: 'Your day' })).toBeVisible()
    await page.getByRole('button', { name: 'Add a task', exact: true }).click()
    const dialog = page.getByRole('dialog', { name: 'Capture a task' })
    await expect(dialog.getByRole('heading')).toHaveCount(1)
    await expect(dialog.getByLabel('Task title', { exact: false })).toBeFocused()
    await dialog.getByLabel('Task title', { exact: false }).fill('A task for the selected day')
    await dialog.getByText('More details', { exact: true }).click()
    await dialog.getByLabel('Details', { exact: true }).fill('Keep the supplied date and description.')
    await dialog.getByRole('button', { name: 'Add to this day' }).click()
    await expect(dialog.getByText('Task captured.')).toBeVisible()
    const saved = (await api('/tasks?search=A%20task%20for%20the%20selected%20day')).items[0]
    expect(saved.plannedDate).toBe(nextDate)
    expect(saved.details).toBe('Keep the supplied date and description.')
    await page.keyboard.press('Escape')
    await expect(page.getByRole('button', { name: 'Add a task', exact: true })).toBeFocused()
  }
  expect(errors).toEqual([])
})
