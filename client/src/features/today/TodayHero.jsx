import { useLanguage } from '../settings/language.js'
import { Link } from 'react-router'
import { Icon } from '../../shared/ui/Icon.jsx'
import styles from './TodayPage.module.css'

export function TodayHero({ data }) {
  const { t, date } = useLanguage()
  const removed = new Set(data?.commitments.filter(plan => plan.removedAtUtc).map(plan => plan.taskId))
  const tasks = data?.tasks.filter(task => !task.deletedAtUtc && !removed.has(task.id))
  const mission = tasks?.find(task => task.id === data?.mission?.taskId && !task.isCompleted)

  return <section className={styles.hero} aria-labelledby="today-title" data-app-hero data-hero-theme="dark">
    <div className={styles.artwork} aria-hidden="true">
      <img src="/images/Backround.png" width="671" height="1200" alt="" fetchPriority="high" />
    </div>
    <div className={styles.heroContent}>
      <span className={styles.headerBoundary} data-hero-boundary aria-hidden="true" />
      <h1 id="today-title">{t('Today')}</h1>
      {data && <p className={styles.heroDate}>{date(data.currentLocalDate || data.localDate, { dateStyle: undefined, weekday: 'long', day: 'numeric', month: 'long' })}</p>}
      <div className={styles.heroProgress}>
        {tasks?.length > 0 && <p>{t('dayStatus', { done: tasks.filter(task => task.isCompleted).length, total: tasks.length })}</p>}
        {data?.habits.length > 0 && <p>{t('Habits')} · {t('doneCount', { done: data.habits.filter(habit => habit.activeLogId || habit.targetReached).length, total: data.habits.length })}</p>}
      </div>
      {mission && <div className={styles.heroMission}><p>{t('Daily Mission')}</p><p className={styles.heroPriority}>{mission.title}</p></div>}
      <div className={styles.heroActions}>
        <a className={styles.heroLink} href="#daily-workspace">{t('Open your day')}<Icon name="arrow" className={styles.downArrow} /></a>
        {mission && <Link className={styles.heroLink} to={`/focus?taskId=${mission.id}`}><Icon name="focus" />{t('Start focus')}</Link>}
      </div>
    </div>
  </section>
}
