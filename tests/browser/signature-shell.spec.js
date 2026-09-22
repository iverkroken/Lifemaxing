const { test, expect } = require('@playwright/test')
const fs = require('node:fs')
const { navigateTo, captureTask } = require('./navigation-helpers.cjs')
const artifactRoot = process.env.VISUAL_ARTIFACT_ROOT ? `${process.env.VISUAL_ARTIFACT_ROOT}/signature` : 'artifacts/signature'

async function login(page) {
  await page.goto('/login')
  await page.getByLabel('Email').fill(process.env.SMOKE_EMAIL)
  await page.getByLabel('Password').fill(process.env.SMOKE_PASSWORD)
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await expect(page).toHaveURL(/\/today$/, { timeout: 20000 })
}
async function api(page, path, method = 'GET', body) {
  return page.evaluate(async ({ path, method, body }) => {
    const headers = { 'Content-Type': 'application/json' }
    if (method !== 'GET') headers['X-CSRF-TOKEN'] = (await (await fetch('/api/v1/auth/csrf')).json()).requestToken
    const response = await fetch('/api/v1' + path, { method, headers, ...(body && { body: JSON.stringify(body) }) })
    if (!response.ok) throw new Error(`${method} ${path}: ${response.status}`)
    return response.status === 204 ? null : response.json()
  }, { path, method, body })
}
async function capture(page, name, browserName) {
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await expect(page.getByText(/^Loading.*|^Checking your workspace/)).toHaveCount(0)
  await page.evaluate(() => document.fonts.ready)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), name).toBe(true)
  await page.screenshot({ path: `${artifactRoot}/${browserName}/${name}.png`, fullPage: true, animations: 'disabled' })
}

test('production artwork shell, both densities and themes, reflow and contrast', async ({ page, browserName }) => {
  test.setTimeout(240000)
  fs.mkdirSync(`${artifactRoot}/${browserName}`, { recursive: true })
  await login(page)
  const results = []
  for (const theme of ['light', 'dark']) for (const density of ['normal', 'compact']) {
    await api(page, '/settings', 'PATCH', { theme, density })
    for (const width of [320, 390, 768, 1280, 1440, 1920]) {
      await page.setViewportSize({ width, height: 1000 })
      for (const route of ['/today', '/settings?section=appearance']) {
        await page.goto(route)
        await expect(page.locator('html')).toHaveAttribute('data-theme', theme)
        await expect(page.locator('html')).toHaveAttribute('data-density', density)
        await capture(page, `${theme}-${density}-${route.includes('settings') ? 'settings' : 'today'}-${width}`, browserName)
        expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe(theme === 'dark' ? 'rgb(16, 24, 38)' : 'rgb(247, 244, 237)')
        // The shared primary controls keep a practical touch target in compact too.
        const dimensions = await page.locator('button[class*="_button_"]:visible').evaluateAll(buttons => buttons.map(button => button.getBoundingClientRect().height))
        expect(dimensions.every(height => height >= 44)).toBe(true)
        if (width === 320 && route === '/today') {
          // Keep room for the localized native date segments and picker indicator.
          expect((await page.getByLabel('Plan date', { exact: true }).boundingBox()).width).toBeGreaterThanOrEqual(180)
        }
      }
    }
    const ratios = await page.evaluate(() => {
      const style = getComputedStyle(document.documentElement)
      const luminance = key => {
        const raw = style.getPropertyValue('--color-' + key).trim().slice(1)
        const hex = raw.length === 3 ? [...raw].map(value => value + value).join('') : raw
        const c = [0, 2, 4].map(index => parseInt(hex.slice(index, index + 2), 16) / 255).map(v => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)
        return c[0] * 0.2126 + c[1] * 0.7152 + c[2] * 0.0722
      }
      const pairs = []
      for (const bg of ['canvas', 'sidebar', 'surface', 'surface-muted', 'raised', 'selected', 'hover', 'selected-hover']) {
        for (const fg of ['text', 'text-muted', 'accent', 'danger', 'warning', 'success', 'text-secondary', 'info', 'brand-bronze', 'area-blue-mark', 'area-sand-mark', 'area-rose-mark', 'area-sage-mark']) pairs.push([fg, bg, 4.5])
        for (const fg of ['focus', 'control-border']) pairs.push([fg, bg, 3])
      }
      pairs.push(['success', 'success-soft', 4.5], ['danger', 'danger-soft', 4.5], ['info', 'info-soft', 4.5], ['warning', 'warning-soft', 4.5], ['on-accent', 'action', 4.5], ['on-accent', 'action-hover', 4.5], ['on-accent', 'action-pressed', 4.5], ['on-danger', 'danger-fill', 4.5], ['on-danger', 'danger-hover', 4.5], ['on-success', 'success', 4.5], ['area-ink', 'area-blue', 4.5], ['area-ink', 'area-sand', 4.5], ['area-ink', 'area-rose', 4.5], ['area-ink', 'area-sage', 4.5])
      return pairs.map(([fg, bg, minimum]) => ({ fg, bg, minimum, ratio: (Math.max(luminance(fg), luminance(bg)) + 0.05) / (Math.min(luminance(fg), luminance(bg)) + 0.05) }))
    })
    results.push({ theme, density, ratios })
    for (const pair of ratios) expect(pair.ratio, `${theme} ${pair.fg}/${pair.bg}`).toBeGreaterThanOrEqual(pair.minimum)
    for (const route of ['/today', '/tasks', '/areas', '/settings?section=appearance', '/settings?section=security', '/progress']) {
      await page.goto(route)
      await page.evaluate(() => { document.documentElement.style.fontSize = '200%' })
      await page.setViewportSize({ width: 1440, height: 1000 })
      await capture(page, `${theme}-${density}-text200-${route.slice(1).replace(/[^\w-]/g, '-')}`, browserName)
    }
    // Full navigation overlays the page and can scroll on a short desktop.
    await page.goto('/today')
    await page.setViewportSize({ width: 1440, height: 540 })
    await expect(page.getByRole('dialog', { name: 'LIFEMAXING', exact: true })).not.toBeVisible()
    await page.getByRole('button', { name: 'Menu', exact: true }).click()
    const drawer = page.getByRole('dialog', { name: 'LIFEMAXING', exact: true })
    await drawer.getByRole('button', { name: 'Sign out', exact: true }).scrollIntoViewIfNeeded()
    await expect(drawer.getByRole('button', { name: 'Sign out', exact: true })).toBeInViewport()
    await page.screenshot({ path: `${artifactRoot}/${browserName}/${theme}-${density}-short-desktop.png`, fullPage: true })
    await page.keyboard.press('Escape')
  }
  fs.writeFileSync(`${artifactRoot}/${browserName}/contrast.json`, JSON.stringify(results, null, 2))
  await api(page, '/settings', 'PATCH', { theme: 'light', density: 'normal' })
})

test('command keyboard, appearance failure, prepaint and safe logout retry', async ({ page, browserName }) => {
  test.setTimeout(90000)
  await login(page)
  await page.setViewportSize({ width: 1440, height: 1000 })
  const trigger = page.getByRole('button', { name: 'Search', exact: true })
  const menu = page.getByRole('button', { name: 'Menu', exact: true })
  const drawer = page.getByRole('dialog', { name: 'LIFEMAXING', exact: true })
  await expect(drawer).not.toBeVisible()
  await expect(page.getByRole('navigation', { name: 'Main navigation', exact: true }).getByRole('link', { name: 'Focus', exact: true })).toBeVisible()
  await menu.click()
  await expect(drawer.getByRole('link', { name: 'Activity', exact: true })).toBeVisible()
  await expect(drawer.getByRole('link', { name: 'Focus', exact: true })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(menu).toBeFocused()
  const shortcut = await page.evaluate(() => /Mac|iPhone|iPad/.test(navigator.platform) ? 'Meta+k' : 'Control+k')
  await page.keyboard.press(shortcut)
  const command = page.getByRole('dialog', { name: 'Search', exact: true })
  await command.getByRole('textbox').fill('Habits')
  await page.keyboard.press('ArrowDown')
  await expect(command.getByRole('button', { name: /Habits/ })).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/\/habits$/)
  await trigger.click()
  await command.getByRole('textbox').fill('no-such-action')
  await expect(command.getByRole('status')).toContainText('No matching actions')
  await page.keyboard.press('Escape')
  await expect(trigger).toBeFocused()
  await page.goto('/settings?section=appearance')
  await page.route('**/api/v1/settings', route => route.request().method() === 'PATCH' ? route.fulfill({ status: 503, contentType: 'application/problem+json', body: '{}' }) : route.continue())
  await page.getByRole('radio', { name: 'Dark', exact: true }).check()
  await expect(page.getByRole('status')).toContainText('could not be saved')
  expect((await api(page, '/settings')).theme).toBe('light')
  await page.unroute('**/api/v1/settings')
  await page.getByRole('button', { name: 'Try again', exact: true }).click()
  await expect(page.getByRole('status')).toContainText('Settings saved.')
  // With the React entry delayed, synchronous display memory still sets the correct theme.
  await page.route('**/assets/*.js', route => route.abort())
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe('rgb(16, 24, 38)')
  await page.unroute('**/assets/*.js')
  await page.reload()
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  for (const everywhere of [false, true]) {
    await page.goto('/settings?section=security')
    const name = everywhere ? 'Sign out everywhere' : 'Sign out'
    const dialogName = everywhere ? 'Sign out on all devices?' : 'Sign out of this device?'
    const endpoint = everywhere ? '/auth/logout-everywhere' : '/auth/logout'
    let requests = 0
    const listener = request => { if (request.url().endsWith(endpoint) && request.method() === 'POST') requests++ }
    page.on('request', listener)
    const opener = page.getByRole('button', { name, exact: true }).last()
    await opener.click()
    const dialog = page.getByRole('dialog', { name: dialogName })
    await expect(dialog.getByRole('button', { name: 'Stay signed in' })).toBeFocused()
    await page.keyboard.press('Escape')
    await opener.click()
    await dialog.getByRole('button', { name: 'Stay signed in' }).click()
    expect(requests).toBe(0)
    await opener.click()
    await page.route('**/api/v1' + endpoint, async route => {
      await new Promise(resolve => setTimeout(resolve, 300))
      await route.fulfill({ status: 503, contentType: 'application/problem+json', body: '{}' })
    })
    await dialog.getByRole('button', { name, exact: true }).evaluate(button => { button.click(); button.click() })
    await expect(dialog.getByRole('alert')).toBeVisible()
    expect(requests).toBe(1)
    expect((await api(page, '/auth/me')).email).toBe(process.env.SMOKE_EMAIL)
    await capture(page, `${everywhere ? 'everywhere' : 'device'}-logout-retry`, browserName)
    await page.unroute('**/api/v1' + endpoint)
    await dialog.getByRole('button', { name, exact: true }).click()
    await expect(page).toHaveURL(/\/login$/)
    expect(requests).toBe(2)
    page.off('request', listener)
    await login(page)
  }
  await api(page, '/settings', 'PATCH', { theme: 'light', density: 'normal' })
})


test('mobile daily hierarchy, routine views, settings back and contextual editing', async ({ page, browserName }) => {
  await login(page)
  await page.setViewportSize({ width: 375, height: 900 })
  await page.goto('/today')
  const habits = page.locator('details').filter({ has: page.locator('summary', { hasText: "Today's habits" }) })
  const tasks = page.getByRole('region', { name: 'Daily commitments', exact: true })
  await expect(habits).toBeVisible()
  await page.evaluate(() => document.fonts.ready)
  await page.screenshot({ path: artifactRoot + '/' + browserName + '/mobile-today-viewport.png' })
  expect((await habits.boundingBox()).y).toBeLessThan((await tasks.boundingBox()).y)
  await navigateTo(page, 'Habits')
  await expect(page.getByRole('region', { name: 'Habits today', exact: true })).toBeVisible()
  await page.getByRole('navigation', { name: 'Habit views' }).getByRole('button', { name: 'Your routines' }).click()
  const library = page.getByRole('region', { name: 'Habit library' })
  await expect(library).toBeVisible()
  await library.getByLabel('Life Area filter').selectOption({ index: 1 })
  await library.getByLabel('Life Area filter').selectOption('')
  await expect(library).toBeVisible()
  await page.reload()
  await expect(library).toBeVisible()
  await page.goto('/settings')
  await page.getByRole('navigation', { name: 'Settings sections' }).getByRole('button', { name: 'Appearance', exact: true }).click()
  await expect(page.getByRole('radio', { name: 'Dark', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Settings sections', exact: true }).click()
  await expect(page.getByRole('navigation', { name: 'Settings sections' })).toBeVisible()
  await page.screenshot({ path: artifactRoot + '/' + browserName + '/mobile-settings-overview.png' })
  await page.goto('/areas')
  const editArea = page.getByRole('button', { name: /^Edit Life Area:/ }).first()
  await editArea.click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(editArea).toBeFocused()
  await page.goto('/today')
  const menu = page.getByLabel('Task actions', { exact: true }).first()
  await menu.click()
  await expect(page.getByRole('button', { name: 'Cancel plan', exact: true })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(menu).toBeFocused()
  await expect(page.getByRole('button', { name: 'Cancel plan', exact: true })).not.toBeVisible()
})

test('Joint lockup, hidden native scrollbars and forced-color navigation', async ({ page, browserName }) => {
  test.setTimeout(60000)
  const expectHiddenScrollbar = async container => {
    await expect(container).toHaveCSS('scrollbar-gutter', 'auto')
    await expect(container).toHaveCSS('scrollbar-width', 'none')
    expect(await container.evaluate(element => [...document.styleSheets].some(sheet =>
      [...sheet.cssRules].some(rule => rule.selectorText && element.matches(rule.selectorText) && rule.style.scrollbarWidth === 'none')
    ))).toBe(true)
  }
  await login(page)
  await page.setViewportSize({ width: 1440, height: 540 })
  const brand = page.locator('header[data-artwork]').getByRole('link', { name: 'LIFEMAXING', exact: true })
  await expect(brand).toHaveCSS('gap', '12px')
  await expect(brand).toHaveCSS('font-size', '14px')
  await expect(brand).toHaveCSS('font-weight', '500')
  await expect(brand.locator('svg')).toHaveAttribute('width', '20')
  await expect(brand.locator('svg')).toHaveAttribute('aria-hidden', 'true')
  await expectHiddenScrollbar(page.locator('html'))
  await page.mouse.move(200, 300)
  await page.mouse.wheel(0, 500)
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(0)
  await page.getByRole('button', { name: 'Menu', exact: true }).click()
  const drawer = page.getByRole('dialog', { name: 'LIFEMAXING', exact: true })
  await expectHiddenScrollbar(drawer)
  await drawer.evaluate(el => { el.scrollTop = 0 })
  await drawer.hover()
  await page.mouse.wheel(0, 500)
  await expect.poll(() => drawer.evaluate(el => el.scrollTop)).toBeGreaterThan(0)
  await page.screenshot({ path: `${artifactRoot}/${browserName}/hidden-drawer-scroll.png` })
  await page.keyboard.press('Escape')

  // Rasterize the actual production SVG at native sizes, including both monochromes.
  // Each approved part must survive as a separate visible component at every size.
  const proof = await brand.locator('svg').evaluate(async svg => {
    const results = []
    const sheet = document.createElement('canvas')
    sheet.width = 320; sheet.height = 120
    const sheetContext = sheet.getContext('2d')
    for (const [row, color] of ['#000000', '#ffffff'].entries()) for (const [column, size] of [16, 20, 24, 32].entries()) {
      const clone = svg.cloneNode(true)
      clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
      clone.setAttribute('width', size); clone.setAttribute('height', size); clone.setAttribute('fill', color)
      const image = new Image()
      image.src = 'data:image/svg+xml,' + encodeURIComponent(new XMLSerializer().serializeToString(clone))
      await image.decode()
      const canvas = document.createElement('canvas'); canvas.width = size; canvas.height = size
      const context = canvas.getContext('2d'); context.drawImage(image, 0, 0)
      const pixels = context.getImageData(0, 0, size, size).data
      const seen = new Set(); let components = 0
      for (let index = 0; index < size * size; index++) {
        if (seen.has(index) || pixels[index * 4 + 3] < 128) continue
        components++
        const queue = [index]; seen.add(index)
        while (queue.length) {
          const current = queue.pop(), x = current % size, y = Math.floor(current / size)
          for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const nx = x + dx, ny = y + dy, next = ny * size + nx
            if (nx >= 0 && nx < size && ny >= 0 && ny < size && !seen.has(next) && pixels[next * 4 + 3] >= 128) { seen.add(next); queue.push(next) }
          }
        }
      }
      results.push({ size, color, components })
      sheetContext.fillStyle = row ? '#181e22' : '#fffefa'
      sheetContext.fillRect(column * 80, row * 60, 80, 60)
      sheetContext.drawImage(canvas, column * 80 + 20, row * 60 + 14)
    }
    return { results, png: sheet.toDataURL().split(',')[1] }
  })
  for (const item of proof.results) expect(item.components, `${item.color} ${item.size}px Joint`).toBe(2)
  fs.writeFileSync(`${artifactRoot}/${browserName}/joint-native-proof.png`, Buffer.from(proof.png, 'base64'))
  await page.emulateMedia({ forcedColors: 'active' })
  await expectHiddenScrollbar(page.locator('html'))
  await brand.focus()
  await expect(brand).toHaveCSS('outline-style', 'solid')
  await page.screenshot({ path: `${artifactRoot}/${browserName}/forced-colors.png` })
  await page.emulateMedia({ forcedColors: 'none' })
  for (const width of [1199, 1200]) {
    await page.setViewportSize({ width, height: 900 })
    const mainNavigation = page.getByRole('navigation', { name: 'Main navigation', exact: true })
    if (width === 1199) await expect(mainNavigation).not.toBeVisible()
    else await expect(mainNavigation).toBeVisible()
    await expect(page.getByRole('button', { name: 'Menu', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Search', exact: true })).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  }
  await page.setViewportSize({ width: 1440, height: 400 })
  await page.goto('/tasks?search=Review')
  const row = page.locator('[data-task-link]').first()
  await row.click()
  const panel = page.getByRole('complementary', { name: 'Task details' })
  await expectHiddenScrollbar(panel)
  await panel.getByRole('button', { name: 'Save task', exact: true }).scrollIntoViewIfNeeded()
  expect(await panel.evaluate(el => el.scrollTop)).toBeGreaterThan(0)
  await page.screenshot({ path: `${artifactRoot}/${browserName}/hidden-panel-scroll.png` })
  await panel.getByRole('button', { name: 'Back to list' }).click()
  await expect(row).toBeFocused()
  const captureTrigger = page.getByRole('button', { name: 'Capture a task', exact: true }).first()
  await captureTask(page)
  const dialog = page.getByRole('dialog', { name: 'Capture a task' })
  await dialog.getByText('More details', { exact: true }).click()
  await expectHiddenScrollbar(dialog)
  await dialog.getByRole('button', { name: 'Add to Inbox', exact: true }).scrollIntoViewIfNeeded()
  expect(await dialog.evaluate(el => el.scrollTop)).toBeGreaterThan(0)
  await page.screenshot({ path: `${artifactRoot}/${browserName}/hidden-dialog-scroll.png` })
  await page.keyboard.press('Escape')
  await expect(captureTrigger).toBeFocused()
})


test('task workspace scales through 0, 3, 30 and 300 real filtered tasks', async ({ page, browserName }) => {
  test.setTimeout(120000)
  await login(page)
  const prefix = 'Scale review ' + Date.now()
  let created = 0
  for (const count of [0, 3, 30, 300]) {
    // Only the disposable test account is populated; production never receives fixtures.
    while (created < count) {
      await api(page, '/tasks', 'POST', { title: prefix + ' task ' + (++created), priority: 'Normal' })
    }
    await page.goto('/tasks?search=' + encodeURIComponent(prefix))
    await expect.poll(async () => (await api(page, '/tasks?search=' + encodeURIComponent(prefix))).total).toBe(count)
    const { pageSize } = await api(page, '/tasks?search=' + encodeURIComponent(prefix))
    await expect(page.locator('[data-task-link]')).toHaveCount(Math.min(count, pageSize))
    for (const width of [390, 1440]) {
      await page.setViewportSize({ width, height: 900 })
      await capture(page, `tasks-scale-${count}-${width}`, browserName)
    }
    if (count > pageSize) {
      await page.getByRole('navigation', { name: 'List pages' }).getByRole('button', { name: 'Next', exact: true }).click()
      await expect(page).toHaveURL(/page=2/)
      await expect(page.locator('[data-task-link]')).toHaveCount(Math.min(count - pageSize, pageSize))
    }
  }
})
