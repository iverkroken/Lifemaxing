import { useState } from 'react'
import { Link } from 'react-router'
import { queryString, useProductivity, useProductivityAction } from '../../shared/api/productivity.js'
import { Card } from '../../shared/ui/Card.jsx'
import { Input } from '../../shared/ui/Input.jsx'
import { Select } from '../../shared/ui/Select.jsx'
import { PageHeader } from '../../shared/ui/PageHeader.jsx'
import { ActionFeedback, Pagination, QueryFeedback } from '../../shared/ui/ProductivityFeedback.jsx'
import { QuickAdd } from './QuickAdd.jsx'
import { TaskRow } from './TaskRow.jsx'
import styles from '../../shared/ui/Productivity.module.css'

export function TasksPage({ inbox = false }) {
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState('active')
  const [search, setSearch] = useState('')
  const [areaId, setAreaId] = useState('')
  const areas = useProductivity('/areas')
  const tasks = useProductivity(`/tasks?${queryString({ inbox, page, status, search, areaId })}`)
  const action = useProductivityAction()
  return <div className={styles.stack}>
    <PageHeader title={inbox ? 'Inbox' : 'Tasks'} description={inbox ? 'Capture first. Choose a planned date when you are ready to act.' : 'Turn your plans into clear, manageable actions.'}
      action={<Link to="/tasks/new">Create task with details</Link>} />
    <QuickAdd />
    <Card>
      <div className={styles.fields}>
        <Input label="Search tasks" value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} />
        {!inbox && <Select label="Task status" value={status} onChange={e => { setStatus(e.target.value); setPage(1) }}>
          <option value="active">Active</option><option value="completed">Completed</option><option value="all">All unarchived</option><option value="archived">Archived</option>
        </Select>}
        <Select label="Life Area filter" value={areaId} onChange={e => { setAreaId(e.target.value); setPage(1) }}>
          <option value="">All areas</option>{areas.data?.map(area => <option key={area.id} value={area.id}>{area.displayName}</option>)}
        </Select>
      </div>
      <QueryFeedback query={areas} /><QueryFeedback query={tasks} /><ActionFeedback action={action} />
      {tasks.data?.items.length === 0 && <p>{inbox ? 'Your Inbox is clear. Capture a task above whenever something comes to mind.' : 'No tasks match this view. Create a task or adjust your filters.'}</p>}
      <ul className={styles.list}>{tasks.data?.items.map(task => <TaskRow key={task.id} task={task} action={action} />)}</ul>
      <Pagination data={tasks.data} setPage={setPage} />
    </Card>
  </div>
}
