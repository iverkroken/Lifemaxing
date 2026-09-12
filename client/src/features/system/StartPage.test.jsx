import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, test, vi } from 'vitest'
import { StartPage } from './StartPage.jsx'

afterEach(() => vi.unstubAllGlobals())

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(<QueryClientProvider client={client}><StartPage /></QueryClientProvider>)
}

test('shows real status after loading and allows a fresh check', async () => {
  let resolveResponse
  const fetch = vi.fn().mockReturnValueOnce(new Promise(resolve => { resolveResponse = resolve }))
    .mockResolvedValueOnce(new Response(JSON.stringify({ api: 'available', database: 'not_configured' })))
  vi.stubGlobal('fetch', fetch)
  renderPage()
  expect(screen.getByText('Checking your connection…')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Check again' })).toBeDisabled()
  resolveResponse(new Response(JSON.stringify({ api: 'available', database: 'available' })))
  expect(await screen.findAllByText('Connected')).toHaveLength(2)
  await userEvent.click(screen.getByRole('button', { name: 'Check again' }))
  expect(await screen.findByText('Not configured')).toBeInTheDocument()
  expect(fetch).toHaveBeenCalledWith('/api/v1/system/status', expect.objectContaining({ credentials: 'same-origin' }))
})

test('shows a persistent error and recovers when retried', async () => {
  vi.stubGlobal('fetch', vi.fn()
    .mockResolvedValueOnce(new Response(JSON.stringify({ title: 'Database unavailable.', code: 'database_unavailable' }), { status: 503 }))
    .mockResolvedValueOnce(new Response(JSON.stringify({ api: 'available', database: 'available' }))))
  renderPage()
  expect(await screen.findByRole('alert')).toHaveTextContent('could not confirm the connection')
  await userEvent.click(screen.getByRole('button', { name: 'Check again' }))
  await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument())
  expect(await screen.findAllByText('Connected')).toHaveLength(2)
})
