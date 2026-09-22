import { useLanguage } from '../settings/language.js'
import { Link } from 'react-router'
import { Icon } from '../../shared/ui/Icon.jsx'
import { HeroArtwork } from '../../shared/ui/HeroArtwork.jsx'
import styles from './TodayPage.module.css'

export function TodayHero({ data }) {
  const { t, date } = useLanguage()
  const tasks = data?.tasks.filter(task => !task.archivedAtUtc)
  const mission = tasks?.find(task => task.id === data?.mission?.taskId && !task.isCompleted)

  return <section className={styles.hero} aria-labelledby="today-title" data-app-hero data-hero-theme="dark">
    <HeroArtwork src="/images/Background%20upgrade.png" width={1672} height={941} />
    <div className={styles.heroContent}>
      <span className={styles.headerBoundary} data-hero-boundary aria-hidden="true" />
      <h1 id="today-title">{t('Today')}</h1>
      {data && <p className={styles.heroDate}>{date(data.currentLocalDate || data.localDate, { dateStyle: undefined, weekday: 'long', day: 'numeric', month: 'long' })}</p>}
      <div className={styles.heroProgress}>
        {tasks?.length > 0 && <p>{t('dayStatus', { done: tasks.filter(task => task.isCompleted).length, total: tasks.length })}</p>}
        {data?.habits.length > 0 && <p>{t('Habits')} · {t('doneCount', { done: data.habits.filter(habit => habit.activeLogId || habit.targetReached).length, total: data.habits.length })}</p>}
      </div>
      {mission && <div className={styles.heroMission}><p>{t('Daily priority')}</p><p className={styles.heroPriority}>{mission.title}</p></div>}
      <div className={styles.heroActions}>
        <a className={styles.heroLink} href="#daily-workspace">{t('Open your day')}<Icon name="arrow" className={styles.downArrow} /></a>
        {mission && <Link className={styles.heroLink} to={`/focus?taskId=${mission.id}`}><Icon name="focus" />{t('Start focus')}</Link>}
      </div>
    </div>
  </section>
}
