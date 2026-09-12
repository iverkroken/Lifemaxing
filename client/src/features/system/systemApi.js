import { apiRequest } from '../../shared/api/client.js'

export function getSystemStatus(signal) {
  return apiRequest('/system/status', { signal })
}
