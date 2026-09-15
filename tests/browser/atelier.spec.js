import { test, expect } from '@playwright/test'

const entry = '/design-reference/atelier/'
async function open(page, view = 'today', extra = '') {
  await page.goto(`${entry}?view=${view}&preview=1${extra}`)
  await page.locator('h1').first().waitFor()
  await page.evaluate(() => document.fonts.ready)
}
async function noOverflow(page) {
  const sizes = await page.evaluate(() => ({
    width: innerWidth,
    scroll: document.documentElement.scrollWidth
  }))
  expect(sizes.scroll).toBeLessThanOrEqual(sizes.width + 1)
}

test('screens render in both themes at mobile, tablet and desktop sizes without API traffic', async ({
  page
}) => {
  const errors = [],
    forbidden = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('request', (r) => {
    const u = new URL(r.url())
    if (
      u.pathname.startsWith('/api') ||
      (u.protocol.startsWith('http') && u.hostname !== '127.0.0.1')
    )
      forbidden.push(r.url())
  })
  for (const width of [320, 390, 768, 1440, 1920]) {
    await page.setViewportSize({ width, height: 1000 })
    for (const theme of ['light', 'dark'])
      for (const view of [
        'today',
        'areas',
        'progress',
        'settings',
        'brand',
        'sidebar',
        'surfaces'
      ]) {
        await open(page, view, `&theme=${theme}`)
        await noOverflow(page)
        await expect(page.locator('[data-theme]').first()).toHaveAttribute(
          'data-theme',
          theme
        )
      }
  }
  expect(errors).toEqual([])
  expect(forbidden).toEqual([])
})

test('first mobile viewport keeps the primary action and next section visible with either mark', async ({
  page
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  for (const theme of ['light', 'dark'])
    for (const mark of ['fold', 'meridian']) {
      await open(page, 'today', `&theme=${theme}&mark=${mark}`)
      const cta = await page.getByTestId('start-focus').boundingBox()
      const next = await page
        .getByRole('heading', { name: 'Små vaner' })
        .boundingBox()
      expect(cta.y + cta.height).toBeLessThan(480)
      expect(next.y + next.height).toBeLessThan(650)
      await expect(
        page.locator(`img[src*='${mark}-${theme}.webp']`)
      ).toBeVisible()
    }
})

test('day states, capture, reversible completion, habits and focus work locally', async ({
  page
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 })
  await open(page)
  const task = page.getByRole('button', {
    name: 'Fullfør: Les kapittelet om organisasjonskultur'
  })
  await task.click()
  await expect(page.getByText('2 av 6 oppgaver fullført')).toBeVisible()
  await page
    .getByRole('button', {
      name: 'Gjenåpne: Les kapittelet om organisasjonskultur'
    })
    .click()
  await expect(page.getByText('1 av 6 oppgaver fullført')).toBeVisible()
  const habit = page.getByRole('button', {
    name: 'Logg vane: Les i 15 minutter'
  })
  await habit.click()
  await expect(habit).toHaveAttribute('aria-pressed', 'true')
  await page.getByTestId('start-focus').click()
  await expect(
    page.getByRole('button', { name: 'Pause', exact: true })
  ).toBeVisible()
  await page.getByRole('button', { name: 'Tilbake til dagen' }).click()
  await expect(page.getByTestId('start-focus')).toContainText('Fortsett fokus')
  await open(page, 'today', '&day=empty')
  await page
    .getByRole('button', { name: 'Legg til en oppgave', exact: true })
    .click()
  await page
    .getByLabel('Hva vil du gjøre?')
    .fill('Skriv et rolig første utkast')
  await page
    .getByRole('button', { name: 'Legg til oppgave', exact: true })
    .last()
    .click()
  await expect(
    page.getByRole('button', { name: /Skriv et rolig første utkast/ }).last()
  ).toBeVisible()
  await open(page, 'today', '&day=complete')
  await expect(
    page.getByRole('heading', {
      name: 'Du har gjort plass til resten av dagen.'
    })
  ).toBeVisible()
  await page
    .getByRole('button', { name: 'Logg vane: Les i 15 minutter' })
    .click()
  await expect(
    page.getByRole('button', { name: 'Logg vane: Les i 15 minutter' })
  ).toHaveAttribute('aria-pressed', 'false')
  await open(page, 'today', '&day=busy')
  await expect(page.getByText('1 av 18 oppgaver fullført')).toBeVisible()
  expect(await page.locator('ul').first().locator('li').count()).toBe(17)
})

test('area counts lead to the represented records; progression arithmetic is explicit', async ({
  page
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 })
  await open(page, 'areas')
  const university = page
    .getByRole('article')
    .filter({
      has: page.getByRole('heading', { name: 'University', exact: true })
    })
  await university
    .getByRole('button', { name: '3 oppgaver', exact: true })
    .click()
  await expect(page.getByRole('heading', { name: 'Oppgaver.' })).toBeVisible()
  expect(await page.locator('ul li').count()).toBe(3)
  await open(page, 'progress')
  await expect(page.getByRole('heading', { name: 'Level 8' })).toBeVisible()
  await expect(
    page.getByText('6 200 XP opptjent gjennom fullførte handlinger.')
  ).toBeVisible()
  await expect(page.getByText('600 / 1 200 XP', { exact: true })).toBeVisible()
})

test('Settings previews, system theme, density, region and retry are reviewable', async ({
  page
}) => {
  await open(page, 'settings')
  await page.getByRole('radio', { name: /Mørkt Dempet/ }).check()
  await expect(page.locator('[data-theme]').first()).toHaveAttribute(
    'data-theme',
    'dark'
  )
  await page.getByRole('radio', { name: /System Følger/ }).check()
  await page.emulateMedia({ colorScheme: 'light' })
  await expect(page.locator('[data-theme]').first()).toHaveAttribute(
    'data-theme',
    'light'
  )
  await page.emulateMedia({ colorScheme: 'dark' })
  await expect(page.locator('[data-theme]').first()).toHaveAttribute(
    'data-theme',
    'dark'
  )
  await page.getByRole('radio', { name: /Kompakt/ }).check()
  await expect(page.locator('[data-density]')).toHaveAttribute(
    'data-density',
    'compact'
  )
  await page.getByText('Prøv lagringstilstander · demonstrasjon').click()
  await page.getByRole('button', { name: 'Feil', exact: true }).click()
  await expect(page.getByRole('status')).toContainText('Kunne ikke lagre')
  await page.getByRole('button', { name: 'Prøv igjen', exact: true }).click()
  await expect(page.getByRole('status')).toContainText('lagret')
  await page.getByRole('button', { name: 'Språk og tid', exact: true }).click()
  await page.getByLabel('Regionalt format').selectOption('en-GB')
  await expect(page.getByText(/14 September 2026/)).toBeVisible()
})

test('keyboard focus, dialog return, collapsed navigation and scrollbar are functional', async ({
  page,
  browserName
}) => {
  await page.setViewportSize({ width: 1440, height: 780 })
  await open(page, 'today')
  const capture = page.getByRole('button', { name: /Legg til noe/ })
  await capture.focus()
  await page.keyboard.press('Enter')
  await expect(page.getByLabel('Hva vil du gjøre?')).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(capture).toBeFocused()
  await page.getByText('Din utvikling', { exact: true }).click()
  await expect(
    page.getByRole('button', { name: 'Fremgang', exact: true })
  ).toBeHidden()
  const sidebar = page.getByRole('complementary', { name: 'Hovednavigasjon' })
  if (browserName === 'chromium')
    expect(
      await sidebar.evaluate((e) => getComputedStyle(e).scrollbarWidth)
    ).toBe('thin')
  // Playwright's Firefox headless build forces the computed width to none.
  // Verify the authored declaration and actual native scrolling in that engine.
  expect(
    await sidebar.evaluate((e) =>
      [...document.styleSheets].some((sheet) =>
        [...sheet.cssRules].some(
          (rule) =>
            rule.selectorText &&
            e.matches(rule.selectorText) &&
            rule.style.scrollbarWidth === 'thin'
        )
      )
    )
  ).toBe(true)
  await page.getByText('Din utvikling', { exact: true }).click()
  await sidebar.evaluate((e) => {
    e.scrollTop = e.scrollHeight
  })
  expect(await sidebar.evaluate((e) => e.scrollTop)).toBeGreaterThan(0)
  expect(
    await sidebar.evaluate((e) => getComputedStyle(e).scrollbarColor)
  ).not.toBe('auto')
  await page.emulateMedia({ reducedMotion: 'reduce' })
  expect(
    await capture.evaluate((e) => getComputedStyle(e).transitionDuration)
  ).toBe('0s')
  await page.setViewportSize({ width: 390, height: 844 })
  await page.getByRole('button', { name: 'Åpne navigasjon' }).click()
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Livsområder', exact: true })
    .click()
  await expect(
    page.getByRole('heading', { name: 'Livet har flere sider.' })
  ).toBeVisible()
})

test('images have a stable fallback and 200 percent text retains all content', async ({
  page
}) => {
  await page.route('**/*.webp', (route) => route.abort())
  await page.setViewportSize({ width: 390, height: 844 })
  await open(page)
  await expect(page.getByTestId('start-focus')).toBeVisible()
  await expect(page.locator('[class*="objectFallback"]')).toBeVisible()
  for (const view of ['today', 'areas', 'progress', 'settings']) {
    await open(page, view, '&day=long')
    await page.evaluate(() => {
      const entries = [...document.querySelectorAll('[data-theme] *')].map(
        (e) => [e, getComputedStyle(e).fontSize]
      )
      entries.forEach(([e, size]) => {
        if (e instanceof HTMLElement)
          e.style.fontSize = `${parseFloat(size) * 2}px`
      })
    })
    await noOverflow(page)
    await page.screenshot({
      path: `artifacts/atelier/text-200-${test.info().project.name}-${view}.png`,
      fullPage: true
    })
  }
})

test('gallery provides all eight comparisons and contrast pairs meet their roles', async ({
  page
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.goto(entry)
  const navigation = page.getByRole('navigation', { name: 'Studievisninger' })
  expect(await navigation.getByRole('button').count()).toBe(8)
  for (const button of await navigation.getByRole('button').all()) {
    await button.click()
    await expect(page.locator('iframe')).toHaveCount(2)
    await expect(
      page.getByRole('link', { name: 'Åpne og prøv ↗' })
    ).toHaveCount(2)
  }
  const ratios = []
  for (const theme of ['light', 'dark']) {
    await open(page, 'surfaces', `&theme=${theme}`)
    const colors = await page.locator('[data-theme]').evaluate((e) => {
      const s = getComputedStyle(e)
      return Object.fromEntries(
        [
          'canvas',
          'sidebar',
          'surface',
          'raised',
          'selected',
          'interactive',
          'ink',
          'muted',
          'ruby',
          'rubyText',
          'onRuby',
          'blueText',
          'sage',
          'bronze',
          'error',
          'control',
          'focus',
          'thumb'
        ].map((k) => [k, s.getPropertyValue('--' + k).trim()])
      )
    })
    const lum = (hex) => {
      let h = hex.slice(1)
      if (h.length === 3)
        h = h
          .split('')
          .map((c) => c + c)
          .join('')
      const rgb = [0, 2, 4]
        .map((i) => parseInt(h.slice(i, i + 2), 16) / 255)
        .map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
      return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722
    }
    const pairs = []
    for (const bg of [
      'canvas',
      'sidebar',
      'surface',
      'raised',
      'selected',
      'interactive'
    ])
      for (const fg of ['ink', 'muted']) pairs.push([fg, bg, 4.5])
    for (const fg of ['rubyText', 'blueText', 'sage', 'bronze', 'error'])
      pairs.push([fg, 'canvas', 4.5])
    pairs.push(
      ['onRuby', 'ruby', 4.5],
      ['control', 'canvas', 3],
      ['control', 'surface', 3],
      ['focus', 'canvas', 3],
      ['thumb', 'sidebar', 3]
    )
    for (const [fg, bg, min] of pairs) {
      const a = lum(colors[fg]),
        b = lum(colors[bg]),
        ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
      ratios.push({ theme, fg, bg, ratio })
      expect(ratio, `${theme} ${fg}/${bg}`).toBeGreaterThanOrEqual(min)
    }
  }
  await test
    .info()
    .attach('contrast', {
      body: JSON.stringify(ratios, null, 2),
      contentType: 'application/json'
    })
})
