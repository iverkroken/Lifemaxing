import { rankLabel } from '../progress/rankDisplay.js'
import { useLanguage } from '../settings/language.js'
import { Link } from 'react-router'
import { useProductivity } from '../../shared/api/productivity.js'
import { Button } from '../../shared/ui/Button.jsx'
import styles from './TodayPage.module.css'

export function Availability({ query, label }) {
  const { t } = useLanguage()
  if (query.isPending) return <p role="status">{t('loadingSection', { label })}</p>
  if (query.isError) return <div className={styles.unavailable}><p role="alert">{t('unavailableSection', { label })}</p><Button variant="quiet" size="small" onClick={() => query.refetch()}>{t("Try again")}</Button></div>
  return null
}

export function ProgressNote() {
  const { t } = useLanguage()
  const query = useProductivity('/progress')
  const progress = query.data?.progress
  return <section className={styles.progress} aria-label={t("Your progression")}>
    <Availability query={query} label={t("Progress")} />
    {progress && <><div className={styles.progressHeading}><Link to="/progress">{t('levelNumber', { level: progress.level })} · {rankLabel(progress.rankInfo, t) || t(progress.rank)}</Link><span>{progress.totalXp} XP</span></div>
      <progress aria-label={t("Progress to next level")} value={progress.xpIntoLevel} max={progress.xpForNextLevel} />
      <p>{t('xpToward', { current: progress.xpIntoLevel, total: progress.xpForNextLevel, level: progress.level + 1 })}</p></>}
  </section>
}
