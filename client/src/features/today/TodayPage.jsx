import { useState } from 'react'
import { Link } from 'react-router'
import { queryString, useProductivity, useProductivityAction } from '../../shared/api/productivity.js'
import { Button } from '../../shared/ui/Button.jsx'
import { Dialog } from '../../shared/ui/Dialog.jsx'
import { EmptyState } from '../../shared/ui/EmptyState.jsx'
import { Icon } from '../../shared/ui/Icon.jsx'
import { Input } from '../../shared/ui/Input.jsx'
import { Select } from '../../shared/ui/Select.jsx'
import { PageHeader } from '../../shared/ui/PageHeader.jsx'
import { ActionFeedback, Pagination, QueryFeedback } from '../../shared/ui/ProductivityFeedback.jsx'
import { QuickAdd } from '../tasks/QuickAdd.jsx'
import { TaskRow } from '../tasks/TaskRow.jsx'
import { TodayHabits } from '../habits/TodayHabits.jsx'
import styles from '../../shared/ui/Productivity.module.css'
import layout from './TodayPage.module.css'

function PlanPicker({ date, action }) {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [taskId, setTaskId] = useState('')
  const tasks = useProductivity(`/tasks?${queryString({ search, page, status: 'active' })}`)
  return <div className={styles.form}>
    <p className={styles.intro}>Choose one task as your mission, or add it to your commitments for this day.</p>
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
    <ActionFeedback action={action} />
  </div>
}

function MissionGoal({ id }) {
  const goal = useProductivity(`/goals/${id}`)
  return <><QueryFeedback query={goal} />{goal.data && <Link className={layout.contextLink} to={`/goals/${id}`}>Working toward: {goal.data.title} →</Link>}</>
}

export function TodayPage() {
  const [selectedDate, setSelectedDate] = useState('')
  const [pickerOpen, setPickerOpen] = useState(false)
  const today = useProductivity(`/today${selectedDate ? `?date=${selectedDate}` : ''}`)
  const areas = useProductivity('/areas')
  const action = useProductivityAction()
  const planning = useProductivityAction(() => setPickerOpen(false))
  const data = today.data
  const mission = data?.tasks.find(task => task.id === data.mission?.taskId)
  const commitments = new Map(data?.commitments.map(plan => [plan.taskId, plan]) || [])
  const otherTasks = data?.tasks.filter(task => task.id !== mission?.id) || []
  const unfinished = otherTasks.filter(task => !task.isCompleted && !task.deletedAtUtc && !commitments.get(task.id)?.removedAtUtc)
  const committed = unfinished.filter(task => commitments.has(task.id))
  const attention = unfinished.filter(task => !commitments.has(task.id))
  const history = otherTasks.filter(task => task.isCompleted || task.deletedAtUtc || commitments.get(task.id)?.removedAtUtc)
  const renderTask = task => <TaskRow key={task.id} task={task} action={action} date={data.localDate} commitment={commitments.get(task.id)} areaName={areas.data?.find(area => area.id === task.lifeAreaId)?.displayName} />
  const current = data?.localDate === data?.currentLocalDate
  return <div className={`${styles.stack} ${layout.page}`}>
    <PageHeader eyebrow={data ? `${data.localDate} · ${data.timeZoneId}` : 'Your daily space'} title={current || !data ? 'Today' : 'Your day'}
      description={current ? 'Make space for what matters.' : 'A little intention goes a long way.'}
      action={<div className={layout.dateBar}><Input label="Plan date" type="date" value={selectedDate || data?.localDate || ''} onChange={e => setSelectedDate(e.target.value)} />
        {selectedDate && <Button variant="quiet" onClick={() => setSelectedDate('')}>Go to today</Button>}</div>} />
    <QueryFeedback query={today} />
    {data && <>
      <div className={layout.context}>
        <span>{data.commitments.filter(plan => !plan.removedAtUtc).length} {data.commitments.filter(plan => !plan.removedAtUtc).length === 1 ? 'commitment' : 'commitments'}</span>
        <span>{data.habits.filter(habit => habit.activeLogId).length} of {data.habits.length} habits done</span>
        <Link to="/inbox">{data.inboxCount} in Inbox →</Link>
      </div>
      <div className={layout.layout}>
        <div className={layout.main}>
          <section className={layout.mission} aria-label="Daily Mission">
            <h2>Daily Mission</h2>
            <p className={layout.missionTitle}>{mission ? <Link to={`/tasks/${mission.id}`}>{mission.title}</Link> : 'One thing that would make today meaningful.'}</p>
            <p className={layout.missionNote}>{mission ? mission.deletedAtUtc ? 'Archived · your plan is preserved.' : mission.isCompleted ? 'Mission completed.' : 'Start here. Give your most important work your attention.' : 'Choose a single task to give this day a clear direction.'}</p>
            <div className={styles.actions}>
              {mission && !mission.deletedAtUtc && <Button loading={action.isPending} onClick={() => action.mutate({ path: `/tasks/${mission.id}/${mission.isCompleted ? 'reopen' : 'complete'}` })}><Icon name="check" />{mission.isCompleted ? 'Reopen mission' : 'Complete mission'}</Button>}
              <Button variant={mission ? 'quiet' : 'primary'} onClick={() => { planning.reset(); setPickerOpen(true) }}>{mission ? 'Change mission' : 'Choose a mission'}</Button>
            </div>
            {mission?.goalId && <MissionGoal id={mission.goalId} />}
          </section>
          <ActionFeedback action={action} />
          <section aria-label="Daily commitments">
            <div className={styles.sectionHeading}><h2>Your commitments</h2><Button variant="quiet" size="small" onClick={() => { planning.reset(); setPickerOpen(true) }}><Icon name="plus" size={16} />Plan a task</Button></div>
            {committed.length === 0 ? <EmptyState title={mission ? 'Keep the rest of your day intentional' : 'Choose what deserves your time'}>Add a commitment when you are ready. Your mission already has its own place above.</EmptyState> : <ul className={styles.list}>{committed.map(renderTask)}</ul>}
          </section>
          {attention.length > 0 && <section className={styles.section} aria-label="Needs attention"><div className={styles.sectionHeading}><h2>Needs attention</h2><span className={styles.meta}>Earlier plans & due dates</span></div>
            <p className={styles.intro}>Review these tasks and decide what belongs in this day.</p><ul className={styles.list}>{attention.map(renderTask)}</ul></section>}
          {history.length > 0 && <details className={layout.history}><summary>Completed & changed plans · {history.length}</summary><ul className={styles.list}>{history.map(renderTask)}</ul></details>}
          <QueryFeedback query={areas} />
        </div>
        <aside className={layout.aside} aria-label="Daily routines and capture">
          <section aria-label="Today's habits"><div className={styles.sectionHeading}><h2>Daily rhythms</h2><Link to="/habits">All habits →</Link></div><TodayHabits data={data} action={action} /></section>
          <div className={layout.capture}><QuickAdd date={data.localDate} /></div>
          <p className={styles.meta}>Capture now. Organize in Inbox. Commit when you are ready.</p>
        </aside>
      </div>
      <Dialog open={pickerOpen} onClose={() => setPickerOpen(false)} title="Give this day a plan"><PlanPicker key={data.localDate} date={data.localDate} action={planning} />
        {mission && <div className={styles.section}><Button variant="quiet" loading={planning.isPending} onClick={() => planning.mutate({ path: `/daily-mission/${data.localDate}`, method: 'DELETE' })}>Clear mission</Button></div>}
      </Dialog>
    </>}
  </div>
}
