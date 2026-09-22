import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getCurrentUser } from './authApi.js'
import { checkSession, invalidateSessionRequests } from './sessionSynchronization.js'
import { clearCsrfToken } from '../../shared/api/client.js'

export const currentUserKey = ['auth', 'me']

export function useCurrentUser() {
  const client = useQueryClient()
  return useQuery({
    queryKey: currentUserKey,
    queryFn: ({ signal }) => checkSession(async () => {
      const previousId = client.getQueryData(currentUserKey)?.id
      const privateQueries = { predicate: query => query.queryKey[0] !== 'auth' }
      const clearPrivateState = () => {
        invalidateSessionRequests()
        clearCsrfToken()
        // Removing queries cancels their requests as well as discarding cached data.
        client.removeQueries(privateQueries)
        client.getMutationCache().clear()
      }
      try {
        const user = await getCurrentUser(signal)
        signal.throwIfAborted()
        if (previousId !== user.id) clearPrivateState()
        return user
      } catch (error) {
        signal.throwIfAborted()
        if (error.status === 401) clearPrivateState()
        throw error
      }
    }),
    retry: false,
    staleTime: 60_000,
  })
}
