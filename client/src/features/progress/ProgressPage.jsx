import { useState } from 'react'
import { Link } from 'react-router'
import { useProductivity } from '../../shared/api/productivity.js'
import { PageHeader } from '../../shared/ui/PageHeader.jsx'
import { QueryFeedback, Pagination } from '../../shared/ui/ProductivityFeedback.jsx'
import { EmptyState } from '../../shared/ui/EmptyState.jsx'
import { Select } from '../../shared/ui/Select.jsx'
import styles from '../../shared/ui/Productivity.module.css'
import progressStyles from './ProgressPage.module.css'
import { RankBadge } from './RankBadge.jsx'
import { Icon } from '../../shared/ui/Icon.jsx'
import { useLanguage } from '../settings/language.js'

export function ProgressSummary({ compact = false }) {
  const { t, number } = useLanguage()
  const query = useProductivity('/progress')
  const data = query.data?.progress
  return <section aria-label={t("Your progression")} className={compact ? progressStyles.compact : progressStyles.summary}>
    <QueryFeedback query={query} />
    {data && <>{!compact && <RankBadge rank={data.rank} />}<div className={progressStyles.levelHeading}><h2>{t('levelNumber', { level: data.level })} <span>{t(data.rank)}</span></h2><Link to="/progress">{number(data.totalXp)} XP</Link></div>
      <progress className={progressStyles.meter} value={data.xpIntoLevel} max={data.xpForNextLevel} aria-label={t("Progress to next level")} />
      <p className={styles.meta}>{t('xpToward', { current: data.xpIntoLevel, total: data.xpForNextLevel, level: data.level + 1 })}</p></>}
  </section>
}

export function ActivityList({ data }) {
  const { t, locale, timeZone = 'UTC', language } = useLanguage()
  const groups = Object.groupBy(data?.items || [], event => new Intl.DateTimeFormat('sv-SE', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(event.occurredAtUtc)))
  return data?.items.length ? <div className={progressStyles.activity}>{Object.entries(groups).map(([date, events]) => <section key={date}>
    <h3>{new Intl.DateTimeFormat(locale, { dateStyle: 'full', timeZone: 'UTC' }).format(new Date(date + 'T12:00:00Z'))}</h3>
    <ol className={progressStyles.timeline}>{events.map(event => <li key={event.id} data-kind={event.kind}>
      <div className={progressStyles.eventHeading}><Icon name={event.subjectKind === 'Task' ? 'tasks' : event.subjectKind === 'Habit' ? 'habits' : event.subjectKind === 'Goal' ? 'goals' : 'activity'} /><strong>{t('event_' + event.kind)}</strong>
        <time dateTime={event.occurredAtUtc}>{new Intl.DateTimeFormat(locale, { timeStyle: 'short', timeZone }).format(new Date(event.occurredAtUtc))}</time>
      </div>
      {language === 'en' ? <p>{event.summary}</p> : <details><summary>{t('originalRecord')}</summary><p lang="en">{event.summary}</p></details>}
    </li>)}</ol>
  </section>)}</div> : data && <EmptyState title={t("Your actions leave a record")}>{t("Completed work, corrections, focus and claimed rewards will appear here.")}</EmptyState>
}

export function ActivityPage() {
  const { t } = useLanguage()
  const [page, setPage] = useState(1)
  const [kind, setKind] = useState('')
  const query = useProductivity(`/activity?page=${page}&kind=${kind}`)
  return <div className={`${styles.stack} ${progressStyles.activityPage}`}><PageHeader title={t("Activity")} description={t("What you did, and the corrections along the way.")} />
    <Select label={t("Activity type")} value={kind} onChange={e => { setKind(e.target.value); setPage(1) }}><option value="">{t("All activity")}</option>
      {[['TaskCompleted', 'Tasks completed'], ['TaskReopened', 'Tasks reopened'], ['HabitCompleted', 'Habits completed'], ['HabitReversed', 'Habit corrections'], ['GoalProgressRecorded', 'Goal progress'], ['GoalCompleted', 'Goals completed'], ['LevelReached', 'Levels reached'], ['RewardClaimed', 'Rewards claimed'], ['FocusCompleted', 'Focus completed'], ['FocusStopped', 'Focus stopped'], ['FocusCancelled', 'Focus cancelled'], ['MissionChanged', 'Mission changes']].map(([value]) => <option key={value} value={value}>{t('event_' + value)}</option>)}
    </Select><QueryFeedback query={query} /><section aria-label={t("Activity history")}><ActivityList data={query.data} /></section><Pagination data={query.data} setPage={setPage} /></div>
}

export function ProgressPage() {
  const { t, date: formatDate, number } = useLanguage()
  const query = useProductivity('/progress')
  const recent = useProductivity('/activity?pageSize=5')
  const [page, setPage] = useState(1)
  const ledger = useProductivity(`/progress/ledger?page=${page}`)
  return <div className={`${styles.stack} ${progressStyles.page}`}><PageHeader editorial title={t("Progress")} description={t("Your earned XP, completed work and recorded focus, with the history behind them.")} action={<Link to="/rewards">{t("Your rewards →")}</Link>} />
    <div className={progressStyles.feature}>
      <div className={progressStyles.featureCopy}><ProgressSummary /></div>
      <div className={progressStyles.artwork}><img src="/images/Muhammed%20ali.png" alt="" decoding="async" /></div>
    </div>
    {query.data && <dl className={progressStyles.facts}><div><dt>{t("Tasks completed · lifetime")}</dt><dd>{number(query.data.tasksCompleted)}</dd></div><div><dt>{t("Habit completions · lifetime")}</dt><dd>{number(query.data.habitCompletions)}</dd></div><div><dt>{t("Focus minutes · lifetime")}</dt><dd>{number(Math.floor(query.data.focusSeconds / 60))}</dd></div></dl>}
    <div className={progressStyles.recordLayout}><section aria-label={t("Recent activity")}><div className={styles.sectionHeading}><h2>{t("Recently done")}</h2><Link to="/activity">{t("All activity →")}</Link></div><QueryFeedback query={recent} /><ActivityList data={recent.data} /></section>
      <details className={`${styles.section} ${progressStyles.rules}`}><summary>{t("How does this work?")}</summary><h2 className={styles.sectionTitle}>{t("Progress with intention")}</h2><p>{t("XP recognises completion. It is never spent, and time alone does not earn points.")}</p><p>{t("Tiny 10 · Small 25 · Medium 50 · Large 100 · Epic 200 XP.")}</p><p className={styles.meta}>{t("Tiny and Small tasks share a 50 XP daily cap. Habits share 75 XP per scheduled local day. Reopening reverses the exact award; completing again creates a new cycle.")}</p><p className={styles.meta}>{t("Level 1 starts at 0 XP. The next level needs 500 XP, then each transition needs 100 more. Bronze 1–9 · Silver 10–19 · Gold 20–29 · Platinum 30–39 · Diamond 40–49 · Apex 50+. Rules v1.")}</p></details></div>
    <details className={styles.section}><summary>{t("XP ledger · awards and corrections")}</summary><QueryFeedback query={ledger} />
      {ledger.data?.total === 0 && <p>{t("No XP entries yet. Start with one useful action.")}</p>}
      <ul className={styles.list}>{ledger.data?.items.map(entry => <li className={styles.row} key={entry.id}><div><strong>{t('ledgerEntry', { amount: (entry.amountSigned > 0 ? '+' : '') + number(entry.amountSigned), kind: t(entry.kind) })}</strong><p className={styles.meta}>{t('ledgerContext', { kind: entry.sourceKind === 'TaskCompletion' ? t("Task completion") : t("Habit completion"), date: formatDate(entry.localDate), version: entry.ruleVersion })}</p></div></li>)}</ul><Pagination data={ledger.data} setPage={setPage} />
    </details>
  </div>
}
