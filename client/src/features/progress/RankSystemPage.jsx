import { Link } from 'react-router'
import { useLanguage } from '../settings/language.js'
import { useProductivity } from '../../shared/api/productivity.js'
import { PageHeader } from '../../shared/ui/PageHeader.jsx'
import { QueryFeedback } from '../../shared/ui/ProductivityFeedback.jsx'
import { RankBadge } from './RankBadge.jsx'
import { rankLabel, rankStyle } from './rankDisplay.js'
import styles from './ProgressPage.module.css'

export function RankSystemPage() {
  const { t } = useLanguage()
  const catalog = useProductivity('/progress/ranks')
  const progress = useProductivity('/progress')
  const current = progress.data?.progress.rankInfo
  return <div className={styles.page}>
    <Link to="/progress">{t('Back to Progress')}</Link>
    <PageHeader editorial title={t('Rank System')} description={t('Your progression through LIFEMAXING')} />
    <p className={styles.rankExplanation}>{t('rankExplanation')}</p>
    <ol className={styles.progressionSteps}><li>{t('Complete work')} <span>→</span></li><li>XP <span>→</span></li><li>{t('Level')} <span>→</span></li><li>{t('Rank & Division')}</li></ol>
    <p>{t('divisionExplanation')}</p>
    <QueryFeedback query={catalog} /><QueryFeedback query={progress} />
    <ol className={styles.rankGrid}>{catalog.data?.map(rank => {
      const state = !current ? null : rank.order === current.order ? 'Current' : rank.order < current.order ? 'Completed' : 'Locked'
      return <li key={rank.name} className={styles.rankCard} data-state={state} style={rankStyle(rank)} aria-current={state === 'Current' ? 'step' : undefined}>
        <div className={styles.rankCardHeading}><h2>{t(rank.name)}</h2>{state && <span>{t(state)}</span>}</div>
        <RankBadge rank={rank} />
        <p>{rank.maximumLevel == null ? t('levelsAbove', { level: rank.minimumLevel }) : t('levelsRange', { min: rank.minimumLevel, max: rank.maximumLevel })}</p>
        <ol className={styles.divisions}>{rank.divisions.map(division => <li key={division.name} aria-current={state === 'Current' && current.division === division.name ? 'step' : undefined}>
          <strong>{division.name}</strong><span>{division.maximumLevel == null ? `${division.minimumLevel}+` : `${division.minimumLevel}–${division.maximumLevel}`}</span>
        </li>)}</ol>
        {state === 'Current' && <p className={styles.currentLabel}>{t('Current')} · {rankLabel(current, t)}</p>}
      </li>
    })}</ol>
  </div>
}
