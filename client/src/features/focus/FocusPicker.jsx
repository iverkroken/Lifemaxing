import { useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { useLanguage } from '../settings/language.js'
import { queryString, useProductivity } from '../../shared/api/productivity.js'
import { Button } from '../../shared/ui/Button.jsx'
import { Input } from '../../shared/ui/Input.jsx'
import { Select } from '../../shared/ui/Select.jsx'
import { AreaLabel } from '../../shared/ui/AreaLabel.jsx'
import { Pagination, QueryFeedback } from '../../shared/ui/ProductivityFeedback.jsx'
import styles from '../../shared/ui/Productivity.module.css'
import focusStyles from './FocusPage.module.css'

const types = [['tasks', 'Tasks', 'taskId'], ['goals', 'Goals', 'goalId'], ['habits', 'Habits', 'habitId']]

export function FocusEntityContext({ kind, id }) {
  const { t } = useLanguage()
  const entity = useProductivity(`/${kind}/${id}`)
  const areas = useProductivity('/areas')
  return <><QueryFeedback query={entity} />{entity.data && <>
    <h2 className={focusStyles.taskTitle}>{entity.data.title}</h2>
    <AreaLabel area={areas.data?.find(area => area.id === entity.data.lifeAreaId)} />
    {(entity.data.details || entity.data.description) && <details><summary>{t('Details')}</summary><p className={styles.note}>{entity.data.details || entity.data.description}</p></details>}
    <Link to={`/${kind}/${id}`}>{t(kind === 'goals' ? 'Record progress' : kind === 'habits' ? 'View habit' : 'Task details →')}</Link>
  </>}</>
}

export function FocusPicker({ action, onChoose, initialReference }) {
  const { t, areaName } = useLanguage()
  const [params] = useSearchParams()
  const initial = types.find(([, , key]) => initialReference?.[key] || params.get(key))
  const [kind, setKind] = useState(initial?.[0] || 'tasks')
  const [id, setId] = useState(initial ? initialReference?.[initial[2]] || params.get(initial[2]) : '')
  const [view, setView] = useState('today')
  const [search, setSearch] = useState('')
  const [areaId, setAreaId] = useState('')
  const [priority, setPriority] = useState('')
  const [page, setPage] = useState(1)
  const areas = useProductivity('/areas')
  const daily = view === 'today' && kind !== 'tasks'
  const query = useProductivity(daily ? '/today' : `/${kind}?${queryString({ page, search, areaId,
    ...(kind === 'tasks' ? { status: 'active', view: view === 'all' ? '' : view, priority } : kind === 'goals' ? { state: 'Active' } : { active: true }) })}`, { enabled: kind !== 'none' })
  const items = (daily ? kind === 'goals' ? query.data?.goals?.map(row => row.goal).filter(goal => goal.state === 'Active') : query.data?.habits : query.data?.items) || []
  const shown = daily ? items.filter(item => (!areaId || item.lifeAreaId === areaId) && item.title.toLocaleLowerCase().includes(search.toLocaleLowerCase())) : items
  const chooseKind = value => { setKind(value); setId(''); setView('today'); setPage(1); setSearch(''); setPriority('') }
  return <form className={styles.form} onSubmit={event => { event.preventDefault(); const reference = kind === 'none' ? {} : { [types.find(([type]) => type === kind)[2]]: id }; if (onChoose) onChoose(reference); else action.mutate({ path: '/focus-sessions', body: reference }) }}>
    <fieldset className={focusStyles.choice}><legend>{t('Choose your focus')}</legend>
      {types.map(([value, label]) => <label key={value}><input type="radio" name="focus-kind" value={value} checked={kind === value} onChange={() => chooseKind(value)} />{t(label)}</label>)}
    </fieldset>
    {kind !== 'none' && <>
      <div className={styles.fields}>
        <Select label={t('Show')} value={view} onChange={e => { setView(e.target.value); setPage(1) }}>
          <option value="today">{t('Today')}</option><option value="all">{t('All active')}</option>
          {kind === 'tasks' && <><option value="overdue">{t('Overdue')}</option><option value="upcoming">{t('Upcoming')}</option></>}
        </Select>
        <Select label={t('Life Area filter')} value={areaId} onChange={e => { setAreaId(e.target.value); setPage(1) }}><option value="">{t('All areas')}</option>{areas.data?.map(area => <option key={area.id} value={area.id}>{areaName(area)}</option>)}</Select>
        {kind === 'tasks' && <Select label={t('Priority')} value={priority} onChange={e => { setPriority(e.target.value); setPage(1) }}><option value="">{t('All priorities')}</option>{['High', 'Normal', 'Low'].map(value => <option key={value} value={value}>{t(value)}</option>)}</Select>}
      </div>
      <Input label={t('Find an item')} value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} />
      <QueryFeedback query={query} /><QueryFeedback query={areas} />
      {query.isSuccess && shown.length === 0 && <p>{t('No items match. Try All active or another filter.')}</p>}
      <ul className={focusStyles.pickerList}>{shown.map(item => <li key={item.id}><button type="button" aria-pressed={id === item.id} onClick={() => setId(item.id)}>
        <strong>{item.title}</strong><span><AreaLabel area={areas.data?.find(area => area.id === item.lifeAreaId)} />{item.priority && <> · {t(item.priority)}</>}</span>
      </button></li>)}</ul>
      {!daily && <Pagination data={query.data} setPage={setPage} />}
      {id && <FocusEntityContext key={`${kind}-${id}`} kind={kind} id={id} />}
    </>}
    <Button type="submit" loading={action?.isPending} disabled={kind !== 'none' && !id}>{t(onChoose ? 'Choose item' : 'Start focus')}</Button>
    <label className={styles.check}><input type="radio" name="focus-kind" checked={kind === 'none'} onChange={() => chooseKind('none')} />{t('Focus without an item')}</label>
    <p className={styles.meta}>{t('One session at a time. Pause whenever you need to. Focus minutes are recorded, but do not earn XP.')}</p>
  </form>
}
