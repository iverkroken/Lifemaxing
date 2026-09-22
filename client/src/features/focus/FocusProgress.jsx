import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useLanguage } from '../settings/language.js'
import { useProductivityAction } from '../../shared/api/productivity.js'
import { Button } from '../../shared/ui/Button.jsx'
import { Input } from '../../shared/ui/Input.jsx'
import { Select } from '../../shared/ui/Select.jsx'
import { Icon } from '../../shared/ui/Icon.jsx'
import { Dialog } from '../../shared/ui/Dialog.jsx'
import { QueryFeedback, ActionFeedback } from '../../shared/ui/ProductivityFeedback.jsx'
import { useTimeHub } from './TimeHubContext.js'
import styles from './FocusPage.module.css'

const schema = z.object({ hours: z.coerce.number().int().min(0).max(24), minutes: z.coerce.number().int().min(0).max(45).multipleOf(15) })
  .refine(({ hours, minutes }) => hours * 60 + minutes >= 15 && hours * 60 + minutes <= 1440, { path: ['hours'] })

export function FocusProgress({ summary }) {
  const { t, number } = useLanguage(), hub = useTimeHub()
  const [editing, setEditing] = useState(false)
  const ready = summary.isSuccess && hub.preferencesQuery.isSuccess
  const goal = hub.preferences.dailyGoalMinutes ?? 120
  const minutes = Math.floor((summary.data?.todaySeconds || 0) / 60)
  const goalLabel = `${Math.floor(goal / 60) ? `${number(Math.floor(goal / 60))} ${t('h')}` : ''}${goal % 60 ? ` ${number(goal % 60)} ${t('min')}` : ''}`.trim()
  return <section className={styles.dailyProgress} aria-label={t('Daily focus progress')}>
    {!ready ? <><QueryFeedback query={summary} /><QueryFeedback query={hub.preferencesQuery} /></> : <>
      <dl><div><dt>{t('Yesterday')}</dt><dd>{number(Math.floor((summary.data.yesterdaySeconds || 0) / 60))} {t('min')}</dd></div>
        <div><dt>{t('Daily goal')}</dt><dd><button className={styles.goalEdit} onClick={() => setEditing(true)} aria-label={t('Edit daily goal')}>{goalLabel}<Icon name="creative" size={14} /></button></dd></div>
        <div className={styles.completedMetric}><dt>{t('Completed')}</dt><dd>
          <span className={styles.goalRing} role="progressbar" aria-label={t('Daily focus progress')} aria-valuemin={0} aria-valuemax={goal} aria-valuenow={Math.min(minutes, goal)} aria-valuetext={t('{minutes} minutes focused of {goal}', { minutes: number(minutes), goal: goalLabel })}>
            <svg viewBox="0 0 40 40" aria-hidden="true"><circle className={styles.track} cx="20" cy="20" r="17" /><circle className={styles.arc} cx="20" cy="20" r="17" pathLength="100" strokeDasharray={`${Math.min(100, minutes / goal * 100)} 100`} /></svg>
          </span>
          <span>{number(minutes)} / {number(goal)} {t('min')}</span>
        </dd></div>
        <div><dt>{t('Streak')}</dt><dd>{t(summary.data.streakDays === 1 ? '1 day' : '{days} days', { days: number(summary.data.streakDays || 0) })}</dd></div></dl>
    </>}
    <Dialog open={editing} onClose={() => setEditing(false)} title={t('Daily focus goal')}>
      {editing && <DailyGoalForm goal={goal} onClose={() => setEditing(false)} />}
    </Dialog>
  </section>
}

function DailyGoalForm({ goal, onClose }) {
  const { t } = useLanguage(), action = useProductivityAction(onClose)
  const form = useForm({ resolver: zodResolver(schema), defaultValues: { hours: Math.floor(goal / 60), minutes: goal % 60 } })
  return <form className={styles.settings} onSubmit={form.handleSubmit(({ hours, minutes }) => action.mutate({ path: '/focus-preferences/daily-goal', method: 'PUT', body: { dailyGoalMinutes: hours * 60 + minutes } }))}>
    <div className={styles.settingsGrid}><Input label={t('Hours')} type="number" min="0" max="24" {...form.register('hours')} error={form.formState.errors.hours ? t('Choose 15 minutes to 24 hours.') : undefined} />
      <Select label={t('Minutes')} {...form.register('minutes')}>{[0, 15, 30, 45].map(value => <option key={value} value={value}>{value}</option>)}</Select></div>
    <p className={styles.hint}>{t('A personal target, not a requirement. Any day with a recorded focus minute counts toward your streak.')}</p>
    <ActionFeedback action={action} /><Button type="submit" loading={action.isPending}>{t('Save daily goal')}</Button>
  </form>
}
