import { useQueries } from '@tanstack/react-query'
import { Link, useOutletContext } from 'react-router'
import { apiRequest } from '../../shared/api/client.js'
import { useProductivity } from '../../shared/api/productivity.js'
import { Button } from '../../shared/ui/Button.jsx'
import { Icon } from '../../shared/ui/Icon.jsx'
import styles from './TodayPage.module.css'

export function Availability({ query, label }) {
  if (query.isPending) return <p role="status">Loading {label.toLowerCase()}…</p>
  if (query.isError) return <div className={styles.unavailable}><p role="alert">{label} could not be loaded.</p><Button variant="quiet" size="small" onClick={() => query.refetch()}>Try again</Button></div>
  return null
}

export function ProgressNote() {
  const query = useProductivity('/progress')
  const progress = query.data?.progress
  return <section className={styles.progress} aria-label="Your progression">
    <Availability query={query} label="Progress" />
    {progress && <><div className={styles.progressHeading}><Link to="/progress">Level {progress.level} · {progress.rank}</Link><span>{progress.totalXp} XP</span></div>
      <progress aria-label="Progress to next level" value={progress.xpIntoLevel} max={progress.xpForNextLevel} />
      <p>{progress.xpIntoLevel} / {progress.xpForNextLevel} XP toward level {progress.level + 1}</p></>}
  </section>
}

// Only mounted for an empty day. Archives/history distinguish it from a new account.
export function EmptyDay({ date, openPicker }) {
  const { user, openCapture } = useOutletContext()
  const paths = ['/tasks?status=all&pageSize=1', '/tasks?status=archived&pageSize=1', '/habits?pageSize=1', '/habits?archived=true&pageSize=1', '/goals?pageSize=1', '/goals?archived=true&pageSize=1', '/activity?pageSize=1']
  const queries = useQueries({ queries: paths.map(path => ({ queryKey: ['productivity', user.id, path], queryFn: ({ signal }) => apiRequest(path, { signal }) })) })
  if (queries.some(query => query.isPending)) return <p role="status">Checking your workspace…</p>
  if (queries.some(query => query.isError)) return <div className={styles.unavailable}><p role="alert">Your workspace could not be checked.</p><Button variant="secondary" onClick={() => queries.forEach(query => query.refetch())}>Try again</Button></div>
  const newAccount = queries.every(query => query.data.total === 0)
  return <section className={styles.start} aria-label={newAccount ? 'Get started' : 'Empty day'}>
    <h2>{newAccount ? 'Start with one task' : 'Nothing planned for this day'}</h2>
    <p>{newAccount ? 'Capture a task, then choose when to do it. Add a routine or a goal when you need one.' : 'Choose an existing task or add something new. Your other work is still in Tasks.'}</p>
    {newAccount ? <div className={styles.steps}>
      <div><Icon name="tasks" /><div><strong>Your first task</strong><p>Something you want to get done.</p></div><Button onClick={() => openCapture({ date })}>Add a task</Button></div>
      <div><Icon name="habits" /><div><strong>Your first habit</strong><p>A routine to repeat.</p></div><Button variant="quiet" onClick={() => openCapture({ kind: 'habit' })}>Add a habit</Button></div>
      <div><Icon name="goals" /><div><strong>Your first goal</strong><p>An outcome to work toward.</p></div><Button variant="quiet" onClick={() => openCapture({ kind: 'goal' })}>Add a goal</Button></div>
    </div> : <div className={styles.missionPrompt}><Button onClick={openPicker}>Choose a mission</Button><Button variant="secondary" onClick={() => openCapture({ date })}>Add a task</Button></div>}
  </section>
}
