import { useId } from 'react'
import styles from './Input.module.css'

export function Select({ label, children, hint, error, id, ...props }) {
  const generatedId = useId()
  const selectId = id || generatedId
  return <div className={styles.field}>
    <label htmlFor={selectId}>{label}</label>
    {hint && <p id={`${selectId}-hint`} className={styles.hint}>{hint}</p>}
    <select {...props} id={selectId} className={styles.input} aria-invalid={Boolean(error)}
      aria-describedby={[hint && `${selectId}-hint`, error && `${selectId}-error`].filter(Boolean).join(' ') || undefined}>{children}</select>
    {error && <p id={`${selectId}-error`} className={styles.error}>{error}</p>}
  </div>
}
