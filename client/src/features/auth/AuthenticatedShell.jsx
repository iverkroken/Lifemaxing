import { useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { NavLink, Outlet, useNavigate, useOutletContext } from 'react-router'
import { Button } from '../../shared/ui/Button.jsx'
import { clearCsrfToken } from '../../shared/api/client.js'
import { logout } from './authApi.js'
import styles from './AuthenticatedShell.module.css'

export function AuthenticatedShell() {
  const { user } = useOutletContext()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const logoutMutation = useMutation({
    mutationFn: logout,
    onSuccess: () => {
      queryClient.clear()
      navigate('/login', { replace: true })
    },
  })

  useEffect(() => {
    const sessionExpired = () => {
      clearCsrfToken()
      queryClient.clear()
      navigate('/login?reason=expired', { replace: true })
    }
    window.addEventListener('lifemaxing:session-expired', sessionExpired)
    return () => window.removeEventListener('lifemaxing:session-expired', sessionExpired)
  }, [navigate, queryClient])

  const navClass = ({ isActive }) => isActive ? styles.activeLink : styles.navLink
  return <div className={styles.shell}>
    <a href="#main-content" className={styles.skipLink}>Skip to content</a>
    <aside className={styles.sidebar}>
      <NavLink to="/areas" className={styles.brand}>LIFEMAXING</NavLink>
      <p className={styles.tagline}>Your personal operating system.</p>
      <nav className={styles.navigation} aria-label="Main navigation">
        <NavLink to="/areas" className={navClass}>Areas</NavLink>
        <NavLink to="/settings" className={navClass}>Settings</NavLink>
      </nav>
      <div className={styles.account}>
        <span className={styles.email}>{user.email}</span>
        <Button variant="quiet" size="small" loading={logoutMutation.isPending}
          onClick={() => logoutMutation.mutate()}>Sign out</Button>
        {logoutMutation.isError && <p role="alert" className={styles.error}>Could not sign out. Try again.</p>}
      </div>
    </aside>
    <main id="main-content" className={styles.content} tabIndex={-1}>
      <Outlet context={{ user }} />
    </main>
  </div>
}
