import { useEffect } from 'react'
import { Link } from 'react-router'
import { BrandMark } from '../../shared/ui/BrandMark.jsx'
import { Select } from '../../shared/ui/Select.jsx'
import { languages, useLanguage } from '../settings/language.js'
import styles from './AuthLayout.module.css'

export function AuthLayout({ title, intro, children }) {
  const { t, preferences, setPublicPreferences } = useLanguage()
  useEffect(() => { document.title = `${title} · LIFEMAXING` }, [title])
  return <main className={styles.page}>
    <aside className={styles.identity} aria-label={t('workspace')}>
      <img src="/images/no%20risk%20no%20story.jpg" width="736" height="414" alt={t('No risk, no story — a playful painted portrait.')} />
      <div className={styles.copy}><h2>{t('Make room for what matters.')}</h2>
        <p>{t('A personal space to turn plans into action and preserve your progress over time.')}</p></div>
    </aside>
    <div className={styles.content}>
      <Link to="/login" className={styles.brand}><BrandMark size={20} />LIFEMAXING</Link>
      <div className={styles.surface}><h1>{title}</h1>{intro && <p className={styles.intro}>{intro}</p>}{children}</div>
      <div className={styles.preferences}>
        <Select label={t('language')} value={preferences.uiLanguage || 'en'} onChange={event => setPublicPreferences({ uiLanguage: event.target.value })}>{languages.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</Select>
        <Select label={t('theme')} value={preferences.theme || 'system'} onChange={event => setPublicPreferences({ theme: event.target.value })}>{['light', 'dark', 'system'].map(value => <option key={value} value={value}>{t(value)}</option>)}</Select>
      </div>
    </div>
  </main>
}
