import { Availability, EmptyDay, ProgressNote } from './DayContext.jsx'
import { useState } from 'react'
import { Link, useNavigate, useOutletContext } from 'react-router'
import { queryString, useProductivity, useProductivityAction } from '../../shared/api/productivity.js'
import { Button } from '../../shared/ui/Button.jsx'
import { Dialog } from '../../shared/ui/Dialog.jsx'

import { Icon } from '../../shared/ui/Icon.jsx'
import { Input } from '../../shared/ui/Input.jsx'
import { Select } from '../../shared/ui/Select.jsx'
import { PageHeader } from '../../shared/ui/PageHeader.jsx'
import { ActionFeedback, Pagination, QueryFeedback } from '../../shared/ui/ProductivityFeedback.jsx'

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
    <p className={styles.intro}>Choose a main task or add a commitment for this day.</p>
    <Input label="Find a task" value={search} onChange={e => { setSearch(e.target.value); setPage(1); setTaskId('') }} />
    <QueryFeedback query={tasks} />
    <Select label="Task to plan" value={taskId} onChange={e => setTaskId(e.target.value)}>
      <option value="">Choose an active task</option>{tasks.data?.items.map(task => <option key={task.id} value={task.id}>{task.title}</option>)}
    </Select>
    <Pagination data={tasks.data} setPage={value => { setPage(value); setTaskId('') }} />
    {tasks.data?.total === 0 && <p>{search ? 'No tasks match this search.' : 'No active tasks. Add a task using Quick Add.'}</p>}
    <div className={styles.actions}>
      <Button disabled={!taskId} loading={action.isPending} onClick={() => action.mutate({ path: `/daily-mission/${date}`, method: 'PUT', body: { taskId } })}>Set Daily Mission</Button>
      <Button variant="secondary" disabled={!taskId} loading={action.isPending} onClick={() => action.mutate({ path: '/daily-commitments', body: { taskId, localDate: date } })}>Add commitment</Button>
    </div>
    <ActionFeedback action={action} />
  </div>
}

function MissionGoal({ id }) {
  const goal = useProductivity(`/goals/${id}`)
  return <><Availability query={goal} label="Linked goal" />{goal.data && <Link className={layout.contextLink} to={`/goals/${id}`}>Goal: {goal.data.title} →</Link>}</>
}

export function TodayPage() {
  const { openCapture } = useOutletContext()
  const navigate = useNavigate()
  const [selectedDate, setSelectedDate] = useState('')
  const [pickerOpen, setPickerOpen] = useState(false)
  const today = useProductivity(`/today${selectedDate ? `?date=${selectedDate}` : ''}`)
  const areas = useProductivity('/areas')
  const focus = useProductivity('/focus-sessions/active')
  const startFocus = useProductivityAction(() => navigate('/focus'))
  const action = useProductivityAction()
  const planning = useProductivityAction(() => setPickerOpen(false))
  const openPicker = () => { planning.reset(); setPickerOpen(true) }
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
  const emptyDay = data && data.tasks.length === 0 && data.habits.length === 0 && data.inboxCount === 0
  const finished = data && !emptyDay && (data.tasks.some(task => task.isCompleted) || data.habits.some(habit => habit.activeLogId || habit.targetReached)) && !data.tasks.some(task => !task.isCompleted && !task.deletedAtUtc && !commitments.get(task.id)?.removedAtUtc) && data.habits.every(habit => habit.activeLogId || habit.targetReached)
  return <div className={layout.page}>
    <PageHeader eyebrow={data ? `${data.localDate} · ${data.timeZoneId}` : 'Daily plan'} title={current || !data ? 'Today' : 'Your day'}
      action={<div className={layout.dateBar}><Input label="Plan date" type="date" value={selectedDate || data?.localDate || ''} onChange={e => setSelectedDate(e.target.value)} />
        {selectedDate && <Button variant="quiet" onClick={() => setSelectedDate('')}>Go to today</Button>}
        <Button variant="secondary" onClick={() => openCapture({ date: data?.localDate })}><Icon name="plus" />Add a task</Button></div>} />
    <Availability query={today} label="Your day" />
    {focus.data?.session && <p className={styles.meta}>Your focus session is {focus.data.session.status.toLowerCase()}. <Link to="/focus">Return to focus →</Link></p>}
    {data && <>
      {focus.isError && <Availability query={focus} label="Focus" />}
      {finished && <p role="status" className={layout.finished}><Icon name="check" />Your planned work and habits are complete for this day.</p>}
      {emptyDay ? <><EmptyDay date={data.localDate} openPicker={openPicker} /><ProgressNote /></> : <div className={layout.layout}>
        <div className={layout.main}>
          <section className={mission ? layout.mission : layout.pickMission} aria-label="Daily Mission">
            <div className={layout.missionHeading}><h2>Daily Mission</h2>{mission && <Button variant="quiet" size="small" onClick={openPicker}>Change mission</Button>}</div>
            <h3 className={layout.missionTitle}>{mission ? <Link to={`/tasks/${mission.id}`}>{mission.title}</Link> : 'Choose the task to do first.'}</h3>
            {mission && <p className={styles.meta}>{[areas.data?.find(area => area.id === mission.lifeAreaId)?.displayName, mission.estimateMinutes && `${mission.estimateMinutes} min`, mission.priority === 'High' && 'High priority'].filter(Boolean).join(' · ')}</p>}
            {mission && <p className={layout.missionNote}>{mission.deletedAtUtc ? 'Archived · your plan is preserved.' : mission.isCompleted ? 'Mission completed.' : mission.details || 'Your main task for this day.'}</p>}
            <div className={styles.actions}>
              {mission && !mission.isCompleted && !mission.deletedAtUtc && (focus.data?.session ? <Link to="/focus">Return to focus →</Link> : <Button loading={startFocus.isPending} disabled={!focus.isSuccess} onClick={() => startFocus.mutate({ path: '/focus-sessions', body: { taskId: mission.id } })}><Icon name="focus" />Start focus</Button>)}
              {mission && !mission.deletedAtUtc && <Button variant="secondary" loading={action.isPending} onClick={() => action.mutate({ path: `/tasks/${mission.id}/${mission.isCompleted ? 'reopen' : 'complete'}` })}><Icon name="check" />{mission.isCompleted ? 'Reopen mission' : 'Complete mission'}</Button>}
              {!mission && <Button variant="secondary" onClick={openPicker}>Choose a mission</Button>}
            </div>
            <ActionFeedback action={startFocus} success="Focus started." />
            {mission?.goalId && <MissionGoal id={mission.goalId} />}
          </section>
          <ActionFeedback action={action} />
          <section className={layout.work} aria-label="Daily commitments">
            <div className={styles.sectionHeading}><h2>Planned tasks <span className={styles.meta}>· {committed.length}</span></h2><Button variant="quiet" size="small" onClick={openPicker}><Icon name="plus" size={16} />Plan a task</Button></div>
            {committed.length === 0 ? <p className={styles.meta}>{mission ? 'No other tasks planned.' : 'No tasks planned for this day.'}</p> : <ul className={styles.list}>{committed.map(renderTask)}</ul>}
          </section>
          {attention.length > 0 && <section className={layout.work} aria-label="Needs attention"><div className={styles.sectionHeading}><h2>Needs attention</h2><span className={styles.meta}>Earlier plans & due dates</span></div><ul className={styles.list}>{attention.map(renderTask)}</ul></section>}
          {history.length > 0 && <details className={layout.history}><summary>Completed & changed plans · {history.length}</summary><ul className={styles.list}>{history.map(renderTask)}</ul></details>}
          {areas.isError && <Availability query={areas} label="Life Areas" />}
        </div>
        <aside className={layout.aside} aria-label="Daily habits and progress">
          <section className={layout.habits} aria-label="Today's habits"><div className={styles.sectionHeading}><h2>Today's habits</h2><Link to="/habits">All habits →</Link></div>
            {data.habits.length ? <><p className={styles.meta}>{data.habits.filter(habit => habit.activeLogId).length} of {data.habits.length} done</p><TodayHabits data={data} action={action} compact /></> : <p className={styles.meta}>No habits scheduled for this day.</p>}
          </section>
          <ProgressNote />
          <Link className={layout.inboxLink} to="/inbox"><Icon name="inbox" /><span>Inbox <span className={styles.meta}>· {data.inboxCount} unplanned</span></span><span aria-hidden="true">→</span></Link>
        </aside>
      </div>}
      <Dialog open={pickerOpen} onClose={() => setPickerOpen(false)} title="Plan this day"><PlanPicker key={data.localDate} date={data.localDate} action={planning} />
        {mission && <div className={styles.section}><Button variant="quiet" loading={planning.isPending} onClick={() => planning.mutate({ path: `/daily-mission/${data.localDate}`, method: 'DELETE' })}>Clear mission</Button></div>}
      </Dialog>
    </>}
  </div>
}
