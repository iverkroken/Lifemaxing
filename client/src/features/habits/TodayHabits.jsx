import { useLanguage } from '../settings/language.js'
import { Link } from 'react-router'
import { Button } from '../../shared/ui/Button.jsx'
import { AreaLabel } from '../../shared/ui/AreaLabel.jsx'
import { EmptyState } from '../../shared/ui/EmptyState.jsx'
import styles from '../../shared/ui/Productivity.module.css'

export function TodayHabits({ data, action, areas, onCreate, emptyClassName = '' }) {
  const { t } = useLanguage()
  if (!data) return null
  if (data.habits.length === 0) return <EmptyState className={emptyClassName} title={t("Room for a small routine")} action={onCreate ? <Button variant="secondary" onClick={onCreate}>{t("New habit")}</Button> : <Link to="/habits">{t("Explore your habits")}</Link>}>{t("No habits are scheduled for this day.")}</EmptyState>
  return <ul className={`${styles.list} ${styles.habitWork}`}>{data.habits.map(habit => <li key={habit.id} className={styles.row}>
    <label className={styles.completionControl}><input className={styles.completionCheck} type="checkbox" checked={Boolean(habit.activeLogId)} disabled={action.isPending || data.localDate > data.currentLocalDate}
      aria-label={`${habit.activeLogId ? t('Undo completion') : t('Log completion')}: ${habit.title}`} aria-busy={action.isPending}
      onChange={() => action.mutate(habit.activeLogId ? { path: `/habits/${habit.id}/logs/${habit.activeLogId}/revoke` } : { path: `/habits/${habit.id}/logs`, body: { localDate: data.localDate } })} /></label>
    <div><Link className={styles.title} to={`/habits/${habit.id}`}>{habit.title}</Link>
      <p className={styles.meta}><AreaLabel area={areas?.find(area => area.id === habit.lifeAreaId)} />{habit.xpPerLog != null && <> · {habit.activeLogId ? `${habit.awardedXp ?? 0} XP` : t('upToXp', { xp: habit.xpPerLog })}</>}</p>
      <p className={styles.meta}>{habit.pattern === 'WeeklyCount' ? t('weeklyCount', { count: habit.weekCompletions, target: habit.weeklyTarget }) : t('Scheduled for this date')}{habit.targetReached && <> · {t('Target reached')}</>}{habit.activeLogId && <> · {t('Completed')}</>}</p></div>
    {!habit.activeLogId && <Link to={`/focus?habitId=${habit.id}`}>{t('Focus')}</Link>}
  </li>)}</ul>
}
