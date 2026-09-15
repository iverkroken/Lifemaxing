import { useLanguage } from '../../features/settings/language.js'
import { Icon } from './Icon.jsx'
import styles from './AreaLabel.module.css'

export function AreaLabel({ area }) {
  const { areaName } = useLanguage()
  if (!area) return null
  return <span className={styles.label} data-area={area.key}><Icon name={area.key} size={16} /><span>{areaName(area)}</span></span>
}
