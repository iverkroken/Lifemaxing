import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Outlet, Route, Routes } from 'react-router'
import { afterEach, expect, test, vi } from 'vitest'
import { clearCsrfToken } from '../../shared/api/client.js'
import { FocusPage } from './FocusPage.jsx'
import { TimeHubProvider } from './TimeHubProvider.jsx'
import { defaultPreferences } from './timeTools.js'

afterEach(() => { clearCsrfToken(); vi.unstubAllGlobals() })

function show(fetcher, path = '/focus') {
  const fetchMock = vi.fn((path, options) => {
    if (path.endsWith('/focus-runs/active')) return Promise.resolve(Response.json({ run: null }))
    if (path.endsWith('/focus-preferences')) return Promise.resolve(Response.json(defaultPreferences))
    if (path === '/api/v1/focus-runs') return Promise.resolve(Response.json({ id: 'test-run', endedAtUtc: new Date().toISOString() }))
    return fetcher(path, options)
  })
  vi.stubGlobal('fetch', fetchMock)
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(<QueryClientProvider client={client}><MemoryRouter initialEntries={[path]}><Routes>
    <Route element={<Outlet context={{ user: { id: 'fictional-focus-owner' } }} />}>
      <Route path="/focus" element={<TimeHubProvider user={{ id: 'fictional-focus-owner' }}><FocusPage /></TimeHubProvider>} />
    </Route>
  </Routes></MemoryRouter></QueryClientProvider>)
  return fetchMock
}

test('makes task and unstructured focus explicit and clears a task when choosing unstructured', async () => {
  const fetchMock = show(async (path) => {
    if (path.endsWith('/csrf')) return Response.json({ requestToken: 'test-token' })
    if (path.endsWith('/focus-sessions/active')) return Response.json({ session: null })
    if (path.endsWith('/tasks/task-1')) return Response.json({ id: 'task-1', title: 'One real task' })
    if (path.endsWith('/areas')) return Response.json([])
    if (path.includes('/tasks?')) return Response.json({ items: [{ id: 'task-1', title: 'One real task' }], page: 1, pageSize: 30, total: 1 })
    return Response.json({})
  }, '/focus?taskId=task-1')
  expect(await screen.findByText('One real task')).toBeVisible()
  await userEvent.click(screen.getByRole('button', { name: 'Remove', exact: true }))
  expect(screen.queryByLabelText('Focus task')).not.toBeInTheDocument()
  await userEvent.click(screen.getByRole('button', { name: 'Start focus' }))
  const start = fetchMock.mock.calls.find(([path]) => path === '/api/v1/focus-runs')
  expect(JSON.parse(start[1].body)).toMatchObject({ configuration: { method: 'Pomodoro' }, reference: {} })
})

test('keeps the server timer, pause/resume and distinct session-only finishing behavior', async () => {
  let status = 'Running'
  const fetchMock = show(async path => {
    if (path.endsWith('/csrf')) return Response.json({ requestToken: 'test-token' })
    if (path.endsWith('/pause')) { status = 'Paused'; return Response.json({}) }
    if (path.endsWith('/resume')) { status = 'Running'; return Response.json({}) }
    if (path.endsWith('/focus-sessions/active')) return Response.json({ session: { id: 'session-1', taskId: null, status, elapsedSeconds: 125 } })
    return Response.json({})
  })
  expect(await screen.findByRole('timer')).toHaveTextContent('00:02:05')
  await userEvent.click(screen.getByRole('button', { name: 'Pause focus' }))
  expect(await screen.findByRole('button', { name: 'Resume focus' })).toBeVisible()
  expect(screen.getByRole('timer')).toHaveTextContent('00:02:05')
  await userEvent.click(screen.getByRole('button', { name: 'Resume focus' }))
  expect(await screen.findByRole('button', { name: 'Pause focus' })).toBeVisible()
  await userEvent.click(screen.getByRole('button', { name: 'Finish session' }))
  expect(fetchMock).toHaveBeenCalledWith('/api/v1/focus-sessions/session-1/stop', expect.objectContaining({ method: 'POST', body: JSON.stringify({ outcome: 'Completed' }) }))
})
