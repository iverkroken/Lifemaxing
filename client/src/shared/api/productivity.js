import { useRef } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useOutletContext } from 'react-router'
import { apiRequest } from './client.js'

export function useProductivity(path) {
  const { user } = useOutletContext()
  return useQuery({ queryKey: ['productivity', user.id, path],
    queryFn: ({ signal }) => apiRequest(path, { signal }),
    refetchInterval: path === '/focus-sessions/active' ? 15000 : path.startsWith('/today') ? 60000 : false })
}

export function useProductivityAction(onSuccess) {
  const client = useQueryClient()
  const pendingCommands = useRef(new Map())
  return useMutation({
    mutationFn: async ({ path, method = 'POST', body }) => {
      const guarded = method === 'POST' && new RegExp('^/(tasks/[^/]+/(complete|reopen)|habits/[^/]+/logs(/[^/]+/revoke)?|goals/[^/]+/progress|rewards/[^/]+/claim|focus-sessions(/[^/]+/(pause|resume|stop))?)$').test(path)
      const signature = JSON.stringify([path, method, body])
      if (guarded && !pendingCommands.current.has(signature)) pendingCommands.current.set(signature, crypto.randomUUID())
      try {
        const result = await apiRequest(path, { method, body, ...(guarded && { headers: { ClientActionId: pendingCommands.current.get(signature) } }) })
        pendingCommands.current.delete(signature)
        return result
      } catch (error) {
        // A transport/server failure may have happened after commit: retain its identity for retry.
        if (error.status >= 400 && error.status < 500) pendingCommands.current.delete(signature)
        throw error
      }
    },
    onSuccess: async data => {
      onSuccess?.(data)
      await client.invalidateQueries({ queryKey: ['productivity'] })
    },
  })
}

export function queryString(values) {
  return new URLSearchParams(Object.entries(values).filter(([, value]) => value !== '' && value != null)).toString()
}
