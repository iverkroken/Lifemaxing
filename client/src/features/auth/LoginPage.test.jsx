import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { afterEach, expect, test, vi } from 'vitest'
import { LoginPage } from './LoginPage.jsx'
import { clearCsrfToken } from '../../shared/api/client.js'

afterEach(() => { vi.unstubAllGlobals(); clearCsrfToken() })

test('validates the login form before sending credentials', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 401,
    headers: { 'Content-Type': 'application/problem+json' } })))
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(<QueryClientProvider client={client}><MemoryRouter><LoginPage /></MemoryRouter></QueryClientProvider>)
  await screen.findByRole('heading', { name: 'Sign in' })
  await userEvent.click(screen.getByRole('button', { name: 'Sign in' }))
  expect(await screen.findByText('Enter a valid email address.')).toBeInTheDocument()
  expect(screen.getByText('Enter a valid value in this field.')).toBeInTheDocument()
  expect(fetch.mock.calls.some(([url]) => url.endsWith('/login'))).toBe(false)
  expect(fetch).toHaveBeenCalledWith('/api/v1/auth/me', expect.anything())
})

test('paste, password visibility and remember choice preserve the exact credentials on retry', async () => {
  const submissions = []
  vi.stubGlobal('fetch', vi.fn(async (url, options) => {
    if (url.endsWith('/providers')) return Response.json({ emailAvailable: false, googleEnabled: false, appleEnabled: false })
    if (url.endsWith('/csrf')) return new Response(JSON.stringify({ requestToken: 'fictional-csrf' }))
    if (url.endsWith('/login')) {
      submissions.push(JSON.parse(options.body))
      return new Response('{}', { status: 503 })
    }
    return new Response('{}', { status: 401 })
  }))
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const user = userEvent.setup()
  render(<QueryClientProvider client={client}><MemoryRouter><LoginPage /></MemoryRouter></QueryClientProvider>)
  const password = screen.getByLabelText(/Password/)
  expect(password).toHaveAttribute('autocomplete', 'current-password')
  expect(screen.getByLabelText(/Email/)).toHaveAttribute('autocomplete', 'username')
  const remember = screen.getByRole('checkbox')
  expect(remember).not.toBeChecked()
  await user.type(screen.getByLabelText(/Email/), 'fictional@example.test')
  await user.click(password)
  await user.paste('  ordinary words åøæ  ')
  await user.click(screen.getByRole('button', { name: 'Show password' }))
  expect(password).toHaveAttribute('type', 'text')
  await user.click(screen.getByRole('button', { name: 'Sign in' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('server is temporarily unavailable')
  expect(submissions[0]).toEqual({ email: 'fictional@example.test', password: '  ordinary words åøæ  ', rememberMe: false })
  await user.click(remember)
  await user.click(screen.getByRole('button', { name: 'Hide password' }))
  await user.click(screen.getByRole('button', { name: 'Sign in' }))
  expect(await screen.findByRole('alert')).toBeInTheDocument()
  expect(submissions.at(-1).rememberMe).toBe(true)
  expect(password).toHaveValue('  ordinary words åøæ  ')
})
