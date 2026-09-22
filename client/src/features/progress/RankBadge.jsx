import { useLanguage } from '../settings/language.js'
import { rankStyle } from './rankDisplay.js'
import styles from './ProgressPage.module.css'

export function RankBadge({ rank, current = false }) {
  const { t } = useLanguage()
  if (!rank) return null
  return <div className={styles.rankEmblem} data-rank={rank.name} data-current={current} style={rankStyle(rank)}>
    <img src={rank.image} alt={t('rankEmblem', { rank: t(rank.name) })} width="1280" height="1280" decoding="async" loading={current ? 'eager' : 'lazy'} />
  </div>
}
