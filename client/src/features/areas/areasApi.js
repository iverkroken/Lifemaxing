import { apiRequest } from '../../shared/api/client.js'

export function getAreas(signal) {
  return apiRequest('/areas', { signal })
}

export function updateArea(area) {
  return apiRequest(`/areas/${area.id}`, {
    method: 'PATCH',
    body: { displayName: area.displayName, isActive: area.isActive, sortOrder: area.sortOrder },
  })
}
