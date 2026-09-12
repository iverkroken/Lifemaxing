import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { afterEach, expect, test, vi } from 'vitest'
import { LoginPage } from './LoginPage.jsx'

afterEach(() => vi.unstubAllGlobals())

test('validates the login form before sending credentials', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 401,
    headers: { 'Content-Type': 'application/problem+json' } })))
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(<QueryClientProvider client={client}><MemoryRouter><LoginPage /></MemoryRouter></QueryClientProvider>)
  await screen.findByRole('heading', { name: 'Welcome back.' })
  await userEvent.click(screen.getByRole('button', { name: 'Sign in' }))
  expect(await screen.findByText('Enter a valid email address.')).toBeInTheDocument()
  expect(screen.getByText('Enter your password.')).toBeInTheDocument()
  expect(fetch).toHaveBeenCalledTimes(1)
  expect(fetch).toHaveBeenCalledWith('/api/v1/auth/me', expect.anything())
})
