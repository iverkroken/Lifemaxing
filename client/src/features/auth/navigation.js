export const planDestinations = ['tasks', 'goals', 'habits', 'inbox']
export const progressDestinations = ['progress', 'activity', 'rewards']
export const destinations = ['today', ...planDestinations, 'areas', ...progressDestinations, 'focus', 'settings']

export function navigationGroup(pathname) {
  const root = pathname.split('/')[1]
  if (planDestinations.includes(root)) return 'plan'
  if (progressDestinations.includes(root)) return 'progress'
  return root
}
