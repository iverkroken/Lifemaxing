import { afterEach, expect, test, vi } from 'vitest'
import { apiRequest, clearCsrfToken } from './client.js'

afterEach(() => {
  clearCsrfToken()
  vi.unstubAllGlobals()
})

test('gets a fresh antiforgery token and retries once when a token expires', async () => {
  const fetch = vi.fn()
    .mockResolvedValueOnce(new Response(JSON.stringify({ requestToken: 'old' })))
    .mockResolvedValueOnce(new Response(JSON.stringify({ code: 'csrf_validation_failed' }), {
      status: 400, headers: { 'Content-Type': 'application/problem+json' },
    }))
    .mockResolvedValueOnce(new Response(JSON.stringify({ requestToken: 'fresh' })))
    .mockResolvedValueOnce(new Response(JSON.stringify({ saved: true })))
  vi.stubGlobal('fetch', fetch)

  await expect(apiRequest('/settings', { method: 'PATCH', body: { locale: 'nb-NO' } }))
    .resolves.toEqual({ saved: true })
  expect(fetch).toHaveBeenNthCalledWith(2, '/api/v1/settings',
    expect.objectContaining({ headers: expect.objectContaining({ 'X-CSRF-TOKEN': 'old' }) }))
  expect(fetch).toHaveBeenNthCalledWith(4, '/api/v1/settings',
    expect.objectContaining({ headers: expect.objectContaining({ 'X-CSRF-TOKEN': 'fresh' }) }))
})

test('sends FormData without overriding the browser multipart boundary', async () => {
  const fetch = vi.fn()
    .mockResolvedValueOnce(Response.json({ requestToken: 'token' }))
    .mockResolvedValueOnce(Response.json({ saved: true }))
  vi.stubGlobal('fetch', fetch)
  const body = new FormData()
  body.append('image', new Blob(['image'], { type: 'image/png' }), 'area.png')

  await apiRequest('/areas/id/image', { method: 'PUT', body })

  expect(fetch).toHaveBeenNthCalledWith(2, '/api/v1/areas/id/image', expect.objectContaining({
    body,
    headers: expect.not.objectContaining({ 'Content-Type': 'application/json' }),
  }))
})
