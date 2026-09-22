import { useQuery } from '@tanstack/react-query'
import { useOutletContext } from 'react-router'
import { getSettings } from '../settings/settingsApi.js'

export function usePlanningMode() {
  const { user } = useOutletContext()
  const query = useQuery({ queryKey: ['settings', user.id], queryFn: ({ signal }) => getSettings(signal) })
  return { mode: query.data?.planningMode || 'FocusedDay', query, userId: user.id }
}
