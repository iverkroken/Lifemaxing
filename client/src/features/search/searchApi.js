import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { apiRequest } from '../../shared/api/client.js'

export function useRecordSearch(userId, search, areaId) {
  const query = search.trim()
  const [settled, setSettled] = useState('')
  useEffect(() => {
    const timer = setTimeout(() => setSettled(query), 250)
    return () => clearTimeout(timer)
  }, [query])
  const result = useQuery({
    queryKey: ['productivity', userId, 'search', query, areaId],
    enabled: Boolean(userId) && settled === query,
    queryFn: ({ signal }) => apiRequest('/search?' + new URLSearchParams({ q: query, ...(areaId && { areaId }) }), { signal }),
    staleTime: 0,
    gcTime: 0,
    retry: false,
  })
  return { ...result, waiting: settled !== query, items: settled === query ? result.data?.items || [] : [] }
}
