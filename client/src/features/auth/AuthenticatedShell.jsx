import { lazy, Suspense, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Outlet, useLocation, useNavigate, useNavigationType, useOutletContext } from 'react-router'
import { Button } from '../../shared/ui/Button.jsx'
import { clearCsrfToken } from '../../shared/api/client.js'
import { SignOutDialog } from './SignOutDialog.jsx'
import { useLanguage } from '../settings/language.js'
import styles from './AuthenticatedShell.module.css'
import { Dialog } from '../../shared/ui/Dialog.jsx'
import { QuickAdd } from '../tasks/QuickAdd.jsx'
import { useProductivity } from '../../shared/api/productivity.js'
import { HabitForm } from '../habits/HabitForm.jsx'
import { GoalForm } from '../goals/GoalForm.jsx'
import { Select } from '../../shared/ui/Select.jsx'
import { CommandMenu } from './CommandMenu.jsx'

import { TopNavigation, SectionNavigation } from './Navigation.jsx'
import { MenuDrawer } from './MenuDrawer.jsx'
import { destinations } from './navigation.js'

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
  const immersive = focusing || location.pathname === '/today'
  const [heroState, setHeroState] = useState(null)
  const overArtwork = focusing || (location.pathname === '/today' && !(heroState?.key === location.key && heroState.past))
  useEffect(() => {
    if (location.pathname !== '/today') return
    let observer
    let observedBoundary
    let headerHeight
    const header = document.querySelector('header')
    const observeHero = () => {
      const boundary = document.querySelector('[data-hero-boundary]')
      const nextHeight = header?.offsetHeight || 72
      if (!boundary || (boundary === observedBoundary && nextHeight === headerHeight)) return
      observer?.disconnect()
      observedBoundary = boundary
      headerHeight = nextHeight
      // Cover text when it reaches the fixed header, not when the whole hero
      // leaves. Rebuild the observer margin when the header changes size.
      observer = new IntersectionObserver(([entry]) => setHeroState({ key: location.key, past: entry.boundingClientRect.top < headerHeight }), { rootMargin: `-${headerHeight}px 0px 0px 0px` })
      observer.observe(boundary)
    }
    const resize = new ResizeObserver(observeHero)
    if (header) resize.observe(header)
    const mounts = new MutationObserver(observeHero)
    mounts.observe(document.getElementById('root'), { childList: true, subtree: true })
    observeHero()
    return () => { observer?.disconnect(); resize.disconnect(); mounts.disconnect() }
  }, [location.key, location.pathname])
  const today = useProductivity('/today')
  const activeFocus = useProductivity('/focus-sessions/active')
  useEffect(() => {
    if (!panelTaskId) return
    panelRef.current?.focus()
    return () => document.querySelector(`[data-task-link="${panelTaskId}"]`)?.focus({ preventScroll: true })
  }, [panelTaskId])
  useEffect(() => {
    const shortcut = event => {
      if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== 'k' || event.altKey || event.shiftKey || event.isComposing) return
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

  return <div className={`${styles.shell} ${immersive ? styles.immersive : ''} ${panelTaskId ? styles.withPanel : ''}`}>
    <a href="#main-content" className={styles.skipLink}>{t("Skip to content")}</a>
    <TopNavigation onSearch={() => setCommandOpen(true)} onMenu={() => setMenuOpen(true)} menuOpen={menuOpen} session={activeFocus.data?.session} overArtwork={overArtwork} />
    <main id="main-content" className={styles.content} tabIndex={-1}>
      <SectionNavigation />
      <Outlet context={{ user, openCapture }} />
    </main>
    {panelTaskId && <aside ref={panelRef} tabIndex={-1} className={styles.taskPanel} aria-label={t('taskDetails')}
      onKeyDown={event => { if (event.key === 'Escape' && !document.querySelector('dialog[open]')) navigate(-1) }}>
      <Button variant="secondary" onClick={() => navigate(-1)}>{t('backToList')}</Button>
      <Suspense fallback={<p role="status">{t('Loading…')}</p>}><TaskDetailPage taskId={panelTaskId} panel /></Suspense>
    </aside>}
    <Dialog placement="sheet" open={captureOpen} onClose={() => setCaptureOpen(false)} title={capture.kind === 'habit' ? t("Create a habit") : capture.kind === 'goal' ? t("Create a goal") : t("Capture a task")}>
      <div className={styles.captureType}><Select label={t("Create")} value={capture.kind} onChange={e => setCapture(value => ({ ...value, kind: e.target.value }))}>
        <option value="task">{t("Task")}</option><option value="habit">{t("Habit")}</option><option value="goal">{t("Goal")}</option>
      </Select></div>
      {capture.kind === 'task' && <QuickAdd currentDate={today.data?.currentLocalDate} lifeAreaId={capture.lifeAreaId} date={capture.date === null ? undefined : capture.date || today.data?.currentLocalDate} autoFocus />}
      {capture.kind === 'habit' && <HabitForm initialAreaId={capture.lifeAreaId} onSaved={habit => { setCaptureOpen(false); navigate(`/habits/${habit.id}`) }} />}
      {capture.kind === 'goal' && <GoalForm initialAreaId={capture.lifeAreaId} onSaved={goal => { setCaptureOpen(false); navigate(`/goals/${goal.id}`) }} />}
    </Dialog>
    <MenuDrawer onNavigate={() => { setMenuOpen(false); requestAnimationFrame(() => document.getElementById('main-content')?.focus({ preventScroll: true })) }} open={menuOpen} onClose={() => setMenuOpen(false)} user={user} session={activeFocus.data?.session}
      onSearch={() => { setMenuOpen(false); setCommandOpen(true) }}
      onSignOut={() => { setMenuOpen(false); setSignOut('device') }} />
    <SignOutDialog mode={signOut} onClose={() => setSignOut(null)} />
    <CommandMenu open={commandOpen} onClose={() => setCommandOpen(false)} openCapture={openCapture} session={activeFocus.data?.session}
      destinations={destinations.map(path => [path])} />
  </div>
}
