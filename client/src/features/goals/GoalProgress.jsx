import { useProductivity } from '../../shared/api/productivity.js'
import { QueryFeedback } from '../../shared/ui/ProductivityFeedback.jsx'
import { goalProgress } from './goalProgress.js'
import styles from './GoalProgress.module.css'

export function GoalProgress({ goal }) {
  const progress = useProductivity(`/goals/${goal.id}/progress?pageSize=1`)
  const latest = progress.data?.items[0]
  const percent = goalProgress(goal, latest)
  return <div className={styles.progress}>
    <QueryFeedback query={progress} />
    {progress.data && (goal.targetValue != null ? <>
      <p className={styles.value}>{latest ? latest.value : goal.baselineValue} <span>{goal.unit}</span></p>
      <p className={styles.caption}>{latest ? 'Last recorded' : 'Starting point · no updates yet'} · {goal.direction === 'Decrease' ? 'Decrease' : 'Increase'} toward {goal.targetValue} {goal.unit}</p>
      {percent != null && <><progress max="100" value={Math.min(100, Math.max(0, percent))} aria-label={`${goal.title}: ${percent}% from baseline toward target`} /><p className={styles.caption}>{percent}% from baseline toward target</p></>}
    </> : <p className={styles.note}>{latest?.note || 'Progress takes many forms. Record the next meaningful step.'}</p>)}
  </div>
}
