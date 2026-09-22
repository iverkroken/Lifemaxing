import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { beforeEach, expect, test, vi } from 'vitest'
import { LanguageContext, translate } from './language.js'
import { RecentlyDeletedPage } from './RecentlyDeletedPage.jsx'

const mutate = vi.fn()
const invalidate = vi.fn()
const state = vi.hoisted(() => ({ isError: false, error: null }))
vi.mock('@tanstack/react-query', () => ({ useQueryClient: () => ({ invalidateQueries: invalidate }) }))
vi.mock('../../shared/api/productivity.js', () => ({
  useProductivity: () => ({ isSuccess: true, data: {
    items: [{ id: 'task-1', type: 'task', title: 'Study algorithms', lifeAreaName: 'University',
      deletedAtUtc: '2026-09-20T10:00:00Z', expiresAtUtc: '2026-10-20T10:00:00Z' }],
    total: 1, page: 1, pageSize: 30, serverNowUtc: '2026-09-22T11:00:00Z', retentionDays: 30,
  } }),
  useProductivityAction: onSuccess => ({ mutate: (...args) => { mutate(...args); if (!state.isError) onSuccess?.() }, isPending: false, ...state }),
}))

beforeEach(() => {
  mutate.mockReset()
  invalidate.mockReset()
  state.isError = false
  state.error = null
  HTMLDialogElement.prototype.showModal = function () { this.open = true }
  HTMLDialogElement.prototype.close = function () { this.open = false }
})

test('explains retention and requires a second confirmation before permanent deletion', () => {
  const t = (key, values) => translate('en', key, values)
  render(<MemoryRouter><LanguageContext.Provider value={{ language: 'en', t, dateTime: value => value }}>
    <RecentlyDeletedPage />
  </LanguageContext.Provider></MemoryRouter>)

  expect(screen.getByRole('heading', { name: 'Recently Deleted' })).toBeInTheDocument()
  expect(screen.getByText(/30 days/)).toBeInTheDocument()
  expect(screen.getByText('Study algorithms')).toBeInTheDocument()
  expect(screen.getByText('University')).toBeInTheDocument()
  expect(screen.getByText('Deleted 2 days ago')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Delete permanently' }))
  expect(screen.getByRole('dialog')).toHaveTextContent('This cannot be undone')
  fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete permanently' }))
  expect(mutate).toHaveBeenCalledWith(expect.objectContaining({
    path: '/recently-deleted/task/task-1', method: 'DELETE',
  }), expect.anything())
})

test('restores the original item from the management row', () => {
  const t = (key, values) => translate('en', key, values)
  render(<MemoryRouter><LanguageContext.Provider value={{ language: 'en', t, dateTime: value => value }}>
    <RecentlyDeletedPage />
  </LanguageContext.Provider></MemoryRouter>)
  fireEvent.click(screen.getByRole('button', { name: 'Restore' }))
  expect(mutate).toHaveBeenCalledWith(expect.objectContaining({
    path: '/recently-deleted/task/task-1/restore', method: 'POST',
  }))
  expect(invalidate).toHaveBeenCalledWith({ queryKey: ['areas'] })
})

test('permanent deletion errors are readable inside the confirmation dialog', () => {
  state.isError = true
  state.error = new Error('Please retry')
  const t = (key, values) => translate('en', key, values)
  render(<MemoryRouter><LanguageContext.Provider value={{ language: 'en', t, dateTime: value => value, errorMessage: error => error.message }}>
    <RecentlyDeletedPage />
  </LanguageContext.Provider></MemoryRouter>)
  fireEvent.click(screen.getByRole('button', { name: 'Delete permanently' }))
  expect(within(screen.getByRole('dialog')).getByRole('alert')).toHaveTextContent('Could not reach the server')
})
