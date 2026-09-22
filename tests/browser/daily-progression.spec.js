const { test, expect } = require('@playwright/test')
const root = process.env.VISUAL_ARTIFACT_ROOT || 'artifacts/daily-progression'

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

test('daily capture, planning, habit completion and Focus share real entities', async ({ page }) => {
  test.setTimeout(90000)
  test.skip(process.env.SMOKE_RESTART === '1', 'Run before the restart check.')
  await login(page)
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  const day = await api(page, '/today')
  const area = (await api(page, '/areas'))[0]
  const goal = await api(page, '/goals', 'POST', { title: 'Aster learning project', lifeAreaId: area.id })
  await api(page, '/goals', 'POST', { title: 'Another active outcome' })
  await api(page, '/habits', 'POST', { title: 'Read thoughtfully', lifeAreaId: area.id, xpPerLog: 75 })
  await page.reload()
  await page.getByRole('region', { name: 'Tasks Today', exact: true }).getByRole('button', { name: 'Add a task' }).first().click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('Task title', { exact: false }).fill('Review the next chapter')
  await dialog.getByLabel('Life Area', { exact: true }).selectOption(area.id)
  await dialog.getByText('More details', { exact: true }).click()
  await dialog.getByLabel('Goal', { exact: true }).selectOption(goal.id)
  await dialog.getByRole('button', { name: 'Add to today', exact: true }).click()
  await expect(dialog.getByText('Task captured.')).toBeVisible()
  await page.keyboard.press('Escape')
  let task = (await api(page, '/tasks')).items.find(item => item.title === 'Review the next chapter')
  expect(task.plannedDate).toBe(day.localDate)
  expect(task.lifeAreaId).toBe(area.id)
  expect(task.goalId).toBe(goal.id)
  expect((await api(page, '/focus-sessions/active')).session).toBeNull()
  const tasks = page.getByRole('region', { name: 'Tasks Today', exact: true })
  await expect(tasks.getByRole('link', { name: task.title })).toBeVisible()
  const goals = page.getByRole('region', { name: "Today's Goals", exact: true })
  await expect(goals.getByText(goal.title, { exact: true })).toBeVisible()
  await expect(goals.getByText('Another active outcome')).toHaveCount(0)
  for (const mode of ['Simple', 'ThreeThreeThree', 'Custom', 'FocusedDay']) {
    await page.getByLabel('Planning mode', { exact: true }).selectOption(mode)
    await expect(page.getByText('Planning mode saved.')).toBeVisible()
    expect((await api(page, `/tasks/${task.id}`)).plannedDate).toBe(day.localDate)
  }
  await page.getByRole('checkbox', { name: 'Log completion: Read thoughtfully' }).click()
  await expect(page.getByRole('checkbox', { name: 'Undo completion: Read thoughtfully' })).toBeChecked()
  expect((await api(page, '/progress')).progress.totalXp).toBe(75)
  await tasks.getByRole('link', { name: 'Focus', exact: true }).click()
  await page.getByRole('button', { name: 'Start focus', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Pause', exact: true })).toBeVisible()
  await expect(page.getByRole('timer')).toBeVisible()
  expect((await api(page, '/focus-sessions/active')).session.taskId).toBe(task.id)
  await page.getByRole('button', { name: 'Session actions' }).click()
  await page.getByRole('button', { name: 'Complete task & finish' }).click()
  await expect(page.getByRole('button', { name: 'Start focus', exact: true })).toBeVisible()
  task = await api(page, `/tasks/${task.id}`)
  expect(task.isCompleted).toBe(true)
  expect(task.goalId).toBe(goal.id)
  await page.goto(`/goals/${goal.id}`)
  await page.getByRole('button', { name: 'Add to today', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Remove selection' })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('button', { name: 'Remove selection' })).toBeVisible()
  await page.goto('/progress')
  await expect(page.getByRole('img', { name: 'Iron rank emblem' })).toBeVisible()
  await page.getByRole('link', { name: /View rank system/ }).click()
  await expect(page.getByRole('img', { name: /rank emblem/ })).toHaveCount(10)
  await expect(page.getByText('Current · Iron IV')).toBeVisible()
  await page.goto('/focus')
  await page.getByRole('button', { name: '+ Choose task, goal or habit' }).click()
  await page.getByRole('radio', { name: 'Goals', exact: true }).check()
  await page.getByRole('button', { name: /Aster learning project/ }).click()
  await page.getByRole('button', { name: 'Choose item', exact: true }).click()
  await page.getByRole('button', { name: 'Start focus', exact: true }).click()
  await page.getByRole('button', { name: 'Pause' }).click()
  await expect(page.getByRole('button', { name: 'Resume' })).toBeVisible()
  expect((await api(page, '/focus-sessions/active')).session.goalId).toBe(goal.id)
  expect(errors).toEqual([])
})

test('Today, Focus and progression remain readable across sizes, themes and languages', async ({ page, browserName }) => {
  test.setTimeout(120000)
  test.skip(process.env.SMOKE_RESTART === '1', 'Run before the restart check.')
  await login(page)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  const cases = [
    { width: 1440, height: 1000, theme: 'light', density: 'normal', uiLanguage: 'en' },
    { width: 820, height: 1180, theme: 'dark', density: 'compact', uiLanguage: 'nb' },
    { width: 390, height: 844, theme: 'light', density: 'normal', uiLanguage: 'sv' },
    { width: 390, height: 844, theme: 'system', density: 'compact', uiLanguage: 'da' },
  ]
  for (const sample of cases) {
    await api(page, '/settings', 'PATCH', sample)
    await page.setViewportSize({ width: sample.width, height: sample.height })
    for (const route of ['today', 'focus', 'progress', 'progress/ranks']) {
      await page.goto('/' + route)
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
      await expect(page.getByRole('alert')).toHaveCount(0)
      await page.evaluate(() => document.fonts.ready)
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
      if (route.includes('progress')) {
        const emblems = page.locator('img[src^="/images/ranks/"]')
        await expect(emblems).toHaveCount(route.endsWith('ranks') ? 10 : 1)
        await emblems.evaluateAll(images => Promise.all(images.map(image => { image.loading = 'eager'; return image.decode() })))
        expect(await emblems.first().evaluate(image => getComputedStyle(image).objectFit)).toBe('contain')
        expect((await emblems.first().boundingBox()).width).toBeGreaterThan(150)
      }
      await page.screenshot({ path: `${root}/${browserName}-${sample.width}-${sample.uiLanguage}-${route.replace('/', '-')}.png`, fullPage: true, animations: 'disabled' })
    }
  }
  await api(page, '/settings', 'PATCH', { theme: 'system', density: 'normal', uiLanguage: 'en' })
})

test('daily selections, completion and goal Focus survive an API restart', async ({ page }) => {
  test.skip(process.env.SMOKE_RESTART !== '1', 'The isolated runner restarts the API first.')
  await login(page)
  const day = await api(page, '/today')
  expect(day.tasks.find(task => task.title === 'Review the next chapter').isCompleted).toBe(true)
  expect(day.habits.find(habit => habit.title === 'Read thoughtfully').activeLogId).toBeTruthy()
  const goal = day.goals.find(row => row.goal.title === 'Aster learning project')
  expect(goal.manuallySelected).toBe(true)
  expect(goal.plannedTaskCount).toBe(1)
  await page.goto('/focus')
  await expect(page.getByText('Aster learning project', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Continue on this device' }).click()
  await expect(page.getByRole('button', { name: 'Resume' })).toBeVisible()
  expect((await api(page, '/focus-sessions/active')).session.goalId).toBe(goal.goal.id)
  await page.getByRole('button', { name: 'Stop' }).click()
  await expect(page.getByRole('button', { name: 'Start focus' })).toBeVisible()
})
