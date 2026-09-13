import { useLanguage } from '../settings/language.js'
import { useQueries } from '@tanstack/react-query'
import { Link, useOutletContext } from 'react-router'
import { apiRequest } from '../../shared/api/client.js'
import { useProductivity } from '../../shared/api/productivity.js'
import { Button } from '../../shared/ui/Button.jsx'
import { Icon } from '../../shared/ui/Icon.jsx'
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
    {progress && <><div className={styles.progressHeading}><Link to="/progress">{t('levelNumber', { level: progress.level })} · {t(progress.rank)}</Link><span>{progress.totalXp} XP</span></div>
      <progress aria-label={t("Progress to next level")} value={progress.xpIntoLevel} max={progress.xpForNextLevel} />
      <p>{t('xpToward', { current: progress.xpIntoLevel, total: progress.xpForNextLevel, level: progress.level + 1 })}</p></>}
  </section>
}

// Only mounted for an empty day. Archives/history distinguish it from a new account.
export function EmptyDay({ date, openPicker }) {
  const { t } = useLanguage()
  const { user, openCapture } = useOutletContext()
  const paths = ['/tasks?status=all&pageSize=1', '/tasks?status=archived&pageSize=1', '/habits?pageSize=1', '/habits?archived=true&pageSize=1', '/goals?pageSize=1', '/goals?archived=true&pageSize=1', '/activity?pageSize=1']
  const queries = useQueries({ queries: paths.map(path => ({ queryKey: ['productivity', user.id, path], queryFn: ({ signal }) => apiRequest(path, { signal }) })) })
  if (queries.some(query => query.isPending)) return <p role="status">{t("Checking your workspace…")}</p>
  if (queries.some(query => query.isError)) return <div className={styles.unavailable}><p role="alert">{t("Your workspace could not be checked.")}</p><Button variant="secondary" onClick={() => queries.forEach(query => query.refetch())}>{t("Try again")}</Button></div>
  const newAccount = queries.every(query => query.data.total === 0)
  return <section className={styles.start} aria-label={newAccount ? t("Get started") : t("Empty day")}>
    <h2>{newAccount ? t("Start with one task") : t("Nothing planned for this day")}</h2>
    <p>{newAccount ? t("Capture a task, then choose when to do it. Add a routine or a goal when you need one.") : t("Choose an existing task or add something new. Your other work is still in Tasks.")}</p>
    {newAccount ? <div className={styles.steps}>
      <div><Icon name="tasks" /><div><strong>{t("Your first task")}</strong><p>{t("Something you want to get done.")}</p></div><Button onClick={() => openCapture({ date })}>{t("Add a task")}</Button></div>
      <div><Icon name="habits" /><div><strong>{t("Your first habit")}</strong><p>{t("A routine to repeat.")}</p></div><Button variant="quiet" onClick={() => openCapture({ kind: 'habit' })}>{t("Add a habit")}</Button></div>
      <div><Icon name="goals" /><div><strong>{t("Your first goal")}</strong><p>{t("An outcome to work toward.")}</p></div><Button variant="quiet" onClick={() => openCapture({ kind: 'goal' })}>{t("Add a goal")}</Button></div>
    </div> : <div className={styles.missionPrompt}><Button onClick={openPicker}>{t("Choose a mission")}</Button><Button variant="secondary" onClick={() => openCapture({ date })}>{t("Add a task")}</Button></div>}
  </section>
}
