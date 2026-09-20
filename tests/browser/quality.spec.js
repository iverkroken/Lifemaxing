const { test, expect } = require('@playwright/test')
const fs = require('node:fs')
const root = `${process.env.VISUAL_ARTIFACT_ROOT || 'artifacts/quality-review'}/quality`

test.beforeEach(async ({ browserName }) => { fs.mkdirSync(`${root}/${browserName}`, { recursive: true }) })

async function login(page) {
  await page.goto('/login')
  await page.getByLabel('Email').fill(process.env.SMOKE_EMAIL)
  await page.getByLabel('Password', { exact: false }).fill(process.env.SMOKE_PASSWORD)
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await expect(page).toHaveURL(/\/today$/, { timeout: 15000 })
}

async function ready(page) {
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await expect(page.getByText(/^Loading.*|^Checking your workspace/)).toHaveCount(0)
  await page.evaluate(() => document.fonts.ready)
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

test('Today text scrolls naturally and never shows through the fixed navigation', async ({ page, browserName }) => {
  await login(page)
  for (const width of [1440, 1280, 1024, 768, 430, 390]) {
    await page.setViewportSize({ width, height: 844 })
    await page.goto('/today')
    await ready(page)
    const heading = page.getByRole('heading', { name: 'Today', exact: true })
    const before = await heading.boundingBox()
    const fontSize = await heading.evaluate(element => getComputedStyle(element).fontSize)
    const header = page.locator('header[data-artwork]')
    const headerBox = await header.boundingBox()
    await page.evaluate(y => scrollTo(0, y), before.y - headerBox.height + 12)
    const after = await heading.boundingBox()
    // Browser scrolling rounds to device pixels while layout can use half pixels.
    expect(Math.abs(after.y - (headerBox.height - 12))).toBeLessThanOrEqual(1)
    await expect(heading).toHaveCSS('font-size', fontSize)
    await page.screenshot({ path: `${root}/${browserName}/today-scroll-${width}.png` })
    await expect(header).toHaveAttribute('data-artwork', 'false')
    await page.evaluate(() => scrollTo(0, 0))
    await expect(header).toHaveAttribute('data-artwork', 'true')
  }
})

test('populated workspaces reflow at six widths with usable images, forms and navigation', async ({ page, browserName }) => {
  test.setTimeout(240000)
  await login(page)
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  const day = await api(page, '/today')
  const areas = await api(page, '/areas')
  const task = await api(page, '/tasks', 'POST', { title: 'Prepare the project review and identify the next useful step', plannedDate: day.localDate, priority: 'High', lifeAreaId: areas[0].id, estimateMinutes: 25 })
  await api(page, `/daily-mission/${day.localDate}`, 'PUT', { taskId: task.id })
  await api(page, '/habits', 'POST', { title: 'Read a few pages', pattern: 'Daily', effectiveFromDate: day.localDate, lifeAreaId: areas[0].id })
  const goal = await api(page, '/goals', 'POST', { title: 'Build a thoughtful portfolio of completed work', state: 'Active', targetValue: 12, baselineValue: 0, unit: 'projects', direction: 'Increase', lifeAreaId: areas[0].id })
  await api(page, `/goals/${goal.id}/progress`, 'POST', { value: 3, note: 'Recorded a first round of progress.' })
  const routes = ['/today', '/tasks', '/goals', '/habits', '/areas', '/progress', '/rewards', '/focus', '/inbox', '/activity', '/settings?section=appearance', `/goals/${goal.id}`, `/tasks/${task.id}`]
  for (const theme of ['light', 'dark']) {
    await api(page, '/settings', 'PATCH', { theme })
    for (const route of routes) {
      await page.goto(route)
      await ready(page)
      for (const width of [1440, 1280, 1024, 768, 430, 390]) {
        await page.setViewportSize({ width, height: 900 })
        await page.evaluate(() => scrollTo(0, 0))
        await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), { message: `${route}, ${theme}, ${width}` }).toBe(true)
        await expect.poll(() => page.locator('img:not([loading="lazy"])').evaluateAll(images => images.every(image => image.complete && image.naturalWidth > 0))).toBe(true)
        await expect(page.getByRole('button', { name: 'Menu', exact: true })).toBeInViewport()
        if (route === '/areas') {
          // Reachable first-card content matters more than an arbitrary hero height.
          const firstCard = page.locator('section[data-area]').first()
          const firstBox = await firstCard.boundingBox()
          expect(firstBox.y + firstBox.height).toBeLessThanOrEqual(900)
          for (const key of ['personal', 'home', 'fitness']) {
            const card = page.locator(`section[data-area="${key}"]`)
            await card.scrollIntoViewIfNeeded()
            await expect.poll(() => card.locator('img').evaluate(image => image.complete && image.naturalWidth > 0)).toBe(true)
            await card.screenshot({ path: `${root}/${browserName}/${theme}-${key}-${width}.png`, animations: 'disabled' })
          }
          await page.evaluate(() => scrollTo(0, 0))
        }
        if (['/today', '/tasks', '/goals', '/areas', '/progress', '/rewards', '/focus'].includes(route)) {
          await page.screenshot({ path: `${root}/${browserName}/${theme}-${route.slice(1)}-${width}.png`, animations: 'disabled' })
        }
      }
      if (route === '/today') {
        await page.getByRole('link', { name: 'Open your day' }).click()
        await expect(page.getByRole('region', { name: 'Daily Mission', exact: true })).toBeVisible()
        await page.screenshot({ path: `${root}/${browserName}/${theme}-today-workspace-390.png`, fullPage: true, animations: 'disabled' })
      }
    }
  }
  await api(page, '/settings', 'PATCH', { theme: 'light' })
  expect(errors).toEqual([])
})

test('small-screen menus, select keyboard controls and dialogs stay inside the viewport', async ({ page, browserName }) => {
  await login(page)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/today')
  await ready(page)
  const day = await api(page, '/today')
  await api(page, '/tasks', 'POST', { title: 'A planned action with a reachable menu', plannedDate: day.localDate })
  await page.reload()
  await ready(page)
  const menu = page.getByLabel('Task actions').last()
  await menu.click()
  const cancel = page.getByRole('button', { name: 'Cancel plan' }).last()
  const box = await cancel.boundingBox()
  expect(box.x).toBeGreaterThanOrEqual(0)
  expect(box.x + box.width).toBeLessThanOrEqual(390)
  await page.screenshot({ path: `${root}/${browserName}/task-menu-390.png` })
  await page.keyboard.press('Escape')
  await expect(cancel).not.toBeVisible()
  await expect(menu).toBeFocused()
  await page.goto('/tasks')
  await ready(page)
  const status = page.getByLabel('Task status')
  await status.focus()
  const customizablePicker = await page.evaluate(() => CSS.supports('appearance', 'base-select'))
  // Native OS popups do not receive Playwright keys in headless Firefox.
  // Its closed native select still supports keyboard selection.
  if (customizablePicker) await page.keyboard.press('Space')
  await page.screenshot({ path: `${root}/${browserName}/select-390.png` })
  await page.keyboard.press('ArrowDown')
  if (customizablePicker) await page.keyboard.press('Enter')
  await expect(status).toHaveValue('completed')
  await page.getByRole('button', { name: 'Capture a task', exact: true }).first().click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  const create = dialog.getByLabel('Create', { exact: true })
  await create.focus()
  if (customizablePicker) {
    await page.keyboard.press('Space')
    await page.keyboard.press('Escape')
  }
  await expect(dialog).toBeVisible()
  await page.screenshot({ path: `${root}/${browserName}/capture-390.png` })
  await page.keyboard.press('Escape')
  await expect(dialog).not.toBeVisible()
})

test('enlarged text, short landscape and reduced motion preserve scrolling and controls', async ({ page, browserName }) => {
  await login(page)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  for (const viewport of [{ width: 390, height: 844 }, { width: 844, height: 390 }]) {
    await page.setViewportSize(viewport)
    for (const route of ['/today', '/goals', '/areas', '/tasks', '/focus']) {
      await page.goto(route)
      await ready(page)
      await page.evaluate(() => { document.documentElement.style.fontSize = '200%' })
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
      const header = page.locator('header[data-artwork]')
      const brand = await header.getByRole('link', { name: 'LIFEMAXING' }).boundingBox()
      const search = await header.getByRole('button', { name: 'Search', exact: true }).boundingBox()
      expect(brand.x + brand.width).toBeLessThanOrEqual(search.x)
      if (route === '/today') {
        await page.getByRole('link', { name: 'Open your day' }).click()
        await expect(page.getByLabel('Plan date')).toBeVisible()
        await expect(header).toHaveAttribute('data-artwork', 'false')
      }
      await page.screenshot({ path: `${root}/${browserName}/large-text-${route.slice(1)}-${viewport.width}.png`, animations: 'disabled' })
    }
  }
})

test('session verification preserves scroll and drafts, and another tab signs out promptly', async ({ page, context }) => {
  await login(page)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/areas')
  await ready(page)
  await page.locator('section[data-area="home"]').scrollIntoViewIfNeeded()
  const before = await page.evaluate(() => ({ y: scrollY, height: document.documentElement.scrollHeight }))
  let release
  await page.route('**/api/v1/auth/me', async route => {
    await new Promise(resolve => { release = resolve })
    await route.continue()
  }, { times: 1 })
  await page.evaluate(() => dispatchEvent(new Event('focus')))
  await expect(page.getByText('Checking your session…')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Life Areas', exact: true })).not.toBeVisible()
  expect(await page.evaluate(() => ({ y: scrollY, height: document.documentElement.scrollHeight }))).toEqual(before)
  release()
  await ready(page)
  expect(await page.evaluate(() => scrollY)).toBe(before.y)

  await page.goto('/tasks/new')
  await ready(page)
  const title = page.getByRole('textbox', { name: /^Title/ })
  await title.fill('Unsaved fictional draft')
  const checked = page.waitForResponse(response => response.url().endsWith('/api/v1/auth/me'))
  await page.evaluate(() => dispatchEvent(new Event('focus')))
  await checked
  await expect(title).toBeVisible()
  await expect(title).toHaveValue('Unsaved fictional draft')

  await page.goto('/tasks')
  await ready(page)
  await page.getByRole('button', { name: 'Capture a task', exact: true }).first().click()
  const capture = page.getByRole('dialog', { name: 'Capture a task', exact: true })
  await capture.getByLabel('Task title').fill('A draft kept through a network failure')
  await page.route('**/api/v1/auth/me', route => route.fulfill({ status: 503, json: {} }), { times: 1 })
  await page.evaluate(() => dispatchEvent(new Event('focus')))
  await expect(page.getByRole('alert')).toContainText('We could not check your session')
  await expect(capture).not.toBeVisible()
  await page.getByRole('button', { name: 'Try again', exact: true }).click()
  await expect(capture).toBeVisible()
  await expect(capture.getByLabel('Task title')).toHaveValue('A draft kept through a network failure')
  await page.keyboard.press('Escape')
  await expect(capture).not.toBeVisible()

  const other = await context.newPage()
  try {
    await other.goto('/settings?section=security')
    await ready(other)
    await other.getByRole('button', { name: 'Sign out', exact: true }).click()
    await other.getByRole('dialog').getByRole('button', { name: 'Sign out', exact: true }).click()
    await expect(other).toHaveURL(/\/login$/)
    await expect(page).toHaveURL(/\/login/)
    await expect(page.getByRole('textbox', { name: /^Title/ })).toHaveCount(0)
  } finally {
    await other.close()
  }
})
