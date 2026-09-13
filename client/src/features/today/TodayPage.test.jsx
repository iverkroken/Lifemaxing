import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Outlet, Route, Routes } from 'react-router'
import { afterEach, expect, test, vi } from 'vitest'
import { clearCsrfToken } from '../../shared/api/client.js'
import { TodayPage } from './TodayPage.jsx'

afterEach(() => { clearCsrfToken(); vi.unstubAllGlobals() })

test('uses server local day, displays mission and habit state, and sends completion to the API', async () => {
  let completed = false
  const fetchMock = vi.fn(async (path) => {
    if (path.endsWith('/csrf')) return Response.json({ requestToken: 'test-token' })
    if (path.endsWith('/tasks/task-1/complete')) { completed = true; return Response.json({}) }
    if (path.startsWith('/api/v1/tasks?')) return Response.json({ items: [], total: 0, page: 1, pageSize: 30 })
    return Response.json({ localDate: '2026-03-29', currentLocalDate: '2026-03-29', timeZoneId: 'Europe/Oslo', inboxCount: 2,
      mission: { taskId: 'task-1' }, tasks: [{ id: 'task-1', title: 'Most important action', priority: 'High', tier: 'Small', isCompleted: completed }], commitments: [],
      habits: [{ id: 'habit-1', title: 'Read', pattern: 'WeeklyCount', weeklyTarget: 3, weekCompletions: 2, activeLogId: null, targetReached: false }] })
  })
  vi.stubGlobal('fetch', fetchMock)
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(<QueryClientProvider client={client}><MemoryRouter><Routes><Route element={<Outlet context={{ user: { id: 'owner' } }} />}>
    <Route index element={<TodayPage />} /></Route></Routes></MemoryRouter></QueryClientProvider>)
  expect(await screen.findByText('2026-03-29 · Europe/Oslo')).toBeInTheDocument()
  expect(screen.getByText('2 / 3 this week')).toBeInTheDocument()
  await userEvent.click(screen.getByRole('button', { name: 'Complete mission' }))
  expect(await screen.findByText('Mission completed.')).toBeInTheDocument()
  expect(fetchMock).toHaveBeenCalledWith('/api/v1/tasks/task-1/complete', expect.objectContaining({ method: 'POST' }))
})
