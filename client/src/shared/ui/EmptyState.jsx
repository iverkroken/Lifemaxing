import { Icon } from './Icon.jsx'
import styles from './Productivity.module.css'

export function EmptyState({ title, children, icon = 'leaf', action, className = '' }) {
  return <div className={`${styles.empty} ${className}`}>
    <span className={styles.emptyIcon}><Icon name={icon} size={24} /></span>
    <h3>{title}</h3><p>{children}</p>{action}
  </div>
}
