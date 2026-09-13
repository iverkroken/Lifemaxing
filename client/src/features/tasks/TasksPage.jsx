import { useLanguage } from '../settings/language.js'

import { Link, NavLink, useSearchParams, useOutletContext } from 'react-router'
import { queryString, useProductivity, useProductivityAction } from '../../shared/api/productivity.js'
import { Input } from '../../shared/ui/Input.jsx'
import { Select } from '../../shared/ui/Select.jsx'
import { EmptyState } from '../../shared/ui/EmptyState.jsx'
import { PageHeader } from '../../shared/ui/PageHeader.jsx'
import { ActionFeedback, Pagination, QueryFeedback } from '../../shared/ui/ProductivityFeedback.jsx'
import { Button } from '../../shared/ui/Button.jsx'
import { TaskRow } from './TaskRow.jsx'
import styles from '../../shared/ui/Productivity.module.css'

export function TasksPage({ inbox = false }) {
  const { t, areaName } = useLanguage()
  const { openCapture } = useOutletContext()
  const [params, setParams] = useSearchParams()
  const page = Math.max(1, Number(params.get('page')) || 1)
  const status = params.get('status') || 'active'
  const search = params.get('search') || ''
  const changeFilter = (key, value) => setParams(current => {
    const next = new URLSearchParams(current)
    if (value) next.set(key, value); else next.delete(key)
    if (key !== 'page') next.delete('page')
    return next
  }, { replace: true })
  const setPage = value => changeFilter('page', String(value))
  const areaId = params.get('areaId') || ''
  const areas = useProductivity('/areas')
  const today = useProductivity('/today')
  const tasks = useProductivity(`/tasks?${queryString({ inbox, page, status, search, areaId })}`)
  const action = useProductivityAction()
  return <div className={styles.stack}>
    <PageHeader eyebrow={inbox ? t("Capture → organize → commit") : t("Plan and do")} title={inbox ? t("Inbox") : t("Tasks")}
      description={inbox ? t("A place for everything on your mind. Choose a day to turn a thought into a commitment.") : t("Choose your next action. Plan it, complete it, or pick up where you left off.")}
      action={<Button onClick={() => openCapture({ date: null })}>{t("Capture a task")}</Button>} />
    <nav className={styles.tabs} aria-label={t("Task views")}><NavLink to="/tasks" end>{t("All tasks")}</NavLink><NavLink to="/inbox">{t("Inbox")}</NavLink></nav>
    <div className={styles.stack}>
      <section className={styles.surface} aria-label={t("Task workspace")}>
        <div className={styles.toolbar}>
          <Input label={t("Search tasks")} placeholder={t("Find an action…")} value={search} onChange={e => changeFilter('search', e.target.value)} />
          {!inbox && <Select label={t("Task status")} value={status} onChange={e => changeFilter('status', e.target.value)}>
            <option value="active">{t("Active")}</option><option value="completed">{t("Completed")}</option><option value="all">{t("All unarchived")}</option><option value="archived">{t("Archived")}</option>
          </Select>}
          <Select label={t("Life Area filter")} value={areaId} onChange={e => changeFilter('areaId', e.target.value)}>
            <option value="">{t("All areas")}</option>{areas.data?.map(area => <option key={area.id} value={area.id}>{areaName(area)}</option>)}
          </Select>
          {(search || areaId || status !== 'active') && <Button variant="quiet" onClick={() => setParams({}, { replace: true })}>{t("Reset filters")}</Button>}
        </div>
        <QueryFeedback query={areas} />{inbox && <QueryFeedback query={today} />}<QueryFeedback query={tasks} /><ActionFeedback action={action} />
        {tasks.data && <p className={styles.meta}>{t('taskCount', { count: tasks.data.total, status: t(inbox ? 'unplanned' : { active: 'Active', completed: 'Completed', all: 'All unarchived', archived: 'Archived' }[status]) })}</p>}
        {tasks.data?.items.length === 0 && <EmptyState title={search || areaId ? t("No matching tasks") : inbox ? t("Your Inbox is clear") : t("No tasks in this view")} icon={inbox ? 'inbox' : 'tasks'}>{inbox ? t("Your Inbox is clear. Capture an idea whenever it comes to mind.") : t("Create your next action, or adjust the filters to find earlier work.")}</EmptyState>}
        <ul className={styles.list}>{tasks.data?.items.map(task => <TaskRow key={task.id} task={task} action={action}
          date={inbox ? today.data?.currentLocalDate : undefined} areaName={areaName(areas.data?.find(area => area.id === task.lifeAreaId))} />)}</ul>
        <Pagination data={tasks.data} setPage={setPage} />
      </section>
      <div className={styles.actions}><Link to="/tasks/new">{t("Create task with details →")}</Link>{inbox && <p className={styles.meta}>{t("Choose a planned date to move a task out of Inbox.")}</p>}</div>
    </div>
  </div>
}
