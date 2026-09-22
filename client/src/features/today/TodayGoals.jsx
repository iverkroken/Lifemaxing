import { useState } from 'react'
import { Link } from 'react-router'
import { useLanguage } from '../settings/language.js'
import { useProductivity, queryString } from '../../shared/api/productivity.js'
import { Button } from '../../shared/ui/Button.jsx'
import { Input } from '../../shared/ui/Input.jsx'
import { AreaLabel } from '../../shared/ui/AreaLabel.jsx'
import { Pagination, QueryFeedback, ActionFeedback } from '../../shared/ui/ProductivityFeedback.jsx'
import { goalProgress } from '../goals/goalProgress.js'
import styles from '../../shared/ui/Productivity.module.css'

export function GoalDayPicker({ date, action }) {
  const { t } = useLanguage()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const goals = useProductivity(`/goals?${queryString({ state: 'Active', search, page })}`)
  return <div className={styles.form}>
    <Input label={t('Find a goal')} value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} />
    <QueryFeedback query={goals} />
    {goals.data?.total === 0 && <p>{t('No active goals match this view.')}</p>}
    <ul className={styles.list}>{goals.data?.items.map(goal => <li key={goal.id} className={styles.row}><strong>{goal.title}</strong>
      <Button variant="secondary" size="small" loading={action.isPending} onClick={() => action.mutate({ path: `/today/${date}/goals/${goal.id}`, method: 'PUT' })}>{t('Select goal')}</Button>
    </li>)}</ul>
    <Pagination data={goals.data} setPage={setPage} /><ActionFeedback action={action} />
  </div>
}

export function TodayGoals({ goals, areas, date, action }) {
  const { t, number } = useLanguage()
  return <ul className={styles.list}>{goals.map(({ goal, latestProgress, manuallySelected, plannedTaskCount }) => {
    const percent = goalProgress(goal, latestProgress)
    return <li key={goal.id} className={styles.row}>
      <div><Link className={styles.title} to={`/goals/${goal.id}`}>{goal.title}</Link>
        <p className={styles.meta}><AreaLabel area={areas?.find(area => area.id === goal.lifeAreaId)} /> · {t(goal.state)} · {plannedTaskCount ? t('goalTasksToday', { count: plannedTaskCount }) : t('Selected for this day')}</p>
        {percent != null ? <><progress value={Math.min(100, Math.max(0, percent))} max="100" aria-label={t('goalMeter', { title: goal.title, percent: number(percent) })} /><p className={styles.meta}>{number(latestProgress.value)} / {number(goal.targetValue)} {goal.unit} · {number(percent)}%</p></> : <p className={styles.meta}>{latestProgress?.note || t('No updates yet. Add your first progress note.')}</p>}
        {manuallySelected && plannedTaskCount > 0 && <p className={styles.meta}>{t('goalRetainedByTasks')}</p>}
      </div>
      <div className={styles.actions}>
        {goal.state === 'Active' && <Link to={`/focus?goalId=${goal.id}`}>{t('Continue')}</Link>}
        <Link to={`/goals/${goal.id}`}>{t('View Goal')}</Link>
        {manuallySelected && <Button variant="quiet" size="small" loading={action.isPending} onClick={() => action.mutate({ path: `/today/${date}/goals/${goal.id}`, method: 'DELETE' })}>{t('Remove selection')}</Button>}
      </div>
    </li>
  })}</ul>
}
