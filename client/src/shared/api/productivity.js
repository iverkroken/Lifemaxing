import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useOutletContext } from 'react-router'
import { apiRequest } from './client.js'

export function useProductivity(path) {
  const { user } = useOutletContext()
  return useQuery({ queryKey: ['productivity', user.id, path],
    queryFn: ({ signal }) => apiRequest(path, { signal }),
    refetchInterval: path.startsWith('/today') ? 60000 : false })
}

export function useProductivityAction(onSuccess) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({ path, method = 'POST', body }) => apiRequest(path, { method, body }),
    onSuccess: async data => {
      onSuccess?.(data)
      await client.invalidateQueries({ queryKey: ['productivity'] })
    },
  })
}

export function queryString(values) {
  return new URLSearchParams(Object.entries(values).filter(([, value]) => value !== '' && value != null)).toString()
}
