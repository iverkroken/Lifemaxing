import { apiRequest } from '../../shared/api/client.js'

export function getAreas(signal) {
  return apiRequest('/areas', { signal })
}

export function updateArea(area) {
  return apiRequest(`/areas/${area.id}`, {
    method: 'PATCH',
    body: { displayName: area.displayName, isActive: area.isActive, imageFocalX: Number(area.imageFocalX), imageFocalY: Number(area.imageFocalY) },
  })
}

export function createArea(area) {
  return apiRequest('/areas', { method: 'POST', body: { displayName: area.displayName, imageFocalX: Number(area.imageFocalX), imageFocalY: Number(area.imageFocalY) } })
}

export function uploadAreaImage(id, image) {
  const body = new FormData()
  body.append('image', image)
  return apiRequest(`/areas/${id}/image`, { method: 'PUT', body })
}

export function removeAreaImage(id) {
  return apiRequest(`/areas/${id}/image`, { method: 'DELETE' })
}

export function getAreaDeleteImpact(id, signal) {
  return apiRequest(`/areas/${id}/delete-impact`, { signal })
}

export function deleteArea(id) {
  return apiRequest(`/areas/${id}`, { method: 'DELETE' })
}

export function updateAreaOrder(areaIds) {
  return apiRequest('/areas/order', { method: 'PUT', body: { areaIds } })
}
