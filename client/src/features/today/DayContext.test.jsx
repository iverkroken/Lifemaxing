import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Outlet, Route, Routes } from 'react-router'
import { afterEach, expect, test, vi } from 'vitest'
import { TodayPage } from './TodayPage.jsx'

afterEach(() => vi.unstubAllGlobals())

function show(failed = false) {
  const fetcher = vi.fn(async path => {
    if (path.endsWith('/areas')) return Response.json([])
    if (path.endsWith('/settings')) return Response.json({ planningMode: 'Simple' })
    if (!path.includes('/today')) return Response.json({})
    return failed ? Response.json({}, { status: 503 }) : Response.json({ localDate: '2026-09-21', currentLocalDate: '2026-09-21', timeZoneId: 'UTC', tasks: [], habits: [], goals: [], commitments: [], inboxCount: 0 })
  })
  vi.stubGlobal('fetch', fetcher)
  const openCapture = vi.fn()
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(<QueryClientProvider client={client}><MemoryRouter><Routes><Route element={<Outlet context={{ user: { id: 'fictional' }, openCapture }} />}><Route index element={<TodayPage />} /></Route></Routes></MemoryRouter></QueryClientProvider>)
  return { openCapture, fetcher }
}

test('empty sections explain their purpose and create normal contextual entities', async () => {
  const { openCapture } = show()
  const tasks = await screen.findByRole('region', { name: 'Tasks Today' })
  await userEvent.click(within(tasks).getAllByRole('button', { name: 'Add a task' })[0])
  expect(openCapture).toHaveBeenLastCalledWith({ date: '2026-09-21' })
  await userEvent.click(within(screen.getByRole('region', { name: "Today's habits" })).getAllByRole('button', { name: 'New habit' })[0])
  expect(openCapture).toHaveBeenLastCalledWith({ kind: 'habit' })
  await userEvent.click(screen.getByRole('button', { name: 'New goal' }))
  expect(openCapture).toHaveBeenLastCalledWith({ kind: 'goal' })
})

test('an empty day does not need to download task and habit archives', async () => {
  const { fetcher } = show()
  expect(await screen.findByText('No tasks planned for this day')).toBeVisible()
  expect(screen.getByText('No habits are scheduled for this day.')).toBeVisible()
  expect(screen.getByText('No goals selected for this day')).toBeVisible()
  expect(fetcher.mock.calls.some(([path]) => path.includes('archived'))).toBe(false)
})

test('failed daily lookup does not fabricate empty sections', async () => {
  show(true)
  expect(await screen.findByRole('alert')).toHaveTextContent('Your day could not be loaded.')
  expect(screen.queryByRole('region', { name: 'Tasks Today' })).not.toBeInTheDocument()
})
