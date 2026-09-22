import { useState } from 'react'
import { Link, useOutletContext } from 'react-router'
import { useLanguage } from '../settings/language.js'
import { Availability, ProgressNote } from './DayContext.jsx'
import { useProductivity, useProductivityAction } from '../../shared/api/productivity.js'
import { Button } from '../../shared/ui/Button.jsx'
import { Dialog } from '../../shared/ui/Dialog.jsx'
import { Input } from '../../shared/ui/Input.jsx'
import { Select } from '../../shared/ui/Select.jsx'
import { EmptyState } from '../../shared/ui/EmptyState.jsx'
import { ActionFeedback } from '../../shared/ui/ProductivityFeedback.jsx'
import { TaskRow } from '../tasks/TaskRow.jsx'
import { TodayHabits } from '../habits/TodayHabits.jsx'
import { TodayGoals, GoalDayPicker } from './TodayGoals.jsx'
import { TodayHero } from './TodayHero.jsx'
import { PlanningGuide, PlanningModeControl } from './PlanningModeControl.jsx'
import { usePlanningMode } from './usePlanningMode.js'
import styles from '../../shared/ui/Productivity.module.css'
import layout from './TodayPage.module.css'

export function TodayPage() {
  const { t, date: formatDate } = useLanguage()
  const { openCapture } = useOutletContext()
  const [selectedDate, setSelectedDate] = useState('')
  const [goalPickerOpen, setGoalPickerOpen] = useState(false)
  const planningMode = usePlanningMode()
  const currentDay = useProductivity('/today')
  const today = useProductivity(`/today${selectedDate ? `?date=${selectedDate}` : ''}`)
  const areas = useProductivity('/areas')
  const focus = useProductivity('/focus-sessions/active')
  const action = useProductivityAction()
  const priorityAction = useProductivityAction()
  const goalAction = useProductivityAction(() => setGoalPickerOpen(false))
  const data = today.data
  const tasks = data?.tasks || []
  const goals = data?.goals || []
  const commitments = new Map(data?.commitments.map(plan => [plan.taskId, plan]) || [])
  const priority = tasks.find(task => task.id === data?.mission?.taskId)
  const renderTask = task => <TaskRow key={task.id} task={task} action={action} date={data.localDate}
    commitment={commitments.get(task.id)} area={areas.data?.find(area => area.id === task.lifeAreaId)} />
  const finished = data && (tasks.length > 0 || data.habits.length > 0) && tasks.every(task => task.isCompleted) && data.habits.every(habit => habit.activeLogId || habit.targetReached)
  const addTask = () => openCapture({ date: data.localDate })
  return <div className={layout.page}>
    <TodayHero data={currentDay.data} />
    <div className={layout.workspace} id="daily-workspace" tabIndex={-1}>
      <header className={layout.workspaceHeader}>
        <div><h2>{t('Your day')}</h2><p>{data ? `${formatDate(data.localDate)} · ${data.timeZoneId}` : t('Daily plan')}</p></div>
        <div className={layout.dateBar}><Input label={t('Plan date')} type="date" value={selectedDate || data?.localDate || ''} onChange={e => setSelectedDate(e.target.value)} />
          {selectedDate && <Button variant="quiet" onClick={() => setSelectedDate('')}>{t('Go to today')}</Button>}
          <Link to="/focus">{focus.data?.session ? t('Return to focus →') : t('Choose your focus')}</Link>
        </div>
      </header>
      <section className={layout.planningPanel} aria-label={t('Daily plan')}>
        <PlanningModeControl {...planningMode} /><PlanningGuide mode={planningMode.mode} />
        {data && ['FocusedDay', 'Custom'].includes(planningMode.mode) && <>
          <Select label={t('Daily priority')} value={priority?.id || ''} disabled={priorityAction.isPending} onChange={e => priorityAction.mutate({ path: `/daily-mission/${data.localDate}`, method: e.target.value ? 'PUT' : 'DELETE', ...(e.target.value && { body: { taskId: e.target.value } }) })}>
            <option value="">{t('Choose a planned task')}</option>
            {tasks.filter(task => !task.isCompleted || task.id === priority?.id).map(task => <option key={task.id} value={task.id}>{task.title}</option>)}
          </Select>
          <p className={styles.meta}>{t('priorityExplanation')}</p><ActionFeedback action={priorityAction} />
        </>}
      </section>
      <Availability query={today} label={t('Your day')} />
      {data && <div className={layout.dailySections} data-planning-mode={planningMode.mode}>
        {finished && <p role="status" className={layout.finished}>{t('Your planned work and habits are complete for this day.')}</p>}
        <section aria-label={t('Tasks Today')}>
          <div className={styles.sectionHeading}><h2>{t('Tasks Today')} <span className={styles.meta}>{tasks.filter(task => task.isCompleted).length} / {tasks.length}</span></h2><Button onClick={addTask}>{t('Add a task')}</Button></div>
          <p className={styles.meta}>{t('tasksTodayExplanation')}</p>
          {tasks.length ? <ul className={styles.list}>{tasks.map(task => renderTask(task))}</ul> : <EmptyState title={t('No Tasks planned for this day')} action={<Button variant="secondary" onClick={addTask}>{t('Add a task')}</Button>}>{t('emptyTasksToday')} <Link to="/inbox">{t('Open Inbox')}</Link></EmptyState>}
        </section>
        <section aria-label={t("Today's habits")}>
          <div className={styles.sectionHeading}><h2>{t("Today's habits")}</h2><Button variant="quiet" onClick={() => openCapture({ kind: 'habit' })}>{t('New habit')}</Button></div>
          <TodayHabits data={data} areas={areas.data} action={action} onCreate={() => openCapture({ kind: 'habit' })} />
        </section>
        <section aria-label={t("Today's Goals")}>
          <div className={styles.sectionHeading}><h2>{t("Today's Goals")}</h2><Button variant="secondary" onClick={() => { goalAction.reset(); setGoalPickerOpen(true) }}>{t('Select a goal')}</Button></div>
          {goals.length ? <TodayGoals goals={goals} areas={areas.data} date={data.localDate} action={action} /> : <EmptyState title={t('No Goals selected for this day')} action={<Button variant="quiet" onClick={() => openCapture({ kind: 'goal' })}>{t('New goal')}</Button>}>{t('emptyGoalsToday')}</EmptyState>}
        </section>
        <ActionFeedback action={action} /><Availability query={areas} label={t('Life Areas')} />
        {data.attentionTasks?.length > 0 && <details className={layout.history}><summary>{t('Earlier plans & due dates')} · {data.attentionTasks.length}</summary><p className={styles.meta}>{t('attentionExplanation')}</p><ul className={styles.list}>{data.attentionTasks.map(task => renderTask(task))}</ul></details>}
        {data.planHistory?.length > 0 && <details className={layout.history}><summary>{t('Planning history')} · {data.planHistory.length}</summary><p className={styles.meta}>{t('planHistoryExplanation')}</p><ul className={styles.list}>{data.planHistory.map(task => renderTask(task))}</ul></details>}
        <footer className={layout.workspaceFooter}><Link to="/inbox">{t('Inbox')} · {data.inboxCount} {t('unplanned')}</Link><ProgressNote /></footer>
        <Dialog open={goalPickerOpen} onClose={() => setGoalPickerOpen(false)} title={t('Select a goal')}><GoalDayPicker key={data.localDate} date={data.localDate} action={goalAction} /></Dialog>
      </div>}
    </div>
  </div>
}
