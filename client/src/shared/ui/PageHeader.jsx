import styles from './PageHeader.module.css'

export function PageHeader({ eyebrow, title, description, action, editorial = false }) {
  return <header className={`${styles.header} ${editorial ? styles.editorial : ''}`}>
    <div>
      {eyebrow && <p className={styles.eyebrow}>{eyebrow}</p>}
      <h1>{title}</h1>
      {description && <p className={styles.description}>{description}</p>}
    </div>
    {action && <div>{action}</div>}
  </header>
}
