import { useLanguage } from '../settings/language.js'
import { Link } from 'react-router'
import { Button } from '../../shared/ui/Button.jsx'
import { useLocation } from 'react-router'
import { Icon } from '../../shared/ui/Icon.jsx'
import styles from '../../shared/ui/Productivity.module.css'
import row from './TaskRow.module.css'

export function TaskRow({ task, action, date, commitment, areaName }) {
  const { t, date: formatDate, number } = useLanguage()
  const location = useLocation()
  const overdue = date && task.dueDate && task.dueDate < date && !task.isCompleted
  return <li className={row.row}>
    {!task.deletedAtUtc ? <button className={`${row.complete} ${task.isCompleted ? row.checked : ''}`} disabled={action.isPending}
      aria-label={`${task.isCompleted ? t("Reopen") : t("Complete")} ${task.title}`} aria-busy={action.isPending}
      onClick={() => action.mutate({ path: `/tasks/${task.id}/${task.isCompleted ? 'reopen' : 'complete'}` })}>
      {task.isCompleted && <Icon name="check" size={16} />}
    </button> : <span className={row.archived}><Icon name="inbox" size={16} /></span>}
    <div className={row.body}>
      <Link data-task-link={task.id} className={`${styles.title} ${task.isCompleted ? styles.completed : ''}`} to={`/tasks/${task.id}`}
        state={{ backgroundLocation: location }}>{task.title}</Link>
      <div className={row.meta}>
        {task.priority === 'High' && <span className={row.priority}>{t("High priority")}</span>}
        {areaName && <span>{areaName}</span>}
        {task.dueDate && <span className={overdue ? styles.warning : ''}>{overdue ? t("Overdue") : t("Due")} {formatDate(task.dueDate)}</span>}
        {task.plannedDate && <span>{t('plannedOn', { date: formatDate(task.plannedDate) })}</span>}
        {task.estimateMinutes && <span>{t('minutesCount', { count: number(task.estimateMinutes) })}</span>}
        {task.deletedAtUtc && <span>{t("Archived")}</span>}{task.isCompleted && <span>{t("Completed")}</span>}
        {commitment && <span>{commitment.removedAtUtc ? t("Cancelled · historical plan retained") : commitment.plannedSameDay ? t("Planned on this day") : t("Planned in advance")}</span>}
      </div>
    </div>
    {!task.deletedAtUtc && !task.isCompleted && <div className={row.actions}>
      <Link to={`/focus?taskId=${task.id}`}>{t("Focus")}</Link>
      {date && (!commitment || commitment.removedAtUtc) && <Button variant="quiet" size="small" loading={action.isPending}
        onClick={() => action.mutate({ path: '/daily-commitments', body: { taskId: task.id, localDate: date } })}>{t("Commit to this day")}</Button>}
      {commitment && !commitment.removedAtUtc && <Button variant="quiet" size="small" loading={action.isPending}
        onClick={() => action.mutate({ path: `/daily-commitments/${commitment.id}`, method: 'DELETE' })}>{t("Cancel plan")}</Button>}
    </div>}
  </li>
}
