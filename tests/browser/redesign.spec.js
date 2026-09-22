const { navigateTo, captureTask } = require('./navigation-helpers.cjs')
const { test, expect } = require('@playwright/test')
const fs = require('node:fs')
const artifactRoot = process.env.VISUAL_ARTIFACT_ROOT ? `${process.env.VISUAL_ARTIFACT_ROOT}/redesign` : 'artifacts/full-redesign'

async function login(page) {
  await page.goto('/login')
  await page.getByLabel('Email').fill(process.env.SMOKE_EMAIL)
  await page.getByLabel('Password', { exact: false }).fill(process.env.SMOKE_PASSWORD)
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await expect(page).toHaveURL(/\/today$/, { timeout: 20000 })
  await expect(page.locator('#main-content')).toBeVisible()
}
async function api(page, path, method = 'GET', body) {
  return page.evaluate(async ({ path, method, body }) => {
    const headers = { 'Content-Type': 'application/json', ClientActionId: crypto.randomUUID() }
    if (method !== 'GET') headers['X-CSRF-TOKEN'] = (await (await fetch('/api/v1/auth/csrf')).json()).requestToken
    const response = await fetch('/api/v1' + path, { method, headers, ...(body !== undefined && { body: JSON.stringify(body) }) })
    if (!response.ok) throw new Error(`${method} ${path}: ${response.status}`)
    return response.status === 204 ? null : response.json()
  }, { path, method, body })
}
async function ready(page) {
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await expect(page.getByText(/^Loading.*|^Checking your workspace/)).toHaveCount(0)
  await page.evaluate(() => document.fonts.ready)
}
async function capture(page, name, width, browserName) {
  await page.setViewportSize({ width, height: 1000 })
  await ready(page)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), name).toBe(true)
  await page.screenshot({ path: `${artifactRoot}/${browserName}/${name}-${width}.png`, fullPage: true, animations: 'disabled' })
}

test('real empty, small and busy data; every surface in light/dark; execution and corrections', async ({ page, browserName }) => {
  test.setTimeout(240000)
  fs.mkdirSync(`${artifactRoot}/${browserName}`, { recursive: true })
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  await login(page)
  const baseRoutes = ['/today', '/areas', '/settings', '/settings?section=appearance', '/tasks', '/inbox', '/habits', '/goals', '/progress', '/activity', '/rewards', '/focus']
  for (const path of browserName === 'chromium' ? baseRoutes : ['/today', '/areas']) {
    await page.goto(path)
    await capture(page, 'empty-' + path.slice(1).replace(/[^\w-]/g, '-'), 1440, browserName)
  }
  const today = await api(page, '/today')
  const areas = await api(page, '/areas')
  const task = await api(page, '/tasks', 'POST', { title: 'Prepare a thoughtful project review — observations, next steps and questions', plannedDate: today.localDate, lifeAreaId: areas[0].id, priority: 'High', estimateMinutes: 25 })
  await api(page, '/daily-mission/' + today.localDate, 'PUT', { taskId: task.id })
  const habit = await api(page, '/habits', 'POST', { title: 'Read for fifteen minutes', lifeAreaId: areas[0].id, isActive: true, xpPerLog: 10, schedule: { pattern: 'WeeklyCount', weeklyTarget: 3, effectiveFromDate: today.localDate } })
  const goal = await api(page, '/goals', 'POST', { title: 'Read twelve books', lifeAreaId: areas[0].id, state: 'Active', baselineValue: 0, targetValue: 12, unit: 'books', direction: 'Increase' })
  await api(page, `/goals/${goal.id}/progress`, 'POST', { value: 4, note: 'Finished a chapter and recorded what I learned.' })
  await page.goto('/today')
  await capture(page, 'small-today', 1440, browserName)
  await capture(page, 'small-today', 375, browserName)
  await api(page, `/tasks/${task.id}/complete`, 'POST', {})
  const smallLog = await api(page, `/habits/${habit.id}/logs`, 'POST', { localDate: today.localDate })
  await page.reload()
  await expect(page.getByText('Your planned work and habits are complete for this day.')).toBeVisible()
  await capture(page, 'completed-today', 375, browserName)
  await capture(page, 'completed-today', 1440, browserName)
  await api(page, `/tasks/${task.id}/reopen`, 'POST', {})
  await api(page, `/habits/${habit.id}/logs/${smallLog.id}/revoke`, 'POST', {})
  // Fifteen planned tasks with real deadlines, plus enough inbox items to exercise paging.
  for (let index = 0; index < 43; index++) await api(page, '/tasks', 'POST', {
    title: `${['Review the outline', 'Plan meals for the week', 'Choose a walking route', 'Read the next chapter'][index % 4]} · ${index + 1}`,
    plannedDate: index < 14 ? today.localDate : null, dueDate: index % 3 === 0 ? today.localDate : null,
    lifeAreaId: areas[index % areas.length].id, priority: index % 4 === 0 ? 'High' : 'Normal',
  })
  await api(page, '/habits', 'POST', { title: 'Take an afternoon walk', isActive: true, xpPerLog: 10, schedule: { pattern: 'Daily', effectiveFromDate: today.localDate } })
  await api(page, '/habits', 'POST', { title: 'Review the day', isActive: true, xpPerLog: 10, schedule: { pattern: 'SelectedWeekdays', daysOfWeek: [1, 3, 5], effectiveFromDate: today.localDate } })
  await api(page, '/goals', 'POST', { title: 'Build a portfolio that explains the decisions behind each project', state: 'Paused' })
  const decreasing = await api(page, '/goals', 'POST', { title: 'Reduce the unread reading list', state: 'Active', baselineValue: 20, targetValue: 5, unit: 'articles', direction: 'Decrease' })
  await api(page, `/goals/${decreasing.id}/progress`, 'POST', { value: 3 })
  await api(page, '/rewards', 'POST', { title: 'An afternoon at the museum', requiredLevel: 15 })
  const reward = await api(page, '/rewards', 'POST', { title: 'A film evening', requiredLevel: 1 })
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.goto('/today')
  await page.getByRole('button', { name: 'Start focus', exact: true }).click()
  await expect(page).toHaveURL(/\/focus$/)
  await expect(page.getByRole('heading', { name: task.title })).toBeVisible()
  await page.getByRole('button', { name: 'Pause focus' }).click()
  await expect(page.getByText('Paused · time is not counting')).toBeVisible()
  await page.reload()
  await page.getByRole('button', { name: 'Resume focus' }).click()
  await expect(page.getByRole('button', { name: 'Pause focus' })).toBeEnabled()
  await expect(page.getByRole('timer')).toBeVisible()
  const finish = page.getByRole('button', { name: 'Complete task & finish' })
  await finish.hover()
  await expect(finish).toHaveCSS('background-color', 'rgb(28, 44, 36)')
  await expect(finish).toHaveCSS('color', 'rgb(155, 189, 176)')
  await capture(page, 'focus-running', 375, browserName)
  await page.getByRole('button', { name: 'Complete task & finish' }).click()
  await expect(page.getByRole('button', { name: 'Start focus', exact: true })).toBeVisible()
  expect((await api(page, `/tasks/${task.id}`)).isCompleted).toBe(true)
  await page.goto('/today')
  await page.getByRole('button', { name: 'Reopen mission' }).click()
  await expect(page.getByRole('button', { name: 'Complete mission' })).toBeVisible()
  await page.goto('/habits')
  await page.getByRole('button', { name: 'Log completion: Read for fifteen minutes', exact: true }).click()
  await page.getByRole('button', { name: 'Undo completion: Read for fifteen minutes', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Log completion: Read for fifteen minutes', exact: true })).toBeEnabled()
  const week = await api(page, '/habits/week')
  expect(week.items.find(row => row.id === habit.id).days.find(day => day.localDate === today.localDate).state).toBe('corrected')
  await page.goto('/rewards')
  await page.getByRole('region', { name: reward.title }).getByRole('button', { name: 'Claim reward' }).click()
  await expect(page.getByRole('region', { name: reward.title })).toContainText('Claimed')
  const routes = [...baseRoutes, `/tasks/${task.id}`, `/habits/${habit.id}`, `/goals/${goal.id}`, '/tasks/new', '/settings?section=preferences', '/settings?section=security']
  for (const theme of ['light', 'dark']) {
    await api(page, '/settings', 'PATCH', { theme })
    for (const path of browserName === 'chromium' ? routes : ['/today', '/habits', '/settings?section=appearance']) {
      await page.goto(path)
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme)
      for (const width of browserName === 'chromium' ? [375, 1440] : [375])
        await capture(page, theme + '-' + path.slice(1).replace(/[^\w-]/g, '-'), width, browserName)
    }
  }
  await api(page, '/settings', 'PATCH', { theme: 'light' })
  if (browserName === 'chromium') for (const width of [320, 768, 1024, 1920]) for (const path of ['/today', '/areas', '/tasks', '/settings?section=appearance', '/focus']) {
    await page.goto(path)
    await capture(page, 'reflow-' + path.slice(1).replace(/[^\w-]/g, '-'), width, browserName)
  }
  expect(errors).toEqual([])
})

test('four languages preserve formatting, fields, dialogs and server preferences; system and density', async ({ page, browserName }) => {
  test.setTimeout(120000)
  await login(page)
  await page.setViewportSize({ width: 1440, height: 1000 })
  const original = await api(page, '/settings')
  for (const [language, save, heading, create, title, inbox, required] of [
    ['nb', 'Save settings', 'Innstillinger', 'Registrer en oppgave', 'Oppgavetittel', 'Legg i innboksen', 'Fyll ut dette feltet'],
    ['sv', 'Lagre innstillinger', 'Inställningar', 'Lägg till en uppgift', 'Uppgiftstitel', 'Lägg i inkorgen', 'Fyll i fältet'],
    ['da', 'Spara inställningar', 'Indstillinger', 'Tilføj en opgave', 'Opgavetitel', 'Tilføj til indbakken', 'Udfyld feltet'],
    ['en', 'Gem indstillinger', 'Settings', 'Capture a task', 'Task title', 'Add to Inbox', 'Enter a valid value'],
  ]) {
    await page.goto('/settings?section=preferences')
    await page.locator('select[name="uiLanguage"]').selectOption(language)
    await page.getByRole('button', { name: save, exact: true }).click()
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(heading)
    await page.reload()
    await expect(page.locator('html')).toHaveAttribute('lang', language)
    const saved = await api(page, '/settings')
    expect([saved.locale, saved.timeZoneId]).toEqual([original.locale, original.timeZoneId])
    await capture(page, 'language-' + language, 1440, browserName)
    await page.keyboard.press('Control+k')
    await expect(page.locator('dialog[open]')).toBeVisible()
    await page.keyboard.press('Escape')
    await page.goto('/tasks')
    await page.getByRole('button', { name: create, exact: true }).first().click()
    const dialog = page.locator('dialog[open]')
    await dialog.getByRole('button', { name: inbox, exact: true }).click()
    await expect(dialog).toContainText(required)
    await dialog.getByLabel(title, { exact: false }).fill('Ærlig øvelse, långsiktigt arbete – København')
    await page.route('**/api/v1/tasks', route => route.fulfill({ status: 503, contentType: 'application/problem+json', body: '{}' }))
    await dialog.getByRole('button', { name: inbox, exact: true }).click()
    await expect(dialog.getByRole('alert')).toBeVisible()
    await expect(dialog.getByLabel(title, { exact: false })).toHaveValue('Ærlig øvelse, långsiktigt arbete – København')
    await capture(page, 'language-dialog-' + language, 375, browserName)
    await page.unroute('**/api/v1/tasks')
    await page.keyboard.press('Escape')
    await page.setViewportSize({ width: 1440, height: 1000 })
  }
  await page.goto('/settings?section=appearance')
  await page.getByRole('radio', { name: 'Dark', exact: true }).check()
  await expect(page.getByRole('status')).toContainText('Settings saved.')
  await page.getByRole('radio', { name: /Compact/ }).check()
  await expect(page.getByRole('status')).toContainText('Settings saved.')
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-density', 'compact')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await page.getByRole('radio', { name: 'System', exact: true }).check()
  await expect(page.getByRole('status')).toContainText('Settings saved.')
  await page.emulateMedia({ colorScheme: 'light' })
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' })
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await capture(page, 'appearance-system-compact', 1440, browserName)
  // Unsaved regional values survive changing sections and leaving Settings.
  await page.goto('/settings?section=preferences')
  await page.locator('select[name="locale"]').selectOption('en-US')
  await navigateTo(page, 'Tasks')
  await navigateTo(page, 'Settings')
  await page.getByRole('button', { name: 'Language & time' }).click()
  await expect(page.locator('select[name="locale"]')).toHaveValue('en-US')
  await page.getByRole('button', { name: 'Save settings', exact: true }).click()
  await expect(page.getByText('Settings saved.', { exact: true })).toBeVisible()
  await api(page, '/settings', 'PATCH', { ...original, uiLanguage: 'en', theme: 'light', density: 'normal' })
})

test('task panel preserves list filters, scroll and keyboard context; direct and mobile details', async ({ page, browserName }) => {
  test.setTimeout(60000)
  await login(page)
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.goto('/tasks?search=Review')
  await ready(page)
  const row = page.locator('[data-task-link]').last()
  await row.scrollIntoViewIfNeeded()
  await row.focus()
  const scroll = await page.evaluate(() => scrollY)
  await row.click()
  const panel = page.getByRole('complementary', { name: 'Task details' })
  await expect(panel).toBeVisible()
  await expect(page.getByLabel('Search tasks')).toHaveValue('Review')
  await expect(panel).not.toHaveAttribute('aria-modal', 'true')
  await capture(page, 'task-panel', 1440, browserName)
  await panel.getByRole('button', { name: 'Back to list' }).click()
  await expect(row).toBeFocused()
  expect(Math.abs(await page.evaluate(() => scrollY) - scroll)).toBeLessThan(3)
  await row.click()
  const detailUrl = page.url()
  await page.reload()
  await expect(panel).not.toBeVisible()
  await expect(page.getByLabel('Title', { exact: false })).toBeVisible()
  await page.setViewportSize({ width: 375, height: 1000 })
  await page.goto(detailUrl)
  const storedTask = await api(page, '/tasks/' + detailUrl.split('/').pop())
  await expect(page.locator('select[name="lifeAreaId"]')).toHaveValue(storedTask.lifeAreaId || '')
  await page.getByRole('button', { name: 'Save task' }).click()
  await expect(page.getByText('Task saved.', { exact: true })).toBeVisible()
  expect((await api(page, '/tasks/' + storedTask.id)).lifeAreaId).toBe(storedTask.lifeAreaId)
  await capture(page, 'task-mobile-detail', 375, browserName)
  await expect(page.getByRole('button', { name: 'Save task' })).toBeVisible()
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.goto('/tasks')
  await page.getByLabel('Search tasks').focus()
  await page.keyboard.press('Control+k')
  await expect(page.locator('dialog[open]')).toHaveCount(0)
  await page.getByRole('button', { name: 'Search', exact: true }).click()
  const command = page.getByRole('dialog', { name: 'Search' })
  await command.getByRole('textbox').fill('unfindable-action')
  await expect(command).toContainText('No matching actions')
  await page.keyboard.press('Escape')
  await expect(page.getByRole('button', { name: 'Search', exact: true })).toBeFocused()
})

test('contrast roles, enlarged text, translated public login and confirmation dialogs', async ({ page, browserName }) => {
  test.setTimeout(120000)
  await login(page)
  await page.setViewportSize({ width: 1440, height: 1000 })
  const contrast = []
  for (const theme of ['light', 'dark']) {
    await api(page, '/settings', 'PATCH', { theme })
    await page.goto('/settings?section=appearance')
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme)
    const ratios = await page.evaluate(() => {
      const style = getComputedStyle(document.documentElement)
      const luminance = key => {
        const raw = style.getPropertyValue('--color-' + key).trim().slice(1)
        const hex = raw.length === 3 ? [...raw].map(value => value + value).join('') : raw
        const components = [0, 2, 4].map(index => parseInt(hex.slice(index, index + 2), 16) / 255).map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4)
        return components[0] * 0.2126 + components[1] * 0.7152 + components[2] * 0.0722
      }
      return [['text', 'surface', 4.5], ['text-muted', 'canvas', 4.5], ['text-muted', 'surface', 4.5], ['text-muted', 'surface-muted', 4.5], ['accent', 'surface', 4.5], ['accent', 'accent-soft', 4.5], ['on-accent', 'action', 4.5], ['on-danger', 'danger-fill', 4.5], ['warning', 'surface', 4.5], ['control-border', 'surface', 3], ['focus', 'surface', 3]].map(([fg, bg, minimum]) => {
        const a = luminance(fg), b = luminance(bg)
        return { fg, bg, minimum, ratio: (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05) }
      })
    })
    contrast.push({ theme, ratios })
    for (const value of ratios) expect(value.ratio, `${theme}: ${value.fg}/${value.bg}`).toBeGreaterThanOrEqual(value.minimum)
    await page.getByRole('button', { name: 'Menu', exact: true }).click()
    await page.getByRole('dialog', { name: 'LIFEMAXING', exact: true }).getByRole('button', { name: 'Sign out', exact: true }).click()
    const dialog = page.getByRole('dialog', { name: 'Sign out of this device?' })
    await expect(dialog.getByRole('button', { name: 'Stay signed in' })).toBeFocused()
    await capture(page, theme + '-logout', 375, browserName)
    await page.keyboard.press('Escape')
    await page.setViewportSize({ width: 1440, height: 1000 })
  }
  fs.writeFileSync(`${artifactRoot}/${browserName}/contrast.json`, JSON.stringify(contrast, null, 2))
  for (const route of ['/today', '/tasks', '/areas', '/settings?section=appearance', '/habits']) {
    await page.goto(route)
    await ready(page)
    await page.addStyleTag({ content: 'html { font-size: 200% !important; }' })
    await capture(page, 'text-200-' + route.slice(1).replace(/[^\w-]/g, '-'), 1440, browserName)
  }
  await api(page, '/settings', 'PATCH', { theme: 'light', density: 'normal' })
  await api(page, '/auth/logout', 'POST', {})
  await page.goto('/login')
  for (const language of ['en', 'nb', 'sv', 'da']) {
    await page.getByRole('combobox').first().selectOption(language)
    for (const theme of ['light', 'dark']) {
      await page.getByRole('combobox').last().selectOption(theme)
      await expect(page.locator('html')).toHaveAttribute('lang', language)
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme)
      await page.locator('button[type="submit"]').click()
      await expect(page.locator('input[type="email"]')).toHaveAttribute('aria-invalid', 'true')
      await capture(page, `login-${language}-${theme}`, theme === 'light' ? 1440 : 375, browserName)
    }
  }
})
