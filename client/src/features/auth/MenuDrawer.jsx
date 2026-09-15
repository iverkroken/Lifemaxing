import { Link, NavLink, useLocation } from 'react-router'
import { Dialog } from '../../shared/ui/Dialog.jsx'
import { Icon } from '../../shared/ui/Icon.jsx'
import { Button } from '../../shared/ui/Button.jsx'
import { useLanguage } from '../settings/language.js'
import { planDestinations, progressDestinations } from './navigation.js'
import styles from './MenuDrawer.module.css'

export function MenuDrawer({ open, onClose, onNavigate, onSearch, onSignOut, user, session }) {
  const { t } = useLanguage()
  const location = useLocation()
  const accountActive = location.pathname === '/settings' && (!new URLSearchParams(location.search).get('section') || new URLSearchParams(location.search).get('section') === 'account')
  const groups = [['today', ['today']], ['Plan', planDestinations], ['Your life', ['areas']], ['progress', progressDestinations], ['focus', ['focus']]]
  return <Dialog placement="drawer" open={open} onClose={onClose} title="LIFEMAXING">
    <button className={styles.search} onClick={onSearch}><Icon name="search" />{t('Search')}<kbd>Ctrl / ⌘ K</kbd></button>
    <nav aria-label={t('Full navigation')} className={styles.navigation}>
      {groups.map(([label, paths]) => <section key={label}>
        <h3>{t(label)}</h3>
        {paths.map(path => <NavLink key={path} to={'/' + path} onClick={onNavigate}>
          <Icon name={path} /><span>{path === 'focus' && session ? t('continueFocus') : t(path)}</span>
          {path === 'focus' && session && <small>{t(session.status)}</small>}
        </NavLink>)}
      </section>)}
      <section><h3>{t('account')}</h3>
        <Link to="/settings" aria-current={location.pathname === '/settings' && !accountActive ? 'page' : undefined} onClick={onNavigate}><Icon name="settings" />{t('settings')}</Link>
        <Link to="/settings?section=account" aria-current={accountActive ? 'page' : undefined} onClick={onNavigate}><Icon name="personal" />{t('account')}</Link>
      </section>
    </nav>
    <footer className={styles.account}><p>{user.email}</p><Button variant="dangerQuiet" onClick={onSignOut}><Icon name="signOut" />{t('signOut')}</Button></footer>
  </Dialog>
}
