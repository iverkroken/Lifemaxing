import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router'
import { useRef } from 'react'
import { Button } from '../../shared/ui/Button.jsx'
import { Dialog } from '../../shared/ui/Dialog.jsx'
import { useLanguage } from '../settings/language.js'
import { logout, logoutEverywhere } from './authApi.js'
import styles from '../../shared/ui/Productivity.module.css'

export function SignOutDialog({ mode, onClose }) {
  const { t, language, preferences, setPublicPreferences } = useLanguage()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const cancelRef = useRef(null)
  const submitting = useRef(false)
  const everywhere = mode === 'everywhere'
  const action = useMutation({ mutationFn: everywhere ? logoutEverywhere : logout, onSuccess: () => {
    setPublicPreferences(preferences)
    queryClient.clear()
    navigate('/login', { replace: true })
  }, onSettled: () => { submitting.current = false } })
  const confirm = () => {
    if (submitting.current) return
    submitting.current = true
    action.mutate()
  }
  const close = () => { if (!action.isPending) { action.reset(); onClose() } }
  return <Dialog open={Boolean(mode)} onClose={close} initialFocusRef={cancelRef}
    title={t(everywhere ? 'confirmEverywhere' : 'confirmOut')}>
    <div lang={language}>
      <p>{t(everywhere ? 'everywhereHint' : 'outHint')}</p>
      {action.isError && <p role="alert" className={styles.error}>{t('logoutError')}</p>}
      <div className={styles.actions}>
        <Button ref={cancelRef} variant="secondary" disabled={action.isPending} onClick={close}>{t('cancel')}</Button>
        <Button variant="danger" loading={action.isPending} onClick={confirm}>{t(everywhere ? 'everywhere' : 'signOut')}</Button>
      </div>
    </div>
  </Dialog>
}
