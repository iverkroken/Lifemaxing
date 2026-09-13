import { useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router'
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
import styles from '../../shared/ui/Productivity.module.css'

export function HabitsPage() {
  const [page, setPage] = useState(1)
  const [archived, setArchived] = useState('false')
  const [creating, setCreating] = useState(false)
  const [params, setParams] = useSearchParams()
  const areaId = params.get('areaId') || ''
  const habits = useProductivity(`/habits?page=${page}&archived=${archived}&${areaId ? `areaId=${areaId}` : ''}`)
  const today = useProductivity('/today')
  const areas = useProductivity('/areas')
  const action = useProductivityAction()
  const navigate = useNavigate()
  return <div className={styles.stack}>
    <PageHeader eyebrow="Small actions, woven into life" title="Habits" description="Build a rhythm you want to return to."
      action={<Button onClick={() => setCreating(true)}>New habit</Button>} />
    <div className={styles.split}>
      <section aria-label="Habits today"><div className={styles.sectionHeading}><h2>For today</h2><span className={styles.meta}>{areaId ? 'All areas · ' : ''}{today.data?.localDate}</span></div>
        <QueryFeedback query={today} /><TodayHabits data={today.data} action={action} /><ActionFeedback action={action} />
      </section>
      <section className={styles.section} aria-label="Habit library"><h2 className={styles.sectionTitle}>Your routines</h2>
        <div className={styles.form}><Select label="Habit list" value={archived} onChange={e => { setArchived(e.target.value); setPage(1) }}><option value="false">Current habits</option><option value="true">Archived habits</option></Select>
          <Select label="Life Area filter" value={areaId} onChange={e => { setParams(e.target.value ? { areaId: e.target.value } : {}); setPage(1) }}><option value="">All areas</option>{areas.data?.map(area => <option key={area.id} value={area.id}>{area.displayName}</option>)}</Select></div>
        <QueryFeedback query={habits} /><QueryFeedback query={areas} />
        {habits.data?.total === 0 && <EmptyState title="Start with something small">A few minutes of something meaningful is enough to begin.</EmptyState>}
        <ul className={styles.list}>{habits.data?.items.map(habit => <li className={styles.row} key={habit.id}><div>
          <Link className={styles.title} to={`/habits/${habit.id}`}>{habit.title}</Link>
          <p className={styles.meta}>{habit.archivedAtUtc ? 'Archived' : habit.isActive ? 'Active' : 'Inactive'}{habit.lifeAreaId && ` · ${areas.data?.find(area => area.id === habit.lifeAreaId)?.displayName || 'Life Area'}`}</p>
        </div><Link to={`/habits/${habit.id}`} aria-label={`History and settings for ${habit.title}`}>→</Link></li>)}</ul><Pagination data={habits.data} setPage={setPage} />
      </section>
    </div>
    <Dialog open={creating} onClose={() => setCreating(false)} title="Build a habit"><HabitForm onSaved={habit => { setCreating(false); navigate(`/habits/${habit.id}`) }} /></Dialog>
  </div>
}

export function HabitDetailPage() {
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
    <Link to="/habits">← All habits</Link>
    <PageHeader eyebrow={value?.archivedAtUtc ? 'Archived routine' : value?.isActive ? 'Your daily rhythm' : 'Inactive routine'} title={value?.title || 'Habit'}
      description="Show up, record it, and keep going."
      action={value && !value.archivedAtUtc && <Button variant="secondary" onClick={() => setEditing(true)}>Edit habit</Button>} />
    <QueryFeedback query={habit} />
    {value && <div className={styles.split}>
      <section aria-label="Completion log"><h2 className={styles.sectionTitle}>Completion log</h2>
        {!value.archivedAtUtc && value.isActive && <form className={styles.form} onSubmit={e => { e.preventDefault(); action.mutate({ path: `/habits/${id}/logs`, body: { localDate: date || today.data?.currentLocalDate } }) }}>
          <div className={styles.toolbar}><Input label="Completion date" type="date" required value={date || today.data?.currentLocalDate || ''} max={today.data?.currentLocalDate} onChange={e => setDate(e.target.value)} />
            <Button type="submit" loading={action.isPending} disabled={!today.data}>Log completion</Button></div>
        </form>}
        {value.archivedAtUtc && <p className={styles.intro}>This habit is archived. Its schedules and logs are preserved.</p>}
        {!value.isActive && !value.archivedAtUtc && <p className={styles.intro}>This routine is inactive. Edit the habit to start logging again.</p>}
        <QueryFeedback query={today} /><QueryFeedback query={logs} /><ActionFeedback action={action} />
        {logs.data?.total === 0 && <EmptyState title="Your first entry starts here">Log a scheduled day after you have done the habit.</EmptyState>}
        <ul className={styles.list}>{logs.data?.items.map(log => <li className={styles.row} key={log.id}><div><strong>{log.localDate}</strong>
          <p className={styles.meta}>{log.reversedAtUtc ? 'Reversed' : 'Completed'} · {log.timeZoneId}</p></div>
          {!log.reversedAtUtc && <Button variant="quiet" loading={action.isPending} onClick={() => action.mutate({ path: `/habits/${id}/logs/${log.id}/revoke` })}>Undo completion</Button>}
        </li>)}</ul><Pagination data={logs.data} setPage={setPage} />
      </section>
      <section className={styles.section} aria-label="Schedule history"><h2 className={styles.sectionTitle}>Your rhythm over time</h2>
        <p className={styles.intro}>New schedules begin on a future day. Your earlier routine stays on record.</p>
        <ol className={styles.history}>{value.schedules.map(schedule => <li key={schedule.id}>
          <strong>{schedule.pattern === 'WeeklyCount' ? `${schedule.weeklyTarget} times per week` : schedule.pattern === 'Daily' ? 'Every day' : schedule.daysOfWeek.map(day => ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][day - 1]).join(', ')}</strong>
          <p className={styles.meta}>From {schedule.effectiveFromDate}{schedule.effectiveToDate ? ` until ${schedule.effectiveToDate} (exclusive)` : ' onward'} · {schedule.timeZoneId}</p>
        </li>)}</ol>
        {!value.archivedAtUtc && <Button variant="secondary" onClick={() => setScheduling(true)}>Change future schedule</Button>}
      </section>
    </div>}
    <Dialog open={editing} onClose={() => setEditing(false)} title="Edit habit">{value && <><HabitForm key={id} habit={value} />
      <details className={styles.section}><summary>Archive this habit</summary><p>Schedules and completions stay in your history.</p><Button variant="danger" loading={action.isPending} onClick={() => action.mutate({ path: `/habits/${id}`, method: 'DELETE' }, { onSuccess: () => setEditing(false) })}>Archive habit</Button><ActionFeedback action={action} /></details></>}</Dialog>
    <Dialog open={scheduling} onClose={() => setScheduling(false)} title="Plan a future rhythm">{value && <ScheduleForm habit={value} />}</Dialog>
  </div>
}
