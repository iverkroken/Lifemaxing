import { afterEach, expect, test, vi } from 'vitest'
import { logout, logoutEverywhere } from './authApi.js'
import { clearCsrfToken } from '../../shared/api/client.js'

afterEach(() => { clearCsrfToken(); vi.unstubAllGlobals() })
test.each([logout, logoutEverywhere])('a lost logout response requires confirmed session status', async endSession => {
  let checkStatus = 200
  vi.stubGlobal('fetch', vi.fn(async url => {
    if (url.endsWith('/csrf')) return Response.json({ requestToken: 'fictional-csrf' })
    if (url.endsWith('/me')) return Response.json({}, { status: checkStatus })
    throw new TypeError('Response lost')
  }))
  await expect(endSession()).rejects.toThrow('Response lost')
  checkStatus = 503
  await expect(endSession()).rejects.toThrow('Response lost')
  checkStatus = 401
  await expect(endSession()).resolves.toBeUndefined()
})
