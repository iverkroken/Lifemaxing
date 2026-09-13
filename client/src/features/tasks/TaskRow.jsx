import { Link } from 'react-router'
import { Button } from '../../shared/ui/Button.jsx'
import styles from '../../shared/ui/Productivity.module.css'

export function TaskRow({ task, action, date, commitment }) {
  return <li className={styles.row}>
    <div>
      <Link className={`${styles.title} ${task.isCompleted ? styles.completed : ''}`} to={`/tasks/${task.id}`}>{task.title}</Link>
      <p className={styles.meta}>{task.priority} priority · {task.tier}
        {task.plannedDate && ` · Planned ${task.plannedDate}`}{task.dueDate && ` · Due ${task.dueDate}`}
        {task.deletedAtUtc && ' · Archived'}{task.isCompleted && ' · Completed'}</p>
      {date && task.dueDate && task.dueDate < date && !task.isCompleted && <p className={styles.warning}>Overdue</p>}
      {commitment && <p className={styles.meta}>{commitment.removedAtUtc ? 'Cancelled · historical plan retained' : commitment.plannedSameDay ? 'Planned on this day' : 'Planned in advance'}</p>}
    </div>
    {!task.deletedAtUtc && <div className={styles.actions}>
      <Button variant="secondary" size="small" loading={action.isPending}
        onClick={() => action.mutate({ path: `/tasks/${task.id}/${task.isCompleted ? 'reopen' : 'complete'}` })}>{task.isCompleted ? 'Reopen' : 'Complete'}</Button>
      {date && !task.isCompleted && (!commitment || commitment.removedAtUtc) && <Button variant="quiet" size="small" loading={action.isPending}
        onClick={() => action.mutate({ path: '/daily-commitments', body: { taskId: task.id, localDate: date } })}>Commit to this day</Button>}
      {commitment && !commitment.removedAtUtc && !task.isCompleted && <Button variant="quiet" size="small" loading={action.isPending}
        onClick={() => action.mutate({ path: `/daily-commitments/${commitment.id}`, method: 'DELETE' })}>Cancel plan</Button>}
    </div>}
  </li>
}
