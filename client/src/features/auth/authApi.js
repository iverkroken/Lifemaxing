import { apiRequest, clearCsrfToken } from '../../shared/api/client.js'

export function getCurrentUser(signal) {
  return apiRequest('/auth/me', { signal })
}

export async function login(credentials) {
  await apiRequest('/auth/login', { method: 'POST', body: credentials })
  clearCsrfToken()
}

export async function logout() {
  await apiRequest('/auth/logout', { method: 'POST' })
  clearCsrfToken()
}
