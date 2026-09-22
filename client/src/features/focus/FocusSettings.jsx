import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { apiRequest } from '../../shared/api/client.js'
import { Button } from '../../shared/ui/Button.jsx'
import { Input } from '../../shared/ui/Input.jsx'
import { Select } from '../../shared/ui/Select.jsx'
import { QueryFeedback } from '../../shared/ui/ProductivityFeedback.jsx'
import { useLanguage } from '../settings/language.js'
import { sounds, normalizeSound } from './focusAudio.js'
import { useTimeHub } from './TimeHubContext.js'
import styles from './FocusPage.module.css'

const schema = z.object({ focusMinutes: z.coerce.number().int().min(1).max(240), breakMinutes: z.coerce.number().int().min(1).max(120),
  longBreakMinutes: z.coerce.number().int().min(1).max(120), sessionsBeforeLongBreak: z.coerce.number().int().min(1).max(12),
  totalSessions: z.preprocess(value => value === '' ? null : Number(value), z.number().int().min(1).max(48).nullable()) })

export function FocusSettings({ onClose }) {
  const hub = useTimeHub()
  return hub.preferencesQuery.isSuccess ? <SettingsForm onClose={onClose} /> : <QueryFeedback query={hub.preferencesQuery} />
}

function SettingsForm({ onClose }) {
  const { t } = useLanguage(), hub = useTimeHub(), client = useQueryClient()
  const [draft, setDraft] = useState(() => ({ ...hub.preferences, sound: normalizeSound(hub.preferences.sound) })), [message, setMessage] = useState('')
  const form = useForm({ resolver: zodResolver(schema), defaultValues: { ...hub.preferences.custom, totalSessions: hub.preferences.custom.totalSessions ?? '' } })
  const save = useMutation({ mutationFn: custom => apiRequest('/focus-preferences', { method: 'PUT', body: { ...draft, custom: { ...draft.custom, ...custom, method: 'Custom' } } }),
    onSuccess: async () => { await client.invalidateQueries({ predicate: query => query.queryKey.includes('/focus-preferences') }); onClose() } })
  const enableNotifications = async checked => {
    if (!checked) { setDraft(value => ({ ...value, notifications: false })); return }
    if (!('Notification' in globalThis)) { setMessage(t('Notifications are unavailable in this browser.')); return }
    try {
      const permission = await Notification.requestPermission()
      setDraft(value => ({ ...value, notifications: permission === 'granted' }))
      if (permission !== 'granted') setMessage(t('Notifications are blocked. You can change this in your browser settings.'))
    } catch { setMessage(t('Notifications are unavailable in this browser.')) }
  }
  return <form onSubmit={form.handleSubmit(values => save.mutate(values))} className={styles.settings}>
    <fieldset><legend>{t('Custom rhythm')}</legend><div className={styles.settingsGrid}>{[['focusMinutes', 'Focus minutes', 240], ['breakMinutes', 'Break minutes', 120], ['longBreakMinutes', 'Long break minutes', 120], ['sessionsBeforeLongBreak', 'Sessions before long break', 12], ['totalSessions', 'Total sessions (optional)', 48]].map(([name, label, max]) =>
      <Input key={name} label={t(label)} type="number" min="1" max={max} {...form.register(name)} error={form.formState.errors[name] ? t('Enter a value within the allowed range.') : undefined} />)}</div></fieldset>
    <fieldset><legend>{t('Sound and transitions')}</legend>
      <label className={styles.check}><input type="checkbox" checked={draft.soundEnabled} onChange={e => setDraft({ ...draft, soundEnabled: e.target.checked })} />{t('Completion sound')}</label>
      <div className={styles.settingsGrid}><Select label={t('Sound')} value={draft.sound} onChange={e => setDraft({ ...draft, sound: e.target.value })}>{sounds.map(sound => <option key={sound} value={sound}>{t(sound)}</option>)}</Select>
      <label className={styles.volume}>{t('Volume')} · {draft.volume}%<input aria-label={t('Volume')} type="range" min="0" max="100" value={draft.volume} onChange={e => setDraft({ ...draft, volume: Number(e.target.value) })} /></label></div>
      <Button variant="secondary" type="button" onClick={async () => { if (!(await hub.previewSound(draft))) setMessage(t('Sound could not play. Try again after interacting with this page.')) }}>{t('Preview sound')}</Button>
      {[['focusSound', 'Play sound when focus ends'], ['breakSound', 'Play sound when break ends'], ['autoBreak', 'Auto start breaks'], ['autoFocus', 'Auto start next focus']].map(([key, label]) => <label key={key} className={styles.check}><input type="checkbox" checked={draft[key]} onChange={e => setDraft({ ...draft, [key]: e.target.checked })} />{t(label)}</label>)}
    </fieldset>
    <fieldset><legend>{t('This device')}</legend>
      <label className={styles.check}><input type="checkbox" checked={draft.notifications} onChange={e => void enableNotifications(e.target.checked)} />{t('Browser notifications')}</label>
      {draft.notifications && globalThis.Notification?.permission !== 'granted' && <Button type="button" variant="secondary" onClick={() => void enableNotifications(true)}>{t('Enable on this device')}</Button>}
      <label className={styles.check}><input type="checkbox" disabled={!navigator.wakeLock} checked={draft.keepAwake} onChange={e => setDraft({ ...draft, keepAwake: e.target.checked })} />{t('Keep screen awake')}</label>
      {!navigator.wakeLock && <p className={styles.hint}>{t('Screen wake lock is unavailable in this browser.')}</p>}
    </fieldset>
    <p className={styles.hint}>{t('Rhythm changes apply to future focus runs. Settings and cities follow your account.')}</p>
    {message && <p role="status">{message}</p>}{save.error && <p role="alert">{t('Settings could not be saved. Try again.')}</p>}
    <Button type="submit" loading={save.isPending}>{t('Save settings')}</Button>
  </form>
}
