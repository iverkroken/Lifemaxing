import { Button } from './Button.jsx'
import styles from './Productivity.module.css'

export function QueryFeedback({ query }) {
  if (query.isPending) return <p role="status" className={styles.loading}>Loading…</p>
  if (query.isError) return <div><p role="alert" className={styles.error}>{query.error.message}</p>
    <Button variant="secondary" onClick={() => query.refetch()}>Try again</Button></div>
  return null
}

export function ActionFeedback({ action, success = 'Saved.' }) {
  if (action.isError) return <div role="alert" className={styles.error}>
    <p>{action.error.message}</p>
    {Object.entries(action.error.errors || {}).map(([key, messages]) => <p key={key}>{messages.join(' ')}</p>)}
  </div>
  const progression = action.data?.progression
  const earned = progression && (progression.xpChange !== 0 || /\/(complete|logs)$/.test(action.variables?.path || '')) ? progression : null
  return action.isSuccess ? <p role="status" className={styles.feedback}>{success}{earned && <> {earned.xpChange > 0 ? '+' : ''}{earned.xpChange} XP.{earned.levelUp && <> Level {earned.progress.level} reached · {earned.progress.rank}.</>}</>}</p> : null
}

export function Pagination({ data, setPage }) {
  if (!data || data.total <= data.pageSize) return null
  return <nav aria-label="List pages" className={styles.actions}>
    <Button variant="secondary" disabled={data.page <= 1} onClick={() => setPage(data.page - 1)}>Previous</Button>
    <span>Page {data.page} of {Math.ceil(data.total / data.pageSize)}</span>
    <Button variant="secondary" disabled={data.page * data.pageSize >= data.total} onClick={() => setPage(data.page + 1)}>Next</Button>
  </nav>
}
