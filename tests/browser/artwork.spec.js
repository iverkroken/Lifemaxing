const { test, expect } = require('@playwright/test')
const fs = require('node:fs')
const root = `${process.env.VISUAL_ARTIFACT_ROOT || 'artifacts/artwork-review'}/artwork`

async function login(page) {
  await page.goto('/login')
  await page.getByLabel('Email').fill(process.env.SMOKE_EMAIL)
  await page.getByLabel('Password', { exact: false }).fill(process.env.SMOKE_PASSWORD)
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await expect(page).toHaveURL(/\/today$/)
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
  for (const route of ['/today', '/goals', '/focus', '/progress', '/rewards']) {
    await page.goto(route)
    await ready(page)
    await expect(page.getByRole('button', { name: 'Search', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Menu', exact: true })).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  }
  await page.getByRole('button', { name: 'Search', exact: true }).click()
  await expect(page.getByRole('dialog', { name: 'Search', exact: true }).getByRole('textbox')).toBeFocused()
})
