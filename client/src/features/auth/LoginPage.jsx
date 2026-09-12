import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { Navigate, useLocation, useNavigate } from 'react-router'
import { z } from 'zod'
import { ApiError } from '../../shared/api/client.js'
import { Button } from '../../shared/ui/Button.jsx'
import { Card } from '../../shared/ui/Card.jsx'
import { Input } from '../../shared/ui/Input.jsx'
import { login } from './authApi.js'
import { currentUserKey, useCurrentUser } from './useCurrentUser.js'
import styles from './LoginPage.module.css'

const loginSchema = z.object({
  email: z.email('Enter a valid email address.'),
  password: z.string().min(1, 'Enter your password.'),
})

export function LoginPage() {
  const currentUser = useCurrentUser()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const location = useLocation()
  const form = useForm({ resolver: zodResolver(loginSchema), defaultValues: { email: '', password: '' } })
  const mutation = useMutation({
    mutationFn: login,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: currentUserKey })
      navigate(location.state?.from || '/areas', { replace: true })
    },
  })

  if (currentUser.isSuccess) return <Navigate to="/areas" replace />

  const submit = form.handleSubmit(values => mutation.mutate(values))
  const errorMessage = mutation.error instanceof ApiError
    ? mutation.error.message
    : mutation.isError ? 'Sign-in could not be completed. Try again.' : undefined

  return <main className={styles.page}>
    <div className={styles.login}>
      <a href="/start" className={styles.brand}>LIFEMAXING</a>
      <p className={styles.eyebrow}>Private workspace</p>
      <h1>Welcome back.</h1>
      <p className={styles.intro}>Sign in to continue to your personal operating system.</p>
      <Card>
        {new URLSearchParams(location.search).get('reason') === 'expired' &&
          <p role="status" className={styles.notice}>Your session expired. Sign in again to continue.</p>}
        <form onSubmit={submit} className={styles.form} noValidate>
          <Input label="Email" type="email" autoComplete="username" required
            error={form.formState.errors.email?.message} {...form.register('email')} />
          <Input label="Password" type="password" autoComplete="current-password" required
            error={form.formState.errors.password?.message} {...form.register('password')} />
          {errorMessage && <p role="alert" className={styles.error}>{errorMessage}</p>}
          <Button type="submit" loading={mutation.isPending}>Sign in</Button>
        </form>
      </Card>
    </div>
  </main>
}
