import { useLanguage } from '../settings/language.js'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useState } from 'react'
import { useProductivity, useProductivityAction } from '../../shared/api/productivity.js'
import { Button } from '../../shared/ui/Button.jsx'
import { Input } from '../../shared/ui/Input.jsx'
import { Select } from '../../shared/ui/Select.jsx'
import { ActionFeedback, QueryFeedback } from '../../shared/ui/ProductivityFeedback.jsx'
import styles from '../../shared/ui/Productivity.module.css'
import pageStyles from './HabitsPage.module.css'

const schema = z.object({ title: z.string().trim().min(1, 'Enter a habit title.').max(200), lifeAreaId: z.string(), isActive: z.boolean(), xpPerLog: z.coerce.number().int().min(1).max(25) })

export function HabitForm({ habit, onSaved, initialAreaId = '' }) {
  const { t, areaName } = useLanguage()
  const areas = useProductivity('/areas')
  const today = useProductivity('/today')
  const [pattern, setPattern] = useState('Daily')
  const [days, setDays] = useState([1, 3, 5])
  const [target, setTarget] = useState(3)
  const [from, setFrom] = useState('')
  const form = useForm({ resolver: zodResolver(schema), defaultValues: { title: habit?.title || '', lifeAreaId: habit?.lifeAreaId || initialAreaId, isActive: habit?.isActive ?? true, xpPerLog: habit?.xpPerLog ?? 10 } })
  const selectedArea = useWatch({ control: form.control, name: 'lifeAreaId' })
  const action = useProductivityAction(saved => { if (!habit) form.reset(); onSaved?.(saved) })
  return <form className={`${styles.form} ${pageStyles.form}`} noValidate onSubmit={form.handleSubmit(values => action.mutate({ path: habit ? `/habits/${habit.id}` : '/habits', method: habit ? 'PATCH' : 'POST', body: { ...values, lifeAreaId: values.lifeAreaId || null,
    ...(!habit && { schedule: { effectiveFromDate: from || today.data?.currentLocalDate, pattern, daysOfWeek: pattern === 'SelectedWeekdays' ? days : null, weeklyTarget: pattern === 'WeeklyCount' ? Number(target) : null } }),
  } }))}>
    <fieldset disabled={action.isPending} className={styles.formFields}>
    <Input label={t("Habit title")} required error={form.formState.errors.title} {...form.register('title')} />
    <Select label={t("Life Area")} {...form.register('lifeAreaId')} value={selectedArea}><option value="">{t("No area")}</option>{areas.data?.map(x => <option key={x.id} value={x.id}>{areaName(x)}</option>)}</Select>
    <Input label={t("XP per completion")} type="number" min="1" max="25" hint={t("Daily habit awards share a 75 XP cap.")} error={form.formState.errors.xpPerLog} {...form.register('xpPerLog')} />
    <label className={styles.check}><input type="checkbox" {...form.register('isActive')} />{t("Active habit")}</label>
    {!habit && <ScheduleFields {...{ pattern, setPattern, days, setDays, target, setTarget }} from={from || today.data?.currentLocalDate || ''} setFrom={setFrom}
      hint={t("Start today or later. Future schedule changes preserve this initial plan.")} />}
    <QueryFeedback query={areas} />{!habit && <QueryFeedback query={today} />}<ActionFeedback action={action} success={t("Habit saved.")} />
    <Button type="submit" loading={action.isPending} disabled={!habit && !today.data}>{habit ? t("Save habit") : t("Create habit")}</Button>
    </fieldset>
  </form>
}

export function ScheduleForm({ habit }) {
  const { t } = useLanguage()
  const [pattern, setPattern] = useState('Daily')
  const [days, setDays] = useState([1, 3, 5])
  const [target, setTarget] = useState(3)
  const [from, setFrom] = useState('')
  const action = useProductivityAction()
  return <form className={styles.form} onSubmit={e => { e.preventDefault(); action.mutate({ path: `/habits/${habit.id}/schedule`, method: 'PUT', body: {
    effectiveFromDate: from, pattern, daysOfWeek: pattern === 'SelectedWeekdays' ? days : null, weeklyTarget: pattern === 'WeeklyCount' ? Number(target) : null,
  } }) }}>
    <fieldset disabled={action.isPending} className={styles.formFields}>
    <ScheduleFields {...{ from, setFrom, pattern, setPattern, days, setDays, target, setTarget }}
      hint={t("Choose a future day after the latest schedule start. Existing dates retain their schedule.")} />
    <ActionFeedback action={action} success={t("Future schedule saved.")} />
    <Button type="submit" loading={action.isPending}>{t("Save future schedule")}</Button>
    </fieldset>
  </form>
}

function ScheduleFields({ from, setFrom, pattern, setPattern, days, setDays, target, setTarget, hint }) {
  const { t, weekday } = useLanguage()
  return <>
    <Input label={t("Schedule starts")} type="date" required value={from} onChange={e => setFrom(e.target.value)} hint={hint} />
    <Select label={t("Schedule pattern")} value={pattern} onChange={e => setPattern(e.target.value)}>
      <option value="Daily">{t("Every day")}</option><option value="SelectedWeekdays">{t("Selected weekdays")}</option><option value="WeeklyCount">{t("Times per week")}</option>
    </Select>
    {pattern === 'SelectedWeekdays' && <fieldset><legend>{t("Weekdays")}</legend><div className={styles.actions}>{['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((name, i) => <label className={styles.check} key={name}>
      <input type="checkbox" checked={days.includes(i + 1)} onChange={e => setDays(e.target.checked ? [...days, i + 1] : days.filter(x => x !== i + 1))} />{weekday(i + 1)}</label>)}</div></fieldset>}
    {pattern === 'WeeklyCount' && <Input label={t("Weekly target")} type="number" min="1" max="7" required value={target} onChange={e => setTarget(e.target.value)} />}
  </>
}
