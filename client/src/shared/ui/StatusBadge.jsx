import styles from './StatusBadge.module.css'

export function StatusBadge({ tone = 'neutral', children }) {
  return <span className={styles.badge} data-tone={tone}>{children}</span>
}
