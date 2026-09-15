const { test, expect } = require('@playwright/test')
const fs = require('node:fs')

const root = '/design-reference/'
const destination = 'artifacts/p1'
async function ready(page) {
  await expect(page.locator('#reference-main h1')).toBeVisible()
  await page.evaluate(async () => {
    await document.fonts.ready
    await Promise.all([...document.images].map(img => img.decode()))
    // CSS atlas is a separate resource; ensure it is decoded before capture.
    const artwork = document.querySelector('[aria-label^="Materialstudie:"]')
    if (artwork) {
      const src = getComputedStyle(artwork).backgroundImage.slice(5, -2)
      const image = new Image()
      image.src = src
      await image.decode()
    }
  })
}

test('both visual directions, real fixture counts, full ladder, responsive themes and no API access', async ({ page, browserName }) => {
  test.setTimeout(180000)
  fs.mkdirSync(`${destination}/${browserName}`, { recursive: true })
  const errors = []
  const forbidden = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('request', request => {
    const url = new URL(request.url())
    if (url.pathname.startsWith('/api/') || !['127.0.0.1', 'localhost'].includes(url.hostname)) forbidden.push(request.url())
  })
  for (const direction of ['A', 'B']) for (const theme of ['dark', 'light']) for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 1000 })
    for (const screen of ['today', 'areas', 'ranks', 'settings', 'tasks']) {
      await page.goto(`${root}?direction=${direction}&theme=${theme}&page=${screen}`)
      await ready(page)
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${direction}/${theme}/${screen}/${width}`).toBe(true)
      if (screen === 'today') {
        await expect(page.getByText('1 av 6', { exact: true })).toBeVisible()
        await expect(page.getByRole('button', { name: 'Start fokus', exact: true })).toBeVisible()
      }
      if (screen === 'areas') {
        await expect(page.locator('article')).toHaveCount(10)
        const home = page.locator('article').filter({ has: page.getByRole('heading', { name: 'Hjem og planter' }) })
        await expect(home.getByText('0 oppgaver', { exact: true })).toBeVisible()
        const career = page.locator('article').filter({ has: page.getByRole('heading', { name: 'Arbeid og karriere' }) })
        await expect(career.getByText('2 oppgaver', { exact: true })).toBeVisible()
      }
      if (screen === 'ranks') {
        await expect(page.locator('ol > li')).toHaveCount(10)
        await expect(page.getByRole('heading', { name: 'Challenger', exact: true })).toBeVisible()
        await expect(page.getByText('IV → III → II → I', { exact: true })).toHaveCount(7)
      }
      await page.screenshot({ path: `${destination}/${browserName}/${direction}-${theme}-${screen}-${width}.png`, fullPage: true })
    }
    for (const day of ['empty', 'busy']) {
      await page.goto(`${root}?direction=${direction}&theme=${theme}&day=${day}`)
      await ready(page)
      await expect(page.getByText(day === 'empty' ? '0 av 0' : '1 av 18', { exact: true })).toBeVisible()
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
      await page.screenshot({ path: `${destination}/${browserName}/${direction}-${theme}-${day}-${width}.png`, fullPage: true })
    }
  }
  // Additional narrow, wide and enlarged-text checks for the recommended direction.
  for (const width of [320, 768, 1920]) {
    await page.setViewportSize({ width, height: 1000 })
    await page.goto(`${root}?direction=A&theme=dark`)
    await ready(page)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.screenshot({ path: `${destination}/${browserName}/A-dark-today-${width}.png`, fullPage: true })
  }
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.evaluate(() => { document.documentElement.style.fontSize = '200%' })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  expect(await page.locator('section[aria-label="Dagens hovedoppgave"] h2').evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true)
  const textBox = await page.locator('section[aria-label="Dagens hovedoppgave"] h2').boundingBox()
  const imageBox = await page.locator('section[aria-label="Dagens hovedoppgave"] img').boundingBox()
  expect(textBox.y + textBox.height <= imageBox.y || textBox.x + textBox.width <= imageBox.x).toBe(true)
  await page.screenshot({ path: `${destination}/${browserName}/A-dark-today-text200.png`, fullPage: true })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior)).toBe('auto')
  expect(errors).toEqual([])
  expect(forbidden).toEqual([])
})

test('local interactions, reset, keyboard dialog and unchanged progression', async ({ page, browserName }) => {
  await page.goto(root)
  await ready(page)
  await page.getByRole('button', { name: 'Fullfør: Gjennomfør styrkeøkt A' }).click()
  await expect(page.getByText('2 av 6', { exact: true })).toBeVisible()
  await expect(page.getByText('5 600 XP totalt · fiktivt eksempel')).toBeVisible()
  await page.getByRole('button', { name: 'Gjenåpne: Gjennomfør styrkeøkt A' }).click()
  await expect(page.getByText('1 av 6', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Legg til oppgave', exact: true }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await expect(page.getByRole('textbox', { name: 'Tittel' })).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await page.getByRole('button', { name: 'Legg til oppgave', exact: true }).click()
  await page.getByRole('textbox', { name: 'Tittel' }).fill('En fiktiv oppgave for visuell kontroll')
  await page.getByRole('button', { name: 'Legg til', exact: true }).click()
  await expect(page.getByText('1 av 7', { exact: true })).toBeVisible()
  await page.reload()
  await expect(page.getByText('1 av 6', { exact: true })).toBeVisible()
  await expect(page.getByText('En fiktiv oppgave for visuell kontroll')).toHaveCount(0)
  await page.goto(`${root}?page=settings`)
  await page.getByRole('button', { name: 'Logg ut', exact: true }).click()
  await expect(page.getByRole('status')).toContainText('Ingen økt ble endret')
  // Broken illustration must leave the execution controls available.
  await page.route('**/assets/compass-espresso.png', route => route.abort())
  await page.goto(root)
  await expect(page.getByRole('button', { name: 'Start fokus', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Fullfør', exact: true })).toBeVisible()
  await page.screenshot({ path: `${destination}/${browserName}/image-failure.png`, fullPage: true })
})
