import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { useOutletContext, useSearchParams } from 'react-router'
import { z } from 'zod'
import { Button } from '../../shared/ui/Button.jsx'
import { Input } from '../../shared/ui/Input.jsx'
import { Select } from '../../shared/ui/Select.jsx'
import { Icon } from '../../shared/ui/Icon.jsx'
import { PageHeader } from '../../shared/ui/PageHeader.jsx'
import { SignOutDialog } from '../auth/SignOutDialog.jsx'
import { getSettings, updateSettings } from './settingsApi.js'
import { languages } from './language.js'
import { useLanguage } from './language.js'
import { AppearanceSettings } from './AppearanceSettings.jsx'
import styles from './SettingsPage.module.css'

const schema = z.object({ timeZoneId: z.string().min(1), locale: z.string().min(1), uiLanguage: z.enum(['en', 'nb', 'sv', 'da']) })
const sections = [['account', 'personal'], ['preferences', 'languageTime'], ['appearance', 'appearance'], ['security', 'shield']]
const zones = ['UTC', ...Intl.supportedValuesOf('timeZone')]

export function SettingsPage() {
  const { user } = useOutletContext()
  const { t, language } = useLanguage()
  const [params, setParams] = useSearchParams()
  const section = sections.some(([key]) => key === params.get('section')) ? params.get('section') : 'account'
  const [signOut, setSignOut] = useState(null)
  const queryClient = useQueryClient()
  const queryKey = ['settings', user.id]
  const settings = useQuery({ queryKey, queryFn: ({ signal }) => getSettings(signal) })
  const draftKey = ['settings-draft', user.id]
  const form = useForm({ resolver: zodResolver(schema), defaultValues: queryClient.getQueryData(draftKey) || { timeZoneId: '', locale: '', uiLanguage: 'en' } })
  useEffect(() => {
    if (settings.data && !queryClient.getQueryData(['settings-draft', user.id])) form.reset(settings.data)
  }, [form, settings.data, queryClient, user.id])
  useEffect(() => {
    return form.subscribe({ formState: { values: true }, callback: ({ values }) => queryClient.setQueryData(['settings-draft', user.id], values) })
  }, [form, queryClient, user.id])
  const currentValues = useWatch({ control: form.control })
  const dirty = settings.data && ['timeZoneId', 'locale', 'uiLanguage'].some(key => currentValues[key] !== settings.data[key])
  useEffect(() => {
    const warn = event => { if (dirty) { event.preventDefault(); event.returnValue = '' } }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])
  const mutation = useMutation({ mutationFn: updateSettings, onSuccess: saved => {
    queryClient.setQueryData(queryKey, saved)
    queryClient.invalidateQueries({ queryKey: ['productivity'] })
    form.reset(saved)
    queryClient.removeQueries({ queryKey: draftKey })
  } })
  return <div className={styles.page} lang={language}>
    <PageHeader editorial title={t('settings')} description={t('settingsIntro')} />
    <div className={styles.layout} data-detail={params.has("section")}>
      <nav className={styles.navigation} aria-label={t('Settings sections')}>
        {sections.map(([key, icon]) => <button key={key} aria-current={section === key ? 'page' : undefined}
          onClick={() => setParams({ section: key })}><Icon name={icon} />{t(key)}</button>)}
      </nav>
      <div className={styles.content}><Button variant="ghost" className={styles.back} onClick={() => setParams({})}><Icon name="back" />{t("Settings sections")}</Button>
        {section === 'account' && <section className={styles.panel} aria-labelledby="account-heading">
          <div className={styles.accountBanner}><span className={styles.avatar}><Icon name="personal" size={28} /></span><span>{t('privateAccount')}</span></div>
          <div className={styles.panelBody}><h2 id="account-heading">{t('account')}</h2><p>{t('accountHint')}</p>
            <dl className={styles.identity}><dt>{t('email')}</dt><dd>{user.email}</dd></dl>
            <Button variant="secondary" onClick={() => setParams({ section: 'security' })}><Icon name="shield" />{t('security')}</Button>
          </div>
        </section>}
        {section === 'preferences' && <section className={styles.panel} aria-labelledby="preferences-heading"><div className={styles.panelBody}>
          <h2 id="preferences-heading">{t('preferences')}</h2>
          {settings.isPending && <p role="status">{t('loading')}</p>}
          {settings.isError && <><p role="alert" className={styles.error}>{t('loadError')}</p><Button variant="secondary" onClick={() => settings.refetch()}>{t('retry')}</Button></>}
          {settings.isSuccess && <form className={styles.form} onSubmit={form.handleSubmit(values => mutation.mutate(values))} noValidate>
            <fieldset disabled={mutation.isPending} className={styles.form}>
              <Select label={t('language')} hint={t('interfaceHint')} {...form.register('uiLanguage')}>
                {languages.map(([code, name]) => <option key={code} value={code}>{name}</option>)}
              </Select>
              <Select label={t('region')} hint={t('regionHint')} {...form.register('locale')}>
                {[...new Set([settings.data.locale, 'en-GB', 'en-US', 'nb-NO', 'sv-SE', 'da-DK'])].map(locale =>
                  <option key={locale} value={locale}>{new Intl.DisplayNames([language], { type: 'language' }).of(locale)}</option>)}
              </Select>
              <Input label={t('timeZone')} hint={t('zoneSearchHint')} list="time-zones" required {...form.register('timeZoneId')}
                error={form.formState.errors.timeZoneId || mutation.error?.errors?.timeZoneId ? t('invalidZone') : undefined} />
              <datalist id="time-zones">{zones.map(zone => <option key={zone} value={zone}>{zone.replaceAll('_', ' ').replaceAll('/', ' · ')}</option>)}</datalist>
              {mutation.isError && <p role="alert" className={styles.error}>{t('settingsSaveError')}</p>}
              {mutation.isSuccess && <p role="status" className={styles.saved}>{t('saved')}</p>}
              <Button type="submit" loading={mutation.isPending} disabled={!dirty}>{t('save')}</Button>
            </fieldset>
          </form>}
        </div></section>}
        {section === 'appearance' && (settings.isSuccess ? <AppearanceSettings userId={user.id} /> :
          <><p role={settings.isError ? 'alert' : 'status'}>{t(settings.isError ? 'loadError' : 'loading')}</p>
            {settings.isError && <Button variant="secondary" onClick={() => settings.refetch()}>{t('retry')}</Button>}</>)}
        {section === 'security' && <>
          <section className={styles.panel} aria-labelledby="security-heading"><div className={styles.panelBody}>
            <span className={styles.securityIcon}><Icon name="shield" size={28} /></span><h2 id="security-heading">{t('sessionTitle')}</h2>
            <p>{t('sessionHint')}</p><p>{t('deviceHint')}</p>
          </div></section>
          <section className={`${styles.panel} ${styles.danger}`} aria-labelledby="session-controls"><div className={styles.panelBody}>
            <h2 id="session-controls">{t('danger')}</h2>
            <div className={styles.sessionRow}><div><h3>{t('signOut')}</h3><p>{t('outHint')}</p></div><Button variant="dangerQuiet" onClick={() => setSignOut('device')}>{t('signOut')}</Button></div>
            <div className={styles.sessionRow}><div><h3>{t('everywhere')}</h3><p>{t('everywhereHint')}</p></div><Button variant="dangerQuiet" onClick={() => setSignOut('everywhere')}>{t('everywhere')}</Button></div>
          </div></section>
        </>}
      </div>
    </div>
    <SignOutDialog mode={signOut} onClose={() => setSignOut(null)} />
  </div>
}
