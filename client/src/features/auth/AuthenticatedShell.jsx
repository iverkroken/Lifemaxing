import { lazy, Suspense, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { NavLink, Outlet, useLocation, useNavigate, useNavigationType, useOutletContext } from 'react-router'
import { Button } from '../../shared/ui/Button.jsx'
import { clearCsrfToken } from '../../shared/api/client.js'
import { SignOutDialog } from './SignOutDialog.jsx'
import { useLanguage } from '../settings/language.js'
import styles from './AuthenticatedShell.module.css'
import { Dialog } from '../../shared/ui/Dialog.jsx'
import { Icon } from '../../shared/ui/Icon.jsx'
import { QuickAdd } from '../tasks/QuickAdd.jsx'
import { useProductivity } from '../../shared/api/productivity.js'
import { HabitForm } from '../habits/HabitForm.jsx'
import { GoalForm } from '../goals/GoalForm.jsx'
import { Select } from '../../shared/ui/Select.jsx'
import { CommandMenu } from './CommandMenu.jsx'

const destinations = [['today', 'Today'], ['tasks', 'Tasks'], ['goals', 'Goals'], ['habits', 'Habits'], ['areas', 'Life Areas']]

const progressionDestinations = [['focus', 'Focus'], ['progress', 'Progress'], ['activity', 'Activity'], ['rewards', 'Rewards']]
const TaskDetailPage = lazy(() => import('../tasks/TaskDetailPage.jsx').then(module => ({ default: module.TaskDetailPage })))

export function AuthenticatedShell({ panelTaskId }) {
  const { user } = useOutletContext()
  return <Shell user={user} panelTaskId={panelTaskId} />
}

function Shell({ user, panelTaskId }) {
  const { t, language } = useLanguage()
  const [signOut, setSignOut] = useState(null)
  const panelRef = useRef(null)
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const location = useLocation()
  const navigationType = useNavigationType()
  const positions = useRef(new Map())
  const [captureOpen, setCaptureOpen] = useState(false)
  const [capture, setCapture] = useState({ kind: 'task' })
  const openCapture = (options = {}) => { setCapture({ kind: 'task', ...options }); setCaptureOpen(true) }
  const [menuOpen, setMenuOpen] = useState(false)
  const [commandOpen, setCommandOpen] = useState(false)
  const focusing = location.pathname === '/focus'
  const today = useProductivity('/today')
  const activeFocus = useProductivity('/focus-sessions/active')
  useEffect(() => {
    if (!panelTaskId) return
    panelRef.current?.focus()
    return () => document.querySelector(`[data-task-link="${panelTaskId}"]`)?.focus({ preventScroll: true })
  }, [panelTaskId])
  useEffect(() => {
    const shortcut = event => {
      if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== 'k' || event.altKey || event.isComposing) return
      if (document.querySelector('dialog[open]') || event.target.isContentEditable || event.target.closest('input, textarea, select')) return
      event.preventDefault(); setCommandOpen(true)
    }
    document.addEventListener('keydown', shortcut)
    return () => document.removeEventListener('keydown', shortcut)
  }, [])
  useEffect(() => {
    const path = location.pathname.split('/')[1]
    document.title = `${t(path)} · LIFEMAXING`
  }, [location.pathname, language, t])

  useEffect(() => {
    const sessionExpired = () => {
      clearCsrfToken()
      queryClient.clear()
      navigate('/login?reason=expired', { replace: true })
    }
    window.addEventListener('lifemaxing:session-expired', sessionExpired)
    return () => window.removeEventListener('lifemaxing:session-expired', sessionExpired)
  }, [navigate, queryClient])

  useLayoutEffect(() => {
    const saved = navigationType === 'POP' ? positions.current.get(location.key) : null
    document.getElementById('main-content')?.focus({ preventScroll: true })
    window.scrollTo(0, saved?.y || 0)
    if (saved?.taskId) document.querySelector(`[data-task-link="${saved.taskId}"]`)?.focus({ preventScroll: true })
    const remember = () => positions.current.set(location.key, { y: window.scrollY, taskId: document.activeElement?.dataset.taskLink })
    window.addEventListener('scroll', remember, { passive: true })
    document.addEventListener('focusin', remember)
    return () => {
      window.removeEventListener('scroll', remember)
      document.removeEventListener('focusin', remember)
    }
  }, [location.key, navigationType])

  const navClass = ({ isActive }) => isActive ? styles.activeLink : styles.navLink
  return <div className={`${styles.shell} ${focusing ? styles.focusing : ''} ${panelTaskId ? styles.withPanel : ''}`}>
    <a href="#main-content" className={styles.skipLink}>{t("Skip to content")}</a>
    <aside className={styles.sidebar}>
      <NavLink to="/today" className={styles.brand}><Icon name="leaf" size={24} />LIFEMAXING</NavLink>
      <Button variant="secondary" onClick={() => openCapture()}><Icon name="plus" />{t('quickAdd')}</Button>
      <button className={styles.commandTrigger} onClick={() => setCommandOpen(true)}><Icon name="search" />{t('commandMenu')}<kbd>{t("⌘ / Ctrl K")}</kbd></button>
      <nav className={styles.navigation} aria-label={t("Main navigation")}>
        <p className={styles.navLabel}>{t('workspace')}</p>
        {destinations.map(([path]) => <NavLink key={path} to={`/${path}`} className={navClass}><Icon name={path} />{t(path)}</NavLink>)}
        <div className={styles.inbox}><NavLink to="/inbox" aria-label={t('inbox')} className={navClass}><Icon name="inbox" />{t('inbox')}{today.data && <span className={styles.count} aria-hidden="true">{today.data.inboxCount}</span>}</NavLink></div>
        <div className={styles.progressionNav}><p className={styles.navLabel}>{t('progress')}</p>
          <NavLink to="/progress" className={navClass}><Icon name="progress" />{t('progress')}</NavLink>
          <NavLink to="/focus" className={navClass}><Icon name="focus" />{t(activeFocus.data?.session ? 'continueFocus' : 'focus')}</NavLink>
          {activeFocus.data?.session && <span className={styles.focusState}>{t(activeFocus.data.session.status === 'Paused' ? 'paused' : 'running')}</span>}
        </div>
      </nav>
      <div className={styles.account}>
        <NavLink to="/settings" className={navClass}><Icon name="settings" />{t('settings')}</NavLink>
        <span className={styles.email}>{user.email}</span>
        <Button variant="danger" size="small"
          onClick={() => { setMenuOpen(false); setSignOut('device') }}><Icon name="signOut" />{t('signOut')}</Button>
      </div>
    </aside>
    <header className={styles.mobileHeader}><NavLink to="/today" className={styles.brand}><Icon name="leaf" />LIFEMAXING</NavLink>
      <Button variant="quiet" aria-label={t('commandMenu')} onClick={() => setCommandOpen(true)}><Icon name="search" /></Button>
      <NavLink to="/inbox" className={styles.mobileInbox}><Icon name="inbox" /><span>{t('inbox')}</span></NavLink>
    </header>
    <main id="main-content" className={styles.content} tabIndex={-1}>
      {['/progress', '/activity', '/rewards'].includes(location.pathname) && <nav className={styles.progressTabs} aria-label={t('progress')}>
        {progressionDestinations.filter(([path]) => path !== 'focus').map(([path]) => <NavLink key={path} to={'/' + path}>{t(path)}</NavLink>)}
      </nav>}
      <Outlet context={{ user, openCapture }} />
    </main>
    {panelTaskId && <aside ref={panelRef} tabIndex={-1} className={styles.taskPanel} aria-label={t('taskDetails')}
      onKeyDown={event => { if (event.key === 'Escape' && !document.querySelector('dialog[open]')) navigate(-1) }}>
      <Button variant="secondary" onClick={() => navigate(-1)}>{t('backToList')}</Button>
      <Suspense fallback={<p role="status">{t('Loading…')}</p>}><TaskDetailPage taskId={panelTaskId} panel /></Suspense>
    </aside>}
    <nav className={styles.dock} aria-label={t("Mobile navigation")}>
      <NavLink to="/today" className={navClass}><Icon name="today" />{t('today')}</NavLink>
      <NavLink to="/tasks" className={navClass}><Icon name="tasks" />{t('tasks')}</NavLink>
      <button className={styles.dockCapture} onClick={() => openCapture()}><Icon name="plus" />{t('capture')}</button>
      <NavLink to="/goals" className={navClass}><Icon name="goals" />{t('goals')}</NavLink>
      <button className={styles.navLink} aria-haspopup="dialog" onClick={() => setMenuOpen(true)}><Icon name="more" />{t('more')}</button>
    </nav>
    <Dialog open={captureOpen} onClose={() => setCaptureOpen(false)} title={capture.kind === 'habit' ? t("Create a habit") : capture.kind === 'goal' ? t("Create a goal") : t("Capture a task")}>
      <div className={styles.captureType}><Select label={t("Create")} value={capture.kind} onChange={e => setCapture(value => ({ ...value, kind: e.target.value }))}>
        <option value="task">{t("Task")}</option><option value="habit">{t("Habit")}</option><option value="goal">{t("Goal")}</option>
      </Select></div>
      {capture.kind === 'task' && <QuickAdd date={capture.date === null ? undefined : capture.date || today.data?.currentLocalDate} autoFocus />}
      {capture.kind === 'habit' && <HabitForm onSaved={habit => { setCaptureOpen(false); navigate(`/habits/${habit.id}`) }} />}
      {capture.kind === 'goal' && <GoalForm onSaved={goal => { setCaptureOpen(false); navigate(`/goals/${goal.id}`) }} />}
    </Dialog>
    <Dialog open={menuOpen} onClose={() => setMenuOpen(false)} title={t('workspace')}>
      <nav className={styles.menuLinks} aria-label={t("More destinations")}>
        {[...destinations, ...progressionDestinations, ['inbox', 'Inbox'], ['settings', 'Settings']].map(([path]) => <NavLink key={path} to={`/${path}`} className={navClass} onClick={() => setMenuOpen(false)}><Icon name={path} />{t(path)}</NavLink>)}
      </nav>
      <p className={styles.email}>{user.email}</p>
      <Button variant="danger" onClick={() => { setMenuOpen(false); setSignOut('device') }}><Icon name="signOut" />{t('signOut')}</Button>
    </Dialog>
    <SignOutDialog mode={signOut} onClose={() => setSignOut(null)} />
    <CommandMenu open={commandOpen} onClose={() => setCommandOpen(false)} openCapture={openCapture} session={activeFocus.data?.session}
      destinations={[...destinations, ...progressionDestinations, ['inbox'], ['settings']]} />
  </div>
}
