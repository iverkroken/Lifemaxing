import { useLanguage } from '../settings/language.js'
import { useProductivity } from '../../shared/api/productivity.js'
import { QueryFeedback } from '../../shared/ui/ProductivityFeedback.jsx'
import { goalProgress } from './goalProgress.js'
import styles from './GoalProgress.module.css'

export function GoalProgress({ goal }) {
  const { t, number, dateTime } = useLanguage()
  const progress = useProductivity(`/goals/${goal.id}/progress?pageSize=1`)
  const latest = progress.data?.items[0]
  const percent = goalProgress(goal, latest)
  return <div className={styles.progress}>
    <QueryFeedback query={progress} />
    {progress.data && (goal.targetValue != null ? <>
      <p className={styles.value}>{number(latest ? latest.value : goal.baselineValue)} <span>{goal.unit}</span></p>
      <p className={styles.caption}>{latest ? t("Last recorded") : t("Starting point · no updates yet")} · {t('goalDirection', { direction: t(goal.direction), value: number(goal.targetValue), unit: goal.unit })}</p>
      {percent != null && <><progress max="100" value={Math.min(100, Math.max(0, percent))} aria-label={t('goalMeter', { title: goal.title, percent: number(percent) })} /><p className={styles.caption}>{t('goalPercent', { percent: number(percent) })}</p></>}
    </> : <p className={styles.note}>{latest?.note || t("No updates yet. Add your first progress note.")}</p>)}
    {latest && <p className={styles.caption}>{t('lastUpdate', { date: dateTime(latest.recordedAtUtc) })}</p>}
  </div>
}
