import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { Navigate, useLocation, useNavigate } from 'react-router'
import { z } from 'zod'
import { useState } from 'react'
import { ApiError } from '../../shared/api/client.js'
import { Button } from '../../shared/ui/Button.jsx'
import { Icon } from '../../shared/ui/Icon.jsx'
import { Input } from '../../shared/ui/Input.jsx'
import { login } from './authApi.js'
import { currentUserKey, useCurrentUser } from './useCurrentUser.js'
import styles from './LoginPage.module.css'

const loginSchema = z.object({
  email: z.email('Enter a valid email address.'),
  password: z.string().min(1, 'Enter your password.'),
  rememberMe: z.boolean(),
})

export function LoginPage() {
  const currentUser = useCurrentUser()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const location = useLocation()
  const [showPassword, setShowPassword] = useState(false)
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
  const errorMessage = mutation.error instanceof ApiError
    ? mutation.error.status >= 500 ? 'The server is temporarily unavailable. Try again shortly.'
      : mutation.error.status === 403 ? 'Sign-in was denied. Reload the page and try again.'
        : mutation.error.message
    : mutation.isError ? 'Could not reach the server. Check your connection and try again.' : undefined

  return <main className={styles.page}>
    <div className={styles.login}>
      <a href="/start" className={styles.brand}><Icon name="leaf" />LIFEMAXING</a>
      <div className={styles.surface}>
      <h1>Sign in</h1>
      <p className={styles.intro}>Open your tasks, habits and daily plan.</p>
        {new URLSearchParams(location.search).get('reason') === 'expired' &&
          <p role="status" className={styles.notice}>Your session expired. Sign in again to continue.</p>}
        <form onSubmit={submit} className={styles.form} noValidate>
          <Input label="Email" type="email" autoComplete="username" required
            error={form.formState.errors.email?.message} {...form.register('email')} />
          <Input label="Password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" required
            error={form.formState.errors.password?.message} {...form.register('password')} />
          <div className={styles.visibility}><Button type="button" variant="quiet" size="small" aria-pressed={showPassword}
            onClick={() => setShowPassword(value => !value)}>{showPassword ? 'Hide password' : 'Show password'}</Button></div>
          <label className={styles.remember}><input type="checkbox" {...form.register('rememberMe')} />
            Keep me signed in on this device</label>
          <p className={styles.hint}>Up to 30 days. Use only on a device you trust.</p>
          {errorMessage && <p role="alert" className={styles.error}>{errorMessage}</p>}
          <Button type="submit" loading={mutation.isPending}>Sign in</Button>
        </form>
      </div>
    </div>
  </main>
}
