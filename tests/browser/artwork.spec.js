const { test, expect } = require('@playwright/test')
const fs = require('node:fs')
const root = `${process.env.VISUAL_ARTIFACT_ROOT || 'artifacts/artwork-review'}/artwork`

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
async function theme(page, value) {
  await page.goto('/settings?section=appearance')
  await page.getByRole('radio', { name: value, exact: true }).check()
  await expect(page.locator('html')).toHaveAttribute('data-theme', value.toLowerCase())
}

test('Life Area layout drafts support moving, cancel, save failures and persistence', async ({ page, browserName }) => {
  await login(page)
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/areas')
  await ready(page)
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  const cards = page.locator('section[data-area]')
  const order = () => cards.evaluateAll(nodes => nodes.map(node => node.dataset.area))
  const original = await order()
  const edit = () => page.getByRole('button', { name: 'Customize layout' }).click()
  const personal = page.locator('section[data-area="personal"]')
  await edit()
  for (const position of [6, 3, 0]) {
    const earlier = personal.getByRole('button', { name: 'Move earlier' })
    await earlier.focus()
    await page.keyboard.press('Enter')
    await expect.poll(async () => (await order()).indexOf('personal')).toBe(position)
  }
  await expect(personal.getByRole('button', { name: 'Move earlier' })).toBeDisabled()
  await page.getByRole('button', { name: 'Cancel', exact: true }).click()
  expect(await order()).toEqual(original)
  await expect(page.getByRole('button', { name: 'Customize layout' })).toBeFocused()
  await edit()
  for (let i = 0; i < 3; i++) await personal.getByRole('button', { name: 'Move earlier' }).click()
  const draft = await order()
  await page.route('**/api/v1/areas/order', route => route.fulfill({ status: 503, contentType: 'application/problem+json', body: JSON.stringify({ title: 'Temporary test failure' }) }), { times: 1 })
  await page.getByRole('button', { name: 'Save layout' }).click()
  await expect(page.getByRole('alert')).toContainText('Layout not saved')
  expect(await order()).toEqual(draft)
  await page.route('**/api/v1/areas/order', route => route.fulfill({ status: 404, contentType: 'application/problem+json', body: JSON.stringify({ title: 'Not found' }) }), { times: 1 })
  await page.getByRole('button', { name: 'Save layout' }).click()
  await expect(page.getByRole('alert')).toContainText('running API')
  expect(await order()).toEqual(draft)
  await page.getByRole('button', { name: 'Save layout' }).click()
  await expect(page.getByRole('button', { name: 'Customize layout' })).toBeVisible()
  await page.reload()
  await ready(page)
  expect(await order()).toEqual(draft)
  fs.mkdirSync(`${root}/${browserName}`, { recursive: true })
  for (const width of [1920, 1440, 1024, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 900 })
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await expect(personal.locator('img')).toBeVisible()
    if (width >= 1200) {
      const wide = await personal.boundingBox()
      const normal = await page.locator('section[data-area="fitness"]').boundingBox()
      expect(wide.width).toBeGreaterThan(normal.width * 2.9)
    }
    await edit()
    await expect(personal.getByRole('button', { name: 'Move later' })).toBeVisible()
    await page.evaluate(() => scrollTo(0, 0))
    if ([1440, 390].includes(width)) await page.screenshot({ path: `${root}/${browserName}/areas-layout-${width}.png`, fullPage: true })
    await page.getByRole('button', { name: 'Cancel', exact: true }).click()
  }
  // Put the fixture back so later image tests still exercise the original design.
  await edit()
  for (let i = 0; i < 3; i++) await personal.getByRole('button', { name: 'Move later' }).click()
  await page.getByRole('button', { name: 'Save layout' }).click()
  await expect(page.getByRole('button', { name: 'Customize layout' })).toBeVisible()
  expect(await order()).toEqual(original)
  expect(errors).toEqual([])
})

test('Life Area filters keep saved order separate and survive reload', async ({ page, browserName }) => {
  await login(page)
  await page.goto('/areas')
  await ready(page)
  const rows = await page.evaluate(async () => (await fetch('/api/v1/areas')).json())
  const fixture = rows.map((area, index) => ({ id: area.id, tasks: index === 0 ? 3 : 0, goals: index === 1 ? 2 : 0, habits: index === 2 ? 1 : 0 }))
  await page.route('**/api/v1/areas/counts', route => route.fulfill({ json: fixture }))
  await page.reload()
  await ready(page)
  const cards = page.locator('section[data-area]')
  const original = await cards.evaluateAll(nodes => nodes.map(node => node.dataset.area))
  await page.getByRole('button', { name: 'Filter', exact: true }).click()
  const sort = page.getByLabel('Sort by', { exact: true })
  for (const [kind, index] of [['tasks', 0], ['goals', 1], ['habits', 2]]) {
    await sort.selectOption(`${kind}-desc`)
    await expect(cards.first()).toHaveAttribute('data-area', rows[index].key)
    await sort.selectOption(`${kind}-asc`)
    await expect(cards.last()).toHaveAttribute('data-area', rows[index].key)
  }
  await expect(page.locator('section[data-area="personal"]')).not.toHaveAttribute('data-layout', 'wide')
  await page.getByLabel('Content', { exact: true }).selectOption('filled')
  await expect(cards).toHaveCount(3)
  await page.reload()
  await ready(page)
  await expect(cards).toHaveCount(3)
  await page.getByRole('button', { name: /^Filter/ }).click()
  await expect(page.getByLabel('Content', { exact: true })).toHaveValue('filled')
  await page.getByLabel('Area status', { exact: true }).selectOption('inactive')
  await expect(cards).toHaveCount(0)
  await expect(page.getByText('No areas match these filters. Reset to see all areas.')).toBeVisible()
  await page.getByRole('region', { name: 'Filter' }).getByRole('button', { name: 'Reset' }).click()
  expect(await cards.evaluateAll(nodes => nodes.map(node => node.dataset.area))).toEqual(original)
  await expect(page.locator('section[data-area="personal"]')).toHaveAttribute('data-layout', 'wide')
  await page.getByLabel('Content', { exact: true }).selectOption('empty')
  await expect(cards).toHaveCount(7)
  await page.getByRole('button', { name: 'Customize layout' }).click()
  await expect(cards).toHaveCount(10)
  await expect(page).toHaveURL(/\/areas$/)
  await page.getByRole('button', { name: 'Cancel', exact: true }).click()
  expect(await cards.evaluateAll(nodes => nodes.map(node => node.dataset.area))).toEqual(original)
  for (const [width, mode] of [[1440, 'Light'], [390, 'Dark']]) {
    await theme(page, mode)
    await page.goto('/areas?sort=tasks-desc&content=filled')
    await ready(page)
    await page.setViewportSize({ width, height: 900 })
    await page.getByRole('button', { name: /^Filter/ }).click()
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.screenshot({ path: `${root}/${browserName}/areas-filters-${width}.png`, fullPage: true })
  }
  await page.unroute('**/api/v1/areas/counts')
  await page.route('**/api/v1/areas/counts', route => route.fulfill({ status: 503, json: { title: 'Unavailable' } }))
  await page.reload()
  await ready(page)
  await page.getByRole('button', { name: /^Filter/ }).click()
  await expect(page.locator('option[value="tasks-desc"]')).toBeDisabled()
  await expect(cards).toHaveCount(0)
  await page.getByRole('region', { name: 'Filter' }).getByRole('button', { name: 'Reset' }).click()
  await expect(cards).toHaveCount(10)
  await theme(page, 'Light')
})

test('Life Area layout pointer dragging reorders and Escape cancels', async ({ page }) => {
  await login(page)
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.goto('/areas')
  await ready(page)
  await page.getByRole('button', { name: 'Customize layout' }).click()
  const cards = page.locator('section[data-area]')
  const order = () => cards.evaluateAll(nodes => nodes.map(node => node.dataset.area))
  const original = await order()
  const handle = page.locator(`section[data-area="${original[0]}"]`).locator('img')
  await handle.scrollIntoViewIfNeeded()
  const start = await handle.boundingBox()
  const target = await cards.nth(2).boundingBox()
  await page.mouse.move(start.x + start.width / 2, start.y + start.height / 2)
  await page.mouse.down()
  await page.mouse.move(target.x + target.width / 2, target.y + 100, { steps: 15 })
  await page.mouse.up()
  await expect.poll(async () => (await order())[2]).toBe(original[0])
  const reordered = await order()
  await handle.scrollIntoViewIfNeeded()
  const nextStart = await page.locator(`section[data-area="${original[0]}"] h2`).boundingBox()
  const nextTarget = await cards.first().boundingBox()
  await page.mouse.move(nextStart.x + nextStart.width / 2, nextStart.y + nextStart.height / 2)
  await page.mouse.down()
  await page.mouse.move(nextTarget.x + nextTarget.width / 2, nextTarget.y + 100, { steps: 15 })
  await page.keyboard.press('Escape')
  await page.mouse.up()
  expect(await order()).toEqual(reordered)
  await page.getByRole('button', { name: 'Cancel', exact: true }).click()
})

test('Life Area layout supports touch handles and reduced motion in dark theme', async ({ page, browser, browserName }) => {
  test.skip(browserName !== 'chromium', 'Touch movement uses Chromium input emulation')
  await login(page)
  await theme(page, 'Dark')
  const context = await browser.newContext({ storageState: await page.context().storageState(), viewport: { width: 390, height: 1100 }, hasTouch: true, isMobile: true, reducedMotion: 'reduce' })
  const touch = await context.newPage()
  try {
    await touch.goto(`${process.env.SMOKE_BASE_URL}/areas`)
    await ready(touch)
    await touch.getByRole('button', { name: 'Customize layout' }).tap()
    const cards = touch.locator('section[data-area]')
    const original = await cards.evaluateAll(nodes => nodes.map(node => node.dataset.area))
    const handle = cards.first().locator('img')
    await handle.scrollIntoViewIfNeeded()
    await expect(cards.first()).toHaveCSS('touch-action', 'auto')
    await expect(cards.first()).toHaveCSS('transform', 'none')
    const start = await handle.boundingBox()
    const target = await cards.nth(1).boundingBox()
    const session = await context.newCDPSession(touch)
    const from = { x: start.x + start.width / 2, y: start.y + start.height / 2 }
    const to = { x: target.x + target.width / 2, y: target.y + 60 }
    await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [from] })
    // Touch intentionally requires a short hold so incidental contact does not drag.
    await expect(cards.first()).toHaveAttribute('data-dragging', 'true')
    for (let step = 1; step <= 15; step++) {
      await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: from.x + (to.x - from.x) * step / 15, y: from.y + (to.y - from.y) * step / 15 }] })
    }
    await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    await expect.poll(() => cards.nth(1).getAttribute('data-area')).toBe(original[0])
    await cards.first().getByRole('button', { name: 'Move later' }).tap()
    await expect.poll(() => cards.first().getAttribute('data-area')).toBe(original[0])
    // A quick swipe on the card must still scroll; only holding starts a drag.
    await touch.evaluate(() => scrollTo(0, 0))
    const swipeImage = await cards.first().locator('img').boundingBox()
    const swipeStart = { x: swipeImage.x + swipeImage.width / 2, y: swipeImage.y + 160 }
    await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [swipeStart] })
    for (let step = 1; step <= 5; step++) await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: swipeStart.x, y: swipeStart.y - step * 25 }] })
    await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    await expect.poll(() => touch.evaluate(() => scrollY)).toBeGreaterThan(20)
    expect(await cards.evaluateAll(nodes => nodes.map(node => node.dataset.area))).toEqual(original)
    await expect.poll(() => touch.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await touch.evaluate(() => scrollTo(0, 0))
    await touch.screenshot({ path: `${root}/${browserName}/areas-layout-dark-touch.png`, fullPage: true })
    await touch.getByRole('button', { name: 'Cancel', exact: true }).tap()
  } finally {
    await context.close()
    await theme(page, 'Light')
  }
})

test('active navigation keeps one indicator on hover and visible keyboard focus', async ({ page, browserName }) => {
  await login(page)
  await page.setViewportSize({ width: 1440, height: 900 })
  fs.mkdirSync(`${root}/${browserName}`, { recursive: true })
  for (const mode of ['Light', 'Dark']) {
    await theme(page, mode)
    for (const [route, label] of [['/today', 'Today'], ['/goals', 'Plan'], ['/areas', 'Life Areas'], ['/rewards', 'Progress'], ['/focus', 'Focus']]) {
      await page.goto(route)
      await ready(page)
      const navigation = page.getByRole('navigation', { name: 'Main navigation', exact: true })
      const active = navigation.getByRole('link', { name: label, exact: true })
      await expect(navigation.locator('[aria-current]')).toHaveCount(1)
      await expect(active).toHaveAttribute('aria-current', 'true')
      await expect(active).toHaveCSS('border-bottom-width', '2px')
      await expect(active).toHaveCSS('text-decoration-line', 'none')
      await active.hover()
      await page.screenshot({ path: `${root}/${browserName}/nav-${mode}-${label.replaceAll(' ', '-')}.png` })
      await expect(active).toHaveCSS('text-decoration-line', 'none')
      expect(await active.evaluate(element => getComputedStyle(element).borderBottomColor === getComputedStyle(element).color)).toBe(true)
      const inactive = navigation.locator('a:not([aria-current])').first()
      await inactive.hover()
      await expect(inactive).toHaveCSS('text-decoration-line', 'underline')
      await page.mouse.move(0, 400)
      // Tab reaches Search after the five main links; Shift+Tab returns through each link.
      await page.getByRole('button', { name: 'Search', exact: true }).focus()
      for (let index = 4; index >= 0; index--) {
        await page.keyboard.press('Shift+Tab')
        const link = navigation.getByRole('link').nth(index)
        await expect(link).toBeFocused()
        await expect(link).toHaveCSS('outline-style', 'solid')
        await expect(link).toHaveCSS('outline-width', '2px')
      }
    }
  }
})

test('Today header follows the artwork boundary when resizing across navigation breakpoints', async ({ page }) => {
  await login(page)
  await page.setViewportSize({ width: 1440, height: 600 })
  await page.goto('/today')
  await ready(page)
  const hero = page.locator('[data-app-hero]')
  const header = page.locator('header[data-artwork]')
  for (const width of [1440, 390, 1440]) {
    await page.setViewportSize({ width, height: 600 })
    // 68px is between the existing desktop (72px) and mobile (64px) header heights.
    await hero.evaluate(element => scrollTo(0, element.offsetTop + element.offsetHeight - 68))
    await expect.poll(() => hero.evaluate(element => Math.round(element.getBoundingClientRect().bottom))).toBe(68)
    await expect(header).toHaveAttribute('data-artwork', String(width < 1200))
  }
})

test('artwork system: every route, both themes, desktop and mobile, original assets', async ({ page, browserName }) => {
  test.setTimeout(180000)
  fs.mkdirSync(`${root}/${browserName}`, { recursive: true })
  const errors = [], failures = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('response', response => { if (response.status() >= 500) failures.push(response.url()) })
  await login(page)
  // The public auth bootstrap intentionally probes /auth/me with a 401 before sign-in.
  page.on('console', message => { if (['error', 'warning'].includes(message.type())) errors.push(message.text()) })
  const routes = ['/today', '/tasks', '/goals', '/habits', '/inbox', '/areas', '/progress', '/activity', '/rewards', '/focus', '/settings', '/settings?section=appearance', '/settings?section=security']
  for (const mode of ['Light', 'Dark']) {
    await theme(page, mode)
    for (const route of routes) {
      await page.goto(route)
      await ready(page)
      for (const width of [1440, 390]) {
        await page.setViewportSize({ width, height: 900 })
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${route} ${width}`).toBe(true)
        await expect(page.locator('html')).toHaveCSS('scrollbar-width', 'none')
        await expect(page.getByRole('button', { name: 'Search', exact: true })).toBeVisible()
        await expect(page.getByRole('button', { name: 'Menu', exact: true })).toBeVisible()
        await expect.poll(() => page.locator('img').evaluateAll(images => images.filter(image => image.loading !== 'lazy').every(image => image.complete && image.naturalWidth > 0)), { message: `Artwork decoded: ${route}` }).toBe(true)
        await page.screenshot({ path: `${root}/${browserName}/${mode}-${route.slice(1).replace(/[^\w-]/g, '-')}-${width}.png`, fullPage: true })
      }
    }
  }
  await theme(page, 'Light')
  for (const width of [320, 768, 1280, 1920]) {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/today')
    await ready(page)
    const hero = page.locator('[data-app-hero]')
    const box = await hero.boundingBox()
    expect(box.x).toBe(0)
    expect(Math.round(box.width)).toBe(width)
    expect(box.height).toBeGreaterThanOrEqual(899)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.screenshot({ path: `${root}/${browserName}/hero-${width}.png` })
    await page.mouse.move(width / 2, 700)
    await page.mouse.wheel(0, 1000)
    await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(100)
    // Empty tablet content can reach its scroll limit while artwork is still behind the header.
    const stillOverArtwork = await hero.evaluate(element => element.getBoundingClientRect().bottom > document.querySelector('header[data-artwork]').offsetHeight)
    await expect(page.locator('header[data-artwork]')).toHaveAttribute('data-artwork', String(stillOverArtwork))
    await page.screenshot({ path: `${root}/${browserName}/workspace-${width}.png` })
  }
  for (const filename of ['Backround.png', 'Gods plan.png', 'Money.png', 'Muhammed ali.png', 'Odessey.png', 'Rolex.png', 'Tiger.png', 'Tutto passo.png']) {
    const response = await page.request.get('/images/' + encodeURIComponent(filename))
    expect(response.status()).toBe(200)
    expect(response.headers()['content-type']).toContain('image/png')
  }
  expect(errors).toEqual([])
  expect(failures).toEqual([])
})

test('Life Area images preserve locked assignments, responsive cards and editing', async ({ page, browserName }) => {
  test.setTimeout(180000)
  const expected = {
    university: 'Tesla.jpg',
    fitness: 'Ronaldo.jpg', career: 'Work.jpg', finance: 'Money.png', home: 'toscana.jpg',
    style: 'Rolex.png', food: 'cooking.jpg', creative: 'Tutto passo.png',
    travel: 'Polo 1.jpg', personal: 'personal.jpg',
  }
  const errors = []
  await login(page)
  page.on('pageerror', error => errors.push(error.message))
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
  fs.mkdirSync(`${root}/${browserName}`, { recursive: true })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  for (const mode of ['Light', 'Dark']) {
    await theme(page, mode)
    await page.goto('/areas')
    await ready(page)
    await expect(page.locator('section[data-area]')).toHaveCount(10)
    for (const width of [1920, 1440, 1280, 1024, 768, 390, 320]) {
      await page.setViewportSize({ width, height: 900 })
      for (const [key, filename] of Object.entries(expected)) {
        const card = page.locator(`section[data-area="${key}"]`)
        const image = card.locator('img')
        await image.scrollIntoViewIfNeeded()
        await expect(image).toHaveAttribute('src', `/images/${filename}`)
        await expect.poll(() => image.evaluate(element => element.complete && element.naturalWidth > 0)).toBe(true)
        await expect(image).toHaveCSS('object-fit', 'cover')
        await expect(card.getByRole('heading')).toBeVisible()
        for (const kind of ['tasks', 'goals', 'habits']) {
          await expect(card.locator(`a[href^="/${kind}?areaId="]`).last()).toBeVisible()
        }
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
      await page.evaluate(() => scrollTo(0, 0))
      await page.screenshot({ path: `${root}/${browserName}/areas-images-${mode}-${width}.png`, fullPage: true })
    }
  }
  const card = page.locator('section[data-area="food"]')
  const edit = card.getByRole('button', { name: /Edit Life Area/ })
  await edit.focus()
  await page.keyboard.press('Enter')
  const dialog = page.getByRole('dialog', { name: 'Edit Life Area', exact: true })
  const name = dialog.getByLabel('Display name')
  const original = await name.inputValue()
  await name.fill('Kitchen practice')
  await dialog.getByRole('button', { name: 'Save changes' }).click()
  await expect(dialog.getByRole('status')).toHaveText('Changes saved.')
  await page.keyboard.press('Escape')
  await expect(edit).toBeFocused()
  await page.reload()
  await expect(card.getByRole('heading')).toHaveText('Kitchen practice')
  await expect(card.locator('img')).toHaveAttribute('src', '/images/cooking.jpg')
  await edit.click()
  await name.fill(original)
  await dialog.getByRole('button', { name: 'Save changes' }).click()
  await expect(dialog.getByRole('status')).toHaveText('Changes saved.')
  await page.keyboard.press('Escape')
  await card.locator('a[href^="/tasks?areaId="]').first().click()
  await expect(page).toHaveURL(/\/tasks\?areaId=/)
  expect(errors).toEqual([])
})

test('drawer and search preserve keyboard, route focus, and native scrolling', async ({ page, browserName }) => {
  await login(page)
  await page.setViewportSize({ width: 1440, height: 540 })
  await page.locator('#main-content').focus()
  await page.keyboard.press('PageDown')
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(0)
  await page.evaluate(() => scrollTo(0, 0))
  const menu = page.getByRole('button', { name: 'Menu', exact: true })
  const drawer = page.getByRole('dialog', { name: 'LIFEMAXING', exact: true })
  await expect(drawer).not.toBeVisible()
  await menu.click()
  await expect(drawer).toBeVisible()
  await expect(drawer).toHaveCSS('scrollbar-width', 'none')
  await drawer.getByRole('button', { name: 'Sign out', exact: true }).scrollIntoViewIfNeeded()
  expect(await drawer.evaluate(element => element.scrollTop)).toBeGreaterThan(0)
  await page.screenshot({ path: `${root}/${browserName}/drawer-short.png` })
  await page.keyboard.press('Escape')
  await expect(menu).toBeFocused()
  await expect(page.locator('html')).not.toHaveCSS('overflow', 'hidden')
  await menu.click()
  await drawer.getByRole('link', { name: 'Goals', exact: true }).click()
  await expect(page).toHaveURL(/\/goals$/)
  await expect(page.locator('#main-content')).toBeFocused()
  await expect(page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name: 'Plan', exact: true })).toHaveAttribute('aria-current', 'true')
  const search = page.getByRole('button', { name: 'Search', exact: true })
  await search.click()
  const command = page.getByRole('dialog', { name: 'Search', exact: true })
  await command.getByRole('textbox').fill('Rewards')
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/\/rewards$/)
  await search.click()
  await page.keyboard.press('Escape')
  await expect(search).toBeFocused()
  await menu.click()
  await drawer.getByRole('button', { name: /Search/ }).click()
  await expect(drawer).not.toBeVisible()
  await expect(command.getByRole('textbox')).toBeFocused()
  await page.keyboard.press('Escape')
  await menu.click()
  await page.mouse.click(20, 250)
  await expect(drawer).not.toBeVisible()
})

test('large text and reduced motion preserve full navigation and controls', async ({ page, browserName }) => {
  await login(page)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  for (const route of ['/today', '/tasks', '/areas', '/focus', '/settings?section=appearance']) {
    await page.goto(route)
    await ready(page)
    await page.evaluate(() => { document.documentElement.style.fontSize = '200%' })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await expect(page.getByRole('button', { name: 'Menu', exact: true })).toBeVisible()
    await page.screenshot({ path: `${root}/${browserName}/text200-${route.slice(1).replace(/[^\w-]/g, '-')}.png`, fullPage: true })
  }
})


test('missing decorative artwork preserves readable content and working controls', async ({ page }) => {
  await login(page)
  await page.route('**/images/**', route => route.abort())
  for (const route of ['/today', '/goals', '/focus', '/progress', '/rewards', '/areas']) {
    await page.goto(route)
    await ready(page)
    await expect(page.getByRole('button', { name: 'Search', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Menu', exact: true })).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  }
  await page.getByRole('button', { name: 'Search', exact: true }).click()
  await expect(page.getByRole('dialog', { name: 'Search', exact: true }).getByRole('textbox')).toBeFocused()
})


test('Life Area controls preserve filtering and card interaction without layout shifts', async ({ page, browserName }) => {
  test.setTimeout(180000)
  await login(page)
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.goto('/areas')
  await ready(page)
  const cards = page.locator('section[data-area]')
  for (const mode of ['Light', 'Dark']) {
    await theme(page, mode)
    await page.goto('/areas')
    await ready(page)
    for (let index = 0; index < 10; index++) {
      const card = cards.nth(index)
      await page.mouse.move(0, 0)
      const before = await cards.evaluateAll(elements => elements.map(el => [el.offsetLeft, el.offsetTop, el.offsetWidth, el.offsetHeight]))
      await card.locator('img').hover()
      await expect(card).not.toHaveCSS('transform', 'none')
      await expect(card).not.toHaveCSS('box-shadow', 'none')
      expect(await cards.evaluateAll(elements => elements.map(el => [el.offsetLeft, el.offsetTop, el.offsetWidth, el.offsetHeight]))).toEqual(before)
      const control = card.locator('a[href^="/habits?"]')
      await control.focus()
      await page.keyboard.press('Shift+Tab')
      const focused = card.locator('a[href^="/goals?"]')
      await expect(focused).toBeFocused()
      await expect(focused).toHaveCSS('outline-style', 'solid')
      await expect(focused.locator('svg')).toHaveCount(0)
      expect((await focused.boundingBox()).height).toBeGreaterThanOrEqual(44)
      await focused.hover()
      const hoverColor = await focused.evaluate(el => getComputedStyle(el).backgroundColor)
      await page.mouse.down()
      await expect.poll(() => focused.evaluate(el => getComputedStyle(el).backgroundColor)).not.toBe(hoverColor)
      await page.mouse.move(0, 0)
      await page.mouse.up()
    }
  }
  const first = cards.first()
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await first.hover()
  await expect(first).toHaveCSS('transform', 'none')
  await expect(first).toHaveCSS('transition-duration', '0s, 0s')
  await expect(first).not.toHaveCSS('box-shadow', 'none')
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await first.getByRole('button', { name: /Edit Life Area/ }).click()
  await expect(first).toHaveAttribute('data-editing', 'true')
  await expect(first).toHaveCSS('transform', 'none')
  await expect(first).toHaveCSS('box-shadow', 'none')
  await page.keyboard.press('Escape')

  const fixture = await page.evaluate(async () => {
    const get = async path => (await fetch('/api/v1' + path)).json()
    const areas = await get('/areas')
    const today = await get('/today')
    const token = (await get('/auth/csrf')).requestToken
    const cases = [['tasks', 'fitness'], ['goals', 'travel'], ['habits', 'personal']]
    for (const [kind, key] of cases) {
      for (const matching of [true, false]) {
        const body = { title: 'Area filter ' + kind + (matching ? ' included' : ' excluded'), lifeAreaId: areas.find(a => a.key === (matching ? key : 'university')).id }
        if (kind === 'tasks') Object.assign(body, { priority: 'Normal', plannedDate: today.localDate })
        if (kind === 'goals') Object.assign(body, { state: 'Active' })
        if (kind === 'habits') Object.assign(body, { isActive: true, xpPerLog: 10, schedule: { pattern: 'Daily', effectiveFromDate: today.localDate } })
        const response = await fetch('/api/v1/' + kind, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': token, ClientActionId: crypto.randomUUID() }, body: JSON.stringify(body) })
        if (!response.ok) throw new Error('Fixture ' + kind + ': ' + response.status)
      }
    }
    return cases.map(([kind, key]) => ({ kind, key, id: areas.find(a => a.key === key).id }))
  })
  for (const { kind, key, id } of fixture) {
    await page.goto('/areas')
    const control = page.locator('[data-area="' + key + '"] a[href^="/' + kind + '?"]').last()
    await expect(control).toContainText('1')
    await control.click()
    expect(new URL(page.url()).searchParams.get('areaId')).toBe(id)
    await expect(page.getByLabel('Life Area filter')).toHaveValue(id)
    await expect(page.getByText('Area filter ' + kind + ' included', { exact: true })).toBeVisible()
    await expect(page.getByText('Area filter ' + kind + ' excluded', { exact: true })).toHaveCount(0)
    await page.reload()
    await expect(page.getByLabel('Life Area filter')).toHaveValue(id)
    await expect(page.getByText('Area filter ' + kind + ' included', { exact: true })).toBeVisible()
  }
  expect(errors).toEqual([])
})


test('Life Area controls fit translated large text and touch input', async ({ page, browser }) => {
  await login(page)
  const patchLanguage = async uiLanguage => page.evaluate(async uiLanguage => {
    const token = (await (await fetch('/api/v1/auth/csrf')).json()).requestToken
    const response = await fetch('/api/v1/settings', { method: 'PATCH', headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': token }, body: JSON.stringify({ uiLanguage }) })
    if (!response.ok) throw new Error('Language setup: ' + response.status)
  }, uiLanguage)
  await page.setViewportSize({ width: 320, height: 900 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  for (const [language, label] of [['en', 'Tasks'], ['nb', 'Oppgaver'], ['sv', 'Uppgifter'], ['da', 'Opgaver']]) {
    await patchLanguage(language)
    await page.goto('/areas')
    const controls = page.locator('section[data-area] a[href^="/tasks?"]').filter({ hasText: label })
    await expect(controls).toHaveCount(10)
    await page.evaluate(() => { document.documentElement.style.fontSize = '200%' })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    expect(await controls.evaluateAll(elements => elements.every(el => el.scrollWidth <= el.clientWidth && el.offsetHeight >= 44))).toBe(true)
  }
  await patchLanguage('en')
  const touch = await browser.newContext({ baseURL: process.env.SMOKE_BASE_URL, storageState: await page.context().storageState(), hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 } })
  try {
    const mobile = await touch.newPage()
    await mobile.goto('/areas')
    const card = mobile.locator('section[data-area="fitness"]')
    await expect(card.getByRole('heading')).toBeVisible()
    await card.locator('img').hover()
    await expect(card).toHaveCSS('transform', 'none')
    await card.getByRole('link', { name: /^Tasks/ }).tap()
    await expect(mobile.getByLabel('Life Area filter')).toHaveValue(new URL(mobile.url()).searchParams.get('areaId'))
  } finally { await touch.close() }
})
