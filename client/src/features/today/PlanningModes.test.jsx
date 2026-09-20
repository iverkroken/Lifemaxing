import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Outlet, Route, Routes } from 'react-router'
import { afterEach, expect, test, vi } from 'vitest'
import { clearCsrfToken } from '../../shared/api/client.js'
import { TodayPage } from './TodayPage.jsx'

afterEach(() => { clearCsrfToken(); vi.unstubAllGlobals() })

test('a failed settings load keeps work visible and unlocks the selector after a successful retry', async () => {
  let available = false
  vi.stubGlobal('fetch', vi.fn(async path => {
    if (path.endsWith('/settings')) return available ? Response.json({ planningMode: 'Simple' }) : Response.json({}, { status: 500 })
    if (path.endsWith('/areas')) return Response.json([])
    if (path.endsWith('/focus-sessions/active')) return Response.json({ session: null })
    if (path.endsWith('/progress')) return Response.json({})
    return Response.json({ localDate: '2026-09-21', currentLocalDate: '2026-09-21', timeZoneId: 'UTC', inboxCount: 0,
      mission: null, tasks: [{ id: 'retained-task', title: 'Retained daily action' }], commitments: [],
      habits: [{ id: 'retained-habit', title: 'Retained routine', pattern: 'Daily' }] })
  }))
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(<QueryClientProvider client={client}><MemoryRouter><Routes><Route element={<Outlet context={{ user: { id: 'owner' }, openCapture: vi.fn() }} />}><Route index element={<TodayPage />} /></Route></Routes></MemoryRouter></QueryClientProvider>)
  const selector = await screen.findByRole('combobox', { name: 'Planning mode' })
  expect(await screen.findByRole('alert')).toHaveTextContent('could not be saved or loaded')
  expect(selector).toBeDisabled()
  expect(screen.getByText('Retained daily action')).toBeVisible()
  expect(screen.getByText('Retained routine')).toBeVisible()
  available = true
  await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
  await waitFor(() => expect(selector).toBeEnabled())
  expect(selector).toHaveValue('Simple')
  expect(screen.getByText('Retained daily action')).toBeVisible()
  expect(screen.getByText('Retained routine')).toBeVisible()
})

test('persists presentation modes while keeping the mission, daily tasks and habits', async () => {
  let mode = 'FocusedDay'
  const writes = []
  vi.stubGlobal('fetch', vi.fn(async (path, options) => {
    if (path.endsWith('/csrf')) return Response.json({ requestToken: 'token' })
    if (path.endsWith('/settings')) {
      if (options.method === 'PATCH') { mode = JSON.parse(options.body).planningMode; writes.push(path) }
      return Response.json({ planningMode: mode })
    }
    if (path.endsWith('/areas')) return Response.json([])
    if (path.endsWith('/focus-sessions/active')) return Response.json({ session: null })
    if (path.endsWith('/progress')) return Response.json({})
    return Response.json({ localDate: '2026-09-20', currentLocalDate: '2026-09-20', timeZoneId: 'UTC', inboxCount: 0,
      mission: { taskId: 'mission' }, tasks: [{ id: 'mission', title: 'Meaningful work' }, { id: 'task', title: 'Supporting task' }],
      commitments: [{ taskId: 'task' }], habits: [{ id: 'habit', title: 'Evening walk', pattern: 'Daily' }] })
  }))
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(<QueryClientProvider client={client}><MemoryRouter><Routes><Route element={<Outlet context={{ user: { id: 'owner' }, openCapture: vi.fn() }} />}><Route index element={<TodayPage />} /></Route></Routes></MemoryRouter></QueryClientProvider>)
  const selector = await screen.findByRole('combobox', { name: 'Planning mode' })
  await waitFor(() => expect(selector).toBeEnabled())
  expect(selector).toHaveValue('FocusedDay')
  for (const value of ['Simple', 'ThreeThreeThree', 'Custom', 'FocusedDay']) {
    await userEvent.selectOptions(selector, value)
    expect(await screen.findByText('Planning mode saved.')).toBeVisible()
    expect(selector).toHaveValue(value)
    expect(screen.getByText('Supporting task')).toBeVisible()
    expect(screen.getByText('Evening walk')).toBeVisible()
    if (value === 'Simple') expect(within(screen.getByRole('region', { name: 'Daily list' })).getByText('Meaningful work')).toBeVisible()
    if (value === 'ThreeThreeThree') expect(screen.getByText('Three hours of meaningful work')).toBeVisible()
  }
  expect(writes).toEqual(Array(4).fill('/api/v1/settings'))
})

test('retains the saved mode and work after a failed change and allows retry', async () => {
  let fail = true
  vi.stubGlobal('fetch', vi.fn(async (path, options) => {
    if (path.endsWith('/csrf')) return Response.json({ requestToken: 'token' })
    if (path.endsWith('/settings')) {
      if (options.method === 'PATCH') return fail ? Response.json({}, { status: 503 }) : Response.json({ planningMode: 'Simple' })
      return Response.json({ planningMode: 'FocusedDay' })
    }
    if (path.endsWith('/areas')) return Response.json([])
    if (path.endsWith('/focus-sessions/active')) return Response.json({ session: null })
    if (path.endsWith('/progress')) return Response.json({})
    return Response.json({ localDate: '2026-09-20', currentLocalDate: '2026-09-20', timeZoneId: 'UTC', inboxCount: 0,
      mission: { taskId: 'mission' }, tasks: [{ id: 'mission', title: 'Preserved mission' }], commitments: [], habits: [] })
  }))
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(<QueryClientProvider client={client}><MemoryRouter><Routes><Route element={<Outlet context={{ user: { id: 'owner' }, openCapture: vi.fn() }} />}><Route index element={<TodayPage />} /></Route></Routes></MemoryRouter></QueryClientProvider>)
  const selector = await screen.findByRole('combobox', { name: 'Planning mode' })
  await waitFor(() => expect(selector).toBeEnabled())
  await userEvent.selectOptions(selector, 'Simple')
  expect(await screen.findByRole('alert')).toHaveTextContent('Your work is unchanged.')
  expect(selector).toHaveValue('FocusedDay')
  expect(screen.getByRole('link', { name: 'Preserved mission' })).toBeVisible()
  fail = false
  await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
  await waitFor(() => expect(selector).toHaveValue('Simple'))
  expect(within(screen.getByRole('region', { name: 'Daily list' })).getByText('Preserved mission')).toBeVisible()
})
