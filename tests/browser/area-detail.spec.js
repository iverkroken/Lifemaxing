const { test, expect } = require('@playwright/test')
const root = process.env.VISUAL_ARTIFACT_ROOT || 'artifacts/area-details'
const images = {
  fitness: 'Ronaldo.jpg', university: 'Tesla.jpg', career: 'Work.jpg', finance: 'Money.png', home: 'toscana.jpg',
  style: 'Rolex.png', food: 'cooking.jpg', creative: 'Tutto passo.png', travel: 'Polo 1.jpg', personal: 'personal.jpg',
}
const kinds = ['tasks', 'goals', 'habits']

async function login(page) {
  await page.goto('/login')
  await page.getByLabel('Email').fill(process.env.SMOKE_EMAIL)
  await page.getByLabel('Password', { exact: false }).fill(process.env.SMOKE_PASSWORD)
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await expect(page).toHaveURL(/\/today$/, { timeout: 15000 })
}

async function api(page, route, method = 'GET', body) {
  return page.evaluate(async ({ route, method, body }) => {
    const headers = { 'Content-Type': 'application/json', ClientActionId: crypto.randomUUID() }
    if (method !== 'GET') headers['X-CSRF-TOKEN'] = (await (await fetch('/api/v1/auth/csrf')).json()).requestToken
    const response = await fetch(`/api/v1${route}`, { method, headers, ...(body !== undefined && { body: JSON.stringify(body) }) })
    if (!response.ok) throw new Error(`${method} ${route} returned ${response.status}`)
    return response.status === 204 ? null : response.json()
  }, { route, method, body })
}

async function ready(page, name) {
  await expect(page.getByRole('heading', { level: 1, name, exact: true })).toBeVisible()
  await expect(page.getByText(/^Loading.*|^Checking your workspace/)).toHaveCount(0)
}

async function seed(page, areas, prefix) {
  const day = await api(page, '/today')
  for (const area of areas) {
    for (const kind of kinds) {
      const body = { title: `${prefix} ${area.key} ${kind}`, lifeAreaId: area.id }
      if (kind === 'tasks') Object.assign(body, { plannedDate: day.localDate, priority: 'Normal' })
      if (kind === 'goals') body.state = 'Active'
      if (kind === 'habits') Object.assign(body, { isActive: true, xpPerLog: 10, schedule: { pattern: 'Daily', effectiveFromDate: day.localDate } })
      await api(page, `/${kind}`, 'POST', body)
    }
  }
}

test('all ten Life Area cards open their own overview, artwork and genuinely scoped tabs', async ({ page }) => {
  test.setTimeout(180000)
  await login(page)
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  const areas = await api(page, '/areas')
  expect(areas).toHaveLength(10)
  await page.goto('/areas/fitness')
  await ready(page, areas.find(area => area.key === 'fitness').displayName)
  for (const kind of kinds) {
    await expect(page.getByRole('region', { name: 'Overview', exact: true }).locator(`a[href="/areas/fitness/${kind}"]`)).toContainText('0')
  }
  for (const [kind, emptyTitle] of [['tasks', 'No matching tasks'], ['goals', 'What would you like to move toward?'], ['habits', 'Start with something small']]) {
    await page.goto(`/areas/fitness/${kind}`)
    await expect(page.getByRole('heading', { name: emptyTitle, exact: true })).toBeVisible()
  }
  await seed(page, areas, 'Area route')
  const requests = []
  page.on('request', request => {
    const url = new URL(request.url())
    if (kinds.some(kind => url.pathname === `/api/v1/${kind}`)) requests.push({ kind: url.pathname.split('/').at(-1), areaId: url.searchParams.get('areaId') })
  })
  for (const area of areas) {
    await page.goto('/areas')
    const card = page.locator(`section[data-area="${area.key}"]`)
    const mainLink = card.getByRole('heading').getByRole('link')
    await expect(mainLink).toHaveAttribute('href', `/areas/${area.key}`)
    await card.locator('img').scrollIntoViewIfNeeded()
    const imageBox = await card.locator('img').boundingBox()
    await page.mouse.click(imageBox.x + imageBox.width / 2, imageBox.y + imageBox.height / 2)
    await expect(page).toHaveURL(new RegExp(`/areas/${area.key}$`))
    await ready(page, area.displayName)
    const artwork = page.locator('main img').first()
    await expect(artwork).toHaveAttribute('src', `/images/${images[area.key]}`)
    await expect.poll(() => artwork.evaluate(image => image.complete && image.naturalWidth > 0)).toBe(true)
    const navigation = page.getByRole('navigation', { name: 'Life Area navigation' })
    await expect(navigation.getByRole('link', { name: 'Overview', exact: true })).toHaveAttribute('aria-current', 'page')
    const startingRequest = requests.length
    for (const kind of kinds) {
      await navigation.locator(`a[href="/areas/${area.key}/${kind}"]`).click()
      await expect(page).toHaveURL(new RegExp(`/areas/${area.key}/${kind}$`))
      await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1)
      await expect(page.getByRole('link', { name: `Area route ${area.key} ${kind}`, exact: true }).first()).toBeVisible()
      await expect(page.getByLabel('Life Area filter')).toHaveCount(0)
      for (const other of areas.filter(other => other.id !== area.id)) {
        await expect(page.getByRole('link', { name: `Area route ${other.key} ${kind}`, exact: true })).toHaveCount(0)
      }
    }
    expect(requests.slice(startingRequest).length).toBeGreaterThan(0)
    expect(requests.slice(startingRequest).every(request => request.areaId === area.id)).toBe(true)
    await page.reload()
    await expect(page.getByRole('link', { name: `Area route ${area.key} habits`, exact: true }).first()).toBeVisible()
    await page.getByRole('link', { name: 'Back to Life Areas', exact: true }).click()
    await expect(page).toHaveURL(/\/areas$/)
  }
  expect(errors).toEqual([])
})

test('direct area routes retain scope through malicious queries, reset, rename and inactive state', async ({ page }) => {
  test.setTimeout(90000)
  await login(page)
  const areas = await api(page, '/areas')
  const area = areas.find(area => area.key === 'food')
  const other = areas.find(area => area.key === 'university')
  await seed(page, [area, other], 'Scope guard')
  for (const kind of kinds) {
    await page.goto(`/areas/food/${kind}?areaId=${other.id}&view=today`)
    await ready(page, area.displayName)
    await expect(page.getByRole('link', { name: `Scope guard food ${kind}`, exact: true }).first()).toBeVisible()
    await expect(page.getByRole('link', { name: `Scope guard university ${kind}`, exact: true })).toHaveCount(0)
    await expect(page.getByLabel('Life Area filter')).toHaveCount(0)
  }
  await page.goto(`/areas/food/tasks?areaId=${other.id}&search=unfindable-test-phrase`)
  await expect(page.getByRole('heading', { name: 'No matching tasks', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Reset filters', exact: true }).click()
  await expect(page).toHaveURL(/\/areas\/food\/tasks$/)
  await expect(page.getByRole('link', { name: 'Scope guard food tasks', exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Scope guard university tasks', exact: true })).toHaveCount(0)
  await page.getByRole('navigation', { name: 'Life Area navigation' }).getByRole('link', { name: 'Overview', exact: true }).click()
  await page.goBack()
  await expect(page).toHaveURL(/\/areas\/food\/tasks$/)
  await expect(page.getByRole('link', { name: 'Scope guard food tasks', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Capture a task', exact: true }).click()
  const capture = page.getByRole('dialog', { name: 'Capture a task', exact: true })
  await capture.getByLabel('Task title', { exact: false }).fill('Fictional task captured inside Food')
  await capture.getByRole('button', { name: 'Add to Inbox', exact: true }).click()
  await expect(capture.getByRole('status')).toContainText('Task captured.')
  expect((await api(page, '/tasks?search=Fictional%20task%20captured%20inside%20Food')).items[0].lifeAreaId).toBe(area.id)
  await page.keyboard.press('Escape')
  await api(page, `/areas/${area.id}`, 'PATCH', { displayName: 'Fictional kitchen practice', isActive: false })
  try {
    await page.goto('/areas/food')
    await ready(page, 'Fictional kitchen practice')
    await expect(page.locator('main img').first()).toHaveAttribute('src', '/images/cooking.jpg')
    await expect(page.getByText('Inactive', { exact: true })).toBeVisible()
    await page.getByRole('navigation', { name: 'Life Area navigation' }).getByRole('link', { name: 'Tasks', exact: true }).click()
    await expect(page.getByRole('link', { name: 'Scope guard food tasks', exact: true })).toBeVisible()
  } finally {
    await api(page, `/areas/${area.id}`, 'PATCH', { displayName: area.displayName, isActive: area.isActive })
  }
  await page.goto('/areas/not-a-real-area/tasks')
  await ready(page, 'Life Area not found')
  await expect(page.getByRole('link', { name: 'Scope guard food tasks', exact: true })).toHaveCount(0)
  await page.getByRole('link', { name: 'Back to Life Areas', exact: true }).click()
  await expect(page).toHaveURL(/\/areas$/)
})

test('Finance overview discovers subscriptions and shared area layout reflows in both themes', async ({ page, browserName }) => {
  test.setTimeout(120000)
  await login(page)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/areas')
  await page.locator('section[data-area="finance"]').getByRole('heading').getByRole('link').click()
  await ready(page, 'Finance')
  await page.getByRole('link', { name: 'Open subscriptions', exact: true }).click()
  await expect(page).toHaveURL(/\/areas\/finance\/subscriptions$/)
  await expect(page.getByRole('button', { name: 'Add subscription', exact: true }).first()).toBeVisible()
  await page.reload()
  await expect(page.getByRole('link', { name: 'Back to Finance overview', exact: true })).toBeVisible()
  await page.getByRole('link', { name: 'Back to Finance overview', exact: true }).click()
  await expect(page).toHaveURL(/\/areas\/finance$/)
  for (const theme of ['light', 'dark']) {
    await api(page, '/settings', 'PATCH', { theme })
    await page.reload()
    await ready(page, 'Finance')
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme)
    for (const width of [1440, 1280, 1024, 768, 430, 390]) {
      await page.setViewportSize({ width, height: 900 })
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
      const navigation = page.getByRole('navigation', { name: 'Life Area navigation' })
      for (const label of ['Overview', 'Tasks', 'Goals', 'Habits', 'Subscriptions']) {
        await expect(navigation.getByRole('link', { name: label, exact: true })).toBeVisible()
      }
      await page.screenshot({ path: `${root}/${browserName}/finance-overview-${theme}-${width}.png`, fullPage: true, animations: 'disabled' })
    }
  }
  await page.evaluate(() => { document.documentElement.style.fontSize = '200%' })
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  const subscriptions = page.getByRole('navigation', { name: 'Life Area navigation' }).getByRole('link', { name: 'Subscriptions', exact: true })
  await subscriptions.focus()
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/\/areas\/finance\/subscriptions$/)
  await api(page, '/settings', 'PATCH', { theme: 'light' })
})
