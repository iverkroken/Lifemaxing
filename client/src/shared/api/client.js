import { sessionGeneration, waitForSessionCheck } from '../../features/auth/sessionSynchronization.js'

export class ApiError extends Error {
  constructor(message, status, problem = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = problem.code
    this.errors = problem.errors
  }
}

let csrfToken

async function getCsrfToken() {
  if (csrfToken) return csrfToken

  const response = await fetch('/api/v1/auth/csrf', {
    credentials: 'same-origin',
    headers: { Accept: 'application/json' },
  })
  if (!response.ok) throw new ApiError('A secure request token could not be created.', response.status)
  const result = await response.json()
  csrfToken = result.requestToken
  return csrfToken
}

export function clearCsrfToken() {
  csrfToken = undefined
}

export async function apiRequest(path, request = {}) {
  if ((path.startsWith('/auth/') && path !== '/auth/change-password') || path === '/system/status') return sendRequest(path, request, true)
  const generation = sessionGeneration()
  const verifySession = async () => {
    await waitForSessionCheck()
    request.signal?.throwIfAborted()
    if (generation !== sessionGeneration()) throw new DOMException('The session changed.', 'AbortError')
  }
  await verifySession()
  try {
    const result = await sendRequest(path, request, true, verifySession)
    await verifySession()
    return result
  } catch (error) {
    await verifySession()
    if (error.status === 401) window.dispatchEvent(new Event('lifemaxing:session-expired'))
    throw error
  }
}

async function sendRequest(path, { body, headers, ...options }, canRefreshCsrf, verifySession) {
  const method = options.method?.toUpperCase() || 'GET'
  const formData = typeof FormData !== 'undefined' && body instanceof FormData
  const requestHeaders = {
    Accept: 'application/json',
    ...(body === undefined || formData ? {} : { 'Content-Type': 'application/json' }),
    ...headers,
  }
  if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    requestHeaders['X-CSRF-TOKEN'] = await getCsrfToken()
  }
  // Token acquisition and retries can overlap a session change in another tab.
  await verifySession?.()

  const response = await fetch(`/api/v1${path}`, {
    ...options,
    method,
    credentials: 'same-origin',
    headers: requestHeaders,
    ...(body === undefined ? {} : { body: formData ? body : JSON.stringify(body) }),
  })

  if (!response.ok) {
    const problem = await response.json().catch(() => ({}))
    if (problem.code === 'csrf_validation_failed' && canRefreshCsrf) {
      clearCsrfToken()
      return sendRequest(path, { body, headers, ...options }, false, verifySession)
    }
    throw new ApiError(problem.detail || problem.title || 'The request could not be completed.', response.status, problem)
  }

  if (response.status === 204) return undefined
  return response.json()
}
