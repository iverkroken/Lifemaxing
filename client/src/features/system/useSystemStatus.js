import { useQuery } from '@tanstack/react-query'
import { getSystemStatus } from './systemApi.js'

export function useSystemStatus() {
  return useQuery({
    queryKey: ['system', 'status'],
    queryFn: ({ signal }) => getSystemStatus(signal),
  })
}
