import { useLanguage } from '../../features/settings/language.js'
import { Button } from './Button.jsx'
import styles from './Productivity.module.css'

export function QueryFeedback({ query }) {
  const { t, errorMessage } = useLanguage()
  if (query.isPending) return <p role="status" className={styles.loading}>{t("Loading…")}</p>
  if (query.isError) return <div><p role="alert" className={styles.error}>{errorMessage(query.error)}</p>
    <Button variant="secondary" onClick={() => query.refetch()}>{t("Try again")}</Button></div>
  return null
}

export function ActionFeedback({ action, success }) {
  const { t, errorMessage, number } = useLanguage()
  if (action.isError) return <div role="alert" className={styles.error}>
    <p>{errorMessage(action.error)}</p>
  </div>
  const progression = action.data?.progression
  const earned = progression && (progression.xpChange !== 0 || /\/(complete|logs)$/.test(action.variables?.path || '')) ? progression : null
  return action.isSuccess ? <p role="status" className={styles.feedback}>{success || t('Changes saved.')}{earned && <> {earned.xpChange > 0 ? '+' : ''}{number(earned.xpChange)} XP.{earned.levelUp && <> {t('levelReached', { level: number(earned.progress.level), rank: t(earned.progress.rank) })}</>}</>}</p> : null
}

export function Pagination({ data, setPage }) {
  const { t } = useLanguage()
  if (!data || data.total <= data.pageSize) return null
  return <nav aria-label={t("List pages")} className={styles.actions}>
    <Button variant="secondary" disabled={data.page <= 1} onClick={() => setPage(data.page - 1)}>{t("Previous")}</Button>
    <span>{t('pageCount', { page: data.page, total: Math.ceil(data.total / data.pageSize) })}</span>
    <Button variant="secondary" disabled={data.page * data.pageSize >= data.total} onClick={() => setPage(data.page + 1)}>{t("Next")}</Button>
  </nav>
}
