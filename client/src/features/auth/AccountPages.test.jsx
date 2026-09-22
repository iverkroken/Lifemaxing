import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { afterEach, expect, test, vi } from 'vitest'
import { AccountPage } from './AccountPage.jsx'
import { clearCsrfToken } from '../../shared/api/client.js'

afterEach(() => { vi.unstubAllGlobals(); clearCsrfToken() })

function mount(mode, path = '/') {
  const calls = []
  vi.stubGlobal('fetch', vi.fn(async (url, options = {}) => {
    calls.push({ url, body: options.body && JSON.parse(options.body) })
    if (url.endsWith('/csrf')) return Response.json({ requestToken: 'fictional-csrf' })
    if (url.endsWith('/providers')) return Response.json({ emailAvailable: true, emailDelivery: 'development', googleEnabled: false, appleEnabled: false })
    return new Response(null, { status: 204 })
  }))
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(<QueryClientProvider client={client}><MemoryRouter initialEntries={[path]}><AccountPage mode={mode} /></MemoryRouter></QueryClientProvider>)
  return calls
}

test('registration validates passwords and describes local delivery honestly', async () => {
  const calls = mount('signup')
  const user = userEvent.setup()
  await user.type(screen.getByLabelText(/^Email/), 'fictional@example.test')
  await user.type(screen.getByLabelText(/^Password /), 'short')
  await user.type(screen.getByLabelText(/^Confirm password/), 'different')
  await user.click(screen.getByRole('button', { name: 'Create account', exact: true }))
  expect(calls.some(call => call.url.endsWith('/register'))).toBe(false)
  expect(await screen.findByText('Use 15–128 characters. Spaces and Unicode are welcome.')).toBeVisible()
  await user.clear(screen.getByLabelText(/^Password /))
  await user.type(screen.getByLabelText(/^Password /), 'A fictional long passphrase')
  await user.clear(screen.getByLabelText(/^Confirm password/))
  await user.type(screen.getByLabelText(/^Confirm password/), 'A fictional long passphrase')
  await user.click(screen.getByRole('button', { name: 'Create account', exact: true }))
  expect(await screen.findByRole('status')).toHaveTextContent('local development mailbox')
  expect(calls.find(call => call.url.endsWith('/register')).body).toEqual({ email: 'fictional@example.test', password: 'A fictional long passphrase' })
})

test('forgot password gives an account-neutral outcome', async () => {
  const calls = mount('forgot')
  const user = userEvent.setup()
  await user.type(screen.getByLabelText(/^Email/), 'unknown@example.test')
  await user.click(screen.getByRole('button', { name: 'Request reset link' }))
  expect(await screen.findByRole('status')).toHaveTextContent('If an eligible account exists')
  expect(calls.find(call => call.url.endsWith('/forgot-password')).body).toEqual({ email: 'unknown@example.test' })
})

test('verification does not submit the fragment token until the user confirms', async () => {
  const calls = mount('verify', '/verify-email#userId=dddc64de-e679-4b25-8973-66fb8418c509&token=fictional-token')
  await waitFor(() => expect(screen.getByRole('button', { name: 'Verify email' })).toBeEnabled())
  expect(calls.some(call => call.url.endsWith('/confirm-email'))).toBe(false)
  await userEvent.click(screen.getByRole('button', { name: 'Verify email' }))
  expect(await screen.findByRole('status')).toHaveTextContent('Your email is verified')
  expect(calls.find(call => call.url.endsWith('/confirm-email')).body.token).toBe('fictional-token')
})

test('a reset page without token offers recovery instead of an unusable password form', () => {
  mount('reset', '/reset-password')
  expect(screen.getByRole('alert')).toHaveTextContent('invalid or expired')
  expect(screen.getByRole('link', { name: 'Request a new link' })).toHaveAttribute('href', '/forgot-password')
  expect(screen.queryByLabelText(/^Password/)).not.toBeInTheDocument()
})
