import { useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, test, vi } from 'vitest'
import { LanguageContext } from './language.js'
import { AppearanceSettings } from './AppearanceSettings.jsx'
import { updateSettings } from './settingsApi.js'

vi.mock('./settingsApi.js', () => ({ updateSettings: vi.fn() }))

test('theme preview retains failed changes, retries the payload and updates only its owner cache', async () => {
  let rejectSave
  let resolveRetry
  vi.mocked(updateSettings)
    .mockImplementationOnce(() => new Promise((_, reject) => { rejectSave = reject }))
    .mockImplementationOnce(() => new Promise(resolve => { resolveRetry = resolve }))
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
  const initial = { theme: 'light', density: 'compact' }
  client.setQueryData(['settings', 'owner'], initial)
  client.setQueryData(['settings', 'other'], initial)
  const preview = vi.fn()
  function Context() {
    const [preferences, setPreferences] = useState(initial)
    return <LanguageContext.Provider value={{ preferences, t: key => key, previewAppearance: value => {
      preview(value)
      if (value) setPreferences(value)
    } }}><AppearanceSettings userId="owner" /></LanguageContext.Provider>
  }
  const { container } = render(<QueryClientProvider client={client}><Context /></QueryClientProvider>)
  expect(container.querySelectorAll('[data-theme-preview][aria-hidden="true"]')).toHaveLength(3)
  await userEvent.click(screen.getByRole('radio', { name: 'dark', exact: true }))
  await waitFor(() => expect(screen.getByRole('radio', { name: 'light', exact: true })).toBeDisabled())
  expect(updateSettings.mock.calls[0][0]).toEqual({ theme: 'dark', density: 'compact' })
  await act(async () => rejectSave(new Error('Offline')))
  expect(await screen.findByRole('button', { name: 'retry' })).toBeEnabled()
  expect(screen.getByRole('status')).toHaveTextContent('notSaved')
  expect(screen.getByRole('radio', { name: 'dark', exact: true })).toBeChecked()
  expect(preview).not.toHaveBeenCalledWith(null)
  await userEvent.click(screen.getByRole('button', { name: 'retry' }))
  expect(updateSettings.mock.calls[1][0]).toEqual({ theme: 'dark', density: 'compact' })
  const saved = { theme: 'dark', density: 'compact' }
  await act(async () => resolveRetry(saved))
  await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('saved'))
  expect(preview).toHaveBeenLastCalledWith(null)
  expect(client.getQueryData(['settings', 'owner'])).toEqual(saved)
  expect(client.getQueryData(['settings', 'other'])).toEqual(initial)
  client.clear()
})
