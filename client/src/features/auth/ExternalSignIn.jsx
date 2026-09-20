import { useRef, useState } from 'react'
import { Button } from '../../shared/ui/Button.jsx'
import { useLanguage } from '../settings/language.js'
import { googleFormToken, useAccountProviders } from './accountApi.js'
import styles from './LoginPage.module.css'

export function ExternalSignIn() {
  const providers = useAccountProviders()
  const { t, errorMessage } = useLanguage()
  const form = useRef(null)
  const token = useRef(null)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState(null)
  const start = async event => {
    event.preventDefault()
    if (pending) return
    setPending(true)
    setError(null)
    try {
      token.current.value = await googleFormToken()
      // A browser form follows the provider redirect; fetch would cross origins.
      form.current.submit()
    } catch (failure) { setError(failure); setPending(false) }
  }
  return <div className={styles.external}>
    <form ref={form} method="post" action="/api/v1/auth/external/google" onSubmit={start}>
      <input ref={token} type="hidden" name="__RequestVerificationToken" />
      <Button type="submit" variant="secondary" loading={pending} disabled={!providers.data?.googleEnabled}>{t('Continue with Google')}</Button>
    </form>
    <Button variant="secondary" disabled>{t('Continue with Apple')}</Button>
    <p className={styles.providerHint}>{t(providers.data?.googleEnabled ? 'Apple sign-in is not connected yet.' : 'External sign-in is not connected yet. Use email and password.')}</p>
    {(error || providers.isError) && <p role="alert" className={styles.error}>{errorMessage(error || providers.error)}</p>}
  </div>
}
