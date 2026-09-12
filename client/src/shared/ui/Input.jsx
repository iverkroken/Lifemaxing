import { useId } from 'react'
import styles from './Input.module.css'

export function Input({ label, hint, error, required = false, id, className = '', 'aria-describedby': describedBy, ...props }) {
  const generatedId = useId()
  const inputId = id || generatedId
  const description = [describedBy, hint && `${inputId}-hint`, error && `${inputId}-error`].filter(Boolean).join(' ') || undefined

  return <div className={`${styles.field} ${className}`}>
    <label htmlFor={inputId}>{label}{required && <span> (required)</span>}</label>
    {hint && <p id={`${inputId}-hint`} className={styles.hint}>{hint}</p>}
    <input {...props} id={inputId} required={required} aria-invalid={Boolean(error)} aria-describedby={description} className={styles.input} />
    {error && <p id={`${inputId}-error`} className={styles.error}>{error}</p>}
  </div>
}
