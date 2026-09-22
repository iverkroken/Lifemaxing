import { useQuery } from '@tanstack/react-query'
import { apiRequest, clearCsrfToken } from '../../shared/api/client.js'
import { notifySessionChange } from './sessionSynchronization.js'

export function useAccountProviders() {
  return useQuery({ queryKey: ['auth', 'providers'], queryFn: ({ signal }) => apiRequest('/auth/providers', { signal }), staleTime: 60_000, retry: false })
}

export function accountRequest(action, body) {
  return apiRequest(`/auth/${action}`, { method: 'POST', body })
}

export async function changePassword(body) {
  await accountRequest('change-password', body)
  clearCsrfToken()
  notifySessionChange()
}

export async function googleFormToken() {
  const result = await apiRequest('/auth/csrf')
  return result.requestToken
}
