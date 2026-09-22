import { useEffect, useMemo, useRef, useState } from 'react'
import { useLanguage } from '../settings/language.js'
import { useProductivity, useProductivityAction } from '../../shared/api/productivity.js'
import { Button } from '../../shared/ui/Button.jsx'
import { Input } from '../../shared/ui/Input.jsx'
import { Dialog } from '../../shared/ui/Dialog.jsx'
import { Icon } from '../../shared/ui/Icon.jsx'
import { QueryFeedback, ActionFeedback } from '../../shared/ui/ProductivityFeedback.jsx'
import { useTimeHub } from './TimeHubContext.js'
import { worldTime } from './timeTools.js'
import { WorldMap } from './WorldMap.jsx'
import { cityAliases } from './worldLocations.js'
import styles from './FocusPage.module.css'

export function WorldClock() {
  const { t, locale } = useLanguage(), { now, preferences, preferencesQuery } = useTimeHub()
  const query = useProductivity('/world-clock'), action = useProductivityAction()
  const initialization = useProductivityAction(), attempted = useRef(false)
  const { mutate: initialize } = initialization
  useEffect(() => {
    if (preferencesQuery.isSuccess && !preferences.worldClockInitialized && !attempted.current) {
      attempted.current = true; initialize({ path: '/world-clock/initialize', body: {} })
    }
  }, [preferencesQuery.isSuccess, preferences.worldClockInitialized, initialize])
  const [open, setOpen] = useState(false), [search, setSearch] = useState('')
  const localZone = Intl.DateTimeFormat().resolvedOptions().timeZone
  const catalogue = useMemo(() => [...(Intl.supportedValuesOf?.('timeZone') || ['Europe/London', 'Europe/Budapest', 'America/New_York', 'Asia/Tokyo', 'Australia/Sydney']).map(zone => [zone.split('/').at(-1).replaceAll('_', ' '), zone]), ...cityAliases.map(city => city.slice(0, 2))]
    .filter(([name, zone], index, list) => list.findIndex(x => x[0] === name && x[1] === zone) === index).sort((a, b) => a[0].localeCompare(b[0])), [])
  const matches = catalogue.filter(city => city.join(' ').toLocaleLowerCase().includes(search.toLocaleLowerCase())).slice(0, 40)
  const move = (index, delta) => { const ids = query.data.map(city => city.id); [ids[index], ids[index + delta]] = [ids[index + delta], ids[index]]; action.mutate({ path: '/world-clock/order', method: 'PUT', body: { ids } }) }
  const cities = [{ id: 'local', name: t('Local time'), timeZoneId: localZone }, ...(query.data || [])]
  return <section className={styles.modePanel} aria-label={t('World Clock')}>
    <div className={styles.worldHeading}><p className={styles.hint}>{t('A little closer, wherever you are.')}</p><Button variant="secondary" onClick={() => setOpen(true)}>{t('Add a city')}</Button></div>
    <QueryFeedback query={query} />{action.isError && <ActionFeedback action={action} />}{initialization.isError && <ActionFeedback action={initialization} />}
    {initialization.isError && <Button variant="quiet" onClick={() => initialize({ path: '/world-clock/initialize', body: {} })}>{t('Retry')}</Button>}
    <WorldMap cities={cities} />
    <ul className={styles.cities} tabIndex={0} aria-label={t('World Clock')}>{cities.map((city, index) => {
      let time
      try { time = worldTime(city.timeZoneId, now, locale, localZone) } catch { time = { time: '—', date: t('Time zone unavailable'), difference: '' } }
      return <li key={city.id} data-local={index === 0}><div><h2>{city.name}</h2><p>{time.date}{index > 0 && ` · ${time.difference}`}</p></div><strong>{time.time}</strong>
        {index > 0 && <div className={styles.cityActions}><Button variant="quiet" size="small" disabled={index === 1 || action.isPending} aria-label={`${t('Move earlier')}: ${city.name}`} onClick={() => move(index - 1, -1)}><Icon name="back" size={16} /></Button><Button variant="quiet" size="small" disabled={index === cities.length - 1 || action.isPending} aria-label={`${t('Move later')}: ${city.name}`} onClick={() => move(index - 1, 1)}><Icon name="arrow" size={16} /></Button><Button variant="quiet" size="small" disabled={action.isPending} aria-label={`${t('Remove')}: ${city.name}`} onClick={() => action.mutate({ path: '/world-clock/' + city.id, method: 'DELETE' })}><Icon name="close" size={16} /></Button></div>}
      </li>
    })}</ul>
    <Dialog open={open} onClose={() => setOpen(false)} title={t('Add a city')} placement="sheet"><Input label={t('Search cities')} value={search} onChange={e => setSearch(e.target.value)} />
      <p className={styles.hint}>{t('Search major cities and time zones.')}</p><ul className={styles.citySearch}>{matches.map(([name, timeZoneId]) => <li key={name + timeZoneId}><Button variant="quiet" disabled={action.isPending || query.data?.some(city => city.name === name && city.timeZoneId === timeZoneId)} onClick={() => action.mutate({ path: '/world-clock', body: { name, timeZoneId } }, { onSuccess: () => setOpen(false) })}>{name}<small>{timeZoneId.replaceAll('_', ' ')}</small></Button></li>)}</ul>
      {!matches.length && <p>{t('No cities match. Try a nearby major city or time zone.')}</p>}<ActionFeedback action={action} />
    </Dialog>
  </section>
}
