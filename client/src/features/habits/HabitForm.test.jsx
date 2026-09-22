import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Outlet, Route, Routes } from 'react-router'
import { afterEach, expect, test, vi } from 'vitest'
import { clearCsrfToken } from '../../shared/api/client.js'
import { HabitForm } from './HabitForm.jsx'

afterEach(() => { clearCsrfToken(); vi.unstubAllGlobals() })

test.each([1, 25, 26, 75, 0, -1, 76])('habit creation validates %s XP against the displayed range', async xp => {
  const fetcher = vi.fn(async (path, request) => {
    if (path.endsWith('/csrf')) return Response.json({ requestToken: 'token' })
    if (path.endsWith('/areas')) return Response.json([])
    if (path.endsWith('/today')) return Response.json({ currentLocalDate: '2026-09-21' })
    return Response.json({ id: 'habit', ...JSON.parse(request.body) }, { status: 201 })
  })
  vi.stubGlobal('fetch', fetcher)
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  render(<QueryClientProvider client={client}><MemoryRouter><Routes><Route element={<Outlet context={{ user: { id: 'owner' } }} />}><Route index element={<HabitForm />} /></Route></Routes></MemoryRouter></QueryClientProvider>)
  await userEvent.type(screen.getByLabelText('Habit title', { exact: false }), 'A daily practice')
  const input = screen.getByLabelText('XP per completion', { exact: false })
  expect(input).toHaveAttribute('min', '1')
  expect(input).toHaveAttribute('max', '75')
  await userEvent.clear(input)
  await userEvent.type(input, String(xp))
  await userEvent.click(screen.getByRole('button', { name: 'Create habit' }))
  if (xp >= 1 && xp <= 75) {
    await screen.findByText('Habit saved.')
    const write = fetcher.mock.calls.find(([path, request]) => path.endsWith('/habits') && request.method === 'POST')
    expect(JSON.parse(write[1].body).xpPerLog).toBe(xp)
  } else {
    expect(await screen.findByText('Enter a valid number between 1 and 75.')).toBeVisible()
    expect(fetcher.mock.calls.some(([, request]) => request.body)).toBe(false)
  }
})
