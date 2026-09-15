import { BrandMark } from '../../shared/ui/BrandMark.jsx'
import styles from './ThemePreview.module.css'

// Illustration only; AppearanceSettings owns the real preference controls.
export function ThemePreview({ theme }) {
  return <span className={styles.preview} data-theme-preview={theme} aria-hidden="true">
    <span className={styles.topnav}><BrandMark size={12} color="currentColor" /><i /><i /><i /></span>
    <span className={styles.page}><b /><i />
      <span className={styles.mission}><i /><BrandMark size={26} color="currentColor" /></span>
      <i /><i />
    </span>
  </span>
}
