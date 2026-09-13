import { useLanguage } from '../../features/settings/language.js'
import { useId } from 'react'
import styles from './Input.module.css'

export function Input({ label, hint, error, required = false, id, className = '', multiline = false, 'aria-describedby': describedBy, ...props }) {
  const { t } = useLanguage()
  const generatedId = useId()
  const inputId = id || generatedId
  const description = [describedBy, hint && `${inputId}-hint`, error && `${inputId}-error`].filter(Boolean).join(' ') || undefined
  const Control = multiline ? 'textarea' : 'input'

  return <div className={`${styles.field} ${className}`}>
    <label htmlFor={inputId}>{label}{required && <span> {t("(required)")}</span>}</label>
    {hint && <p id={`${inputId}-hint`} className={styles.hint}>{hint}</p>}
    <Control {...props} id={inputId} required={required} aria-invalid={Boolean(error)} aria-describedby={description} className={styles.input} />
    {error && <p id={`${inputId}-error`} className={styles.error}>{typeof error === 'string' ? error : t(props.type === 'email' ? 'field_email' : props.type === 'number' ? 'field_number' : error.type === 'too_big' ? 'field_length' : 'field_required', { min: props.min ?? '−', max: props.max ?? '∞' })}</p>}
  </div>
}
