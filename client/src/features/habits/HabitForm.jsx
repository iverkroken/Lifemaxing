import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useState } from 'react'
import { useProductivity, useProductivityAction } from '../../shared/api/productivity.js'
import { Button } from '../../shared/ui/Button.jsx'
import { Input } from '../../shared/ui/Input.jsx'
import { Select } from '../../shared/ui/Select.jsx'
import { ActionFeedback, QueryFeedback } from '../../shared/ui/ProductivityFeedback.jsx'
import styles from '../../shared/ui/Productivity.module.css'

const schema = z.object({ title: z.string().trim().min(1, 'Enter a habit title.').max(200), lifeAreaId: z.string(), isActive: z.boolean(), xpPerLog: z.coerce.number().int().min(1).max(25) })

export function HabitForm({ habit, onSaved }) {
  const areas = useProductivity('/areas')
  const today = useProductivity('/today')
  const [pattern, setPattern] = useState('Daily')
  const [days, setDays] = useState([1, 3, 5])
  const [target, setTarget] = useState(3)
  const [from, setFrom] = useState('')
  const form = useForm({ resolver: zodResolver(schema), defaultValues: { title: habit?.title || '', lifeAreaId: habit?.lifeAreaId || '', isActive: habit?.isActive ?? true, xpPerLog: habit?.xpPerLog ?? 10 } })
  const action = useProductivityAction(saved => { if (!habit) form.reset(); onSaved?.(saved) })
  return <form className={styles.form} noValidate onSubmit={form.handleSubmit(values => action.mutate({ path: habit ? `/habits/${habit.id}` : '/habits', method: habit ? 'PATCH' : 'POST', body: { ...values, lifeAreaId: values.lifeAreaId || null,
    ...(!habit && { schedule: { effectiveFromDate: from || today.data?.currentLocalDate, pattern, daysOfWeek: pattern === 'SelectedWeekdays' ? days : null, weeklyTarget: pattern === 'WeeklyCount' ? Number(target) : null } }),
  } }))}>
    <fieldset disabled={action.isPending} className={styles.formFields}>
    <Input label="Habit title" required error={form.formState.errors.title?.message} {...form.register('title')} />
    <Select label="Life Area" {...form.register('lifeAreaId')}><option value="">No area</option>{areas.data?.map(x => <option key={x.id} value={x.id}>{x.displayName}</option>)}</Select>
    <Input label="XP per completion" type="number" min="1" max="25" hint="Daily habit awards share a 75 XP cap." error={form.formState.errors.xpPerLog?.message} {...form.register('xpPerLog')} />
    <label className={styles.check}><input type="checkbox" {...form.register('isActive')} />Active habit</label>
    {!habit && <ScheduleFields {...{ pattern, setPattern, days, setDays, target, setTarget }} from={from || today.data?.currentLocalDate || ''} setFrom={setFrom}
      hint="Start today or later. Future schedule changes preserve this initial plan." />}
    <QueryFeedback query={areas} />{!habit && <QueryFeedback query={today} />}<ActionFeedback action={action} success="Habit saved." />
    <Button type="submit" loading={action.isPending} disabled={!habit && !today.data}>{habit ? 'Save habit' : 'Create habit'}</Button>
    </fieldset>
  </form>
}

export function ScheduleForm({ habit }) {
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
      hint="Choose a future day after the latest schedule start. Existing dates retain their schedule." />
    <ActionFeedback action={action} success="Future schedule saved." />
    <Button type="submit" loading={action.isPending}>Save future schedule</Button>
    </fieldset>
  </form>
}

function ScheduleFields({ from, setFrom, pattern, setPattern, days, setDays, target, setTarget, hint }) {
  return <>
    <Input label="Schedule starts" type="date" required value={from} onChange={e => setFrom(e.target.value)} hint={hint} />
    <Select label="Schedule pattern" value={pattern} onChange={e => setPattern(e.target.value)}>
      <option value="Daily">Every day</option><option value="SelectedWeekdays">Selected weekdays</option><option value="WeeklyCount">Times per week</option>
    </Select>
    {pattern === 'SelectedWeekdays' && <fieldset><legend>Weekdays</legend><div className={styles.actions}>{['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((name, i) => <label className={styles.check} key={name}>
      <input type="checkbox" checked={days.includes(i + 1)} onChange={e => setDays(e.target.checked ? [...days, i + 1] : days.filter(x => x !== i + 1))} />{name}</label>)}</div></fieldset>}
    {pattern === 'WeeklyCount' && <Input label="Weekly target" type="number" min="1" max="7" required value={target} onChange={e => setTarget(e.target.value)} />}
  </>
}
