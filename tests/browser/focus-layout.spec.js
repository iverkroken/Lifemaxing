const { test, expect } = require('@playwright/test')
const AxeBuilder = require('@axe-core/playwright').default
const fs = require('node:fs')
const root = process.env.VISUAL_ARTIFACT_ROOT || 'artifacts/focus-layout'

// Layout fixtures exercise the real app shell without creating or migrating accounts.
async function openFocus(page, { state, phase = 'Focus', language = 'en', failure = false } = {}) {
  const { defaultPreferences } = await import('../../client/src/features/focus/timeTools.js')
  let run = state ? { id: 'layout-run', controllerId: 'layout-controller', state, phase, revision: 1, periodIndex: 0,
    configuration: { method: 'Pomodoro' }, sessionNumber: 1, remainingSeconds: 1500, periodSeconds: 1500,
    endsAtUtc: new Date(Date.now() + 1500000).toISOString(), serverNow: new Date().toISOString(),
    reference: { taskId: 'layout-task' }, currentReference: { taskId: 'layout-task' }, nextPeriod: { phase: phase === 'Focus' ? 'Break' : 'Focus', seconds: 300 } } : null
  await page.addInitScript(() => sessionStorage.setItem('lifemaxing.time.layout-user.controller', JSON.stringify({ id: 'layout-controller' })))
  const cities = ['Europe/London', 'America/New_York', 'Asia/Tokyo', 'Australia/Sydney', 'Europe/Paris', 'Asia/Singapore', 'America/Chicago', 'America/Los_Angeles', 'Europe/Berlin', 'Pacific/Auckland', 'Asia/Dubai', 'America/Toronto']
    .map((timeZoneId, index) => ({ id: `city-${index}`, name: timeZoneId.split('/')[1].replaceAll('_', ' '), timeZoneId }))
  await page.route('**/api/v1/**', async route => {
    const path = new URL(route.request().url()).pathname.replace('/api/v1', '')
    let body = { items: [], total: 0 }
    if (path === '/auth/me') body = { id: 'layout-user', email: 'layout@example.test', displayName: 'Layout Test' }
    if (path === '/auth/csrf') body = { requestToken: 'layout-token' }
    if (path === '/settings') body = { theme: 'dark', uiLanguage: language, locale: 'en-GB', timeZoneId: 'Europe/London' }
    if (path === '/today') body = { tasks: [], habits: [], goals: [] }
    if (path === '/areas') body = []
    if (path === '/tasks/layout-task') body = { id: 'layout-task', title: 'Prepare customer interviews and review the research notes for the upcoming university project', priority: 'High' }
    if (path === '/focus-runs/active') body = { run }
    if (path === '/focus-sessions/active') body = { session: null }
    if (path === '/focus-preferences') body = { ...defaultPreferences, soundEnabled: false, worldClockInitialized: true }
    if (path === '/focus-summary') body = { todaySeconds: 4680, yesterdaySeconds: 2520, streakDays: 4, sessions: 3, weekSeconds: 10000 }
    if (path === '/world-clock') body = cities
    if (path === '/focus-runs/layout-run/action') {
      const action = route.request().postDataJSON()
      if (action.action === 'stop' && action.completeTask) {
        body = { ...run, state: 'Ended', endedAtUtc: new Date().toISOString(), progression: { xpChange: 5, levelUp: false } }
        run = null
      } else body = run
    }
    if (failure && path === '/focus-summary') return route.fulfill({ status: 503, json: { title: 'Summary unavailable' } })
    await route.fulfill({ json: body })
  })
  await page.goto('/focus')
  await expect(page.getByRole('tab', { name: 'Focus', exact: true })).toBeVisible()
  if (!failure) await expect(page.getByRole('progressbar')).toBeVisible()
  await page.evaluate(() => document.fonts.ready)
}

async function fitsWithoutScrolling(page, height) {
  const dimensions = await page.evaluate(() => ({ document: document.documentElement.scrollHeight, viewport: innerHeight,
    blocks: [...document.querySelector('[role="tabpanel"]').parentElement.children].map(el => ({ tag: el.tagName, height: el.getBoundingClientRect().height, bottom: el.getBoundingClientRect().bottom })) }))
  expect(dimensions.document, JSON.stringify(dimensions)).toBeLessThanOrEqual(height + 1)
  const panel = await page.getByRole('tabpanel').boundingBox()
  const progress = await page.getByRole('region', { name: 'Daily focus progress' }).boundingBox()
  expect(panel.y + panel.height).toBeLessThanOrEqual(progress.y)
  for (const control of await page.getByRole('tabpanel').locator('button:visible').all()) {
    if (await control.evaluate(el => Boolean(el.closest('ul, ol')))) continue
    const bounds = await control.boundingBox()
    expect(bounds.y + bounds.height).toBeLessThanOrEqual(progress.y)
  }
  const heading = await page.getByRole('heading', { name: 'Focus', exact: true }).boundingBox()
  const header = await page.locator('header[data-artwork]').boundingBox()
  expect(heading.y).toBeGreaterThanOrEqual(header.y + header.height)
  for (const locator of [page.getByRole('tablist'), page.getByRole('region', { name: 'Daily focus progress' }), page.getByRole('button', { name: 'Focus history' })]) {
    const bounds = await locator.boundingBox()
    expect(bounds.y + bounds.height).toBeLessThanOrEqual(height)
  }
  await page.mouse.move(1100, 600)
  await page.mouse.wheel(0, 1000)
  await page.waitForTimeout(150)
  expect(await page.evaluate(() => scrollY)).toBe(0)
  await expect(page.locator('header[data-artwork]')).toHaveAttribute('data-artwork', 'true')
}

for (const [width, height] of [[1920, 1080], [1366, 768]]) {
  test(`Focus layout keeps all four modes inside ${width}x${height}`, async ({ page, browserName }) => {
    await page.setViewportSize({ width, height })
    await openFocus(page)
    fs.mkdirSync(root, { recursive: true })
    for (const mode of ['Focus', 'Timer', 'Stopwatch', 'World Clock']) {
      await page.getByRole('tab', { name: mode, exact: true }).click()
      await fitsWithoutScrolling(page, height)
      if (mode === 'Stopwatch') {
        await page.getByRole('button', { name: 'Start stopwatch' }).click()
        for (let i = 0; i < 30; i++) await page.getByRole('button', { name: 'Lap', exact: true }).click()
        await fitsWithoutScrolling(page, height)
        await assertInternalScroll(page, page.getByRole('list', { name: 'Laps' }))
      }
      if (mode === 'World Clock') await assertInternalScroll(page, page.getByRole('list', { name: 'World Clock' }))
      await page.screenshot({ path: `${root}/${browserName}-${width}-${mode.replaceAll(' ', '-')}.png`, fullPage: true })
    }
    const image = page.locator('img[src="/images/Background%20upgrade.png"]')
    await expect(image).toBeVisible()
    expect(await image.evaluate(el => [el.naturalWidth, el.naturalHeight])).toEqual([1672, 941])
    const bounds = await image.boundingBox()
    expect(Math.abs(bounds.width - width)).toBeLessThan(1)
    expect(Math.abs(bounds.height - height)).toBeLessThan(1)
    expect(await page.locator('img[src*="Odessey"]').count()).toBe(0)
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
  })
}

async function assertInternalScroll(page, list) {
  await expect(list).toBeVisible()
  expect(await list.evaluate(el => el.scrollHeight > el.clientHeight)).toBe(true)
  await list.focus()
  await page.keyboard.press('End')
  await expect.poll(() => list.evaluate(el => el.scrollTop)).toBeGreaterThan(0)
  await list.hover()
  await page.mouse.wheel(0, 10000)
  await page.waitForTimeout(150)
  expect(await page.evaluate(() => scrollY)).toBe(0)
}

test('Focus active, paused and ready states fit with a selected item', async ({ page }) => {
  test.setTimeout(60000)
  for (const state of ['Running', 'Paused', 'Ready']) for (const phase of ['Focus', 'Break']) {
    await page.unrouteAll()
    await page.setViewportSize({ width: 1366, height: 768 })
    await openFocus(page, { state, phase })
    await expect(page.getByText('Prepare customer interviews and review the research notes for the upcoming university project', { exact: true })).toBeVisible()
    for (const [width, height] of [[1920, 1080], [1366, 768]]) {
      await page.setViewportSize({ width, height })
      for (const mode of ['Focus', 'Timer', 'Stopwatch', 'World Clock']) {
        await page.getByRole('tab', { name: mode, exact: true }).click()
        await fitsWithoutScrolling(page, height)
      }
    }
  }
})

test('Smart and custom configuration stay compact and dialogs do not grow Focus', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 })
  await openFocus(page)
  await page.getByRole('button', { name: 'Smart Focus Suggested rhythm' }).click()
  await fitsWithoutScrolling(page, 768)
  await page.getByRole('button', { name: 'Custom Your rhythm' }).click()
  await expect(page.getByRole('dialog', { name: 'Focus settings' })).toBeVisible()
  await page.keyboard.press('Escape')
  await fitsWithoutScrolling(page, 768)
  await page.getByRole('tab', { name: 'Timer', exact: true }).click()
  await page.getByRole('button', { name: 'Custom', exact: true }).click()
  await fitsWithoutScrolling(page, 768)
  await page.getByRole('button', { name: 'Set duration' }).click()
  await page.getByRole('button', { name: 'Start timer' }).click()
  await fitsWithoutScrolling(page, 768)
  await page.getByRole('button', { name: 'Pause', exact: true }).click()
  await fitsWithoutScrolling(page, 768)
})

test('task completion feedback does not add height below Focus', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 })
  await openFocus(page, { state: 'Paused' })
  await page.getByRole('button', { name: 'Session actions' }).click()
  await page.getByRole('button', { name: 'Complete task & finish' }).click()
  await expect(page.getByRole('dialog')).not.toBeVisible()
  await expect(page.getByText('Session recorded.', { exact: true })).toBeVisible()
  await fitsWithoutScrolling(page, 768)
})

test('Focus reflows for mobile, short windows, enlarged text and errors', async ({ page }) => {
  await openFocus(page, { failure: true })
  for (const [width, height, fontSize] of [[390, 844, '16px'], [1366, 500, '16px'], [1366, 768, '32px'], [683, 384, '16px']]) {
    await page.setViewportSize({ width, height })
    await page.evaluate(size => { document.documentElement.style.fontSize = size }, fontSize)
    await page.getByRole('button', { name: 'Start focus', exact: true }).scrollIntoViewIfNeeded()
    await expect(page.getByRole('button', { name: 'Start focus', exact: true })).toBeInViewport()
    await page.getByRole('button', { name: 'Focus history' }).click()
    await expect(page.getByRole('dialog', { name: 'Focus history' })).toBeVisible()
    await page.keyboard.press('Escape')
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width)
  }
})

test('enlarged text remains reachable without an error state', async ({ page, browserName }) => {
  await openFocus(page)
  await page.setViewportSize({ width: 1366, height: 768 })
  await page.evaluate(() => { document.documentElement.style.fontSize = '32px' })
  await page.getByRole('button', { name: 'Focus history' }).scrollIntoViewIfNeeded()
  await expect(page.getByRole('button', { name: 'Focus history' })).toBeInViewport()
  const progress = await page.getByRole('region', { name: 'Daily focus progress' }).boundingBox()
  const selection = await page.getByRole('region', { name: 'Focusing on' }).boundingBox()
  expect(selection.y + selection.height).toBeLessThanOrEqual(progress.y)
  await page.evaluate(() => { document.documentElement.style.fontSize = '' })
  await page.setViewportSize({ width: 390, height: 844 })
  for (const mode of ['Focus', 'Timer', 'Stopwatch', 'World Clock']) {
    await page.getByRole('tab', { name: mode, exact: true }).click()
    await page.screenshot({ path: `${root}/${browserName}-mobile-${mode.replaceAll(' ', '-')}.png`, fullPage: true })
  }
})
