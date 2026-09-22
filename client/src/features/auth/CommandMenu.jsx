import { useId, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useMatch, useNavigate, useOutletContext, useSearchParams } from 'react-router'
import { Dialog } from '../../shared/ui/Dialog.jsx'
import { Input } from '../../shared/ui/Input.jsx'
import { Icon } from '../../shared/ui/Icon.jsx'
import { Button } from '../../shared/ui/Button.jsx'
import { useLanguage } from '../settings/language.js'
import { useRecordSearch } from '../search/searchApi.js'
import { getAreas } from '../areas/areasApi.js'
import styles from './AuthenticatedShell.module.css'
import searchStyles from '../search/Search.module.css'

export function CommandMenu({ open, onClose, ...props }) {
  const { t } = useLanguage()
  return <Dialog open={open} onClose={onClose} title={t('Search')}>
    {open && <Commands {...props} onClose={onClose} />}
  </Dialog>
}

function Commands({ onClose, destinations, openCapture, session }) {
  const { t, language } = useLanguage()
  const { user } = useOutletContext()
  const [params] = useSearchParams()
  const areaRoute = useMatch('/areas/:areaKey/*')
  const areas = useQuery({ queryKey: ['areas', user.id], queryFn: ({ signal }) => getAreas(signal), enabled: Boolean(areaRoute && user.id) })
  const areaId = areaRoute ? areas.data?.find(area => area.key === areaRoute.params.areaKey)?.id : params.get('areaId')
  const [search, setSearch] = useState('')
  const listRef = useRef(null)
  const hintId = useId()
  const navigate = useNavigate()
  const records = useRecordSearch(user.id, search, areaId)
  const query = search.trim().toLocaleLowerCase(language)
  const actions = [
    ...destinations.map(([path]) => ({ key: path, name: t(path), icon: path, run: () => navigate('/' + path) })),
    { key: 'rank-system', name: t('Rank System'), icon: 'progress', run: () => navigate('/progress/ranks') },
    { key: 'finance-subscriptions', name: `${t('area_finance')} · ${t('subscriptionTitle')}`, icon: 'areas', run: () => navigate('/subscriptions') },
    { key: 'recently-deleted', name: t('Recently Deleted'), icon: 'inbox', run: () => navigate('/settings/recently-deleted') },
    ...(session ? [{ key: 'continue', name: t('continueFocus'), icon: 'focus', run: () => navigate('/focus') }] : []),
    ...['task', 'habit', 'goal'].map(kind => ({ key: 'create-' + kind, name: t('create_' + kind), icon: 'plus', run: () => openCapture({ kind }) })),
  ].map(action => {
    const name = action.name.trim().toLocaleLowerCase(language)
    return { ...action, rank: !query || name === query ? 0 : name.startsWith(query) ? 1 : name.includes(query) ? 2 : 3 }
  }).filter(action => action.rank < 3).sort((left, right) => left.rank - right.rank)
  const matches = records.items.map(item => ({ key: item.kind + item.id, name: item.title,
    icon: item.kind === 'area' ? 'areas' : item.kind + 's',
    detail: t('searchKind_' + item.kind) + (item.isActive ? '' : ` · ${t('Inactive')}`), run: () => navigate(item.path) }))
  const choose = action => { onClose(); action.run() }
  const first = actions[0] || matches[0]
  const rows = values => values.map(action => <li key={action.key}><button data-command onClick={() => choose(action)}>
    <Icon name={action.icon} /><div className={searchStyles.resultText}>{action.name}{action.detail && <small>{action.detail}</small>}</div><span aria-hidden="true">↵</span>
  </button></li>)
  return <>
    <Input label={t('Search your workspace')} maxLength={100} value={search} aria-describedby={hintId} autoComplete="off"
      onChange={event => setSearch(event.target.value)} onKeyDown={event => {
        if (event.nativeEvent.isComposing) return
        if (event.key === 'Enter' && first) { event.preventDefault(); choose(first) }
        if (['ArrowDown', 'ArrowUp'].includes(event.key)) {
          event.preventDefault()
          const buttons = listRef.current.querySelectorAll('[data-command]')
          buttons[event.key === 'ArrowDown' ? 0 : buttons.length - 1]?.focus()
        }
      }} />
    <p id={hintId} className={styles.commandHint}>{t('Use arrows or Tab to browse, Enter to open and Escape to close.')}</p>
    <div ref={listRef} className={searchStyles.results} onKeyDown={event => {
      if (!['ArrowDown', 'ArrowUp'].includes(event.key)) return
      const buttons = [...event.currentTarget.querySelectorAll('[data-command]')]
      const index = buttons.indexOf(document.activeElement)
      if (index >= 0) { event.preventDefault(); buttons[(index + (event.key === 'ArrowDown' ? 1 : buttons.length - 1)) % buttons.length]?.focus() }
    }}>
      {actions.length > 0 && <ul aria-label={t('Pages and actions')} className={styles.commandList}>{rows(actions)}</ul>}
      <h3 className={searchStyles.groupTitle}>{search.trim() ? t('Matching records') : t('Recent and relevant')}</h3>
      {matches.length > 0 && <ul aria-label={t('Matching records')} className={styles.commandList}>{rows(matches)}</ul>}
      {(records.waiting || records.isFetching) && <p role="status" className={styles.commandHint}>{t('Searching…')}</p>}
      {!records.waiting && records.isError && <div role="alert"><p>{t('Search could not load. Your pages and actions are still available.')}</p><Button variant="quiet" onClick={() => records.refetch()}>{t('retry')}</Button></div>}
      {!records.waiting && records.isSuccess && !records.isFetching && !matches.length && <p role="status" className={styles.commandHint}>{search.trim() ? t('No matching records. Try another word.') : t('Your tasks, goals, habits and Life Areas will appear here.')}</p>}
    </div>
  </>
}
