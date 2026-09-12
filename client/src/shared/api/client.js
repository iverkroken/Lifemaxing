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

export function apiRequest(path, request = {}) {
  return sendRequest(path, request, true)
}

async function sendRequest(path, { body, headers, ...options }, canRefreshCsrf) {
  const method = options.method?.toUpperCase() || 'GET'
  const requestHeaders = {
    Accept: 'application/json',
    ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
    ...headers,
  }
  if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    requestHeaders['X-CSRF-TOKEN'] = await getCsrfToken()
  }

  const response = await fetch(`/api/v1${path}`, {
    ...options,
    method,
    credentials: 'same-origin',
    headers: requestHeaders,
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  })

  if (!response.ok) {
    const problem = await response.json().catch(() => ({}))
    if (problem.code === 'csrf_validation_failed' && canRefreshCsrf) {
      clearCsrfToken()
      return sendRequest(path, { body, headers, ...options }, false)
    }
    if (response.status === 401 && path !== '/auth/login' && path !== '/auth/me') {
      window.dispatchEvent(new Event('lifemaxing:session-expired'))
    }
    throw new ApiError(problem.detail || problem.title || 'The request could not be completed.', response.status, problem)
  }

  if (response.status === 204) return undefined
  return response.json()
}
