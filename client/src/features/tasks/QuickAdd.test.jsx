import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, test, vi } from 'vitest'
import { clearCsrfToken } from '../../shared/api/client.js'
import { MemoryRouter, Outlet, Route, Routes } from 'react-router'
import { QuickAdd } from './QuickAdd.jsx'

function Capture(props) { return <MemoryRouter><Routes><Route element={<Outlet context={{ user: { id: 'owner' } }} />}><Route index element={<QuickAdd {...props} />} /></Route></Routes></MemoryRouter> }
const read = path => path.endsWith('/areas') ? [{ id: 'owned-finance', name: 'Finance' }] : { items: [], page: 1, pageSize: 30, total: 0 }
const lastWrite = mock => mock.mock.calls.filter(([, request]) => request.method === 'POST' && request.body).at(-1)

afterEach(() => { clearCsrfToken(); vi.unstubAllGlobals() })

test('submitting from Today plans the ordinary task without starting Focus', async () => {
  const fetchMock = vi.fn(async (path, request) => !request.method || request.method === 'GET' ? Response.json(read(path)) : path.endsWith('/csrf') ? Response.json({ requestToken: 'token' }) : Response.json({ id: 'created' }, { status: 201 }))
  vi.stubGlobal('fetch', fetchMock)
  const client = new QueryClient()
  render(<QueryClientProvider client={client}><Capture date="2026-09-21" /></QueryClientProvider>)
  await userEvent.type(screen.getByLabelText('Task title', { exact: false }), 'A normal task{Enter}')
  await screen.findByText('Task captured.')
  const writes = fetchMock.mock.calls.filter(([, request]) => request.method === 'POST')
  expect(writes).toHaveLength(1)
  expect(writes[0][0]).toBe('/api/v1/tasks')
  expect(JSON.parse(writes[0][1].body)).toMatchObject({ plannedDate: '2026-09-21' })
})

test('area capture preserves its actual area for Inbox and planned tasks', async () => {
  const fetchMock = vi.fn(async (path, request) => !request.method || request.method === 'GET' ? Response.json(read(path)) : path.endsWith('/csrf')
    ? Response.json({ requestToken: 'test-token' }) : Response.json({ id: 'task-1', ...JSON.parse(request.body) }, { status: 201 }))
  vi.stubGlobal('fetch', fetchMock)
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
  render(<QueryClientProvider client={client}><Capture lifeAreaId="owned-finance" date="2026-09-21" /></QueryClientProvider>)
  for (const name of ['Add to Inbox', 'Add to today']) {
    await userEvent.type(screen.getByLabelText('Task title', { exact: false }), 'Review costs')
    await userEvent.click(screen.getByRole('button', { name }))
    await screen.findByText('Task captured.')
    expect(JSON.parse(lastWrite(fetchMock)[1].body)).toMatchObject({ title: 'Review costs', lifeAreaId: 'owned-finance' })
  }
})

test('captures only a title, preserves failed input, and explicitly plans the server supplied date', async () => {
  const fetchMock = vi.fn(async (path, request) => {
    if (!request.method || request.method === 'GET') return Response.json(read(path))
    if (path.endsWith('/csrf')) return Response.json({ requestToken: 'test-token' })
    const body = JSON.parse(request.body)
    if (body.title === 'Try again') return Response.json({ title: 'The server is temporarily unavailable. Try again shortly.' }, { status: 503 })
    return Response.json({ id: 'task-1', ...body }, { status: 201 })
  })
  vi.stubGlobal('fetch', fetchMock)
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  render(<QueryClientProvider client={client}><Capture date="2026-03-29" /></QueryClientProvider>)
  await userEvent.click(screen.getByRole('button', { name: 'Add to Inbox' }))
  expect(await screen.findByText('Enter a valid value in this field.')).toBeInTheDocument()
  expect(fetchMock.mock.calls.filter(([, request]) => request.body)).toHaveLength(0)
  await userEvent.type(screen.getByLabelText('Task title', { exact: false }), 'Capture thought')
  await userEvent.click(screen.getByRole('button', { name: 'Add to Inbox' }))
  await screen.findByText('Task captured.')
  expect(JSON.parse(lastWrite(fetchMock)[1].body)).toMatchObject({ title: 'Capture thought', plannedDate: null })
  expect(screen.getByLabelText('Task title', { exact: false })).toHaveValue('')
  await userEvent.type(screen.getByLabelText('Task title', { exact: false }), 'Try again')
  await userEvent.click(screen.getByRole('button', { name: 'Add to Inbox' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('The server is temporarily unavailable. Try again shortly.')
  expect(screen.getByLabelText('Task title', { exact: false })).toHaveValue('Try again')
  await userEvent.clear(screen.getByLabelText('Task title', { exact: false }))
  await userEvent.type(screen.getByLabelText('Task title', { exact: false }), 'Work today')
  await userEvent.click(screen.getByRole('button', { name: 'Add to today' }))
  await screen.findByText('Task captured.')
  expect(JSON.parse(lastWrite(fetchMock)[1].body)).toMatchObject({ title: 'Work today', plannedDate: '2026-03-29' })
})
