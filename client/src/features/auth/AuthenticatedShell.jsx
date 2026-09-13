import { useEffect, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { NavLink, Outlet, useLocation, useNavigate, useOutletContext } from 'react-router'
import { Button } from '../../shared/ui/Button.jsx'
import { clearCsrfToken } from '../../shared/api/client.js'
import { logout } from './authApi.js'
import styles from './AuthenticatedShell.module.css'
import { Dialog } from '../../shared/ui/Dialog.jsx'
import { Icon } from '../../shared/ui/Icon.jsx'
import { QuickAdd } from '../tasks/QuickAdd.jsx'
import { useProductivity } from '../../shared/api/productivity.js'

const destinations = [['today', 'Today'], ['tasks', 'Tasks'], ['goals', 'Goals'], ['habits', 'Habits'], ['areas', 'Life Areas']]

const progressionDestinations = [['focus', 'Focus'], ['progress', 'Progress'], ['activity', 'Activity'], ['rewards', 'Rewards']]

export function AuthenticatedShell() {
  const { user } = useOutletContext()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const location = useLocation()
  const [captureOpen, setCaptureOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const focusing = location.pathname === '/focus'
  const today = useProductivity('/today')
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

  useEffect(() => {
    document.getElementById('main-content')?.focus({ preventScroll: true })
    window.scrollTo(0, 0)
  }, [location.pathname])

  const navClass = ({ isActive }) => isActive ? styles.activeLink : styles.navLink
  return <div className={`${styles.shell} ${focusing ? styles.focusing : ''}`}>
    <a href="#main-content" className={styles.skipLink}>Skip to content</a>
    <aside className={styles.sidebar}>
      <NavLink to="/today" className={styles.brand}><Icon name="leaf" size={24} />LIFEMAXING</NavLink>
      <p className={styles.tagline}>A life, intentionally lived.</p>
      <Button variant="secondary" onClick={() => setCaptureOpen(true)}><Icon name="plus" />Quick Add</Button>
      <nav className={styles.navigation} aria-label="Main navigation">
        <p className={styles.navLabel}>Your workspace</p>
        {destinations.map(([path, label]) => <NavLink key={path} to={`/${path}`} className={navClass}><Icon name={path} />{label}</NavLink>)}
        <div className={styles.inbox}><NavLink to="/inbox" aria-label="Inbox" className={navClass}><Icon name="inbox" />Inbox{today.data && <span className={styles.count} aria-hidden="true">{today.data.inboxCount}</span>}</NavLink></div>
        <details className={styles.progressionNav} open={progressionDestinations.some(([path]) => location.pathname.startsWith('/' + path))}><summary>Progress & execution</summary>
          {progressionDestinations.map(([path, label]) => <NavLink key={path} to={'/' + path} className={navClass}>{label}</NavLink>)}
        </details>
      </nav>
      <div className={styles.account}>
        <NavLink to="/settings" className={navClass}><Icon name="settings" />Settings</NavLink>
        <span className={styles.email}>{user.email}</span>
        <Button variant="quiet" size="small" loading={logoutMutation.isPending}
          onClick={() => logoutMutation.mutate()}>Sign out</Button>
        {logoutMutation.isError && <p role="alert" className={styles.error}>Could not sign out. Try again.</p>}
      </div>
    </aside>
    <header className={styles.mobileHeader}><NavLink to="/today" className={styles.brand}><Icon name="leaf" />LIFEMAXING</NavLink>
      <NavLink to="/inbox" className={styles.mobileInbox}><Icon name="inbox" /><span>Inbox</span></NavLink>
    </header>
    <main id="main-content" className={styles.content} tabIndex={-1}>
      <Outlet context={{ user }} />
    </main>
    <nav className={styles.dock} aria-label="Mobile navigation">
      <NavLink to="/today" className={navClass}><Icon name="today" />Today</NavLink>
      <NavLink to="/tasks" className={navClass}><Icon name="tasks" />Tasks</NavLink>
      <button className={styles.dockCapture} onClick={() => setCaptureOpen(true)}><Icon name="plus" />Capture</button>
      <NavLink to="/goals" className={navClass}><Icon name="goals" />Goals</NavLink>
      <button className={styles.navLink} aria-haspopup="dialog" onClick={() => setMenuOpen(true)}><Icon name="more" />More</button>
    </nav>
    <Dialog open={captureOpen} onClose={() => setCaptureOpen(false)} title="Capture a task">
      <QuickAdd date={today.data?.currentLocalDate} autoFocus />
    </Dialog>
    <Dialog open={menuOpen} onClose={() => setMenuOpen(false)} title="Your workspace">
      <nav className={styles.menuLinks} aria-label="More destinations">
        {[...destinations, ...progressionDestinations, ['inbox', 'Inbox'], ['settings', 'Settings']].map(([path, label]) => <NavLink key={path} to={`/${path}`} className={navClass} onClick={() => setMenuOpen(false)}><Icon name={path} />{label}</NavLink>)}
      </nav>
      <p className={styles.email}>{user.email}</p>
      <Button variant="quiet" loading={logoutMutation.isPending} onClick={() => logoutMutation.mutate()}>Sign out</Button>
      {logoutMutation.isError && <p role="alert">Could not sign out. Try again.</p>}
    </Dialog>
  </div>
}
