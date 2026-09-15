import { useState } from 'react'
import { Link } from 'react-router'
import { useProductivity } from '../../shared/api/productivity.js'
import { Input } from '../../shared/ui/Input.jsx'
import { Icon } from '../../shared/ui/Icon.jsx'
import { QueryFeedback, Pagination } from '../../shared/ui/ProductivityFeedback.jsx'
import { useLanguage } from '../settings/language.js'
import styles from './HabitWeek.module.css'

const states = ['completed', 'corrected', 'planned', 'notPlanned', 'flexible', 'future']
function WeekMark({ state }) {
  const icon = { completed: 'check', corrected: 'back', flexible: 'habits' }[state]
  return icon ? <Icon name={icon} size={18} /> : <span className={styles.stateShape} data-state={state} />
}
export function HabitWeek({ areaId }) {
  const { t, language } = useLanguage()
  const [date, setDate] = useState('')
  const [page, setPage] = useState(1)
  const query = useProductivity(`/habits/week?page=${page}&${date ? `date=${date}&` : ''}${areaId ? `areaId=${areaId}` : ''}`)
  const format = (value, options) => new Intl.DateTimeFormat(language, { ...options, timeZone: 'UTC' }).format(new Date(value + 'T12:00:00Z'))
  return <section className={styles.week} aria-label={t('weekTitle')}>
    <header><div><h2>{t('weekTitle')}</h2><p>{t('weekHint')}</p></div>
      <Input label={t('weekDate')} type="date" value={date || query.data?.currentLocalDate || ''} onChange={event => { setDate(event.target.value); setPage(1) }} />
    </header>
    <ul className={styles.legend} aria-label={t('weekLegend')}>{states.map(state => <li key={state}><span aria-hidden="true"><WeekMark state={state} /></span> {t('week_' + state)}</li>)}</ul>
    <QueryFeedback query={query} />
    {query.data?.items[0] && <div className={styles.weekHeader} aria-hidden="true"><span />{query.data.items[0].days.map(day => <span key={day.localDate}>{format(day.localDate, { weekday: 'short', day: 'numeric' })}</span>)}</div>}
    {query.data?.items.map(habit => {
      const weeklyTarget = habit.days.every(day => day.weeklyTarget === habit.days[0]?.weeklyTarget) ? habit.days[0]?.weeklyTarget : null
      return <article key={habit.id} className={styles.routine}>
      <div className={styles.routineHeading}><Link to={'/habits/' + habit.id}>{habit.title}</Link>
        {weeklyTarget && <span>{t("weeklyTargetCount", { count: weeklyTarget })}</span>}
        {!habit.isActive && <span>{t('Inactive')}</span>}
      </div>
      <div className={styles.days}>{habit.days.map(day => <div key={day.localDate} className={styles.day} data-state={day.state}>
        <time dateTime={day.localDate}>{format(day.localDate, { weekday: 'short' })}<br />{format(day.localDate, { day: 'numeric' })}</time>
        <span className={styles.mark} aria-hidden="true"><WeekMark state={day.state} /></span>
        <span className={styles.state}>{t('week_' + day.state)}</span>
        {!weeklyTarget && day.weeklyTarget && <small>{t("weeklyTargetCount", { count: day.weeklyTarget })}</small>}
        {day.wasCorrected && day.state === 'completed' && <small>{t('week_corrected')}</small>}
      </div>)}</div>
    </article>})}
    {query.data?.total === 0 && <p>{t('weekEmpty')}</p>}
    <Pagination data={query.data} setPage={setPage} />
  </section>
}
