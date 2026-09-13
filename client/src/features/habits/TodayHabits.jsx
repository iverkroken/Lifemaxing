import { Link } from 'react-router'
import { Button } from '../../shared/ui/Button.jsx'
import { Icon } from '../../shared/ui/Icon.jsx'
import { EmptyState } from '../../shared/ui/EmptyState.jsx'
import styles from '../../shared/ui/Productivity.module.css'

export function TodayHabits({ data, action, compact = false }) {
  if (!data) return null
  if (data.habits.length === 0) return <EmptyState title="Room for a small routine" action={<Link to="/habits">Explore your habits</Link>}>No habits are scheduled for this day.</EmptyState>
  return <ul className={styles.list}>{data.habits.map(habit => <li key={habit.id} className={styles.row}>
    <div><Link className={styles.title} to={`/habits/${habit.id}`}>{habit.title}</Link>
      <p className={styles.meta}>{habit.pattern === 'WeeklyCount' ? `${habit.weekCompletions} / ${habit.weeklyTarget} this week${habit.targetReached ? ' · Target reached' : ''}` : 'Scheduled for this date'}{habit.activeLogId && ' · Completed'}</p></div>
    <Button variant={habit.activeLogId ? 'quiet' : 'secondary'} size="small" loading={action.isPending} disabled={data.localDate > data.currentLocalDate}
      {...(compact && { 'aria-label': `${habit.activeLogId ? 'Undo completion' : 'Log completion'}: ${habit.title}`, 'aria-pressed': Boolean(habit.activeLogId) })}
      onClick={() => action.mutate(habit.activeLogId ? { path: `/habits/${habit.id}/logs/${habit.activeLogId}/revoke` } : { path: `/habits/${habit.id}/logs`, body: { localDate: data.localDate } })}>
      {compact ? <Icon name="check" /> : <>{habit.activeLogId && <Icon name="check" size={16} />}{habit.activeLogId ? 'Undo completion' : 'Log completion'}</>}</Button>
  </li>)}</ul>
}
