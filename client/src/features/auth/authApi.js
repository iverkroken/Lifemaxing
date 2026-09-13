import { apiRequest, clearCsrfToken } from '../../shared/api/client.js'

export function getCurrentUser(signal) {
  return apiRequest('/auth/me', { signal })
}

export async function login(credentials) {
  await apiRequest('/auth/login', { method: 'POST', body: credentials })
  clearCsrfToken()
}

export async function logout() {
  await endSession('/auth/logout')
}

export async function logoutEverywhere() {
  await endSession('/auth/logout-everywhere')
}

async function endSession(path) {
  try {
    await apiRequest(path, { method: 'POST' })
  } catch (error) {
    // The response can be lost after the cookie was revoked. Only a confirmed
    // unauthenticated response authorizes clearing private client state.
    try { await getCurrentUser() } catch (check) {
      if (check.status === 401) { clearCsrfToken(); return }
    }
    throw error
  }
  clearCsrfToken()
}
