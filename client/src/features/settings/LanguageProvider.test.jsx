import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, test, vi } from 'vitest'
import { LanguageProvider } from './LanguageProvider.jsx'
import { useLanguage } from './language.js'

afterEach(() => { vi.unstubAllGlobals(); localStorage.clear() })
function Preview() {
  const { t, setPublicPreferences } = useLanguage()
  return <button onClick={() => setPublicPreferences({ uiLanguage: 'nb', theme: 'dark' })}>{t('Sign in')}</button>
}
test('public preferences work before authentication, even when local storage is unavailable', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => Response.json({}, { status: 401 })))
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false, addEventListener() {}, removeEventListener() {} })))
  const storage = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Storage unavailable') })
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(<QueryClientProvider client={client}><LanguageProvider><Preview /></LanguageProvider></QueryClientProvider>)
  await userEvent.click(screen.getByRole('button', { name: 'Sign in' }))
  expect(screen.getByRole('button', { name: 'Logg inn' })).toBeVisible()
  expect(document.documentElement.lang).toBe('nb')
  expect(document.documentElement.dataset.theme).toBe('dark')
  storage.mockRestore()
})
