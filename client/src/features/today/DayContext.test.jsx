import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Outlet, Route, Routes } from 'react-router'
import { afterEach, expect, test, vi } from 'vitest'
import { EmptyDay } from './DayContext.jsx'

afterEach(() => vi.unstubAllGlobals())

function show(fetcher) {
  vi.stubGlobal('fetch', vi.fn(fetcher))
  const openCapture = vi.fn()
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(<QueryClientProvider client={client}><MemoryRouter><Routes>
    <Route element={<Outlet context={{ user: { id: 'fictional' }, openCapture }} />}>
      <Route index element={<EmptyDay date="2026-09-13" openPicker={vi.fn()} />} />
    </Route></Routes></MemoryRouter></QueryClientProvider>)
  return openCapture
}

test('new account has one compact start with correctly contextual creation', async () => {
  const capture = show(async () => Response.json({ total: 0, items: [] }))
  await screen.findByRole('region', { name: 'Get started' })
  await userEvent.click(screen.getByRole('button', { name: 'Add a task' }))
  expect(capture).toHaveBeenLastCalledWith({ date: '2026-09-13' })
  await userEvent.click(screen.getByRole('button', { name: 'Add a habit' }))
  expect(capture).toHaveBeenLastCalledWith({ kind: 'habit' })
  await userEvent.click(screen.getByRole('button', { name: 'Add a goal' }))
  expect(capture).toHaveBeenLastCalledWith({ kind: 'goal' })
})

test('archived work distinguishes an empty day from a new account', async () => {
  show(async path => Response.json({ total: path.includes('status=archived') ? 1 : 0, items: [] }))
  expect(await screen.findByRole('region', { name: 'Empty day' })).toBeVisible()
  expect(screen.queryByText('Start with one task')).not.toBeInTheDocument()
})

test('failed workspace lookup never becomes a fabricated empty account', async () => {
  show(async () => Response.json({}, { status: 503 }))
  expect(await screen.findByRole('alert')).toHaveTextContent('Your workspace could not be checked.')
  expect(screen.queryByRole('region', { name: 'Get started' })).not.toBeInTheDocument()
})
