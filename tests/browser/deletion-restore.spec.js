const { test, expect } = require('@playwright/test')
const AxeBuilder = require('@axe-core/playwright').default
const fs = require('node:fs')
const path = require('node:path')
const root = process.env.VISUAL_ARTIFACT_ROOT || 'artifacts/deletion-browser'

async function login(page) {
  await page.goto('/login')
  await page.getByLabel('Email', { exact: false }).fill(process.env.SMOKE_EMAIL)
  await page.getByLabel('Password', { exact: false }).fill(process.env.SMOKE_PASSWORD)
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await expect(page).toHaveURL(/\/today$/)
}

async function api(page, route, method = 'GET', body) {
  return page.evaluate(async ({ route, method, body }) => {
    const headers = { 'Content-Type': 'application/json', ClientActionId: crypto.randomUUID() }
    if (method !== 'GET') headers['X-CSRF-TOKEN'] = (await (await fetch('/api/v1/auth/csrf')).json()).requestToken
    const response = await fetch('/api/v1' + route, { method, headers, ...(body !== undefined && { body: JSON.stringify(body) }) })
    if (!response.ok) throw new Error(`${method} ${route}: ${response.status}`)
    return response.status === 204 ? null : response.json()
  }, { route, method, body })
}

async function evidence(page, name, audit = true) {
  await page.evaluate(() => document.fonts.ready)
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({ path: `${root}/${name}.png`, fullPage: await page.getByRole('dialog').count() === 0, animations: 'disabled' })
  fs.writeFileSync(`${root}/${name}.aria.txt`, await page.locator('body').ariaSnapshot())
  if (audit) {
    const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze()
    fs.writeFileSync(`${root}/${name}.axe.json`, JSON.stringify(result, null, 2))
    expect(result.violations.map(v => ({ id: v.id, impact: v.impact, nodes: v.nodes.map(n => n.target) })), name).toEqual([])
    // axe cannot always resolve native top-layer dialogs or scrolled tabs.
    // Independently check their computed opaque foreground/background contrast.
    const contrast = []
    for (const item of result.incomplete.filter(item => item.id === 'color-contrast')) {
      for (const node of item.nodes) {
        const colors = await page.locator(node.target[0]).evaluate(element => {
          const style = getComputedStyle(element)
          let parent = element
          while (parent) {
            const background = getComputedStyle(parent).backgroundColor
            const rgba = background.match(/[\d.]+/g)?.map(Number)
            if (rgba && (rgba.length === 3 || rgba[3] === 1)) return { foreground: style.color, background,
              large: parseFloat(style.fontSize) >= 24 || parseFloat(style.fontSize) >= 18.66 && parseInt(style.fontWeight) >= 700 }
            parent = parent.parentElement
          }
          return null
        })
        expect(colors, node.target.join(' ')).not.toBeNull()
        const luminance = color => color.match(/[\d.]+/g).slice(0, 3).map(Number).map(c => c / 255)
          .map(c => c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
          .reduce((total, c, i) => total + c * [0.2126, 0.7152, 0.0722][i], 0)
        const values = [luminance(colors.foreground), luminance(colors.background)].sort((a, b) => b - a)
        const ratio = (values[0] + 0.05) / (values[1] + 0.05)
        contrast.push({ target: node.target, ...colors, ratio })
        expect(ratio, `${name}: ${node.target}`).toBeGreaterThanOrEqual(colors.large ? 3 : 4.5)
      }
    }
    fs.writeFileSync(`${root}/${name}.contrast.json`, JSON.stringify(contrast, null, 2))
  }
}

async function keyboardDialog(page) {
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  expect(await dialog.evaluate(el => el.contains(document.activeElement))).toBe(true)
  const controls = dialog.locator('button:visible:not([disabled]), input:visible:not([disabled]), select:visible:not([disabled]), textarea:visible:not([disabled])')
  await controls.last().focus()
  await page.keyboard.press('Tab')
  await expect(controls.first()).toBeFocused()
  await page.keyboard.press('Shift+Tab')
  await expect(controls.last()).toBeFocused()
  const focus = await controls.last().evaluate(el => {
    const css = getComputedStyle(el)
    return { outline: css.outlineStyle, width: parseFloat(css.outlineWidth), shadow: css.boxShadow }
  })
  expect(focus.outline !== 'none' && focus.width > 0 || focus.shadow !== 'none').toBe(true)
  const bounds = await dialog.boundingBox()
  expect(bounds.x).toBeGreaterThanOrEqual(0)
  expect(bounds.x + bounds.width).toBeLessThanOrEqual(page.viewportSize().width + 1)
  expect(await dialog.evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true)
}

async function openDeleted(page) {
  await page.getByRole('button', { name: 'Menu', exact: true }).click()
  await page.getByRole('dialog').getByRole('link', { name: 'Recently Deleted', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Recently Deleted', exact: true })).toBeVisible()
  await expect(page.getByText(/^Loading/)).toHaveCount(0)
}

async function deleteItem(page, kind, id, title, shot) {
  const singular = kind.slice(0, -1)
  const label = singular[0].toUpperCase() + singular.slice(1)
  await page.goto(`/${kind}/${id}`)
  if (kind !== 'tasks') await page.getByRole('button', { name: `Edit ${singular}`, exact: true }).click()
  await page.getByRole('button', { name: `Delete ${label}`, exact: true }).click()
  await expect(page.getByRole('dialog')).toContainText(title)
  await expect(page.getByRole('dialog')).toContainText('30 days')
  await keyboardDialog(page)
  if (shot) await evidence(page, shot)
  await page.getByRole('dialog').getByRole('button', { name: `Delete ${label}`, exact: true }).click()
  await expect(page).toHaveURL(new RegExp(`/${kind}$`))
}

for (const sample of [
  { name: 'desktop', width: 1440, height: 1000, theme: 'light' },
  { name: 'mobile', width: 390, height: 844, theme: 'dark' },
]) {
  test(`${sample.name}: custom Life Area and complete delete/restore flow with accessibility`, async ({ page, browserName }) => {
    test.setTimeout(180000)
    fs.mkdirSync(root, { recursive: true })
    const prefix = `${browserName}-${sample.name}`
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    await page.setViewportSize({ width: sample.width, height: sample.height })
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await login(page)
    await api(page, '/settings', 'PATCH', { theme: sample.theme })
    await page.goto('/areas')
    const create = page.getByRole('button', { name: 'New Life Area', exact: true })
    await create.focus()
    await page.keyboard.press('Enter')
    let dialog = page.getByRole('dialog')
    await keyboardDialog(page)
    await page.keyboard.press('Escape')
    await expect(dialog).not.toBeVisible()
    await expect(create).toBeFocused()
    await page.keyboard.press('Enter')
    const areaName = `Studio ${sample.name}`
    await dialog.getByLabel('Display name', { exact: false }).fill(areaName)
    await dialog.getByLabel('Custom image', { exact: true }).setInputFiles(path.resolve('client/public/images/Tesla.jpg'))
    await expect.poll(() => dialog.getByRole('img', { name: 'Custom image' }).evaluate(el => el.complete && el.naturalWidth > 0)).toBe(true)
    const slider = dialog.getByLabel('Horizontal focus')
    await slider.focus()
    await page.keyboard.press('ArrowLeft')
    await expect(slider).toHaveValue('49')
    await evidence(page, `${prefix}-01-create-area`)
    await dialog.getByRole('button', { name: 'Create Life Area', exact: true }).click()
    await expect(dialog).not.toBeVisible()
    let area = (await api(page, '/areas')).find(a => a.displayName === areaName)
    expect(area.imageFocalX).toBe(49)
    const card = page.locator(`section[data-area="${area.key}"]`)
    await expect(card.locator('img')).toHaveAttribute('src', /\/api\/v1\/areas\/.*\/image/)
    await page.reload()
    await card.getByRole('button', { name: `Edit Life Area: ${areaName}` }).click()
    await dialog.getByLabel('Display name', { exact: false }).fill(`${areaName} renamed`)
    await dialog.getByRole('button', { name: 'Save changes' }).click()
    await expect(dialog).not.toBeVisible()
    area = (await api(page, '/areas')).find(a => a.id === area.id)
    await card.getByRole('heading').getByRole('link').click()
    await evidence(page, `${prefix}-02-custom-overview`)

    await page.goto(`/areas/${area.key}/goals`)
    await page.getByRole('button', { name: 'New goal' }).click()
    await dialog.getByLabel('Goal title', { exact: false }).fill(`${sample.name} portfolio`)
    await expect(dialog.getByLabel('Life Area', { exact: true })).toHaveValue(area.id)
    await dialog.getByRole('button', { name: 'Create goal' }).click()
    await expect(page).toHaveURL(/\/goals\/[a-f0-9-]+$/)
    const goalId = page.url().split('/').at(-1)
    await page.getByLabel('Progress note').fill('First draft recorded')
    await page.getByRole('button', { name: 'Record progress', exact: true }).click()
    await expect(page.getByRole('region', { name: 'Progress history' })).toContainText('First draft recorded')

    await page.goto(`/areas/${area.key}/habits`)
    await page.locator('main header').getByRole('button', { name: 'New habit', exact: true }).click()
    await dialog.getByLabel('Habit title', { exact: false }).fill(`${sample.name} reading`)
    await expect(dialog.getByLabel('Life Area', { exact: true })).toHaveValue(area.id)
    await dialog.getByLabel('XP per completion').fill('75')
    await dialog.getByRole('button', { name: 'Create habit' }).click()
    await expect(page).toHaveURL(/\/habits\/[a-f0-9-]+$/)
    const habitId = page.url().split('/').at(-1)
    await page.getByRole('button', { name: 'Log completion', exact: true }).click()
    await expect(page.getByRole('button', { name: 'Undo completion' })).toBeVisible()

    const today = (await api(page, '/today')).localDate
    await page.goto(`/tasks/new?areaId=${area.id}`)
    await page.getByLabel('Title', { exact: false }).fill(`${sample.name} draft`)
    await expect(page.getByLabel('Life Area', { exact: true })).toHaveValue(area.id)
    await page.getByLabel('Goal', { exact: true }).selectOption(goalId)
    await page.getByLabel('Planned date').fill(today)
    await page.getByLabel('Priority', { exact: true }).selectOption('High')
    await page.getByRole('button', { name: 'Create task' }).click()
    await expect(page).toHaveURL(/\/tasks\/[a-f0-9-]+$/)
    const taskId = page.url().split('/').at(-1)
    await page.getByRole('link', { name: 'Focus on this task' }).click()
    await page.getByRole('button', { name: 'Start focus', exact: true }).click()
    await expect(page.getByRole('timer')).toBeVisible()
    const focusId = (await api(page, '/focus-sessions/active')).session.id
    const xp = (await api(page, '/progress')).progress.totalXp

    await deleteItem(page, 'tasks', taskId, `${sample.name} draft`, `${prefix}-03-delete-task`)
    expect((await api(page, '/focus-sessions/active')).session).toBeNull()
    expect((await api(page, '/focus-sessions')).items.find(s => s.id === focusId).status).toBe('Stopped')
    await deleteItem(page, 'habits', habitId, `${sample.name} reading`, `${prefix}-04-delete-habit`)
    await deleteItem(page, 'goals', goalId, `${sample.name} portfolio`, `${prefix}-05-delete-goal`)
    await page.goto('/today')
    const day = await api(page, '/today')
    expect(day.tasks.some(t => t.id === taskId)).toBe(false)
    expect(day.habits.some(h => h.id === habitId)).toBe(false)
    expect(day.goals.some(g => g.goal.id === goalId)).toBe(false)
    await expect(page.getByRole('link', { name: `${sample.name} draft`, exact: true })).toHaveCount(0)
    await page.getByRole('button', { name: 'Search', exact: true }).click()
    await dialog.getByLabel('Search your workspace').fill(`${sample.name} draft`)
    await expect(dialog.getByText('No matching records. Try another word.')).toBeVisible()
    await page.keyboard.press('Escape')
    await openDeleted(page)
    await evidence(page, `${prefix}-06-recently-deleted`)
    for (const [category, title] of [['Tasks', `${sample.name} draft`], ['Habits', `${sample.name} reading`], ['Goals', `${sample.name} portfolio`]]) {
      await page.getByRole('navigation', { name: 'Recently Deleted' }).getByRole('button', { name: category, exact: true }).click()
      const row = page.locator('main li').filter({ has: page.getByText(title, { exact: true }) })
      await expect(row).toContainText('30 days')
      await expect(row).toContainText('Deleted today')
      await row.getByRole('button', { name: 'Restore', exact: true }).focus()
      await page.keyboard.press('Enter')
      await expect(row).toHaveCount(0)
    }
    expect(await api(page, `/tasks/${taskId}`)).toMatchObject({ lifeAreaId: area.id, goalId, priority: 'High', plannedDate: today })
    expect((await api(page, `/habits/${habitId}/logs`)).total).toBe(1)
    expect((await api(page, `/goals/${goalId}/progress`)).total).toBe(1)
    expect((await api(page, '/progress')).progress.totalXp).toBe(xp)

    await page.goto('/areas')
    await card.getByRole('button', { name: `Edit Life Area: ${area.displayName}` }).click()
    await dialog.getByRole('button', { name: 'Delete Life Area', exact: true }).click()
    await expect(dialog).toContainText('1 Tasks, 1 Habits and 1 Goals')
    await expect(dialog).toContainText('Unassigned')
    await expect(dialog).toContainText('30 days')
    await keyboardDialog(page)
    await evidence(page, `${prefix}-07-delete-area`)
    await dialog.getByRole('button', { name: 'Cancel', exact: true }).click()
    await expect(card).toBeVisible()
    await card.getByRole('button', { name: `Edit Life Area: ${area.displayName}` }).click()
    await dialog.getByRole('button', { name: 'Delete Life Area', exact: true }).click()
    await dialog.getByRole('button', { name: 'Delete Life Area', exact: true }).click()
    await expect(card).toHaveCount(0)
    await page.goto(`/tasks/${taskId}`)
    await expect(page.getByLabel('Life Area', { exact: true }).locator('option:checked')).toHaveText('Unassigned')
    expect((await api(page, `/tasks/${taskId}`)).lifeAreaId).toBe(area.id)
    await openDeleted(page)
    const areaRow = page.locator('main li').filter({ has: page.getByText(area.displayName, { exact: true }) })
    await areaRow.getByRole('button', { name: 'Restore', exact: true }).click()
    await expect(areaRow).toHaveCount(0)
    await page.getByRole('button', { name: 'Menu', exact: true }).click()
    await dialog.getByRole('link', { name: 'Life Areas', exact: true }).click()
    await expect(card).toBeVisible()
    await card.scrollIntoViewIfNeeded()
    await expect.poll(() => card.locator('img').evaluate(el => el.complete && el.naturalWidth > 0)).toBe(true)
    await card.getByRole('button', { name: `Edit Life Area: ${area.displayName}` }).click()
    await dialog.getByRole('button', { name: 'Remove image', exact: true }).click()
    await dialog.getByRole('button', { name: 'Save changes', exact: true }).click()
    await expect(dialog).not.toBeVisible()
    await expect(card.locator('img')).toHaveCount(0)
    await card.getByRole('button', { name: `Edit Life Area: ${area.displayName}` }).click()
    await dialog.getByLabel('Custom image', { exact: true }).setInputFiles(path.resolve('client/public/images/ranks/Iron.png'))
    await dialog.getByRole('button', { name: 'Save changes', exact: true }).click()
    await expect(dialog).not.toBeVisible()
    await expect(card.locator('img')).toBeVisible()

    for (const [kind, id, title] of [['tasks', taskId, `${sample.name} draft`], ['habits', habitId, `${sample.name} reading`], ['goals', goalId, `${sample.name} portfolio`]]) {
      await deleteItem(page, kind, id, title)
    }
    await page.goto('/areas')
    await card.getByRole('button', { name: `Edit Life Area: ${area.displayName}` }).click()
    await dialog.getByRole('button', { name: 'Delete Life Area', exact: true }).click()
    await dialog.getByRole('button', { name: 'Delete Life Area', exact: true }).click()
    await expect(card).toHaveCount(0)
    await openDeleted(page)
    await evidence(page, `${prefix}-08-all-types`)
    const rows = page.locator('main li').filter({ has: page.getByRole('button', { name: 'Delete permanently', exact: true }) })
    for (let i = 0; i < 4; i++) {
      const row = rows.first()
      await row.getByRole('button', { name: 'Delete permanently', exact: true }).click()
      await expect(dialog).toContainText('This cannot be undone')
      await keyboardDialog(page)
      if (i === 0) {
        await evidence(page, `${prefix}-09-permanent-confirmation`)
        await page.keyboard.press('Escape')
        await expect(row.getByRole('button', { name: 'Delete permanently', exact: true })).toBeFocused()
        await page.keyboard.press('Enter')
      }
      await dialog.getByRole('button', { name: 'Delete permanently', exact: true }).click()
      await expect(dialog).not.toBeVisible()
      await expect(rows).toHaveCount(3 - i)
    }
    await page.reload()
    await expect(page.getByRole('heading', { name: 'Nothing here', exact: true })).toBeVisible()
    await evidence(page, `${prefix}-10-empty`)
    expect((await api(page, '/progress')).progress.totalXp).toBe(xp)
    expect(errors).toEqual([])
  })
}

test('recovery management reflows with enlarged text, narrow and landscape viewports', async ({ page, browserName }) => {
  test.setTimeout(90000)
  await login(page)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  const task = await api(page, '/tasks', 'POST', { title: 'A long recoverable task title for accessible reflow verification across smaller screens' })
  await api(page, `/tasks/${task.id}`, 'DELETE')
  for (const viewport of [{ width: 320, height: 720 }, { width: 844, height: 390 }, { width: 1440, height: 1000 }]) {
    await page.setViewportSize(viewport)
    await page.goto('/settings/recently-deleted')
    await page.evaluate(() => { document.documentElement.style.fontSize = '200%' })
    await expect(page.getByText(task.title, { exact: true })).toBeVisible()
    await evidence(page, `${browserName}-zoom-${viewport.width}`)
    await page.getByRole('button', { name: 'Delete permanently', exact: true }).click()
    await keyboardDialog(page)
    await evidence(page, `${browserName}-zoom-dialog-${viewport.width}`)
    await page.getByRole('button', { name: 'Cancel', exact: true }).click()
    await expect(page.getByText(task.title, { exact: true })).toBeVisible()
  }
})

test('upload retry and built-in Life Area deletion remain recoverable', async ({ page, browserName }) => {
  test.setTimeout(90000)
  await page.setViewportSize({ width: 390, height: 844 })
  await login(page)
  await page.goto('/areas')
  await page.getByRole('button', { name: 'New Life Area', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('Display name', { exact: false }).fill('Upload retry studio')
  await dialog.getByLabel('Custom image', { exact: true }).setInputFiles({ name: 'invalid.png', mimeType: 'image/png', buffer: Buffer.from('invalid image') })
  await dialog.getByRole('button', { name: 'Create Life Area', exact: true }).click()
  await expect(dialog.getByRole('alert')).toBeVisible()
  const created = (await api(page, '/areas')).filter(a => a.displayName === 'Upload retry studio')
  expect(created).toHaveLength(1)
  await dialog.getByLabel('Custom image', { exact: true }).setInputFiles(path.resolve('client/public/images/Tesla.jpg'))
  await dialog.getByRole('button', { name: 'Create Life Area', exact: true }).click()
  await expect(dialog).not.toBeVisible()
  const retried = (await api(page, '/areas')).filter(a => a.displayName === 'Upload retry studio')
  expect(retried).toHaveLength(1)
  expect(retried[0].id).toBe(created[0].id)
  expect(retried[0].customImageUrl).toBeTruthy()

  const area = (await api(page, '/areas')).find(a => a.key === 'university')
  const card = page.locator('section[data-area="university"]')
  await card.getByRole('button', { name: `Edit Life Area: ${area.displayName}` }).click()
  await dialog.getByLabel('Custom image', { exact: true }).setInputFiles(path.resolve('client/public/images/ranks/Iron.png'))
  await dialog.getByRole('button', { name: 'Save changes', exact: true }).click()
  await expect(dialog).not.toBeVisible()
  await expect(card.locator('img')).toHaveAttribute('src', /\/api\/v1\/areas\//)
  await card.getByRole('button', { name: `Edit Life Area: ${area.displayName}` }).click()
  await dialog.getByRole('button', { name: 'Remove image', exact: true }).click()
  await dialog.getByRole('button', { name: 'Save changes', exact: true }).click()
  await expect(dialog).not.toBeVisible()
  await expect(card.locator('img')).toHaveAttribute('src', '/images/Tesla.jpg')
  await card.getByRole('button', { name: `Edit Life Area: ${area.displayName}` }).click()
  await dialog.getByRole('button', { name: 'Delete Life Area', exact: true }).click()
  await expect(dialog).toContainText('30 days')
  await dialog.getByRole('button', { name: 'Delete Life Area', exact: true }).click()
  await expect(card).toHaveCount(0)
  await openDeleted(page)
  const row = page.locator('main li').filter({ has: page.getByText(area.displayName, { exact: true }) })
  await row.getByRole('button', { name: 'Delete permanently', exact: true }).click()
  await page.route(`**/api/v1/recently-deleted/lifeArea/${area.id}`, route => route.fulfill({ status: 503, contentType: 'application/problem+json', body: JSON.stringify({ title: 'Temporary failure' }) }))
  await dialog.getByRole('button', { name: 'Delete permanently', exact: true }).click()
  await expect(dialog.getByRole('alert')).toBeVisible()
  await evidence(page, `${browserName}-11-permanent-error`)
  await page.unroute(`**/api/v1/recently-deleted/lifeArea/${area.id}`)
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click()
  await row.getByRole('button', { name: 'Restore', exact: true }).click()
  await expect(row).toHaveCount(0)
  const restored = (await api(page, '/areas')).find(a => a.id === area.id)
  expect(restored.key).toBe('university')
  expect(restored.customImageUrl).toBeNull()
})
