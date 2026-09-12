import { Link, Navigate, Route, Routes } from 'react-router'
import { AreaPage } from '../features/areas/AreaPage.jsx'
import { AuthenticatedShell } from '../features/auth/AuthenticatedShell.jsx'
import { LoginPage } from '../features/auth/LoginPage.jsx'
import { ProtectedRoute } from '../features/auth/ProtectedRoute.jsx'
import { useCurrentUser } from '../features/auth/useCurrentUser.js'
import { SettingsPage } from '../features/settings/SettingsPage.jsx'
import { StartPage } from '../features/system/StartPage.jsx'
import { PageHeader } from '../shared/ui/PageHeader.jsx'
import styles from './App.module.css'

function HomeRoute() {
  const user = useCurrentUser()
  if (user.isPending) return <main className={styles.centered}>Checking your session…</main>
  return <Navigate to={user.isSuccess ? '/areas' : '/login'} replace />
}

function NotFoundPage() {
  return <main className={styles.publicPage}>
    <PageHeader title="Page not found" description="This page is not available." />
    <Link to="/">Back to LIFEMAXING</Link>
  </main>
}

export function App() {
  return <Routes>
      <Route index element={<HomeRoute />} />
      <Route path="start" element={<main className={styles.publicPage}><StartPage /></main>} />
      <Route path="login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AuthenticatedShell />}>
          <Route path="areas" element={<AreaPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
}
