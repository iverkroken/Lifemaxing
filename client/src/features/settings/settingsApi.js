import { apiRequest } from '../../shared/api/client.js'

export function getSettings(signal) {
  return apiRequest('/settings', { signal })
}

export function updateSettings(settings) {
  return apiRequest('/settings', { method: 'PATCH', body: settings })
}
