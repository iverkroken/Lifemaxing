import { useLanguage } from '../settings/language.js'
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
  const { t } = useLanguage()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [taskId, setTaskId] = useState('')
  const tasks = useProductivity(`/tasks?${queryString({ search, page, status: 'active' })}`)
  return <div className={styles.form}>
    <p className={styles.intro}>{t("Choose a main task or add a commitment for this day.")}</p>
    <Input label={t("Find a task")} value={search} onChange={e => { setSearch(e.target.value); setPage(1); setTaskId('') }} />
    <QueryFeedback query={tasks} />
    <Select label={t("Task to plan")} value={taskId} onChange={e => setTaskId(e.target.value)}>
      <option value="">{t("Choose an active task")}</option>{tasks.data?.items.map(task => <option key={task.id} value={task.id}>{task.title}</option>)}
    </Select>
    <Pagination data={tasks.data} setPage={value => { setPage(value); setTaskId('') }} />
    {tasks.data?.total === 0 && <p>{search ? t("No tasks match this search.") : t("No active tasks. Add a task using Quick Add.")}</p>}
    <div className={styles.actions}>
      <Button disabled={!taskId} loading={action.isPending} onClick={() => action.mutate({ path: `/daily-mission/${date}`, method: 'PUT', body: { taskId } })}>{t("Set Daily Mission")}</Button>
      <Button variant="secondary" disabled={!taskId} loading={action.isPending} onClick={() => action.mutate({ path: '/daily-commitments', body: { taskId, localDate: date } })}>{t("Add commitment")}</Button>
    </div>
    <ActionFeedback action={action} />
  </div>
}

function MissionGoal({ id }) {
  const { t } = useLanguage()
  const goal = useProductivity(`/goals/${id}`)
  return <><Availability query={goal} label={t("Linked goal")} />{goal.data && <Link className={layout.contextLink} to={`/goals/${id}`}>{t('goalLink', { title: goal.data.title })} →</Link>}</>
}

export function TodayPage() {
  const { t, areaName, date: formatDate } = useLanguage()
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
  const renderTask = task => <TaskRow key={task.id} task={task} action={action} date={data.localDate} commitment={commitments.get(task.id)} areaName={areaName(areas.data?.find(area => area.id === task.lifeAreaId))} />
  const current = data?.localDate === data?.currentLocalDate
  const dayTasks = data?.tasks.filter(task => !task.deletedAtUtc && !commitments.get(task.id)?.removedAtUtc) || []
  const emptyDay = data && data.tasks.length === 0 && data.habits.length === 0 && data.inboxCount === 0
  const finished = data && !emptyDay && (data.tasks.some(task => task.isCompleted) || data.habits.some(habit => habit.activeLogId || habit.targetReached)) && !data.tasks.some(task => !task.isCompleted && !task.deletedAtUtc && !commitments.get(task.id)?.removedAtUtc) && data.habits.every(habit => habit.activeLogId || habit.targetReached)
  return <div className={layout.page}>
    <PageHeader eyebrow={data ? `${formatDate(data.localDate)} · ${data.timeZoneId}` : t("Daily plan")} title={current || !data ? t("Today") : t("Your day")}
      action={<div className={layout.dateBar}><Input label={t("Plan date")} type="date" value={selectedDate || data?.localDate || ''} onChange={e => setSelectedDate(e.target.value)} />
        {selectedDate && <Button variant="quiet" onClick={() => setSelectedDate('')}>{t("Go to today")}</Button>}
        <Button variant="secondary" onClick={() => openCapture({ date: data?.localDate })}><Icon name="plus" />{t("Add a task")}</Button></div>} />
    <Availability query={today} label={t("Your day")} />
    {data && <div className={layout.dayStrip}><span>{t('dayStatus', { done: dayTasks.filter(task => task.isCompleted).length, total: dayTasks.length })}</span><span>{t('doneCount', { done: data.habits.filter(habit => habit.activeLogId || habit.targetReached).length, total: data.habits.length })} · {t('Habits')}</span></div>}
    {focus.data?.session && <p className={styles.meta}>{t('focusStatus', { status: t(focus.data.session.status) })} <Link to="/focus">{t("Return to focus →")}</Link></p>}
    {data && <>
      {focus.isError && <Availability query={focus} label={t("Focus")} />}
      {finished && <p role="status" className={layout.finished}><Icon name="check" />{t("Your planned work and habits are complete for this day.")}</p>}
      {emptyDay ? <><EmptyDay date={data.localDate} openPicker={openPicker} /><ProgressNote /></> : <div className={layout.layout}>
        <div className={layout.main}>
          <section className={mission ? layout.mission : layout.pickMission} aria-label={t("Daily Mission")}>
            <div className={layout.missionHeading}><h2>{t("Daily Mission")}</h2>{mission && <Button variant="quiet" size="small" onClick={openPicker}>{t("Change mission")}</Button>}</div>
            <h3 className={layout.missionTitle}>{mission ? <Link to={`/tasks/${mission.id}`}>{mission.title}</Link> : t("Choose the task to do first.")}</h3>
            {mission && <p className={styles.meta}>{[areaName(areas.data?.find(area => area.id === mission.lifeAreaId)), mission.estimateMinutes && `${mission.estimateMinutes} min`, mission.priority === 'High' && t('High priority')].filter(Boolean).join(' · ')}</p>}
            {mission && <p className={layout.missionNote}>{mission.deletedAtUtc ? t("Archived · your plan is preserved.") : mission.isCompleted ? t("Mission completed.") : mission.details || t("Your main task for this day.")}</p>}
            <div className={styles.actions}>
              {mission && !mission.isCompleted && !mission.deletedAtUtc && (focus.data?.session ? <Link to="/focus">{t("Return to focus →")}</Link> : <Button loading={startFocus.isPending} disabled={!focus.isSuccess} onClick={() => startFocus.mutate({ path: '/focus-sessions', body: { taskId: mission.id } })}><Icon name="focus" />{t("Start focus")}</Button>)}
              {mission && !mission.deletedAtUtc && <Button variant="secondary" loading={action.isPending} onClick={() => action.mutate({ path: `/tasks/${mission.id}/${mission.isCompleted ? 'reopen' : 'complete'}` })}><Icon name="check" />{mission.isCompleted ? t("Reopen mission") : t("Complete mission")}</Button>}
              {!mission && <Button variant="secondary" onClick={openPicker}>{t("Choose a mission")}</Button>}
            </div>
            <ActionFeedback action={startFocus} success={t("Focus started.")} />
            {mission?.goalId && <MissionGoal id={mission.goalId} />}
          </section>
          <ActionFeedback action={action} />
          <section className={layout.work} aria-label={t("Daily commitments")}>
            <div className={styles.sectionHeading}><h2>{t("Planned tasks")}<span className={styles.meta}>· {committed.length}</span></h2><Button variant="quiet" size="small" onClick={openPicker}><Icon name="plus" size={16} />{t("Plan a task")}</Button></div>
            {committed.length === 0 ? <p className={styles.meta}>{mission ? t("No other tasks planned.") : t("No tasks planned for this day.")}</p> : <ul className={styles.list}>{committed.map(renderTask)}</ul>}
          </section>
          {attention.length > 0 && <section className={layout.work} aria-label={t("Needs attention")}><div className={styles.sectionHeading}><h2>{t("Needs attention")}</h2><span className={styles.meta}>{t("Earlier plans & due dates")}</span></div><ul className={styles.list}>{attention.map(renderTask)}</ul></section>}
          {history.length > 0 && <details className={layout.history}><summary>{t('historyCount', { count: history.length })}</summary><ul className={styles.list}>{history.map(renderTask)}</ul></details>}
          {areas.isError && <Availability query={areas} label={t("Life Areas")} />}
        </div>
        <aside className={layout.aside} aria-label={t("Daily habits and progress")}>
          <section className={layout.habits} aria-label={t("Today's habits")}><div className={styles.sectionHeading}><h2>{t("Today's habits")}</h2><Link to="/habits">{t("All habits →")}</Link></div>
            {data.habits.length ? <><p className={styles.meta}>{t('doneCount', { done: data.habits.filter(habit => habit.activeLogId).length, total: data.habits.length })}</p><TodayHabits data={data} action={action} compact /></> : <p className={styles.meta}>{t("No habits scheduled for this day.")}</p>}
          </section>
          <ProgressNote />
          <Link className={layout.inboxLink} to="/inbox"><Icon name="inbox" /><span>{t("Inbox")} <span className={styles.meta}>· {data.inboxCount} {t('unplanned')}</span></span><span aria-hidden="true">→</span></Link>
        </aside>
      </div>}
      <Dialog open={pickerOpen} onClose={() => setPickerOpen(false)} title={t("Plan this day")}><PlanPicker key={data.localDate} date={data.localDate} action={planning} />
        {mission && <div className={styles.section}><Button variant="quiet" loading={planning.isPending} onClick={() => planning.mutate({ path: `/daily-mission/${data.localDate}`, method: 'DELETE' })}>{t("Clear mission")}</Button></div>}
      </Dialog>
    </>}
  </div>
}
