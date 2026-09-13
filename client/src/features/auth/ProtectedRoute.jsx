import { Navigate, Outlet, useLocation } from 'react-router'
import { useCurrentUser } from './useCurrentUser.js'
import styles from './ProtectedRoute.module.css'
import { ApiError } from '../../shared/api/client.js'
import { Button } from '../../shared/ui/Button.jsx'

export function ProtectedRoute() {
  const user = useCurrentUser()
  const location = useLocation()

  if (user.isPending) {
    return <main className={styles.centered} aria-live="polite">Checking your session…</main>
  }
  if (user.isError) {
    if (user.error instanceof ApiError && user.error.status === 401) {
      return <Navigate to="/login" replace state={{ from: location.pathname }} />
    }
    return <main className={styles.centered}><div>
      <p role="alert">{user.error?.status === 403 ? 'Access to this workspace was denied.'
        : user.error?.status === 429 ? 'Too many requests. Wait a minute, then try again.'
          : 'We could not check your session. Check your connection and try again.'}</p>
      <Button onClick={() => user.refetch()}>Try again</Button>
    </div></main>
  }
  return <Outlet context={{ user: user.data }} />
}
