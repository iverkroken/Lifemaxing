import { useLanguage } from '../features/settings/language.js'

import { Link, Navigate, Route, Routes, useLocation } from 'react-router'
import { lazy, Suspense, useEffect, useState } from 'react'

import { AuthenticatedShell } from '../features/auth/AuthenticatedShell.jsx'
import { LoginPage } from '../features/auth/LoginPage.jsx'
import { ProtectedRoute } from '../features/auth/ProtectedRoute.jsx'

import { PageHeader } from '../shared/ui/PageHeader.jsx'
import styles from './App.module.css'

const FocusPage = lazy(() => import('../features/focus/FocusPage.jsx').then(module => ({ default: module.FocusPage })))
const AccountPage = lazy(() => import('../features/auth/AccountPage.jsx').then(module => ({ default: module.AccountPage })))
const SubscriptionsPage = lazy(() => import('../features/finance/SubscriptionsPage.jsx').then(module => ({ default: module.SubscriptionsPage })))
const RankSystemPage = lazy(() => import('../features/progress/RankSystemPage.jsx').then(module => ({ default: module.RankSystemPage })))
const ProgressPage = lazy(() => import('../features/progress/ProgressPage.jsx').then(module => ({ default: module.ProgressPage })))
const ActivityPage = lazy(() => import('../features/progress/ProgressPage.jsx').then(module => ({ default: module.ActivityPage })))
const RewardsPage = lazy(() => import('../features/progress/RewardsPage.jsx').then(module => ({ default: module.RewardsPage })))
const AreaPage = lazy(() => import('../features/areas/AreaPage.jsx').then(module => ({ default: module.AreaPage })))
const AreaLayout = lazy(() => import('../features/areas/AreaDetail.jsx').then(module => ({ default: module.AreaLayout })))
const AreaOverview = lazy(() => import('../features/areas/AreaDetail.jsx').then(module => ({ default: module.AreaOverview })))
const SettingsPage = lazy(() => import('../features/settings/SettingsPage.jsx').then(module => ({ default: module.SettingsPage })))
const StartPage = lazy(() => import('../features/system/StartPage.jsx').then(module => ({ default: module.StartPage })))
const TodayPage = lazy(() => import('../features/today/TodayPage.jsx').then(module => ({ default: module.TodayPage })))
const TasksPage = lazy(() => import('../features/tasks/TasksPage.jsx').then(module => ({ default: module.TasksPage })))
const NewTaskPage = lazy(() => import('../features/tasks/TaskDetailPage.jsx').then(module => ({ default: module.NewTaskPage })))
const TaskDetailPage = lazy(() => import('../features/tasks/TaskDetailPage.jsx').then(module => ({ default: module.TaskDetailPage })))
const HabitsPage = lazy(() => import('../features/habits/HabitsPage.jsx').then(module => ({ default: module.HabitsPage })))
const HabitDetailPage = lazy(() => import('../features/habits/HabitsPage.jsx').then(module => ({ default: module.HabitDetailPage })))
const GoalsPage = lazy(() => import('../features/goals/GoalsPage.jsx').then(module => ({ default: module.GoalsPage })))
const GoalDetailPage = lazy(() => import('../features/goals/GoalsPage.jsx').then(module => ({ default: module.GoalDetailPage })))

function HomeRoute() {
  return <Navigate to="/today" replace />
}

function NotFoundPage() {
  const { t } = useLanguage()
  return <main className={styles.publicPage}>
    <PageHeader title={t("Page not found")} description={t("This page is not available.")} />
    <Link to="/">{t("Back to LIFEMAXING")}</Link>
  </main>
}

export function App() {
  const { t } = useLanguage()
  const location = useLocation()
  const [initialKey] = useState(location.key)
  const [wide, setWide] = useState(() => window.matchMedia('(min-width: 1200px)').matches)
  useEffect(() => {
    const media = window.matchMedia('(min-width: 1200px)')
    const update = () => setWide(media.matches)
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])
  const background = wide && location.key !== initialKey && /^\/tasks\/[^/]+$/.test(location.pathname) && location.pathname !== '/tasks/new'
    ? location.state?.backgroundLocation : null
  return <Suspense fallback={<p role="status">{t("Loading…")}</p>}><Routes location={background || location}>
      <Route index element={<HomeRoute />} />
      <Route path="start" element={<main className={styles.publicPage}><StartPage /></main>} />
      <Route path="login" element={<LoginPage />} />
      <Route path="signup" element={<AccountPage key="signup" mode="signup" />} />
      <Route path="forgot-password" element={<AccountPage key="forgot" mode="forgot" />} />
      <Route path="reset-password" element={<AccountPage key="reset" mode="reset" />} />
      <Route path="verify-email" element={<AccountPage key="verify" mode="verify" />} />
      <Route path="resend-verification" element={<AccountPage key="resend" mode="resend" />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AuthenticatedShell panelTaskId={background ? location.pathname.split('/')[2] : null} />}>
          <Route path="focus" element={<FocusPage />} />
          <Route path="progress" element={<ProgressPage />} />
          <Route path="progress/ranks" element={<RankSystemPage />} />
          <Route path="activity" element={<ActivityPage />} />
          <Route path="rewards" element={<RewardsPage />} />
          <Route path="today" element={<TodayPage />} />
          <Route path="inbox" element={<TasksPage key="inbox" inbox />} />
          <Route path="tasks" element={<TasksPage key="tasks" />} />
          <Route path="tasks/new" element={<NewTaskPage />} />
          <Route path="tasks/:id" element={<TaskDetailPage />} />
          <Route path="habits" element={<HabitsPage />} />
          <Route path="habits/:id" element={<HabitDetailPage />} />
          <Route path="goals" element={<GoalsPage />} />
          <Route path="goals/:id" element={<GoalDetailPage />} />
          <Route path="areas" element={<AreaPage />} />
          <Route path="areas/:areaKey" element={<AreaLayout />}>
            <Route index element={<AreaOverview />} />
            <Route path="tasks" element={<TasksPage />} />
            <Route path="goals" element={<GoalsPage />} />
            <Route path="habits" element={<HabitsPage />} />
            <Route path="subscriptions" element={<SubscriptionsPage />} />
          </Route>
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes></Suspense>
}
