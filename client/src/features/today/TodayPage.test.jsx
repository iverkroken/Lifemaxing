import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Outlet, Route, Routes } from 'react-router'
import { afterEach, expect, test, vi } from 'vitest'
import { clearCsrfToken } from '../../shared/api/client.js'
import { TodayPage } from './TodayPage.jsx'

afterEach(() => { clearCsrfToken(); vi.unstubAllGlobals() })

test('uses server local day, displays mission and habit state, and sends completion to the API', async () => {
  let completed = false
  const fetchMock = vi.fn(async (path) => {
    if (path.endsWith('/areas')) return Response.json([])
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
  expect(await screen.findByText('29 Mar 2026 · Europe/Oslo')).toBeInTheDocument()
  expect(screen.getByText('2 / 3 this week')).toBeInTheDocument()
  await userEvent.click(screen.getByRole('button', { name: 'Complete mission' }))
  expect(await screen.findByText('Mission completed.')).toBeInTheDocument()
  expect(fetchMock).toHaveBeenCalledWith('/api/v1/tasks/task-1/complete', expect.objectContaining({ method: 'POST' }))
})

test('separates intentional work from earlier tasks and keeps changed plans available', async () => {
  const tasks = [
    { id: 'mission', title: 'First thing', isCompleted: false },
    { id: 'committed', title: 'Intentional work', isCompleted: false },
    { id: 'earlier', title: 'Earlier deadline', dueDate: '2026-03-28', isCompleted: false },
    { id: 'cancelled', title: 'Changed plan', isCompleted: false },
  ]
  vi.stubGlobal('fetch', vi.fn(async path => Response.json(path.endsWith('/areas') ? [] : {
    localDate: '2026-03-30', currentLocalDate: '2026-03-29', timeZoneId: 'Europe/Oslo', inboxCount: 0,
    tasks, mission: { taskId: 'mission' }, commitments: [
      { id: 'p1', taskId: 'mission' }, { id: 'p2', taskId: 'committed' }, { id: 'p3', taskId: 'cancelled', removedAtUtc: '2026-03-29T10:00:00Z' },
    ], habits: [{ id: 'habit', title: 'Read tomorrow', pattern: 'Daily', activeLogId: null }],
  })))
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(<QueryClientProvider client={client}><MemoryRouter><Routes><Route element={<Outlet context={{ user: { id: 'owner' } }} />}>
    <Route index element={<TodayPage />} /></Route></Routes></MemoryRouter></QueryClientProvider>)
  await screen.findByText('Intentional work')
  expect(screen.getAllByRole('link', { name: 'First thing' })).toHaveLength(1)
  expect(within(screen.getByRole('region', { name: 'Daily commitments' })).getByText('Intentional work')).toBeVisible()
  expect(within(screen.getByRole('region', { name: 'Needs attention' })).getByText('Earlier deadline')).toBeVisible()
  expect(screen.getByRole('button', { name: 'Log completion: Read tomorrow' })).toBeDisabled()
  await userEvent.click(screen.getByText('Completed & changed plans · 1'))
  expect(screen.getByText('Changed plan')).toBeVisible()
})

test('recognizes a completed habit-only day without inventing task completions', async () => {
  vi.stubGlobal('fetch', vi.fn(async path => Response.json(path.endsWith('/areas') ? [] : {
    localDate: '2026-03-29', currentLocalDate: '2026-03-29', timeZoneId: 'Europe/Oslo', inboxCount: 0,
    tasks: [], commitments: [], habits: [{ id: 'habit', title: 'Read', pattern: 'Daily', activeLogId: 'log' }],
  })))
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(<QueryClientProvider client={client}><MemoryRouter><Routes><Route element={<Outlet context={{ user: { id: 'owner' } }} />}>
    <Route index element={<TodayPage />} /></Route></Routes></MemoryRouter></QueryClientProvider>)
  expect(await screen.findByText('Your planned work and habits are complete for this day.')).toBeVisible()
  expect(screen.queryByText('Start with one task')).not.toBeInTheDocument()
})
