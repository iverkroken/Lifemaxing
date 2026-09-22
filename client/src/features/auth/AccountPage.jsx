import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useLocation, useNavigate } from 'react-router'
import { z } from 'zod'
import { Button } from '../../shared/ui/Button.jsx'
import { Input } from '../../shared/ui/Input.jsx'
import { useLanguage } from '../settings/language.js'
import { AuthLayout } from './AuthLayout.jsx'
import { accountRequest, useAccountProviders } from './accountApi.js'
import { ExternalSignIn } from './ExternalSignIn.jsx'
import { accountError, emailUnavailableMessage, invalidLinkMessage, newPassword, passwordHelp } from './accountForms.js'
import styles from './LoginPage.module.css'

const emailSchema = z.object({ email: z.email('Enter a valid email address.') })
const passwordFields = { password: newPassword, confirmation: z.string() }
const passwordsMatch = values => values.password === values.confirmation
const matchError = { message: 'The passwords do not match.', path: ['confirmation'] }
const schemas = {
  signup: emailSchema.extend(passwordFields).refine(passwordsMatch, matchError),
  forgot: emailSchema,
  resend: emailSchema,
  reset: z.object(passwordFields).refine(passwordsMatch, matchError),
  verify: z.object({}),
}
const pages = {
  signup: ['Create account', 'A personal workspace, ready for your next chapter.', 'register', 'Create account'],
  forgot: ['Forgot password', 'We will help you regain access to your workspace.', 'forgot-password', 'Request reset link'],
  resend: ['Verify your email', 'Request a new verification link for your account.', 'resend-verification', 'Request verification link'],
  verify: ['Verify your email', 'Confirm that this email address belongs to you.', 'confirm-email', 'Verify email'],
  reset: ['Choose a new password', 'Your saved work and history will stay with your account.', 'reset-password', 'Reset password'],
}
export function AccountPage({ mode }) {
  const { t, errorMessage } = useLanguage()
  const location = useLocation()
  const navigate = useNavigate()
  const [link] = useState(() => {
    const params = new URLSearchParams(location.hash.slice(1))
    return { userId: params.get('userId') || '', token: params.get('token') || '' }
  })
  useEffect(() => {
    if (location.hash) navigate(location.pathname, { replace: true })
  }, [location.hash, location.pathname, navigate])
  const [showPassword, setShowPassword] = useState(false)
  const providers = useAccountProviders()
  const [title, intro, endpoint, submitLabel] = pages[mode]
  const emailMode = ['signup', 'forgot', 'resend'].includes(mode)
  const passwordMode = ['signup', 'reset'].includes(mode)
  const tokenMode = ['verify', 'reset'].includes(mode)
  const validLink = /^[a-f\d]{8}(-[a-f\d]{4}){3}-[a-f\d]{12}$/i.test(link.userId) && link.token.length > 0 && link.token.length <= 4096
  const form = useForm({ resolver: zodResolver(schemas[mode]), defaultValues: { email: '', password: '', confirmation: '' } })
  const mutation = useMutation({ mutationFn: values => accountRequest(endpoint, {
    ...(emailMode && { email: values.email }), ...(passwordMode && { password: values.password }), ...(tokenMode && link),
  }), onSuccess: () => form.reset() })
  const success = mode === 'verify' ? 'Your email is verified. You can now sign in.'
    : mode === 'reset' ? 'Your password has been reset. Sign in with your new password.'
      : mode === 'signup' ? providers.data?.emailDelivery === 'development'
        ? 'Your account is created. Open the verification link in the local development mailbox.'
        : 'Your account is created. Check your email to verify your address before signing in.'
        : providers.data?.emailDelivery === 'development'
          ? 'If an eligible account exists, its link is available in the local development mailbox.'
          : 'If an eligible account exists, a link has been requested. Check your email shortly.'
  return <AuthLayout title={t(title)} intro={t(intro)}>
    {mutation.isSuccess ? <p className={styles.notice} role="status">{t(success)}</p>
      : tokenMode && !validLink ? <p role="alert" className={styles.error}>{t(invalidLinkMessage)}</p>
        : <form className={styles.form} noValidate onSubmit={form.handleSubmit(values => mutation.mutate(values))}>
          {emailMode && <Input label={t('Email')} type="email" autoComplete="email" required error={form.formState.errors.email && t(form.formState.errors.email.message)} {...form.register('email')} />}
          {passwordMode && <>
            <Input label={t('Password')} type={showPassword ? 'text' : 'password'} autoComplete="new-password" required hint={t(passwordHelp)} error={form.formState.errors.password && t(form.formState.errors.password.message)} {...form.register('password')} />
            <Input label={t('Confirm password')} type={showPassword ? 'text' : 'password'} autoComplete="new-password" required error={form.formState.errors.confirmation && t(form.formState.errors.confirmation.message)} {...form.register('confirmation')} />
            <Button variant="quiet" type="button" size="small" aria-pressed={showPassword} onClick={() => setShowPassword(value => !value)}>{t(showPassword ? 'Hide password' : 'Show password')}</Button>
          </>}
          {mutation.isError && <p role="alert" className={styles.error}>{accountError(mutation.error, t, errorMessage)}</p>}
          {emailMode && providers.data?.emailAvailable === false && <p role="status" className={styles.notice}>{t(emailUnavailableMessage)}</p>}
          <Button type="submit" loading={mutation.isPending} disabled={emailMode && providers.data?.emailAvailable === false}>{t(submitLabel)}</Button>
        </form>}
    <nav className={styles.links} aria-label={t('Account options')}>
      <Link to="/login">{t('Back to sign in')}</Link>
      {mode === 'signup' && <Link to="/resend-verification">{t('Resend verification')}</Link>}
      {mode === 'verify' && <Link to="/resend-verification">{t('Request a new link')}</Link>}
      {mode === 'reset' && <Link to="/forgot-password">{t('Request a new link')}</Link>}
    </nav>
    {mode === 'signup' && !mutation.isSuccess && <ExternalSignIn />}
  </AuthLayout>
}
