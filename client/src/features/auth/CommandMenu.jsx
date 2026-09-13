import { useState } from 'react'
import { useNavigate } from 'react-router'
import { Dialog } from '../../shared/ui/Dialog.jsx'
import { Input } from '../../shared/ui/Input.jsx'
import { Icon } from '../../shared/ui/Icon.jsx'
import { useLanguage } from '../settings/language.js'
import styles from './AuthenticatedShell.module.css'

export function CommandMenu({ open, onClose, destinations, openCapture, session }) {
  const { t } = useLanguage()
  const [search, setSearch] = useState('')
  const navigate = useNavigate()
  const actions = [
    ...['task', 'habit', 'goal'].map(kind => ({ name: t('create_' + kind), icon: 'plus', run: () => openCapture({ kind, date: null }) })),
    ...(session ? [{ name: t('continueFocus'), icon: 'focus', run: () => navigate('/focus') }] : []),
    ...destinations.map(([path]) => ({ name: t(path), icon: path, run: () => navigate('/' + path) })),
  ].filter(action => action.name.toLocaleLowerCase().includes(search.toLocaleLowerCase()))
  const choose = action => { onClose(); setSearch(''); action.run() }
  return <Dialog open={open} onClose={() => { setSearch(''); onClose() }} title={t('commandMenu')}>
    <Input label={t('findAction')} value={search} onChange={event => setSearch(event.target.value)}
      onKeyDown={event => { if (event.key === 'Enter' && !event.nativeEvent.isComposing && actions[0]) { event.preventDefault(); choose(actions[0]) } }} />
    <p className={styles.commandHint}>{t('commandHint')}</p>
    <ul className={styles.commandList} onKeyDown={event => {
      if (!['ArrowDown', 'ArrowUp'].includes(event.key)) return
      const buttons = [...event.currentTarget.querySelectorAll('button')]
      const index = buttons.indexOf(document.activeElement)
      if (index >= 0) { event.preventDefault(); buttons[(index + (event.key === 'ArrowDown' ? 1 : buttons.length - 1)) % buttons.length]?.focus() }
    }}>{actions.map(action => <li key={action.name}><button onClick={() => choose(action)}><Icon name={action.icon} />{action.name}<span aria-hidden="true">↵</span></button></li>)}</ul>
    {!actions.length && <p role="status">{t('noActions')}</p>}
  </Dialog>
}
