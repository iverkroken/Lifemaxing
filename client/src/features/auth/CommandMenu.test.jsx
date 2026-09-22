import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Outlet, Route, Routes, useLocation } from 'react-router'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { CommandMenu } from './CommandMenu.jsx'
import { LanguageContext, translate } from '../settings/language.js'

afterEach(() => vi.unstubAllGlobals())
beforeEach(() => {
  HTMLDialogElement.prototype.showModal = function () { this.open = true }
  HTMLDialogElement.prototype.close = function () { this.open = false }
})

function Location() {
  return <output data-testid="location">{useLocation().pathname}</output>
}

function mount(open = true, options = {}) {
  const client = options.client || new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const onClose = vi.fn()
  const language = options.language || 'en'
  const t = options.t || ((key, values) => translate(language, key, values))
  render(<QueryClientProvider client={client}><LanguageContext.Provider value={{ language, t }}><MemoryRouter initialEntries={options.initialEntries}><Routes><Route element={<Outlet context={{ user: { id: 'owner' } }} />}>
    <Route path="*" element={<><CommandMenu open={open} onClose={onClose} destinations={(options.destinations || ['today', 'tasks']).map(path => [path])} openCapture={vi.fn()} /><Location /></>} />
    <Route path="tasks/result" element={<h1>Opened matching task</h1>} />
  </Route></Routes></MemoryRouter></LanguageContext.Provider></QueryClientProvider>)
  return { onClose, client }
}

test('shows immediate actions and searches records with keyboard navigation', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => Response.json({ items: [{ id: 'result', kind: 'task', title: 'Read a chapter', path: '/tasks/result', isActive: true }] })))
  mount()
  expect(screen.getByRole('button', { name: /Create a task/ })).toBeVisible()
  const input = screen.getByRole('textbox')
  await userEvent.type(input, 'read')
  await screen.findByRole('button', { name: /Read a chapter/ })
  await userEvent.keyboard('{ArrowDown}{Enter}')
  expect(await screen.findByRole('heading', { name: 'Opened matching task' })).toBeVisible()
})

test('ranks localized exact and prefix actions before substring matches, preserving ties and empty order', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => Response.json({ items: [] })))
  const names = { archive: 'Tid til fokus', session: 'Fokusøkt', focus: 'Fokus', plan: 'Fokusplan' }
  mount(true, { language: 'nb', destinations: Object.keys(names), t: (key, values) => names[key] || translate('nb', key, values) })
  const actionNames = () => within(screen.getByRole('list', { name: translate('nb', 'Pages and actions') })).getAllByRole('button').map(button => button.textContent.replace('↵', '').trim())
  expect(actionNames().slice(0, 4)).toEqual(Object.values(names))
  fireEvent.change(screen.getByRole('textbox'), { target: { value: '  FOKUS  ' } })
  expect(actionNames()).toEqual(['Fokus', 'Fokusøkt', 'Fokusplan', 'Tid til fokus'])
  await userEvent.keyboard('{Enter}')
  expect(screen.getByTestId('location')).toHaveTextContent('/focus')
})

test.each(['en', 'nb', 'sv', 'da'])('opens the localized Finance subscriptions destination in %s', async language => {
  vi.stubGlobal('fetch', vi.fn(async path => Response.json(path.endsWith('/areas') ? [] : { items: [] })))
  mount(true, { language })
  const label = `${translate(language, 'area_finance')} · ${translate(language, 'subscriptionTitle')}`
  expect(screen.getByRole('button', { name: label })).toBeVisible()
  fireEvent.change(screen.getByRole('textbox'), { target: { value: translate(language, 'subscriptionTitle') } })
  await userEvent.keyboard('{Enter}')
  expect(screen.getByTestId('location')).toHaveTextContent('/subscriptions')
})

test.each(['/areas/finance', '/areas/finance/subscriptions'])('resolves owned area context from %s and ignores a conflicting filter', async path => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  client.setQueryData(['areas', 'another-owner'], [{ id: 'foreign-area', key: 'finance' }])
  const fetchMock = vi.fn(async url => Response.json(url.endsWith('/areas') ? [{ id: 'owned-area', key: 'finance' }] : { items: [] }))
  vi.stubGlobal('fetch', fetchMock)
  mount(true, { client, initialEntries: [path + '?areaId=foreign-filter'] })
  fireEvent.change(screen.getByRole('textbox'), { target: { value: 'journal' } })
  await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/v1/search?q=journal&areaId=owned-area', expect.anything()))
  const searchUrls = fetchMock.mock.calls.map(([url]) => url).filter(url => url.startsWith('/api/v1/search'))
  expect(searchUrls.some(url => url.includes('foreign'))).toBe(false)
})

test('does not query closed dialogs', () => {
  const fetchMock = vi.fn()
  vi.stubGlobal('fetch', fetchMock)
  mount(false)
  expect(fetchMock).not.toHaveBeenCalled()
  expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
})

test('cancels stale searches while input changes', async () => {
  const aborted = vi.fn()
  const fetchMock = vi.fn((path, options) => {
    if (path.includes('q=old')) return new Promise((resolve, reject) => {
      options.signal.addEventListener('abort', () => { aborted(); reject(new DOMException('Aborted', 'AbortError')) })
    })
    return Promise.resolve(Response.json({ items: [] }))
  })
  vi.stubGlobal('fetch', fetchMock)
  mount()
  const input = screen.getByRole('textbox')
  fireEvent.change(input, { target: { value: 'old' } })
  await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('q=old'), expect.anything()))
  fireEvent.change(input, { target: { value: 'new' } })
  await waitFor(() => expect(aborted).toHaveBeenCalled())
  expect(await screen.findByText('No matching records. Try another word.')).toBeVisible()
})

test('distinguishes a search failure from an empty result and permits retry', async () => {
  let fail = true
  vi.stubGlobal('fetch', vi.fn(async () => fail ? Response.json({}, { status: 503 }) : Response.json({ items: [] })))
  mount()
  await screen.findByText('Search could not load. Your pages and actions are still available.')
  expect(screen.queryByText('No matching records. Try another word.')).not.toBeInTheDocument()
  fail = false
  await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
  await waitFor(() => expect(screen.queryByText('Search could not load. Your pages and actions are still available.')).not.toBeInTheDocument())
})
