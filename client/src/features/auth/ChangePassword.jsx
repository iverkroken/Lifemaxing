import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router'
import { z } from 'zod'
import { Input } from '../../shared/ui/Input.jsx'
import { Button } from '../../shared/ui/Button.jsx'
import { useLanguage } from '../settings/language.js'
import { accountError, newPassword, passwordHelp } from './accountForms.js'
import { changePassword } from './accountApi.js'
import styles from './LoginPage.module.css'

const schema = z.object({ currentPassword: z.string().min(1, 'Enter your password.'), password: newPassword, confirmation: z.string() })
  .refine(values => values.password === values.confirmation, { message: 'The passwords do not match.', path: ['confirmation'] })

export function ChangePassword() {
  const { t, errorMessage, preferences, setPublicPreferences } = useLanguage()
  const [visible, setVisible] = useState(false)
  const client = useQueryClient()
  const navigate = useNavigate()
  const form = useForm({ resolver: zodResolver(schema), defaultValues: { currentPassword: '', password: '', confirmation: '' } })
  const mutation = useMutation({ mutationFn: ({ currentPassword, password }) => changePassword({ currentPassword, password }), onSuccess: () => {
    setPublicPreferences(preferences)
    client.clear()
    navigate('/login?password=changed', { replace: true })
  } })
  return <div><h2>{t('Change password')}</h2><p>{t('Changing your password signs you out here and revokes older sessions within one minute.')}</p>
    <form className={styles.form} onSubmit={form.handleSubmit(values => mutation.mutate(values))} noValidate>
      <Input label={t('Current password')} type={visible ? 'text' : 'password'} autoComplete="current-password" required error={form.formState.errors.currentPassword && t(form.formState.errors.currentPassword.message)} {...form.register('currentPassword')} />
      <Input label={t('New password')} type={visible ? 'text' : 'password'} autoComplete="new-password" required hint={t(passwordHelp)} error={form.formState.errors.password && t(form.formState.errors.password.message)} {...form.register('password')} />
      <Input label={t('Confirm password')} type={visible ? 'text' : 'password'} autoComplete="new-password" required error={form.formState.errors.confirmation && t(form.formState.errors.confirmation.message)} {...form.register('confirmation')} />
      <Button type="button" variant="quiet" size="small" aria-pressed={visible} onClick={() => setVisible(value => !value)}>{t(visible ? 'Hide password' : 'Show password')}</Button>
      {mutation.isError && <p role="alert" className={styles.error}>{accountError(mutation.error, t, errorMessage)}</p>}
      <Button type="submit" loading={mutation.isPending}>{t('Change password')}</Button>
    </form>
    <div className={styles.links}><Link to="/forgot-password">{t('Forgot password')}</Link></div>
  </div>
}
