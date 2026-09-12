import styles from './Button.module.css'

export function Button({ children, variant = 'primary', size = 'regular', loading = false, disabled = false, className = '', type = 'button', ...props }) {
  return <button {...props} type={type} disabled={disabled || loading} aria-busy={loading}
    className={`${styles.button} ${styles[variant]} ${styles[size]} ${className}`}>{children}</button>
}
