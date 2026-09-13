import { useState } from 'react'
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
  const { openCapture } = useOutletContext()
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState('active')
  const [search, setSearch] = useState('')
  const [params, setParams] = useSearchParams()
  const areaId = params.get('areaId') || ''
  const areas = useProductivity('/areas')
  const today = useProductivity('/today')
  const tasks = useProductivity(`/tasks?${queryString({ inbox, page, status, search, areaId })}`)
  const action = useProductivityAction()
  return <div className={styles.stack}>
    <PageHeader eyebrow={inbox ? 'Capture → organize → commit' : 'Your work, with intention'} title={inbox ? 'Inbox' : 'Tasks'}
      description={inbox ? 'A place for everything on your mind. Choose a day to turn a thought into a commitment.' : 'Clear actions. A little less on your mind.'}
      action={<Link to="/tasks/new">Create task with details →</Link>} />
    <nav className={styles.tabs} aria-label="Task views"><NavLink to="/tasks" end>All tasks</NavLink><NavLink to="/inbox">Inbox</NavLink></nav>
    <div className={inbox ? styles.split : styles.stack}>
      <section aria-label="Task workspace">
        <div className={styles.toolbar}>
          <Input label="Search tasks" placeholder="Find an action…" value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} />
          {!inbox && <Select label="Task status" value={status} onChange={e => { setStatus(e.target.value); setPage(1) }}>
            <option value="active">Active</option><option value="completed">Completed</option><option value="all">All unarchived</option><option value="archived">Archived</option>
          </Select>}
          <Select label="Life Area filter" value={areaId} onChange={e => { setParams(e.target.value ? { areaId: e.target.value } : {}); setPage(1) }}>
            <option value="">All areas</option>{areas.data?.map(area => <option key={area.id} value={area.id}>{area.displayName}</option>)}
          </Select>
        </div>
        <QueryFeedback query={areas} />{inbox && <QueryFeedback query={today} />}<QueryFeedback query={tasks} /><ActionFeedback action={action} />
        {tasks.data && <p className={styles.meta}>{tasks.data.total} {inbox ? 'unplanned' : status} {tasks.data.total === 1 ? 'task' : 'tasks'}</p>}
        {tasks.data?.items.length === 0 && <EmptyState title={inbox ? 'A little breathing room' : 'Nothing here just yet'} icon={inbox ? 'inbox' : 'tasks'}>{inbox ? 'Your Inbox is clear. Capture an idea whenever it comes to mind.' : 'Create your next action, or adjust the filters to find earlier work.'}</EmptyState>}
        <ul className={styles.list}>{tasks.data?.items.map(task => <TaskRow key={task.id} task={task} action={action}
          date={inbox ? today.data?.currentLocalDate : undefined} areaName={areas.data?.find(area => area.id === task.lifeAreaId)?.displayName} />)}</ul>
        <Pagination data={tasks.data} setPage={setPage} />
      </section>
      <aside className={styles.section} aria-label="Capture a task"><Button onClick={() => openCapture({ date: null })}>Capture a task</Button>{inbox && <p className={styles.meta}>Open a task to add details, a Life Area or a due date. It leaves Inbox when you choose a planned date.</p>}</aside>
    </div>
  </div>
}
