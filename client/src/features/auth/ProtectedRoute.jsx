import { Navigate, Outlet, useLocation } from 'react-router'
import { useCurrentUser } from './useCurrentUser.js'
import styles from './ProtectedRoute.module.css'

export function ProtectedRoute() {
  const user = useCurrentUser()
  const location = useLocation()

  if (user.isPending) {
    return <main className={styles.centered} aria-live="polite">Checking your session…</main>
  }
  if (user.isError) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }
  return <Outlet context={{ user: user.data }} />
}
