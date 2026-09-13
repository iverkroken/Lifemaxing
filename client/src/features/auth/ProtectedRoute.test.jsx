import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, expect, test, vi } from 'vitest'
import { ProtectedRoute } from './ProtectedRoute.jsx'

afterEach(() => vi.unstubAllGlobals())

test.each([403, 429, 503, 'network'])('session failure %s stays recoverable without redirecting to login', async status => {
  const fetcher = vi.fn()
  if (status === 'network') fetcher.mockRejectedValue(new TypeError('Failed to fetch'))
  else fetcher.mockResolvedValue(new Response('{}', { status }))
  vi.stubGlobal('fetch', fetcher)
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(<QueryClientProvider client={client}><MemoryRouter initialEntries={['/today']}><Routes>
    <Route element={<ProtectedRoute />}><Route path="today" element={<p>Workspace</p>} /></Route>
    <Route path="login" element={<p>Login destination</p>} />
  </Routes></MemoryRouter></QueryClientProvider>)
  expect(await screen.findByRole('alert')).toBeInTheDocument()
  expect(screen.queryByText('Login destination')).not.toBeInTheDocument()
  fetcher.mockResolvedValue(new Response(JSON.stringify({ id: 'fictional', email: 'fictional@example.test' })))
  await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
  expect(await screen.findByText('Workspace')).toBeInTheDocument()
})

test('only a 401 session response redirects to login', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 401 })))
  const client = new QueryClient()
  render(<QueryClientProvider client={client}><MemoryRouter initialEntries={['/today']}><Routes>
    <Route element={<ProtectedRoute />}><Route path="today" element={<p>Workspace</p>} /></Route>
    <Route path="login" element={<p>Login destination</p>} />
  </Routes></MemoryRouter></QueryClientProvider>)
  expect(await screen.findByText('Login destination')).toBeInTheDocument()
})
