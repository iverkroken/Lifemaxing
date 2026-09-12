import { useQuery } from '@tanstack/react-query'
import { getCurrentUser } from './authApi.js'

export const currentUserKey = ['auth', 'me']

export function useCurrentUser() {
  return useQuery({
    queryKey: currentUserKey,
    queryFn: ({ signal }) => getCurrentUser(signal),
    retry: false,
    staleTime: 60_000,
  })
}
