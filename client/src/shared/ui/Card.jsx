import styles from './Card.module.css'

export function Card({ children, variant = 'base', className = '', ...props }) {
  return <section {...props} className={`${styles.card} ${styles[variant]} ${className}`}>{children}</section>
}
