import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, test, vi } from 'vitest'
import { clearCsrfToken } from '../../shared/api/client.js'
import { QuickAdd } from './QuickAdd.jsx'

afterEach(() => { clearCsrfToken(); vi.unstubAllGlobals() })

test('captures only a title, preserves failed input, and explicitly plans the server supplied date', async () => {
  const fetchMock = vi.fn(async (path, request) => {
    if (path.endsWith('/csrf')) return Response.json({ requestToken: 'test-token' })
    const body = JSON.parse(request.body)
    if (body.title === 'Try again') return Response.json({ title: 'The server is temporarily unavailable. Try again shortly.' }, { status: 503 })
    return Response.json({ id: 'task-1', ...body }, { status: 201 })
  })
  vi.stubGlobal('fetch', fetchMock)
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  render(<QueryClientProvider client={client}><QuickAdd date="2026-03-29" /></QueryClientProvider>)
  await userEvent.click(screen.getByRole('button', { name: 'Add to Inbox' }))
  expect(await screen.findByText('Enter a valid value in this field.')).toBeInTheDocument()
  expect(fetchMock).not.toHaveBeenCalled()
  await userEvent.type(screen.getByLabelText('Task title', { exact: false }), 'Capture thought')
  await userEvent.click(screen.getByRole('button', { name: 'Add to Inbox' }))
  await screen.findByText('Task captured.')
  expect(JSON.parse(fetchMock.mock.calls.at(-1)[1].body)).toEqual({ title: 'Capture thought' })
  expect(screen.getByLabelText('Task title', { exact: false })).toHaveValue('')
  await userEvent.type(screen.getByLabelText('Task title', { exact: false }), 'Try again')
  await userEvent.click(screen.getByRole('button', { name: 'Add to Inbox' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('The server is temporarily unavailable. Try again shortly.')
  expect(screen.getByLabelText('Task title', { exact: false })).toHaveValue('Try again')
  await userEvent.clear(screen.getByLabelText('Task title', { exact: false }))
  await userEvent.type(screen.getByLabelText('Task title', { exact: false }), 'Work today')
  await userEvent.click(screen.getByRole('button', { name: 'Add to this day' }))
  await screen.findByText('Task captured.')
  expect(JSON.parse(fetchMock.mock.calls.at(-1)[1].body)).toEqual({ title: 'Work today', plannedDate: '2026-03-29' })
})
