import { useLanguage } from '../settings/language.js'
import { Navigate, Outlet, useLocation } from 'react-router'
import { useCurrentUser } from './useCurrentUser.js'
import styles from './ProtectedRoute.module.css'
import { ApiError } from '../../shared/api/client.js'
import { Button } from '../../shared/ui/Button.jsx'
import { useEffect, useRef } from 'react'
import { watchSessionChanges } from './sessionSynchronization.js'

function SessionVerification({ children, label }) {
  const ref = useRef(null)
  useEffect(() => {
    const dialog = ref.current
    // A previously open form dialog must not make session retry controls inert.
    dialog.showModal()
    return () => dialog.close()
  }, [])
  return <dialog ref={ref} className={styles.verification} aria-label={label}
    onCancel={event => event.preventDefault()}>{children}</dialog>
}

export function ProtectedRoute() {
  const { t } = useLanguage()
  const user = useCurrentUser()
  const location = useLocation()
  const { refetch } = user
  useEffect(() => watchSessionChanges(() => { void refetch() }), [refetch])

  if (user.isPending) {
    return <main className={styles.centered} aria-live="polite">{t("Checking your session…")}</main>
  }
  if (user.isError && user.error instanceof ApiError && user.error.status === 401) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }
  const failure = user.isError && <div>
      <p role="alert">{user.error?.status === 403 ? t("Access to this workspace was denied.")
        : user.error?.status === 429 ? t("Too many requests. Wait a minute, then try again.")
          : t("We could not check your session. Check your connection and try again.")}</p>
      <Button onClick={() => user.refetch()}>{t("Try again")}</Button>
    </div>
  if (!user.data) return <main className={styles.centered}>{failure}</main>
  const verifying = user.isFetching || user.isError
  return <>
    {verifying && <SessionVerification label={t('Checking your session…')}>
      {user.isFetching ? <p role="status">{t('Checking your session…')}</p> : failure}
    </SessionVerification>}
    <div key={user.data.id} inert={verifying} aria-hidden={verifying || undefined}
      style={{ display: 'contents', visibility: verifying ? 'hidden' : undefined }}>
      <Outlet context={{ user: user.data }} />
    </div>
  </>
}
