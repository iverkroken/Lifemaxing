import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { useProductivity, useProductivityAction } from '../../shared/api/productivity.js'
import { Button } from '../../shared/ui/Button.jsx'
import { Card } from '../../shared/ui/Card.jsx'
import { Input } from '../../shared/ui/Input.jsx'
import { Select } from '../../shared/ui/Select.jsx'
import { PageHeader } from '../../shared/ui/PageHeader.jsx'
import { ActionFeedback, Pagination, QueryFeedback } from '../../shared/ui/ProductivityFeedback.jsx'
import { HabitForm, ScheduleForm } from './HabitForm.jsx'
import styles from '../../shared/ui/Productivity.module.css'

export function HabitsPage() {
  const [page, setPage] = useState(1)
  const [archived, setArchived] = useState('false')
  const habits = useProductivity(`/habits?page=${page}&archived=${archived}`)
  const navigate = useNavigate()
  return <div className={styles.stack}>
    <PageHeader title="Habits" description="Small, repeatable actions with a plan that preserves your history." />
    <Card><h2 className={styles.sectionTitle}>Build a habit</h2><HabitForm onSaved={habit => navigate(`/habits/${habit.id}`)} /></Card>
    <Card><h2 className={styles.sectionTitle}>Your habits</h2>
      <Select label="Habit list" value={archived} onChange={e => { setArchived(e.target.value); setPage(1) }}><option value="false">Current habits</option><option value="true">Archived habits</option></Select>
      <QueryFeedback query={habits} />
      {habits.data?.total === 0 && <p>No habits here yet. Start with one manageable routine.</p>}
      <ul className={styles.list}>{habits.data?.items.map(habit => <li className={styles.row} key={habit.id}><div>
        <Link className={styles.title} to={`/habits/${habit.id}`}>{habit.title}</Link>
        <p className={styles.meta}>{habit.archivedAtUtc ? 'Archived' : habit.isActive ? 'Active' : 'Inactive'} · {habit.schedules.length} schedule {habit.schedules.length === 1 ? 'period' : 'periods'}</p>
      </div></li>)}</ul><Pagination data={habits.data} setPage={setPage} />
    </Card>
  </div>
}

export function HabitDetailPage() {
  const { id } = useParams()
  const [page, setPage] = useState(1)
  const [date, setDate] = useState('')
  const habit = useProductivity(`/habits/${id}`)
  const logs = useProductivity(`/habits/${id}/logs?page=${page}`)
  const today = useProductivity('/today')
  const action = useProductivityAction()
  const value = habit.data
  return <div className={styles.stack}>
    <PageHeader title={value?.title || 'Habit'} action={<Link to="/habits">All habits</Link>} />
    <QueryFeedback query={habit} />
    {value && <>
      {!value.archivedAtUtc ? <Card><h2 className={styles.sectionTitle}>Habit details</h2><HabitForm key={id} habit={value} />
        <Button variant="danger" loading={action.isPending} onClick={() => action.mutate({ path: `/habits/${id}`, method: 'DELETE' })}>Archive habit</Button></Card> : <Card><p>This habit is archived. Its schedules and logs are preserved.</p></Card>}
      <Card><h2 className={styles.sectionTitle}>Schedule history</h2>
        <ul className={styles.list}>{value.schedules.map(schedule => <li className={styles.row} key={schedule.id}><div>
          <strong>{schedule.pattern === 'WeeklyCount' ? `${schedule.weeklyTarget} times per week` : schedule.pattern === 'Daily' ? 'Every day' : schedule.daysOfWeek.map(day => ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][day - 1]).join(', ')}</strong>
          <p className={styles.meta}>From {schedule.effectiveFromDate}{schedule.effectiveToDate ? ` until ${schedule.effectiveToDate} (exclusive)` : ' onward'} · {schedule.timeZoneId}</p>
        </div></li>)}</ul>
        {!value.archivedAtUtc && <ScheduleForm habit={value} />}
      </Card>
      <Card><h2 className={styles.sectionTitle}>Completion log</h2>
        {!value.archivedAtUtc && value.isActive && <form className={styles.form} onSubmit={e => { e.preventDefault(); action.mutate({ path: `/habits/${id}/logs`, body: { localDate: date || today.data?.currentLocalDate } }) }}>
          <Input label="Completion date" type="date" required value={date || today.data?.currentLocalDate || ''} max={today.data?.currentLocalDate} onChange={e => setDate(e.target.value)} />
          <Button type="submit" loading={action.isPending}>Log completion</Button>
        </form>}
        <QueryFeedback query={today} /><QueryFeedback query={logs} /><ActionFeedback action={action} />
        {logs.data?.total === 0 && <p>No completions yet. Log a scheduled date when you have done the habit.</p>}
        <ul className={styles.list}>{logs.data?.items.map(log => <li className={styles.row} key={log.id}><div><strong>{log.localDate}</strong>
          <p className={styles.meta}>{log.reversedAtUtc ? 'Reversed' : 'Completed'} · {log.timeZoneId}</p></div>
          {!log.reversedAtUtc && <Button variant="quiet" loading={action.isPending} onClick={() => action.mutate({ path: `/habits/${id}/logs/${log.id}/revoke` })}>Undo completion</Button>}
        </li>)}</ul><Pagination data={logs.data} setPage={setPage} />
      </Card>
    </>}
  </div>
}
