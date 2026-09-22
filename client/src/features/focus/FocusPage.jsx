import { useLanguage } from '../settings/language.js'
import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { useProductivity, useProductivityAction } from '../../shared/api/productivity.js'
import { FocusPicker, FocusEntityContext } from './FocusPicker.jsx'
import { TodayHabits } from '../habits/TodayHabits.jsx'
import { Button } from '../../shared/ui/Button.jsx'
import { ActionFeedback, QueryFeedback } from '../../shared/ui/ProductivityFeedback.jsx'
import styles from '../../shared/ui/Productivity.module.css'
import focusStyles from './FocusPage.module.css'

function formatFocusTime(seconds) {
  const value = Math.max(0, Math.floor(seconds))
  return `${String(Math.floor(value / 3600)).padStart(2, '0')}:${String(Math.floor(value / 60) % 60).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`
}
function Timer({ session }) {
  const { t } = useLanguage()
  const [extra, setExtra] = useState(0)
  useEffect(() => {
    if (session.status !== 'Running') return
    const start = performance.now()
    const timer = setInterval(() => setExtra((performance.now() - start) / 1000), 1000)
    return () => clearInterval(timer)
  }, [session.status])
  return <p className={focusStyles.timer} role="timer" aria-label={t("Active focus time")}>{formatFocusTime(session.elapsedSeconds + extra)}</p>
}
export function FocusPage() {
  const { t } = useLanguage()
  const active = useProductivity('/focus-sessions/active')
  const [, setParams] = useSearchParams()
  const action = useProductivityAction(result => { if (result.endedAtUtc) setParams({}, { replace: true }) })
  const session = active.data?.session
  const kind = session?.taskId ? 'tasks' : session?.goalId ? 'goals' : session?.habitId ? 'habits' : null
  const targetId = session?.taskId || session?.goalId || session?.habitId
  const target = useProductivity('/' + kind + '/' + targetId, { enabled: Boolean(targetId) })
  const today = useProductivity('/today', { enabled: Boolean(session?.habitId) })
  return <div className={focusStyles.page} data-focus-active={Boolean(session)} data-app-hero data-hero-theme="dark">
    <div className={focusStyles.artwork} aria-hidden="true"><img src="/images/Odessey.png" alt="" width="736" height="414" /></div>
    <div className={focusStyles.content}>
    <header className={focusStyles.header}><h1>{t("Focus")}</h1>
      {!session && <p className={focusStyles.statement}>{t('One thing at a time')}</p>}
      <p>{session ? t("Your session is saved. Pause or finish when you are ready.") : t("Choose what deserves your attention right now.")}</p>
    </header>
    <QueryFeedback query={active} />
    {session ? <section aria-label={t("Current focus")} className={focusStyles.session}>
      <p className={styles.eyebrow}>{session.status === 'Paused' ? t("Paused · time is not counting") : t("In progress")}</p>
      {kind ? <FocusEntityContext kind={kind} id={targetId} /> : <h2 className={focusStyles.taskTitle}>{t("Unstructured focus")}</h2>}
      {session.habitId && today.data?.habits.some(habit => habit.id === session.habitId) && <TodayHabits data={{ ...today.data, habits: today.data.habits.filter(habit => habit.id === session.habitId) }} action={action} />}
      <Timer key={`${session.id}-${active.dataUpdatedAt}`} session={session} />
      <div className={`${styles.actions} ${focusStyles.sessionActions}`}>
        <Button loading={action.isPending} onClick={() => action.mutate({ path: `/focus-sessions/${session.id}/${session.status === 'Paused' ? 'resume' : 'pause'}` })}>{session.status === 'Paused' ? t("Resume focus") : t("Pause focus")}</Button>
        <Button variant="secondary" loading={action.isPending} onClick={() => action.mutate({ path: `/focus-sessions/${session.id}/stop`, body: { outcome: 'Completed' } })}>{t("Finish session")}</Button>
        {session.taskId && target.data && !target.data.isCompleted && !target.data.archivedAtUtc && <Button variant="success" loading={action.isPending} onClick={() => action.mutate({ path: `/focus-sessions/${session.id}/stop`, body: { outcome: 'Completed', completeTask: true } })}>{t("Complete task & finish")}</Button>}
      </div>
      <details className={styles.section}><summary>{t("End without completing")}</summary><p className={styles.meta}>{t("Stop to keep recorded focus time, or cancel to exclude it from your focus total. The session stays in history.")}</p>
        <div className={styles.actions}><Button variant="quiet" loading={action.isPending} onClick={() => action.mutate({ path: `/focus-sessions/${session.id}/stop`, body: { outcome: 'Stopped' } })}>{t("Stop session")}</Button><Button variant="quiet" loading={action.isPending} onClick={() => action.mutate({ path: `/focus-sessions/${session.id}/stop`, body: { outcome: 'Cancelled' } })}>{t("Cancel session")}</Button></div></details>
    </section> : active.isSuccess && <section className={focusStyles.start} aria-label={t("Start a session")}><FocusPicker action={action} /></section>}
    <ActionFeedback action={action} success={session ? t("Focus updated.") : t("Session recorded.")} />
    <Link className={focusStyles.returnLink} to="/today">{t("← Return to Today")}</Link>
    </div>
  </div>
}
