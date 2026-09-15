import { Link, NavLink, useLocation } from 'react-router'
import { BrandMark } from '../../shared/ui/BrandMark.jsx'
import { Icon } from '../../shared/ui/Icon.jsx'
import { useLanguage } from '../settings/language.js'
import { navigationGroup, planDestinations, progressDestinations } from './navigation.js'
import styles from './Navigation.module.css'

export function TopNavigation({ onSearch, onMenu, menuOpen = false, session, overArtwork = false }) {
  const { t } = useLanguage()
  const { pathname } = useLocation()
  const group = navigationGroup(pathname)
  const items = [['today', 'today'], ['plan', 'tasks'], ['areas', 'areas'], ['progress', 'progress'], ['focus', 'focus']]
  return <header className={styles.header} data-artwork={overArtwork} data-focusing={pathname === '/focus' && Boolean(session)}>
    <NavLink to="/today" className={styles.brand}><BrandMark size={20} color="currentColor" />LIFEMAXING</NavLink>
    <nav className={styles.primary} aria-label={t('Main navigation')}>
      {items.map(([key, path]) => <Link key={key} to={'/' + path} aria-current={group === key ? 'true' : undefined}>
        {key === 'plan' ? t('Plan') : key === 'focus' && session ? t('continueFocus') : t(key)}
        {key === 'focus' && session && <span className={styles.session}>{t(session.status)}</span>}
      </Link>)}
    </nav>
    <div className={styles.controls}>
      <button aria-label={t('Search')} aria-haspopup="dialog" onClick={onSearch}><Icon name="search" /></button>
      <button aria-label={t('Menu')} aria-haspopup="dialog" aria-expanded={menuOpen} onClick={onMenu}><Icon name="menu" /></button>
    </div>
  </header>
}

export function SectionNavigation() {
  const { t } = useLanguage()
  const { pathname } = useLocation()
  const group = navigationGroup(pathname)
  const items = group === 'plan' ? planDestinations : group === 'progress' ? progressDestinations : []
  if (!items.length) return null
  return <nav className={styles.secondary} aria-label={t(group === 'plan' ? 'Plan navigation' : 'progress')}>
    {items.map(path => <NavLink key={path} to={'/' + path}>{t(path)}</NavLink>)}
  </nav>
}
