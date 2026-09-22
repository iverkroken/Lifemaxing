import { useLanguage } from '../settings/language.js'
import { Link } from 'react-router'
import { Button } from '../../shared/ui/Button.jsx'
import { useLocation } from 'react-router'
import { AreaLabel } from '../../shared/ui/AreaLabel.jsx'
import { Icon } from '../../shared/ui/Icon.jsx'
import styles from '../../shared/ui/Productivity.module.css'
import row from './TaskRow.module.css'

export function TaskRow({ task, action, date, commitment, area }) {
  const { t, date: formatDate, number } = useLanguage()
  const location = useLocation()
  const overdue = date && task.dueDate && task.dueDate < date && !task.isCompleted
  return <li className={row.row}>
    {!task.archivedAtUtc ? <label className={styles.completionControl}><input type="checkbox" checked={Boolean(task.isCompleted)} className={styles.completionCheck} disabled={action.isPending}
      aria-label={`${task.isCompleted ? t("Reopen") : t("Complete")} ${task.title}`} aria-busy={action.isPending}
      onChange={() => action.mutate({ path: `/tasks/${task.id}/${task.isCompleted ? 'reopen' : 'complete'}` })}
    /></label> : <span className={row.archived}><Icon name="inbox" size={16} /></span>}
    <div className={row.body}>
      <Link data-task-link={task.id} className={`${styles.title} ${task.isCompleted ? styles.completed : ''}`} to={`/tasks/${task.id}`}
        state={{ backgroundLocation: location }}>{task.title}</Link>
      <div className={row.meta}>
        {task.priority === 'High' && <span className={row.priority}><Icon name="flag" size={16} />{t("High priority")}</span>}
        <AreaLabel area={area} />
        {task.tier && <span>{t(task.tier)}</span>}
        {task.expectedXp != null && !task.isCompleted && <span>{t('upToXp', { xp: task.expectedXp })}</span>}
        {task.goalId && <Link to={`/goals/${task.goalId}`}>{t('Linked goal')}</Link>}
        {task.dueDate && <span className={overdue ? styles.warning : ''}>{overdue ? t("Overdue") : t("Due")} {formatDate(task.dueDate)}</span>}
        {task.plannedDate && task.plannedDate !== date && <span>{t('plannedOn', { date: formatDate(task.plannedDate) })}</span>}
        {task.estimateMinutes && <span>{t('minutesCount', { count: number(task.estimateMinutes) })}</span>}
        {task.archivedAtUtc && <span>{t("Archived")}</span>}{task.isCompleted && <span>{t("Completed")}</span>}
        {commitment?.removedAtUtc && <span>{t("Cancelled · historical plan retained")}</span>}
      </div>
    </div>
    {!task.archivedAtUtc && !task.isCompleted && <div className={row.actions}>
      <Link to={`/focus?taskId=${task.id}`}>{t("Focus")}</Link>
      {date && task.plannedDate !== date && <Button variant="quiet" size="small" loading={action.isPending}
        onClick={() => action.mutate({ path: '/daily-commitments', body: { taskId: task.id, localDate: date } })}>{t('Plan for this day')}</Button>}
      {commitment && !commitment.removedAtUtc && <details className={row.menu} onKeyDown={event => { if (event.key === "Escape") { event.currentTarget.open = false; event.currentTarget.querySelector("summary").focus() } }} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) event.currentTarget.open = false }}><summary aria-label={t("Task actions")}><Icon name="more" size={20} /></summary><div><Button variant="quiet" size="small" loading={action.isPending}
        onClick={() => action.mutate({ path: `/daily-commitments/${commitment.id}`, method: 'DELETE' })}>{t("Cancel plan")}</Button></div></details>}
    </div>}
  </li>
}
