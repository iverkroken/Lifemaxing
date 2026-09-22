import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Outlet, Route, Routes } from 'react-router'
import { afterEach, expect, test, vi } from 'vitest'
import { FocusPage } from './FocusPage.jsx'
import { TimeHubProvider } from './TimeHubProvider.jsx'
import { defaultPreferences } from './timeTools.js'

afterEach(() => { cleanup(); vi.unstubAllGlobals(); localStorage.clear(); sessionStorage.clear() })
function show(summary = { todaySeconds: 0, yesterdaySeconds: 0, streakDays: 0, sessions: 0, weekSeconds: 0 }) {
  HTMLDialogElement.prototype.showModal = function () { this.open = true }
  HTMLDialogElement.prototype.close = function () { this.open = false }
  let preferences = { ...defaultPreferences }
  vi.stubGlobal('fetch', vi.fn(async (path, options) => {
    if (path.endsWith('/csrf')) return Response.json({ requestToken: 'test-token' })
    if (path.endsWith('/focus-runs/active')) return Response.json({ run: null })
    if (path.endsWith('/focus-sessions/active')) return Response.json({ session: null })
    if (path.endsWith('/focus-preferences/daily-goal')) { preferences = { ...preferences, ...JSON.parse(options.body) }; return Response.json(preferences) }
    if (path.endsWith('/focus-preferences')) return Response.json(preferences)
    if (path.endsWith('/world-clock') || path.endsWith('/areas')) return Response.json([])
    if (path.endsWith('/focus-summary')) return summary === null ? Response.json({ title: 'Summary unavailable' }, { status: 503 }) : Response.json(summary)
    return Response.json({ items: [], total: 0 })
  }))
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(<QueryClientProvider client={client}><MemoryRouter><Routes><Route element={<Outlet context={{ user: { id: 'time-test' } }} />}><Route path="*" element={<TimeHubProvider user={{ id: 'time-test' }}><FocusPage /></TimeHubProvider>} /></Route></Routes></MemoryRouter></QueryClientProvider>)
}
test('daily progress displays real minutes and saves an editable goal', async () => {
  show({ todaySeconds: 3600, yesterdaySeconds: 2400, streakDays: 3, sessions: 2, weekSeconds: 6000 })
  const progress = await screen.findByRole('progressbar', { name: 'Daily focus progress' })
  expect(progress).toHaveAttribute('aria-valuenow', '60')
  expect(progress).toHaveAttribute('aria-valuemax', '120')
  expect(screen.getByText('40 min')).toBeVisible()
  expect(screen.getByText('3 days')).toBeVisible()
  await userEvent.click(screen.getByRole('button', { name: 'Edit daily goal' }))
  await userEvent.clear(screen.getByLabelText('Hours'))
  await userEvent.type(screen.getByLabelText('Hours'), '4')
  await userEvent.click(screen.getByRole('button', { name: 'Save daily goal' }))
  await vi.waitFor(() => expect(progress).toHaveAttribute('aria-valuemax', '240'))
  expect(screen.getByText('4 h')).toBeVisible()
})
test('empty progress stays usable and rejects a zero daily goal', async () => {
  show()
  expect(await screen.findByRole('progressbar')).toHaveAttribute('aria-valuenow', '0')
  expect(screen.getByText('0 days')).toBeVisible()
  await userEvent.click(screen.getByRole('button', { name: 'Edit daily goal' }))
  await userEvent.clear(screen.getByLabelText('Hours'))
  await userEvent.type(screen.getByLabelText('Hours'), '0')
  await userEvent.click(screen.getByRole('button', { name: 'Save daily goal' }))
  expect(await screen.findByText('Choose 15 minutes to 24 hours.')).toBeVisible()
  expect(screen.getByRole('dialog', { name: 'Daily focus goal' })).toBeVisible()
})
test('a failed focus summary offers retry without inventing zero progress', async () => {
  show(null)
  expect(await screen.findByRole('button', { name: 'Try again' })).toBeVisible()
  expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
})
test('opens in Focus with Pomodoro and keeps item filters out of the main view', async () => {
  show()
  const artwork = document.querySelector('img[src="/images/Background%20upgrade.png"]')
  expect(artwork).not.toBeNull()
  expect(artwork).toHaveAttribute('width', '1672')
  expect(artwork).toHaveAttribute('height', '941')
  expect(await screen.findByRole('tab', { name: 'Focus' })).toHaveAttribute('aria-selected', 'true')
  expect(await screen.findByRole('button', { name: /Pomodoro/ })).toHaveAttribute('aria-pressed', 'true')
  expect(screen.getByRole('timer')).toHaveTextContent('25:00')
  expect(screen.getByRole('button', { name: 'Start focus' })).toBeVisible()
  expect(screen.queryByLabelText('Find an item')).not.toBeInTheDocument()
})
test('switches modes without navigating and operates the stopwatch and timer', async () => {
  show()
  await userEvent.click(await screen.findByRole('tab', { name: 'Stopwatch' }))
  expect(screen.getByRole('timer')).toHaveTextContent('00:00:00')
  await userEvent.click(screen.getByRole('button', { name: 'Start stopwatch' }))
  await userEvent.click(screen.getByRole('button', { name: 'Lap' }))
  expect(screen.getByRole('list', { name: 'Laps' }).children).toHaveLength(1)
  await userEvent.click(screen.getByRole('button', { name: 'Pause', exact: true }))
  await userEvent.click(screen.getByRole('button', { name: 'Reset' }))
  expect(screen.queryByRole('list', { name: 'Laps' })).not.toBeInTheDocument()
  await userEvent.click(screen.getByRole('tab', { name: 'Timer' }))
  await userEvent.click(screen.getByRole('button', { name: '15 min' }))
  expect(screen.getByRole('timer')).toHaveTextContent('15:00')
  await userEvent.click(screen.getByRole('tab', { name: 'World Clock' }))
  expect(await screen.findByRole('heading', { name: 'Local time' })).toBeVisible()
  expect(screen.getByRole('img', { name: 'World map' })).toBeVisible()
})
