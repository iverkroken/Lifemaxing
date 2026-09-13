const { test, expect } = require('@playwright/test')
const fs = require('node:fs')
const zlib = require('node:zlib')

test('production workspace laboratory baseline', async ({ page }) => {
  test.skip(!process.env.PERFORMANCE_STAGE, 'Use the isolated runner with -PerformanceStage before or after.')
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.addInitScript(() => {
    window.lab = { lcp: 0, cls: 0 }
    new PerformanceObserver(list => { for (const entry of list.getEntries()) window.lab.lcp = entry.startTime }).observe({ type: 'largest-contentful-paint', buffered: true })
    new PerformanceObserver(list => { for (const entry of list.getEntries()) if (!entry.hadRecentInput) window.lab.cls += entry.value }).observe({ type: 'layout-shift', buffered: true })
  })
  const calls = []
  page.on('request', request => { if (request.url().includes('/api/v1/')) calls.push(new URL(request.url()).pathname) })
  await page.goto('/login')
  await page.getByLabel('Email').fill(process.env.SMOKE_EMAIL)
  await page.getByLabel('Password').fill(process.env.SMOKE_PASSWORD)
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await expect(page).toHaveURL(/\/today$/)
  await expect(page.getByRole('progressbar')).toBeVisible()
  const first = await page.evaluate(() => ({ ...window.lab, navigation: performance.getEntriesByType('navigation')[0].toJSON(),
    loadedScripts: performance.getEntriesByType('resource').filter(entry => new URL(entry.name).pathname.endsWith('.js')).map(entry => ({ path: new URL(entry.name).pathname, decodedBytes: entry.decodedBodySize, transferBytes: entry.transferSize })) }))
  calls.length = 0
  const routeStart = Date.now()
  await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name: 'Tasks', exact: true }).click()
  await expect(page.getByLabel('Search tasks')).toBeVisible()
  await expect(page.getByText(/^Loading/)).toHaveCount(0)
  const routeMs = Date.now() - routeStart
  const routeCalls = [...calls]
  const actionStart = Date.now()
  await page.getByRole('button', { name: 'Capture a task', exact: true }).click()
  await expect(page.getByRole('dialog').getByLabel('Task title', { exact: false })).toBeVisible()
  const interactionMs = Date.now() - actionStart
  const bundles = fs.readdirSync('client/dist/assets').filter(name => name.endsWith('.js')).map(name => {
    const data = fs.readFileSync('client/dist/assets/' + name)
    return { name, rawBytes: data.length, gzipBytes: zlib.gzipSync(data).length }
  })
  fs.mkdirSync('artifacts/full-redesign', { recursive: true })
  fs.writeFileSync(`artifacts/full-redesign/performance-${process.env.PERFORMANCE_STAGE}.json`, JSON.stringify({
    environment: 'Local Windows Chromium, 1440x1000, production Vite preview, isolated PostgreSQL, no network/CPU throttling; laboratory only. Action timings include Playwright overhead and are not field INP.',
    first, routeMs, routeCalls, interactionMs, bundles,
  }, null, 2))
})
