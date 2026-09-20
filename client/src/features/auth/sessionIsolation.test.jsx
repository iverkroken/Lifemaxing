import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useOutletContext } from 'react-router'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { useState } from 'react'
import { ProtectedRoute } from './ProtectedRoute.jsx'
import { useProductivity } from '../../shared/api/productivity.js'
import { apiRequest, clearCsrfToken } from '../../shared/api/client.js'
import { logout } from './authApi.js'
import userEvent from '@testing-library/user-event'

// jsdom has no native dialog methods; these stubs cannot verify focus or top-layer behavior.
beforeEach(() => {
  HTMLDialogElement.prototype.showModal = function () { this.open = true }
  HTMLDialogElement.prototype.close = function () { this.open = false }
})
afterEach(() => { vi.unstubAllGlobals(); clearCsrfToken() })

function Workspace() {
  const { user } = useOutletContext()
  const tasks = useProductivity('/tasks')
  const [draft, setDraft] = useState('')
  return <><p>Account {user.id}</p><p>{tasks.data?.title}</p>
    <input aria-label="Draft" value={draft} onChange={event => setDraft(event.target.value)} /></>
}

function mount() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } } })
  render(<QueryClientProvider client={client}><MemoryRouter initialEntries={['/today']}><Routes>
    <Route element={<ProtectedRoute />}><Route path="today" element={<Workspace />} /></Route>
    <Route path="login" element={<p>Login destination</p>} />
  </Routes></MemoryRouter></QueryClientProvider>)
  return client
}

test('returning to a tab after an account switch removes the previous account cache before loading private data', async () => {
  let owner = 'A'
  let releaseCheck
  vi.stubGlobal('fetch', vi.fn(async (url) => {
    if (url.endsWith('/auth/me')) {
      if (owner === 'B') await new Promise(resolve => { releaseCheck = resolve })
      return new Response(JSON.stringify({ id: owner }))
    }
    return new Response(JSON.stringify({ title: `Private ${owner}` }))
  }))
  const client = mount()
  expect(await screen.findByText('Private A')).toBeVisible()
  client.setQueryData(['settings-draft', 'A'], { locale: 'nb-NO' })
  owner = 'B'
  act(() => window.dispatchEvent(new Event('focus')))
  await waitFor(() => expect(screen.getByText('Private A')).not.toBeVisible())
  act(() => releaseCheck())
  expect(await screen.findByText('Account B')).toBeVisible()
  expect(await screen.findByText('Private B')).toBeVisible()
  expect(client.getQueryData(['settings-draft', 'A'])).toBeUndefined()
  expect(client.getQueryData(['productivity', 'A', '/tasks'])).toBeUndefined()
})

test('checking the same account preserves its unsaved form and cached data', async () => {
  let releaseCheck
  let checks = 0
  vi.stubGlobal('fetch', vi.fn(async url => {
    if (url.endsWith('/auth/me')) {
      if (checks++ > 0) await new Promise(resolve => { releaseCheck = resolve })
      return Response.json({ id: 'A' })
    }
    return Response.json({ title: 'Private A' })
  }))
  const client = mount()
  expect(await screen.findByText('Private A')).toBeVisible()
  await userEvent.type(screen.getByLabelText('Draft'), 'Unfinished thought')
  act(() => window.dispatchEvent(new Event('focus')))
  await waitFor(() => expect(screen.getByText('Private A')).not.toBeVisible())
  act(() => releaseCheck())
  await waitFor(() => expect(screen.getByText('Private A')).toBeVisible())
  expect(screen.getByLabelText('Draft')).toHaveValue('Unfinished thought')
  expect(client.getQueryData(['productivity', 'A', '/tasks'])).toEqual({ title: 'Private A' })
})

test('sign-out in another tab clears the private cache through a data-free broadcast', async () => {
  const channels = new Set()
  const messages = []
  vi.stubGlobal('BroadcastChannel', class {
    constructor(name) { this.name = name; channels.add(this) }
    postMessage(data) {
      messages.push(data)
      for (const channel of channels) if (channel !== this && channel.name === this.name) channel.onmessage?.({ data })
    }
    close() { channels.delete(this) }
  })
  let signedIn = true
  vi.stubGlobal('fetch', vi.fn(async url => {
    if (url.endsWith('/csrf')) return Response.json({ requestToken: 'fictional-token' })
    if (url.endsWith('/logout')) { signedIn = false; return new Response(null, { status: 204 }) }
    if (url.endsWith('/auth/me')) return signedIn ? Response.json({ id: 'A' }) : Response.json({}, { status: 401 })
    return Response.json({ title: 'Private A' })
  }))
  const client = mount()
  expect(await screen.findByText('Private A')).toBeVisible()
  await act(() => logout())
  expect(await screen.findByText('Login destination')).toBeVisible()
  expect(client.getQueryData(['productivity', 'A', '/tasks'])).toBeUndefined()
  expect(messages).toEqual(['changed'])
})

test('an old response and a request waiting on the session check cannot become new-account data', async () => {
  let owner = 'A'
  let releaseCheck
  let releaseOld
  const paths = []
  vi.stubGlobal('fetch', vi.fn(async url => {
    paths.push(url)
    if (url.endsWith('/auth/me')) {
      if (owner === 'B') await new Promise(resolve => { releaseCheck = resolve })
      return Response.json({ id: owner })
    }
    if (url.endsWith('/slow')) return new Promise(resolve => { releaseOld = () => resolve(Response.json({ title: 'Old response' })) })
    return Response.json({ title: `Private ${owner}` })
  }))
  mount()
  expect(await screen.findByText('Private A')).toBeVisible()
  const old = apiRequest('/slow').catch(error => error)
  await waitFor(() => expect(releaseOld).toBeTypeOf('function'))
  owner = 'B'
  act(() => window.dispatchEvent(new Event('focus')))
  await waitFor(() => expect(releaseCheck).toBeTypeOf('function'))
  const waiting = apiRequest('/must-not-send').catch(error => error)
  const passwordChange = apiRequest('/auth/change-password', { method: 'POST', body: { currentPassword: 'fictional', password: 'fictional replacement' } }).catch(error => error)
  act(() => { releaseOld(); releaseCheck() })
  expect(await old).toHaveProperty('name', 'AbortError')
  expect(await waiting).toHaveProperty('name', 'AbortError')
  expect(await passwordChange).toHaveProperty('name', 'AbortError')
  expect(paths).not.toContain('/api/v1/must-not-send')
  expect(paths).not.toContain('/api/v1/auth/change-password')
  expect(await screen.findByText('Private B')).toBeVisible()
})

test('checking the same account preserves an initial private read that is still loading', async () => {
  let releaseTask
  vi.stubGlobal('fetch', vi.fn(async url => {
    if (url.endsWith('/auth/me')) return Response.json({ id: 'A' })
    return new Promise(resolve => { releaseTask = () => resolve(Response.json({ title: 'Private A' })) })
  }))
  mount()
  await screen.findByText('Account A')
  await waitFor(() => expect(releaseTask).toBeTypeOf('function'))
  act(() => window.dispatchEvent(new Event('focus')))
  await waitFor(() => expect(screen.getByText('Account A')).toBeVisible())
  act(() => releaseTask())
  expect(await screen.findByText('Private A')).toBeVisible()
})

test('a recoverable session-check failure hides private content and retains the draft after retry', async () => {
  let unavailable = false
  vi.stubGlobal('fetch', vi.fn(async url => {
    if (url.endsWith('/auth/me')) return unavailable ? Response.json({}, { status: 503 }) : Response.json({ id: 'A' })
    return Response.json({ title: 'Private A' })
  }))
  mount()
  expect(await screen.findByText('Private A')).toBeVisible()
  await userEvent.type(screen.getByLabelText('Draft'), 'Unfinished thought')
  unavailable = true
  act(() => window.dispatchEvent(new Event('focus')))
  expect(await screen.findByRole('alert')).toBeVisible()
  expect(screen.queryByRole('textbox', { name: 'Draft' })).not.toBeInTheDocument()
  unavailable = false
  await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
  await waitFor(() => expect(screen.getByText('Private A')).toBeVisible())
  expect(screen.getByLabelText('Draft')).toHaveValue('Unfinished thought')
})
