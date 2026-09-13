import { useLanguage } from '../settings/language.js'
import { useState } from 'react'
import { Link, useOutletContext, useParams, useSearchParams } from 'react-router'
import { useProductivity, useProductivityAction } from '../../shared/api/productivity.js'
import { Button } from '../../shared/ui/Button.jsx'
import { Dialog } from '../../shared/ui/Dialog.jsx'
import { EmptyState } from '../../shared/ui/EmptyState.jsx'
import { Input } from '../../shared/ui/Input.jsx'
import { Select } from '../../shared/ui/Select.jsx'
import { PageHeader } from '../../shared/ui/PageHeader.jsx'
import { ActionFeedback, Pagination, QueryFeedback } from '../../shared/ui/ProductivityFeedback.jsx'
import { HabitForm, ScheduleForm } from './HabitForm.jsx'
import { TodayHabits } from './TodayHabits.jsx'
import { HabitWeek } from './HabitWeek.jsx'
import styles from '../../shared/ui/Productivity.module.css'

export function HabitsPage() {
  const { t, areaName, date: formatDate } = useLanguage()
  const [page, setPage] = useState(1)
  const [archived, setArchived] = useState('false')
  const { openCapture } = useOutletContext()
  const [params, setParams] = useSearchParams()
  const areaId = params.get('areaId') || ''
  const habits = useProductivity(`/habits?page=${page}&archived=${archived}&${areaId ? `areaId=${areaId}` : ''}`)
  const today = useProductivity('/today')
  const areas = useProductivity('/areas')
  const action = useProductivityAction()

  return <div className={styles.stack}>
    <PageHeader eyebrow={t("Daily practice")} title={t("Habits")} description={t("Complete your daily routines, then review or adjust what comes next.")}
      action={<Button onClick={() => openCapture({ kind: 'habit' })}>{t("New habit")}</Button>} />
    <div className={styles.split}>
      <section className={`${styles.surface} ${styles.habitWork}`} aria-label={t("Habits today")}><div className={styles.sectionHeading}><h2>{t("For today")}</h2><span className={styles.meta}>{areaId && <>{t("All areas")} · </>}{formatDate(today.data?.localDate)}</span></div>
        <QueryFeedback query={today} /><TodayHabits data={today.data} action={action} compact /><ActionFeedback action={action} />
      </section>
      <section className={styles.surface} aria-label={t("Habit library")}><h2 className={styles.sectionTitle}>{t("Your routines")}</h2>
        <div className={styles.form}><Select label={t("Habit list")} value={archived} onChange={e => { setArchived(e.target.value); setPage(1) }}><option value="false">{t("Current habits")}</option><option value="true">{t("Archived habits")}</option></Select>
          <Select label={t("Life Area filter")} value={areaId} onChange={e => { setParams(e.target.value ? { areaId: e.target.value } : {}); setPage(1) }}><option value="">{t("All areas")}</option>{areas.data?.map(area => <option key={area.id} value={area.id}>{areaName(area)}</option>)}</Select></div>
        <QueryFeedback query={habits} /><QueryFeedback query={areas} />
        {habits.data?.total === 0 && <EmptyState title={t("Start with something small")}>{t("A few minutes of something meaningful is enough to begin.")}</EmptyState>}
        <ul className={styles.list}>{habits.data?.items.map(habit => <li className={styles.row} key={habit.id}><div>
          <Link className={styles.title} to={`/habits/${habit.id}`}>{habit.title}</Link>
          <p className={styles.meta}>{habit.archivedAtUtc ? t("Archived") : habit.isActive ? t("Active") : t("Inactive")}{habit.lifeAreaId && ` · ${areaName(areas.data?.find(area => area.id === habit.lifeAreaId)) || t("Life Area")}`}</p>
        </div><Link to={`/habits/${habit.id}`} aria-label={t('historyFor', { title: habit.title })}>→</Link></li>)}</ul><Pagination data={habits.data} setPage={setPage} />
      </section>
    </div>
    <HabitWeek key={areaId} areaId={areaId} />
  </div>
}

export function HabitDetailPage() {
  const { t, date: formatDate, weekday } = useLanguage()
  const { id } = useParams()
  const [page, setPage] = useState(1)
  const [date, setDate] = useState('')
  const [editing, setEditing] = useState(false)
  const [scheduling, setScheduling] = useState(false)
  const habit = useProductivity(`/habits/${id}`)
  const logs = useProductivity(`/habits/${id}/logs?page=${page}`)
  const today = useProductivity('/today')
  const action = useProductivityAction()
  const value = habit.data
  return <div className={styles.stack}>
    <Link to="/habits">{t("← All habits")}</Link>
    <PageHeader eyebrow={value?.archivedAtUtc ? t("Archived routine") : value?.isActive ? t("Your daily rhythm") : t("Inactive routine")} title={value?.title || t("Habit")}
      description={t("Show up, record it, and keep going.")}
      action={value && !value.archivedAtUtc && <Button variant="secondary" onClick={() => setEditing(true)}>{t("Edit habit")}</Button>} />
    <QueryFeedback query={habit} />
    {value && <div className={styles.split}>
      <section aria-label={t("Completion log")}><h2 className={styles.sectionTitle}>{t("Completion log")}</h2>
        {!value.archivedAtUtc && value.isActive && <form className={styles.form} onSubmit={e => { e.preventDefault(); action.mutate({ path: `/habits/${id}/logs`, body: { localDate: date || today.data?.currentLocalDate } }) }}>
          <div className={styles.toolbar}><Input label={t("Completion date")} type="date" required value={date || today.data?.currentLocalDate || ''} max={today.data?.currentLocalDate} onChange={e => setDate(e.target.value)} />
            <Button type="submit" loading={action.isPending} disabled={!today.data}>{t("Log completion")}</Button></div>
        </form>}
        {value.archivedAtUtc && <p className={styles.intro}>{t("This habit is archived. Its schedules and logs are preserved.")}</p>}
        {!value.isActive && !value.archivedAtUtc && <p className={styles.intro}>{t("This routine is inactive. Edit the habit to start logging again.")}</p>}
        <QueryFeedback query={today} /><QueryFeedback query={logs} /><ActionFeedback action={action} />
        {logs.data?.total === 0 && <EmptyState title={t("Your first entry starts here")}>{t("Log a scheduled day after you have done the habit.")}</EmptyState>}
        <ul className={styles.list}>{logs.data?.items.map(log => <li className={styles.row} key={log.id}><div><strong>{formatDate(log.localDate)}</strong>
          <p className={styles.meta}>{log.reversedAtUtc ? t("Reversed") : t("Completed")} · {log.timeZoneId}</p></div>
          {!log.reversedAtUtc && <Button variant="quiet" loading={action.isPending} onClick={() => action.mutate({ path: `/habits/${id}/logs/${log.id}/revoke` })}>{t("Undo completion")}</Button>}
        </li>)}</ul><Pagination data={logs.data} setPage={setPage} />
      </section>
      <section className={styles.section} aria-label={t("Schedule history")}><h2 className={styles.sectionTitle}>{t("Your rhythm over time")}</h2>
        <p className={styles.intro}>{t("New schedules begin on a future day. Your earlier routine stays on record.")}</p>
        <ol className={styles.history}>{value.schedules.map(schedule => <li key={schedule.id}>
          <strong>{schedule.pattern === 'WeeklyCount' ? t('weeklyTargetCount', { count: schedule.weeklyTarget }) : schedule.pattern === 'Daily' ? t('Every day') : schedule.daysOfWeek.map(day => weekday(day, true)).join(', ')}</strong>
          <p className={styles.meta}>{schedule.effectiveToDate ? t('scheduleUntil', { from: formatDate(schedule.effectiveFromDate), to: formatDate(schedule.effectiveToDate) }) : t('scheduleFrom', { date: formatDate(schedule.effectiveFromDate) })} · {schedule.timeZoneId}</p>
        </li>)}</ol>
        {!value.archivedAtUtc && <Button variant="secondary" onClick={() => setScheduling(true)}>{t("Change future schedule")}</Button>}
      </section>
    </div>}
    <Dialog open={editing} onClose={() => setEditing(false)} title={t("Edit habit")}>{value && <><HabitForm key={id} habit={value} />
      <details className={styles.section}><summary>{t("Archive this habit")}</summary><p>{t("Schedules and completions stay in your history.")}</p><Button variant="danger" loading={action.isPending} onClick={() => action.mutate({ path: `/habits/${id}`, method: 'DELETE' }, { onSuccess: () => setEditing(false) })}>{t("Archive habit")}</Button><ActionFeedback action={action} /></details></>}</Dialog>
    <Dialog open={scheduling} onClose={() => setScheduling(false)} title={t("Plan a future rhythm")}>{value && <ScheduleForm habit={value} />}</Dialog>
  </div>
}
