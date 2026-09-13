import { Link } from 'react-router'
import { Button } from '../../shared/ui/Button.jsx'
import { Icon } from '../../shared/ui/Icon.jsx'
import styles from '../../shared/ui/Productivity.module.css'
import row from './TaskRow.module.css'

export function TaskRow({ task, action, date, commitment, areaName }) {
  const overdue = date && task.dueDate && task.dueDate < date && !task.isCompleted
  return <li className={row.row}>
    {!task.deletedAtUtc ? <button className={`${row.complete} ${task.isCompleted ? row.checked : ''}`} disabled={action.isPending}
      aria-label={`${task.isCompleted ? 'Reopen' : 'Complete'} ${task.title}`} aria-busy={action.isPending}
      onClick={() => action.mutate({ path: `/tasks/${task.id}/${task.isCompleted ? 'reopen' : 'complete'}` })}>
      {task.isCompleted && <Icon name="check" size={16} />}
    </button> : <span className={row.archived}><Icon name="inbox" size={16} /></span>}
    <div className={row.body}>
      <Link className={`${styles.title} ${task.isCompleted ? styles.completed : ''}`} to={`/tasks/${task.id}`}>{task.title}</Link>
      <div className={row.meta}>
        {task.priority === 'High' && <span className={row.priority}>High priority</span>}
        {areaName && <span>{areaName}</span>}
        {task.dueDate && <span className={overdue ? styles.warning : ''}>{overdue ? 'Overdue' : 'Due'} {task.dueDate}</span>}
        {task.plannedDate && <span>Planned {task.plannedDate}</span>}
        {task.estimateMinutes && <span>{task.estimateMinutes} min</span>}
        {task.deletedAtUtc && <span>Archived</span>}{task.isCompleted && <span>Completed</span>}
        {commitment && <span>{commitment.removedAtUtc ? 'Cancelled · historical plan retained' : commitment.plannedSameDay ? 'Planned on this day' : 'Planned in advance'}</span>}
      </div>
    </div>
    {!task.deletedAtUtc && !task.isCompleted && <div className={row.actions}>
      <Link to={`/focus?taskId=${task.id}`}>Focus</Link>
      {date && (!commitment || commitment.removedAtUtc) && <Button variant="quiet" size="small" loading={action.isPending}
        onClick={() => action.mutate({ path: '/daily-commitments', body: { taskId: task.id, localDate: date } })}>Commit to this day</Button>}
      {commitment && !commitment.removedAtUtc && <Button variant="quiet" size="small" loading={action.isPending}
        onClick={() => action.mutate({ path: `/daily-commitments/${commitment.id}`, method: 'DELETE' })}>Cancel plan</Button>}
    </div>}
  </li>
}
