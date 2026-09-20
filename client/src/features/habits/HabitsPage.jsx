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
import { Icon } from '../../shared/ui/Icon.jsx'
import { StatusBadge } from '../../shared/ui/StatusBadge.jsx'
import { ActionFeedback, Pagination, QueryFeedback } from '../../shared/ui/ProductivityFeedback.jsx'
import { HabitForm, ScheduleForm } from './HabitForm.jsx'
import { TodayHabits } from './TodayHabits.jsx'
import { HabitWeek } from './HabitWeek.jsx'
import styles from '../../shared/ui/Productivity.module.css'
import pageStyles from './HabitsPage.module.css'

export function HabitsPage() {
  const { t, areaName, date: formatDate } = useLanguage()
  const [page, setPage] = useState(1)
  const [archived, setArchived] = useState('false')
  const { openCapture, area: scopedArea } = useOutletContext()
  const [params, setParams] = useSearchParams()
  const areaId = scopedArea?.id || params.get('areaId') || ''
  const view = scopedArea ? 'library' : params.get('view') || (areaId ? 'library' : 'today')
  const changeView = value => setParams(current => { const next = new URLSearchParams(current); next.set('view', value); return next })
  const habits = useProductivity(`/habits?page=${page}&archived=${archived}&${areaId ? `areaId=${areaId}` : ''}`)
  const today = useProductivity('/today')
  const areas = useProductivity('/areas')
  const action = useProductivityAction()

  return <div className={styles.stack}>
    {scopedArea ? <header className={styles.sectionHeading}><h2>{t('Habits')}</h2><Button onClick={() => openCapture({ kind: 'habit' })}>{t('New habit')}</Button></header> : <PageHeader title={t("Habits")} description={t("Complete your daily routines, then review or adjust what comes next.")}
      action={<Button onClick={() => openCapture({ kind: 'habit' })}>{t("New habit")}</Button>} />}
    {!scopedArea && <nav className={pageStyles.views} aria-label={t("Habit views")}><button aria-current={view === "today" ? "page" : undefined} onClick={() => changeView("today")}><Icon name="today" />{t("For today")}</button><button aria-current={view === "library" ? "page" : undefined} onClick={() => changeView("library")}><Icon name="habits" />{t("Your routines")}</button></nav>}
    {view !== "library" ? <>
      <section className={pageStyles.today} aria-label={t("Habits today")}><div className={pageStyles.todayHeading}><h2>{t("For today")}</h2><span className={styles.meta}>{areaId && <>{t("All areas")} · </>}{formatDate(today.data?.localDate)}</span></div>
        <div className={pageStyles.todayContent}><QueryFeedback query={today} /><TodayHabits data={today.data} action={action} emptyClassName={pageStyles.embeddedEmpty} onCreate={() => openCapture({ kind: 'habit' })} /><ActionFeedback action={action} /></div>
      </section>
      <HabitWeek key={areaId} areaId={areaId} />
    </> : <section aria-label={t("Habit library")}><h2 className={styles.sectionTitle}>{t("Your routines")}</h2>
        <div className={pageStyles.toolbar}><Select label={t("Habit list")} value={archived} onChange={e => { setArchived(e.target.value); setPage(1) }}><option value="false">{t("Current habits")}</option><option value="true">{t("Archived habits")}</option></Select>
          {!scopedArea && <Select label={t("Life Area filter")} value={areaId} onChange={e => { setParams(e.target.value ? { areaId: e.target.value, view: 'library' } : { view: 'library' }); setPage(1) }}><option value="">{t("All areas")}</option>{areas.data?.map(area => <option key={area.id} value={area.id}>{areaName(area)}</option>)}</Select>}</div>
        <QueryFeedback query={habits} /><QueryFeedback query={areas} />
        {habits.data?.total === 0 && <EmptyState title={t("Start with something small")} action={<Button variant="secondary" onClick={() => openCapture({ kind: 'habit' })}>{t("New habit")}</Button>}>{t("A few minutes of something meaningful is enough to begin.")}</EmptyState>}
        <ul className={styles.list}>{habits.data?.items.map(habit => <li className={styles.row} key={habit.id}><div>
          <Link className={styles.title} to={`/habits/${habit.id}`}>{habit.title}</Link>
          <p className={styles.meta}>{habit.archivedAtUtc ? t("Archived") : habit.isActive ? t("Active") : t("Inactive")}{habit.lifeAreaId && ` · ${areaName(areas.data?.find(area => area.id === habit.lifeAreaId)) || t("Life Area")}`}</p>
        </div><Link to={`/habits/${habit.id}`} aria-label={t('historyFor', { title: habit.title })}><Icon name="arrow" /></Link></li>)}</ul><Pagination data={habits.data} setPage={setPage} />
      </section>}
    {scopedArea && <HabitWeek key={areaId} areaId={areaId} />}
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
    <PageHeader title={value?.title || t("Habit")}
      description={t("Show up, record it, and keep going.")}
      action={value && !value.archivedAtUtc && <Button variant="secondary" onClick={() => setEditing(true)}>{t("Edit habit")}</Button>} />
    <QueryFeedback query={habit} />
    {value && <div className={pageStyles.detail}>
      <section aria-label={t("Completion log")}><div className={styles.sectionHeading}><h2 className={styles.sectionTitle}>{t("Completion log")}</h2><StatusBadge>{t(value.archivedAtUtc ? 'Archived' : value.isActive ? 'Active' : 'Inactive')}</StatusBadge></div>
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
      <section className={pageStyles.scheduleHistory} aria-label={t("Schedule history")}><h2 className={styles.sectionTitle}>{t("Your rhythm over time")}</h2>
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
