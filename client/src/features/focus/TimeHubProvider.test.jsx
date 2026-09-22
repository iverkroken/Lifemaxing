import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, expect, test, vi } from 'vitest'
import { TimeHubProvider } from './TimeHubProvider.jsx'
import { useTimeHub } from './TimeHubContext.js'
import { defaultPreferences } from './timeTools.js'
import { FocusSettings } from './FocusSettings.jsx'

const mocks = vi.hoisted(() => ({ request: vi.fn(), play: vi.fn(), initialize: vi.fn() }))
vi.mock('../../shared/api/client.js', () => ({ apiRequest: mocks.request }))
vi.mock('./focusAudio.js', async importOriginal => ({ ...await importOriginal(), createFocusAudio: () => ({ play: mocks.play, initialize: mocks.initialize, close() {} }) }))
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.clearAllMocks(); localStorage.clear(); sessionStorage.clear() })
const controller = 'this-browser'
function Consumer() {
  const hub = useTimeHub()
  return <><output data-testid="state">{hub.run?.state || 'Loading'}</output><output data-testid="time">{hub.focusNow}</output>
    <output data-testid="timer-state">{hub.tools.timer.status}</output>
    <button onClick={() => hub.timerAction('duration', 1000)}>Set timer</button><button onClick={() => hub.timerAction('start')}>Start timer</button>
    <button onClick={() => hub.perform('stop', { completeTask: true })}>Complete linked task</button>
    <button onClick={() => hub.perform('pause')}>Pause</button><button onClick={() => hub.retry()}>Retry</button></>
}
async function show({ phase = 'Focus', state = 'Ready', preferences = {}, blockAutoStart = false, offset = 0 } = {}) {
  sessionStorage.setItem('lifemaxing.time.owner.controller', JSON.stringify({ id: controller }))
  let run = { id: 'run', phase, state, controllerId: controller, revision: 1, periodIndex: 0, blockAutoStart,
    remainingSeconds: state === 'Ready' ? 0 : 1500, endsAtUtc: new Date(Date.now() + offset + 1500000).toISOString(),
    lastObservedAtUtc: new Date(Date.now() + offset).toISOString(), serverNow: new Date(Date.now() + offset).toISOString() }
  mocks.request.mockImplementation(async (path, options = {}) => {
    if (path === '/focus-runs/active') return { run }
    if (path === '/focus-preferences') return { ...defaultPreferences, ...preferences }
    if (path.endsWith('/action')) {
      run = { ...run, revision: run.revision + 1,
        state: options.body.interrupted ? 'Interrupted' : options.body.action === 'pause' ? 'Paused' : 'Running',
        phase: options.body.action === 'next' ? phase === 'Focus' ? 'Break' : 'Focus' : phase }
      return run
    }
    return {}
  })
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  render(<QueryClientProvider client={client}><TimeHubProvider user={{ id: 'owner' }}><Consumer /></TimeHubProvider></QueryClientProvider>)
  await waitFor(() => expect(screen.getByTestId('state')).not.toHaveTextContent('Loading'))
  return client
}
test.each(['Focus', 'Break'])('manual %s transition sounds once and does not start the next interval', async phase => {
  await show({ phase })
  await waitFor(() => expect(mocks.play).toHaveBeenCalledTimes(1))
  expect(mocks.play.mock.calls[0][1]).toBe(phase)
  expect(mocks.request.mock.calls.filter(([, options]) => options?.body?.action === 'next')).toHaveLength(0)
})
test.each(['Focus', 'Break'])('enabled auto-start advances a completed %s interval', async phase => {
  await show({ phase, preferences: { autoBreak: true, autoFocus: true } })
  await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('Running'))
  expect(mocks.request.mock.calls.filter(([, options]) => options?.body?.action === 'next')).toHaveLength(1)
})
test('confirmed inactive work blocks automatic next intervals', async () => {
  await show({ blockAutoStart: true, preferences: { autoBreak: true, autoFocus: true } })
  expect(screen.getByTestId('state')).toHaveTextContent('Ready')
  expect(mocks.request.mock.calls.filter(([, options]) => options?.body?.action === 'next')).toHaveLength(0)
})
test('notifications require saved opt-in and existing browser permission; opening never requests permission', async () => {
  const notice = vi.fn(function () {}); notice.permission = 'granted'; notice.requestPermission = vi.fn()
  vi.stubGlobal('Notification', notice)
  await show({ preferences: { notifications: true } })
  await waitFor(() => expect(notice).toHaveBeenCalledTimes(1))
  expect(notice.requestPermission).not.toHaveBeenCalled()
})
test('notification opt-out suppresses delivery even with permission', async () => {
  const notice = vi.fn(function () {}); notice.permission = 'granted'; notice.requestPermission = vi.fn()
  vi.stubGlobal('Notification', notice)
  await show()
  expect(notice).not.toHaveBeenCalled(); expect(notice.requestPermission).not.toHaveBeenCalled()
})
test('visibility changes preserve focus; a freeze requests persisted interruption recovery', async () => {
  await show({ state: 'Running' })
  fireEvent(document, new Event('visibilitychange'))
  expect(mocks.request.mock.calls.filter(([, options]) => options?.body?.interrupted)).toHaveLength(0)
  fireEvent(document, new Event('freeze'))
  await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('Interrupted'))
  expect(mocks.request.mock.calls.find(([, options]) => options?.body?.action === 'checkpoint')[1].body.interrupted).toBe(true)
})
test('display and checkpoint decisions use server time when device clock differs', async () => {
  const now = Date.now(); vi.spyOn(Date, 'now').mockReturnValue(now)
  await show({ state: 'Running', offset: 3600000 })
  expect(Number(screen.getByTestId('time').textContent)).toBe(now + 3600000)
  await act(async () => { fireEvent(window, new Event('focus')) })
  expect(mocks.request.mock.calls.filter(([, options]) => options?.body?.action)).toHaveLength(0)
})
test('a lost response retries the same command identity without starting another interval', async () => {
  await show({ state: 'Running' })
  const original = mocks.request.getMockImplementation()
  let first = true
  mocks.request.mockImplementation(async (path, options) => {
    if (path.endsWith('/action') && first) { first = false; throw new Error('Offline') }
    return original(path, options)
  })
  fireEvent.click(screen.getByRole('button', { name: 'Pause' }))
  await waitFor(() => expect(sessionStorage.getItem('lifemaxing.time.owner.pending')).toContain('pause'))
  fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
  await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('Paused'))
  const calls = mocks.request.mock.calls.filter(([path]) => path.endsWith('/action'))
  expect(calls).toHaveLength(2)
  expect(calls[0][1].headers.ClientActionId).toBe(calls[1][1].headers.ClientActionId)
})
test('terminal response retry survives reload after the active run has ended', async () => {
  const command = { path: '/focus-runs/finished/action', body: { action: 'stop', controllerId: controller, revision: 2 }, id: 'saved-command', signature: 'saved' }
  sessionStorage.setItem('lifemaxing.time.owner.pending', JSON.stringify(command))
  mocks.request.mockImplementation(async (path, options) => {
    if (path === '/focus-runs/active') return { run: null }
    if (path === '/focus-preferences') return defaultPreferences
    if (options?.method === 'POST') return { id: 'finished', state: 'Ended', endedAtUtc: new Date().toISOString() }
    return {}
  })
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(<QueryClientProvider client={client}><TimeHubProvider user={{ id: 'owner' }}><Consumer /></TimeHubProvider></QueryClientProvider>)
  await waitFor(() => expect(mocks.request).toHaveBeenCalledWith('/focus-runs/active', expect.anything()))
  fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
  await waitFor(() => expect(mocks.request).toHaveBeenCalledWith(command.path, expect.objectContaining({ body: command.body, headers: { ClientActionId: command.id } })))
  expect(sessionStorage.getItem('lifemaxing.time.owner.pending')).toBe('null')
})
test('settings wait for saved preferences instead of snapshotting fallback defaults', async () => {
  let resolvePreferences
  mocks.request.mockImplementation(path => path === '/focus-preferences' ? new Promise(resolve => { resolvePreferences = resolve }) : Promise.resolve({ run: null }))
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(<QueryClientProvider client={client}><TimeHubProvider user={{ id: 'owner' }}><FocusSettings onClose={() => {}} /></TimeHubProvider></QueryClientProvider>)
  expect(screen.queryByRole('button', { name: 'Save settings' })).not.toBeInTheDocument()
  await act(async () => resolvePreferences({ ...defaultPreferences, volume: 17, custom: { ...defaultPreferences.custom, focusMinutes: 42 } }))
  expect(await screen.findByLabelText('Focus minutes')).toHaveValue(42)
  expect(screen.getByLabelText('Volume', { exact: true })).toHaveValue('17')
})
test('normal timer reaches zero and plays once without writing focus commands', async () => {
  await show()
  mocks.play.mockClear(); mocks.request.mockClear()
  vi.useFakeTimers()
  fireEvent.click(screen.getByRole('button', { name: 'Set timer' }))
  fireEvent.click(screen.getByRole('button', { name: 'Start timer' }))
  await act(async () => { await vi.advanceTimersByTimeAsync(1500) })
  expect(screen.getByTestId('timer-state')).toHaveTextContent('Complete')
  expect(mocks.play).toHaveBeenCalledTimes(1)
  expect(mocks.play.mock.calls[0][1]).toBe('Timer')
  expect(mocks.request).not.toHaveBeenCalled()
})
test('explicit task completion refreshes cached Today, task lists and goal progress', async () => {
  const client = await show({ state: 'Running' })
  const keys = ['/today', '/tasks?status=active', '/tasks/task', '/goals/goal'].map(path => ['productivity', 'owner', path])
  keys.forEach(key => client.setQueryData(key, { cached: true }))
  fireEvent.click(screen.getByRole('button', { name: 'Complete linked task' }))
  await waitFor(() => keys.forEach(key => expect(client.getQueryState(key).isInvalidated).toBe(true)))
})
