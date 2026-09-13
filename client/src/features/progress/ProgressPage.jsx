import { useState } from 'react'
import { Link } from 'react-router'
import { useProductivity } from '../../shared/api/productivity.js'
import { PageHeader } from '../../shared/ui/PageHeader.jsx'
import { QueryFeedback, Pagination } from '../../shared/ui/ProductivityFeedback.jsx'
import { EmptyState } from '../../shared/ui/EmptyState.jsx'
import { Select } from '../../shared/ui/Select.jsx'
import styles from '../../shared/ui/Productivity.module.css'
import progressStyles from './ProgressPage.module.css'

export function ProgressSummary({ compact = false }) {
  const query = useProductivity('/progress')
  const data = query.data?.progress
  return <section aria-label="Your progression" className={compact ? progressStyles.compact : progressStyles.summary}>
    <QueryFeedback query={query} />
    {data && <><div className={styles.sectionHeading}><h2>Level {data.level} <span className={styles.meta}>· {data.rank}</span></h2><Link to="/progress">{data.totalXp} XP</Link></div>
      <progress className={progressStyles.meter} value={data.xpIntoLevel} max={data.xpForNextLevel} aria-label="Progress to next level" />
      <p className={styles.meta}>{data.xpIntoLevel} / {data.xpForNextLevel} XP toward level {data.level + 1}</p></>}
  </section>
}

export function ActivityList({ data }) {
  const settings = useProductivity('/settings')
  return data?.items.length ? <ol className={styles.history}>{data.items.map(event => <li key={event.id}>
    <p>{event.summary}</p><time dateTime={event.occurredAtUtc}>{new Date(event.occurredAtUtc).toLocaleString(settings.data?.locale, { timeZone: settings.data?.timeZoneId || 'UTC' })} · {settings.data?.timeZoneId || 'UTC'}</time>
  </li>)}</ol> : data && <EmptyState title="Your actions leave a record">Completed work, corrections, focus and claimed rewards will appear here.</EmptyState>
}

export function ActivityPage() {
  const [page, setPage] = useState(1)
  const [kind, setKind] = useState('')
  const query = useProductivity(`/activity?page=${page}&kind=${kind}`)
  return <div className={styles.stack}><PageHeader eyebrow="A record of doing" title="Activity" description="What you did, and the corrections along the way." />
    <Select label="Activity type" value={kind} onChange={e => { setKind(e.target.value); setPage(1) }}><option value="">All activity</option>
      {[['TaskCompleted', 'Tasks completed'], ['TaskReopened', 'Tasks reopened'], ['HabitCompleted', 'Habits completed'], ['HabitReversed', 'Habit corrections'], ['GoalProgressRecorded', 'Goal progress'], ['GoalCompleted', 'Goals completed'], ['LevelReached', 'Levels reached'], ['RewardClaimed', 'Rewards claimed'], ['FocusCompleted', 'Focus completed'], ['FocusStopped', 'Focus stopped'], ['FocusCancelled', 'Focus cancelled'], ['MissionChanged', 'Mission changes']].map(([value, label]) => <option key={value} value={value}>{label}</option>)}
    </Select><QueryFeedback query={query} /><ActivityList data={query.data} /><Pagination data={query.data} setPage={setPage} /></div>
}

export function ProgressPage() {
  const query = useProductivity('/progress')
  const recent = useProductivity('/activity?pageSize=5')
  const [page, setPage] = useState(1)
  const ledger = useProductivity(`/progress/ledger?page=${page}`)
  return <div className={styles.stack}><PageHeader eyebrow="Effort, made visible" title="Progress" description="A little evidence of the work you put in." action={<Link to="/rewards">Your rewards →</Link>} />
    <ProgressSummary />
    {query.data && <dl className={progressStyles.facts}><div><dt>Tasks completed</dt><dd>{query.data.tasksCompleted}</dd></div><div><dt>Habit completions</dt><dd>{query.data.habitCompletions}</dd></div><div><dt>Recorded focus minutes</dt><dd>{Math.floor(query.data.focusSeconds / 60)}</dd></div></dl>}
    <div className={styles.split}><section aria-label="Recent activity"><div className={styles.sectionHeading}><h2>Recently done</h2><Link to="/activity">All activity →</Link></div><QueryFeedback query={recent} /><ActivityList data={recent.data} /></section>
      <section className={styles.section}><h2 className={styles.sectionTitle}>Progress with intention</h2><p>XP recognises completion. It is never spent, and time alone does not earn points.</p><p>Tiny 10 · Small 25 · Medium 50 · Large 100 · Epic 200 XP.</p><p className={styles.meta}>Tiny and Small tasks share a 50 XP daily cap. Habits share 75 XP per scheduled local day. Reopening reverses the exact award; completing again creates a new cycle.</p><p className={styles.meta}>Level 1 starts at 0 XP. The next level needs 500 XP, then each transition needs 100 more. Bronze 1–9 · Silver 10–19 · Gold 20–29 · Platinum 30–39 · Diamond 40–49 · Apex 50+. Rules v1.</p></section></div>
    <details className={styles.section}><summary>XP ledger · awards and corrections</summary><QueryFeedback query={ledger} />
      {ledger.data?.total === 0 && <p>No XP entries yet. Start with one useful action.</p>}
      <ul className={styles.list}>{ledger.data?.items.map(entry => <li className={styles.row} key={entry.id}><div><strong>{entry.amountSigned > 0 ? '+' : ''}{entry.amountSigned} XP · {entry.kind}</strong><p className={styles.meta}>{entry.sourceKind === 'TaskCompletion' ? 'Task completion' : 'Habit completion'} · {entry.localDate} · rules v{entry.ruleVersion}</p></div></li>)}</ul><Pagination data={ledger.data} setPage={setPage} />
    </details>
  </div>
}
