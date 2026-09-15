import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { Navigate, useLocation, useNavigate } from 'react-router'
import { z } from 'zod'
import { useEffect, useState } from 'react'

import { Button } from '../../shared/ui/Button.jsx'
import { BrandMark } from '../../shared/ui/BrandMark.jsx'
import { Input } from '../../shared/ui/Input.jsx'
import { Select } from '../../shared/ui/Select.jsx'
import { languages, useLanguage } from '../settings/language.js'
import { login } from './authApi.js'
import { currentUserKey, useCurrentUser } from './useCurrentUser.js'
import styles from './LoginPage.module.css'

const loginSchema = z.object({
  email: z.email('Enter a valid email address.'),
  password: z.string().min(1, 'Enter your password.'),
  rememberMe: z.boolean(),
})

export function LoginPage() {
  const { t, preferences, setPublicPreferences, errorMessage: describeError } = useLanguage()
  const currentUser = useCurrentUser()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const location = useLocation()
  const [showPassword, setShowPassword] = useState(false)
  useEffect(() => { document.title = `${t('Sign in')} · LIFEMAXING` }, [t])
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

  return <main className={styles.page}>
    <aside className={styles.identity} aria-label={t('workspace')}>
      <BrandMark size={32} color="var(--color-inverse)" />
      <h2>{t("Make room for what matters.")}</h2><p>{t("A personal space to turn plans into action and preserve your progress over time.")}</p>
    </aside>
    <div className={styles.login}>
      <a href="/start" className={styles.brand}><BrandMark size={20} />LIFEMAXING</a>
      <div className={styles.surface}>
      <h1>{t("Sign in")}</h1>
      <p className={styles.intro}>{t("Open your tasks, habits and daily plan.")}</p>
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
      </div>
      <div className={styles.preferences}>
        <Select label={t('language')} value={preferences.uiLanguage || 'en'} onChange={event => setPublicPreferences({ uiLanguage: event.target.value })}>{languages.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</Select>
        <Select label={t('theme')} value={preferences.theme || 'system'} onChange={event => setPublicPreferences({ theme: event.target.value })}>{['light', 'dark', 'system'].map(value => <option key={value} value={value}>{t(value)}</option>)}</Select>
      </div>
    </div>
  </main>
}
