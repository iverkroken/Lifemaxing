import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Outlet, Route, Routes } from 'react-router'
import { afterEach, expect, test, vi } from 'vitest'
import { AreaPage } from './AreaPage.jsx'

vi.mock('./AreaLayoutEditor.jsx', () => ({ AreaLayoutEditor: () => null }))

afterEach(() => vi.unstubAllGlobals())

test('renders Life Areas and retries a failed image upload without creating another area', async () => {
  HTMLDialogElement.prototype.showModal = function () { this.open = true }
  HTMLDialogElement.prototype.close = function () { this.open = false }
  vi.stubGlobal('URL', class extends URL {
    static createObjectURL() { return 'blob:preview' }
    static revokeObjectURL() {}
  })
  let creates = 0
  let uploads = 0
  const area = { id: 'new-area', key: 'custom-new', displayName: 'Writing', isActive: true, sortOrder: 10 }
  vi.stubGlobal('fetch', vi.fn(async (url, options = {}) => {
    if (url.endsWith('/auth/csrf')) return Response.json({ requestToken: 'csrf' })
    if (url.endsWith('/areas') && options.method === 'POST') { creates++; return Response.json(area) }
    if (url.endsWith('/areas/new-area/image')) {
      uploads++
      return uploads === 1 ? Response.json({ title: 'Upload failed' }, { status: 500 }) : Response.json({ ...area, customImageUrl: '/image' })
    }
    if (url.endsWith('/areas/new-area')) return Response.json(area)
    return Response.json([])
  }))
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  render(<QueryClientProvider client={client}><MemoryRouter><Routes>
    <Route element={<Outlet context={{ user: { id: 'owner' } }} />}><Route path="/" element={<AreaPage />} /></Route>
  </Routes></MemoryRouter></QueryClientProvider>)
  fireEvent.click(screen.getByRole('button', { name: 'New Life Area' }))
  fireEvent.change(screen.getByLabelText(/Display name/), { target: { value: 'Writing' } })
  fireEvent.change(screen.getByLabelText('Custom image'), { target: { files: [new File(['image'], 'area.png', { type: 'image/png' })] } })
  fireEvent.click(screen.getByRole('button', { name: 'Create Life Area' }))
  await screen.findByRole('alert')
  fireEvent.click(screen.getByRole('button', { name: 'Create Life Area' }))
  await waitFor(() => expect(uploads).toBe(2))
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  expect(creates).toBe(1)
  expect(client.getQueryData(['areas', 'owner'])).toEqual([expect.objectContaining({ id: 'new-area' })])
})
