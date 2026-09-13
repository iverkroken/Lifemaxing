import { useState } from 'react'
import { Link } from 'react-router'
import { queryString, useProductivity, useProductivityAction } from '../../shared/api/productivity.js'
import { Button } from '../../shared/ui/Button.jsx'
import { Card } from '../../shared/ui/Card.jsx'
import { Input } from '../../shared/ui/Input.jsx'
import { Select } from '../../shared/ui/Select.jsx'
import { PageHeader } from '../../shared/ui/PageHeader.jsx'
import { ActionFeedback, Pagination, QueryFeedback } from '../../shared/ui/ProductivityFeedback.jsx'
import { QuickAdd } from '../tasks/QuickAdd.jsx'
import { TaskRow } from '../tasks/TaskRow.jsx'
import styles from '../../shared/ui/Productivity.module.css'

function PlanPicker({ date, action }) {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [taskId, setTaskId] = useState('')
  const tasks = useProductivity(`/tasks?${queryString({ search, page, status: 'active' })}`)
  return <details>
    <summary>Choose a mission or add an existing task</summary>
    <div className={styles.form}>
      <Input label="Find a task" value={search} onChange={e => { setSearch(e.target.value); setPage(1); setTaskId('') }} />
      <QueryFeedback query={tasks} />
      <Select label="Task to plan" value={taskId} onChange={e => setTaskId(e.target.value)}>
        <option value="">Choose an active task</option>{tasks.data?.items.map(task => <option key={task.id} value={task.id}>{task.title}</option>)}
      </Select>
      <Pagination data={tasks.data} setPage={value => { setPage(value); setTaskId('') }} />
      {tasks.data?.total === 0 && <p>No active tasks found. Capture one with Quick Add.</p>}
      <div className={styles.actions}>
        <Button disabled={!taskId} loading={action.isPending} onClick={() => action.mutate({ path: `/daily-mission/${date}`, method: 'PUT', body: { taskId } })}>Set Daily Mission</Button>
        <Button variant="secondary" disabled={!taskId} loading={action.isPending} onClick={() => action.mutate({ path: '/daily-commitments', body: { taskId, localDate: date } })}>Add commitment</Button>
      </div>
    </div>
  </details>
}

export function TodayPage() {
  const [selectedDate, setSelectedDate] = useState('')
  const today = useProductivity(`/today${selectedDate ? `?date=${selectedDate}` : ''}`)
  const action = useProductivityAction()
  const data = today.data
  const mission = data?.tasks.find(task => task.id === data.mission?.taskId)
  return <div className={styles.stack}>
    <PageHeader eyebrow={data ? `${data.localDate} · ${data.timeZoneId}` : 'Your daily plan'} title="Today"
      description="Choose what matters most, then take the next step." />
    <div className={styles.actions}>
      <Input label="Plan date" type="date" value={selectedDate || data?.localDate || ''} onChange={e => setSelectedDate(e.target.value)} />
      <Button variant="quiet" onClick={() => setSelectedDate('')}>Go to today</Button>
    </div>
    <QueryFeedback query={today} />
    {data && <>
      <Card variant="featured" aria-label="Daily Mission">
        <h2 className={styles.sectionTitle}>Daily Mission</h2>
        {mission ? <>
          <p className={styles.mission}><Link to={`/tasks/${mission.id}`}>{mission.title}</Link></p>
          <p>{mission.deletedAtUtc ? 'Archived' : mission.isCompleted ? 'Mission completed.' : 'Your most important task for this day.'}</p>
          <div className={styles.actions}>
            {!mission.deletedAtUtc && <Button loading={action.isPending} onClick={() => action.mutate({ path: `/tasks/${mission.id}/${mission.isCompleted ? 'reopen' : 'complete'}` })}>{mission.isCompleted ? 'Reopen mission' : 'Complete mission'}</Button>}
            <Button variant="quiet" loading={action.isPending} onClick={() => action.mutate({ path: `/daily-mission/${data.localDate}`, method: 'DELETE' })}>Clear mission</Button>
          </div>
        </> : <p>What one task would make this day worthwhile? Choose your mission below.</p>}
        <PlanPicker key={data.localDate} date={data.localDate} action={action} />
      </Card>
      <ActionFeedback action={action} />
      <QuickAdd date={data.localDate} />
      <Card aria-label="Daily commitments">
        <h2 className={styles.sectionTitle}>Commitments & tasks</h2>
        <p className={styles.intro}>Your daily plan, unfinished earlier plans, and tasks due by this date.</p>
        {data.tasks.length === 0 && <p>A clear day. Add a commitment or capture your next action above.</p>}
        <ul className={styles.list}>{data.tasks.map(task => <TaskRow key={task.id} task={task} action={action} date={data.localDate}
          commitment={data.commitments.find(plan => plan.taskId === task.id)} />)}</ul>
        <Link to="/inbox">Inbox · {data.inboxCount} unplanned {data.inboxCount === 1 ? 'task' : 'tasks'}</Link>
      </Card>
      <Card aria-label="Today's habits">
        <h2 className={styles.sectionTitle}>Habits for this day</h2>
        {data.habits.length === 0 && <p>No habits scheduled. <Link to="/habits">Build a routine</Link> when you are ready.</p>}
        <ul className={styles.list}>{data.habits.map(habit => <li key={habit.id} className={styles.row}>
          <div><Link className={styles.title} to={`/habits/${habit.id}`}>{habit.title}</Link>
            <p className={styles.meta}>{habit.pattern === 'WeeklyCount' ? `${habit.weekCompletions} / ${habit.weeklyTarget} this week${habit.targetReached ? ' · Target reached' : ''}` : 'Scheduled for this date'}{habit.activeLogId && ' · Completed'}</p></div>
          <Button variant="secondary" loading={action.isPending} disabled={data.localDate > data.currentLocalDate}
            onClick={() => action.mutate(habit.activeLogId ? { path: `/habits/${habit.id}/logs/${habit.activeLogId}/revoke` } : { path: `/habits/${habit.id}/logs`, body: { localDate: data.localDate } })}>{habit.activeLogId ? 'Undo completion' : 'Log completion'}</Button>
        </li>)}</ul>
      </Card>
    </>}
  </div>
}
