import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Outlet, Route, Routes } from 'react-router'
import { afterEach, expect, test, vi } from 'vitest'
import { AreaLayout, AreaOverview } from './AreaDetail.jsx'
import { TasksPage } from '../tasks/TasksPage.jsx'
import { GoalsPage } from '../goals/GoalsPage.jsx'
import { HabitsPage } from '../habits/HabitsPage.jsx'
import { SubscriptionsPage } from '../finance/SubscriptionsPage.jsx'
import { AreaCard } from './AreaCard.jsx'

afterEach(() => vi.unstubAllGlobals())
const areas = [{ id: 'owned-finance', key: 'finance', displayName: 'My renamed finances', isActive: false },
  { id: 'owned-home', key: 'home', displayName: 'Home & Plants', isActive: true }]
function mount(path) {
  const calls = []
  const capture = vi.fn()
  vi.stubGlobal('fetch', vi.fn(async url => {
    calls.push(url)
    if (url.endsWith('/areas')) return Response.json(areas)
    if (url.endsWith('/areas/counts')) return Response.json([{ id: 'owned-finance', tasks: 4, goals: 2, habits: 1 }])
    if (url.startsWith('/api/v1/habits?')) return Response.json({ items: [{ id: 'finance-habit', lifeAreaId: 'owned-finance', title: 'Review recurring costs', isActive: true }], total: 1, page: 1, pageSize: 20 })
    if (url.endsWith('/today')) return Response.json({ localDate: '2026-09-21', currentLocalDate: '2026-09-21', habits: [
      { id: 'finance-habit', lifeAreaId: 'owned-finance', title: 'Review recurring costs', pattern: 'Daily' },
      { id: 'home-habit', lifeAreaId: 'owned-home', title: 'Water fictional plants', pattern: 'Daily' }] })
    return Response.json({ items: [], total: 0, page: 1, pageSize: 20 })
  }))
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(<QueryClientProvider client={client}><MemoryRouter initialEntries={[path]}><Routes>
    <Route element={<Outlet context={{ user: { id: 'owner' }, openCapture: capture }} />}>
      <Route path="areas/:areaKey" element={<AreaLayout />}><Route index element={<AreaOverview />} />
        <Route path="tasks" element={<TasksPage />} /><Route path="goals" element={<GoalsPage />} /><Route path="habits" element={<HabitsPage />} />
        <Route path="subscriptions" element={<SubscriptionsPage />} />
      </Route>
    </Route>
  </Routes></MemoryRouter></QueryClientProvider>)
  return { calls, capture }
}

test('renamed inactive Finance has its own overview and visible subscriptions entry', async () => {
  mount('/areas/finance')
  expect(await screen.findByRole('heading', { level: 1, name: 'My renamed finances' })).toBeVisible()
  expect(screen.getByText('Inactive')).toBeVisible()
  expect(screen.getAllByRole('link', { name: /Subscriptions/ }).every(link => link.getAttribute('href') === '/areas/finance/subscriptions')).toBe(true)
  expect(screen.getByRole('link', { name: 'Tasks', exact: true })).toHaveAttribute('href', '/areas/finance/tasks')
})

test.each(['tasks', 'goals', 'habits'])('route scope controls %s even with a conflicting query filter', async kind => {
  const { calls, capture } = mount(`/areas/finance/${kind}?areaId=owned-home&search=draft`)
  await screen.findByRole('heading', { level: 1, name: 'My renamed finances' })
  await waitFor(() => expect(calls.some(url => url.startsWith(`/api/v1/${kind}?`))).toBe(true))
  expect(calls.filter(url => url.startsWith(`/api/v1/${kind}?`)).every(url => new URL(url, 'http://test').searchParams.get('areaId') === 'owned-finance')).toBe(true)
  expect(screen.queryByLabelText('Life Area filter')).not.toBeInTheDocument()
  if (kind === 'tasks') {
    await userEvent.click(screen.getByRole('button', { name: 'Reset filters' }))
    await waitFor(() => expect(calls.filter(url => url.startsWith('/api/v1/tasks?')).at(-1)).not.toContain('search='))
    expect(calls.filter(url => url.startsWith('/api/v1/tasks?')).at(-1)).toContain('areaId=owned-finance')
    await userEvent.click(screen.getAllByRole('button', { name: 'Capture a task' })[0])
    expect(capture).toHaveBeenCalledWith(expect.objectContaining({ lifeAreaId: 'owned-finance' }))
  }
})

test('area habit today query stays in the scoped library and week', async () => {
  const { calls } = mount('/areas/finance/habits?view=today')
  expect(await screen.findByText('Review recurring costs')).toBeVisible()
  expect(screen.queryByText('Water fictional plants')).not.toBeInTheDocument()
  expect(screen.queryByRole('navigation', { name: 'Habit views' })).not.toBeInTheDocument()
  expect(calls.find(url => url.includes('/habits/week?'))).toContain('areaId=owned-finance')
})

test('unknown area does not request unfiltered private lists', async () => {
  const { calls } = mount('/areas/unknown/tasks')
  expect(await screen.findByRole('heading', { name: 'Life Area not found' })).toBeVisible()
  expect(calls.some(url => /\/tasks\?|\/goals\?|\/habits\?/.test(url))).toBe(false)
})

test('subscriptions under another area lead back to Finance without fetching costs', async () => {
  const { calls } = mount('/areas/home/subscriptions')
  expect(await screen.findByText('Subscriptions belong to Finance. Open Finance to continue.')).toBeVisible()
  expect(screen.getByRole('link', { name: 'Back to Finance overview' })).toHaveAttribute('href', '/areas/finance')
  expect(calls.some(url => url.includes('/finance/subscriptions'))).toBe(false)
})

test('card main link opens its overview while shortcuts remain separate', () => {
  render(<MemoryRouter><AreaCard area={areas[0]} counts={{ tasks: 4, goals: 2, habits: 1 }} /></MemoryRouter>)
  expect(screen.getByRole('link', { name: 'My renamed finances' })).toHaveAttribute('href', '/areas/finance')
  expect(screen.getByRole('link', { name: /Tasks/ })).toHaveAttribute('href', '/areas/finance/tasks')
})

test('custom area artwork takes priority and keeps its focal position', () => {
  const { container } = render(<MemoryRouter><AreaCard area={{ id: 'custom', key: 'custom-id', displayName: 'Writing', isActive: true,
    customImageUrl: '/api/v1/areas/custom/image?v=1', imageFocalX: 28, imageFocalY: 73 }} /></MemoryRouter>)
  const image = container.querySelector('img')
  expect(image).toHaveAttribute('src', '/api/v1/areas/custom/image?v=1')
  expect(image).toHaveStyle({ objectPosition: '28% 73%' })
})
