import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { apiRequest } from '../../shared/api/client.js'
import { Button } from '../../shared/ui/Button.jsx'
import { Input } from '../../shared/ui/Input.jsx'
import { Dialog } from '../../shared/ui/Dialog.jsx'
import { useLanguage } from '../settings/language.js'
import { methods, presetMinutes } from './timeTools.js'
import styles from './FocusPage.module.css'

export function FocusMethods({ method, setMethod, preferences, smartMinutes, setSmartMinutes, onSettings, onReviewed }) {
  const { t } = useLanguage()
  const [review, setReview] = useState(false)
  const preview = useMutation({ mutationFn: minutes => apiRequest('/focus-runs/preview', { method: 'POST', body: { method: 'Smart Focus', smartMinutes: minutes } }) })
  const changeDuration = minutes => { setSmartMinutes(minutes); onReviewed(false); preview.reset() }
  return <>
    <div className={styles.methods} role="group" aria-label={t('Focus method')}>
      {methods.map(name => <button key={name} type="button" aria-pressed={method === name} onClick={() => { setMethod(name); if (name === 'Custom') onSettings() }}>
        <span>{t(name)}</span><small>{presetMinutes[name] ? `${presetMinutes[name][0]} / ${presetMinutes[name][1]} ${t('min')}` : t(name === 'Smart Focus' ? 'Suggested rhythm' : 'Your rhythm')}</small>
      </button>)}
    </div>
    {method === 'Smart Focus' && <div className={styles.smart}>
      <span className={styles.hint}>{smartMinutes} {t('min')} · {t('Suggested rhythm')}</span>
      <Button variant="secondary" size="small" onClick={() => { setReview(true); if (smartMinutes >= 5 && smartMinutes <= 720) preview.mutate(smartMinutes) }}>{t('Review schedule')}</Button>
    </div>}
    {method === 'Custom' && <p className={styles.hint}>{preferences.custom.focusMinutes} {t('min focus')} · {preferences.custom.breakMinutes} {t('min break')} <Button variant="quiet" size="small" onClick={onSettings}>{t('Edit rhythm')}</Button></p>}
    <Dialog open={review} onClose={() => setReview(false)} title={t('Suggested focus rhythm')} placement="sheet">
      <p>{t('A suggested rhythm, not a scientific prescription.')}</p>
      <div className={styles.quick} role="group" aria-label={t('Total duration')}>{[30, 60, 120, 180].map(minutes => <Button key={minutes} variant="quiet" size="small" aria-pressed={smartMinutes === minutes} onClick={() => changeDuration(minutes)}>{minutes < 60 ? '30 ' + t('min') : `${minutes / 60} ${t('h')}`}</Button>)}</div>
      <Input label={t('Total minutes')} type="number" min="5" max="720" value={smartMinutes} onChange={e => changeDuration(Number(e.target.value))} />
      <Button variant="secondary" size="small" disabled={!Number.isInteger(smartMinutes) || smartMinutes < 5 || smartMinutes > 720} loading={preview.isPending} onClick={() => preview.mutate(smartMinutes)}>{t('Review schedule')}</Button>
      {preview.isPending && <p role="status">{t('Loading…')}</p>}
      {preview.error && <p role="alert">{t('Could not load the schedule. Try again.')}</p>}
      {preview.data && <><ol className={styles.schedule}>{preview.data.periods.map((period, index) => <li key={index}><span>{t(period.phase)}</span><strong>{period.seconds / 60} {t('min')}</strong></li>)}</ol>
        <Button onClick={() => { onReviewed(true); setReview(false) }}>{t('Use this schedule')}</Button></>}
    </Dialog>
  </>
}
