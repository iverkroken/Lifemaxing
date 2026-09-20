import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { Link, Navigate, useLocation, useNavigate } from 'react-router'
import { z } from 'zod'
import { useEffect, useRef, useState } from 'react'

import { Button } from '../../shared/ui/Button.jsx'
import { Input } from '../../shared/ui/Input.jsx'
import { useLanguage } from '../settings/language.js'
import { AuthLayout } from './AuthLayout.jsx'
import { ExternalSignIn } from './ExternalSignIn.jsx'
import { notifySessionChange } from './sessionSynchronization.js'
import { login } from './authApi.js'
import { currentUserKey, useCurrentUser } from './useCurrentUser.js'
import styles from './LoginPage.module.css'

const loginSchema = z.object({
  email: z.email('Enter a valid email address.'),
  password: z.string().min(1, 'Enter your password.'),
  rememberMe: z.boolean(),
})

export function LoginPage() {
  const { t, errorMessage: describeError } = useLanguage()
  const currentUser = useCurrentUser()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const location = useLocation()
  const [showPassword, setShowPassword] = useState(false)
  const externalNotified = useRef(false)
  useEffect(() => {
    if (currentUser.isSuccess && new URLSearchParams(location.search).get('external') === 'complete' && !externalNotified.current) {
      externalNotified.current = true
      notifySessionChange()
    }
  }, [currentUser.isSuccess, location.search])
  const form = useForm({ resolver: zodResolver(loginSchema), defaultValues: { email: '', password: '', rememberMe: false } })
  const mutation = useMutation({
    mutationFn: login,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: currentUserKey })
      navigate(location.state?.from || '/today', { replace: true })
    },
  })

  if (currentUser.isSuccess) return <Navigate to={location.state?.from || '/today'} replace />

  const submit = form.handleSubmit(values => mutation.mutate(values))
  const errorMessage = mutation.isError ? describeError(mutation.error) : undefined

  const reason = new URLSearchParams(location.search)
  return <AuthLayout title={t('Sign in')} intro={t('Open your tasks, habits and daily plan.')}>
        {reason.get('password') === 'changed' && <p role="status" className={styles.notice}>{t('Your password has changed. Sign in again on your devices.')}</p>}
        {reason.has('error') && <p role="alert" className={styles.error}>{t(reason.get('error') === 'external_account_exists'
          ? 'An account already uses this email. Sign in with your password or reset it.' : 'External sign-in could not be completed. Try again or use your password.')}</p>}
        {new URLSearchParams(location.search).get('reason') === 'expired' &&
          <p role="status" className={styles.notice}>{t("Your session expired. Sign in again to continue.")}</p>}
        <form onSubmit={submit} className={styles.form} noValidate>
          <Input label={t("Email")} type="email" autoComplete="username" required
            error={form.formState.errors.email} {...form.register('email')} />
          <Input label={t("Password")} type={showPassword ? 'text' : 'password'} autoComplete="current-password" required
            error={form.formState.errors.password} {...form.register('password')} />
          <div className={styles.visibility}><Button type="button" variant="quiet" size="small" aria-pressed={showPassword}
            onClick={() => setShowPassword(value => !value)}>{showPassword ? t("Hide password") : t("Show password")}</Button></div>
          <label className={styles.remember}><input type="checkbox" {...form.register('rememberMe')} />{t("Keep me signed in on this device")}</label>
          <p className={styles.hint}>{t("Up to 30 days. Use only on a device you trust.")}</p>
          {errorMessage && <p role="alert" className={styles.error}>{errorMessage}</p>}
          <Button type="submit" loading={mutation.isPending}>{t("Sign in")}</Button>
        </form>
      <nav className={styles.links} aria-label={t('Account options')}>
        <Link to="/signup">{t('Create account')}</Link><Link to="/forgot-password">{t('Forgot password')}</Link>
        <Link to="/resend-verification">{t('Resend verification')}</Link>
      </nav>
      <ExternalSignIn />
  </AuthLayout>
}
