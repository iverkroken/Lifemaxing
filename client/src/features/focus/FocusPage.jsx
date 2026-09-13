import { useLanguage } from '../settings/language.js'
import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { useProductivity, useProductivityAction } from '../../shared/api/productivity.js'
import { PageHeader } from '../../shared/ui/PageHeader.jsx'
import { Input } from '../../shared/ui/Input.jsx'
import { Select } from '../../shared/ui/Select.jsx'
import { Button } from '../../shared/ui/Button.jsx'
import { ActionFeedback, QueryFeedback, Pagination } from '../../shared/ui/ProductivityFeedback.jsx'
import styles from '../../shared/ui/Productivity.module.css'
import focusStyles from './FocusPage.module.css'

function formatFocusTime(seconds) {
  const value = Math.max(0, Math.floor(seconds))
  return `${String(Math.floor(value / 3600)).padStart(2, '0')}:${String(Math.floor(value / 60) % 60).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`
}
function Timer({ session }) {
  const { t } = useLanguage()
  const [extra, setExtra] = useState(0)
  useEffect(() => {
    if (session.status !== 'Running') return
    const start = performance.now()
    const timer = setInterval(() => setExtra((performance.now() - start) / 1000), 1000)
    return () => clearInterval(timer)
  }, [session.status])
  return <p className={focusStyles.timer} role="timer" aria-label={t("Active focus time")}>{formatFocusTime(session.elapsedSeconds + extra)}</p>
}
function TaskContext({ id }) {
  const { t, areaName } = useLanguage()
  const task = useProductivity(`/tasks/${id}`)
  const areas = useProductivity('/areas')
  return <><QueryFeedback query={task} />{task.data && <><h2 className={focusStyles.taskTitle}>{task.data.title}</h2>
    {task.data.lifeAreaId && <p className={styles.meta}>{areaName(areas.data?.find(area => area.id === task.data.lifeAreaId))}</p>}
    {task.data.details && <p className={`${styles.note} ${focusStyles.description}`}>{task.data.details}</p>}
    {task.data.isCompleted && <p>{t("This task is already complete. You can finish this session without another XP award.")}</p>}
    {task.data.deletedAtUtc && <p>{t("This task is archived. End this session without completing the task.")}</p>}
    <Link to={`/tasks/${id}`}>{t("Task details →")}</Link></>}</>
}
function StartFocus({ action }) {
  const { t } = useLanguage()
  const [params] = useSearchParams()
  const [taskId, setTaskId] = useState(params.get('taskId') || '')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const tasks = useProductivity(`/tasks?status=active&page=${page}&search=${encodeURIComponent(search)}`)
  return <form className={styles.form} onSubmit={e => { e.preventDefault(); action.mutate({ path: '/focus-sessions', body: { taskId: taskId || null } }) }}>
    <Input label={t("Find a task to focus on")} value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} />
    <QueryFeedback query={tasks} />
    <Select label={t("Focus task")} value={taskId} onChange={e => setTaskId(e.target.value)}><option value="">{t("Unstructured focus")}</option>
      {taskId && !tasks.data?.items.some(task => task.id === taskId) && <option value={taskId}>{t("Selected task")}</option>}
      {tasks.data?.items.map(task => <option key={task.id} value={task.id}>{task.title}</option>)}
    </Select><Pagination data={tasks.data} setPage={setPage} />
    {taskId && <TaskContext id={taskId} />}
    <Button type="submit" loading={action.isPending}>{t("Start focus")}</Button>
    <p className={styles.meta}>{t("One session at a time. Pause whenever you need to. Focus minutes are recorded, but do not earn XP.")}</p>
  </form>
}
export function FocusPage() {
  const { t } = useLanguage()
  const active = useProductivity('/focus-sessions/active')
  const [, setParams] = useSearchParams()
  const action = useProductivityAction(result => { if (result.endedAtUtc) setParams({}, { replace: true }) })
  const session = active.data?.session
  return <div className={`${styles.stack} ${focusStyles.page}`}>
    <PageHeader eyebrow={t("One thing at a time")} title={t("Focus")} description={session ? t("Your session is saved. Pause or finish when you are ready.") : t("Choose what deserves your attention right now.")} />
    <QueryFeedback query={active} />
    {session ? <section aria-label={t("Current focus")} className={focusStyles.session}>
      <p className={styles.eyebrow}>{session.status === 'Paused' ? t("Paused · time is not counting") : t("In progress")}</p>
      {session.taskId ? <TaskContext id={session.taskId} /> : <h2 className={focusStyles.taskTitle}>{t("Unstructured focus")}</h2>}
      <Timer key={`${session.id}-${active.dataUpdatedAt}`} session={session} />
      <div className={styles.actions}>
        {session.taskId && <Button loading={action.isPending} onClick={() => action.mutate({ path: `/focus-sessions/${session.id}/stop`, body: { outcome: 'Completed', completeTask: true } })}>{t("Complete task & finish")}</Button>}
        <Button variant={session.taskId ? 'secondary' : 'primary'} loading={action.isPending} onClick={() => action.mutate({ path: `/focus-sessions/${session.id}/${session.status === 'Paused' ? 'resume' : 'pause'}` })}>{session.status === 'Paused' ? t("Resume focus") : t("Pause focus")}</Button>
        <Button variant="secondary" loading={action.isPending} onClick={() => action.mutate({ path: `/focus-sessions/${session.id}/stop`, body: { outcome: 'Completed' } })}>{t("Finish session")}</Button>
      </div>
      <details className={styles.section}><summary>{t("End without completing")}</summary><p className={styles.meta}>{t("Stop to keep recorded focus time, or cancel to exclude it from your focus total. The session stays in history.")}</p>
        <div className={styles.actions}><Button variant="quiet" loading={action.isPending} onClick={() => action.mutate({ path: `/focus-sessions/${session.id}/stop`, body: { outcome: 'Stopped' } })}>{t("Stop session")}</Button><Button variant="quiet" loading={action.isPending} onClick={() => action.mutate({ path: `/focus-sessions/${session.id}/stop`, body: { outcome: 'Cancelled' } })}>{t("Cancel session")}</Button></div></details>
    </section> : active.isSuccess && <section className={styles.surface} aria-label={t("Start a session")}><StartFocus action={action} /></section>}
    <ActionFeedback action={action} success={session ? t("Focus updated.") : t("Session recorded.")} />
    <Link to="/today">{t("← Return to Today")}</Link>
  </div>
}
