import { useQuery } from '@tanstack/react-query'
import { Link, NavLink, Outlet, useOutletContext, useParams } from 'react-router'
import { useLanguage } from '../settings/language.js'
import { getAreas } from './areasApi.js'
import { artwork, descriptions } from './areaPresentation.js'
import { AreaArtwork } from './AreaArtwork.jsx'
import { QueryFeedback } from '../../shared/ui/ProductivityFeedback.jsx'
import { useProductivity } from '../../shared/api/productivity.js'
import { Button } from '../../shared/ui/Button.jsx'
import { Icon } from '../../shared/ui/Icon.jsx'
import styles from './AreaDetail.module.css'

export function AreaLayout() {
  const context = useOutletContext()
  const { areaKey } = useParams()
  const { t, areaName } = useLanguage()
  const areas = useQuery({ queryKey: ['areas', context.user.id], queryFn: ({ signal }) => getAreas(signal) })
  const area = areas.data?.find(value => value.key === areaKey)
  if (!areas.isSuccess) return <div><Link to="/areas">{t('areaBack')}</Link><QueryFeedback query={areas} /></div>
  if (!area) return <section><h1>{t('areaNotFound')}</h1><p>{t('areaNotFoundHint')}</p><Link to="/areas">{t('areaBack')}</Link></section>
  const base = `/areas/${encodeURIComponent(area.key)}`
  const image = area.customImageUrl ? { src: area.customImageUrl, position: `${area.imageFocalX}% ${area.imageFocalY}%` } : artwork[area.key]
  const openCapture = options => context.openCapture({ ...options, lifeAreaId: area.id })
  return <div className={styles.page}>
    <Link className={styles.back} to="/areas"><Icon name="back" />{t('areaBack')}</Link>
    <header className={styles.header}>
      <div><h1>{areaName(area)}</h1><p>{t(descriptions[area.key] || 'A meaningful part of your life.')}</p>
        {!area.isActive && <span className={styles.inactive}>{t('Inactive')}</span>}
      </div>
      <div className={styles.artwork} aria-hidden="true">{image
        ? <img src={image.src} style={{ objectPosition: image.position }} alt="" /> : <AreaArtwork areaKey={area.key} />}</div>
    </header>
    <nav className={styles.tabs} aria-label={t('areaNavigation')}>
      <NavLink end to={base}>{t('areaOverview')}</NavLink>
      {['tasks', 'goals', 'habits'].map(kind => <NavLink key={kind} to={`${base}/${kind}`}>{t(kind)}</NavLink>)}
      {area.key === 'finance' && <NavLink to={`${base}/subscriptions`}>{t('subscriptionTitle')}</NavLink>}
    </nav>
    <Outlet key={area.id} context={{ ...context, area, openCapture }} />
  </div>
}

export function AreaOverview() {
  const { area, openCapture } = useOutletContext()
  const { t } = useLanguage()
  const query = useProductivity('/areas/counts')
  const counts = query.data?.find(value => value.id === area.id)
  const base = `/areas/${encodeURIComponent(area.key)}`
  return <div className={styles.overview}>
    <section aria-label={t('areaOverview')}>
      <h2>{t('areaNextAction')}</h2>
      <p className={styles.hint}>{t('areaOverviewHint')}</p>
      <div className={styles.actions}>
        <Button onClick={() => openCapture({ kind: 'task', date: null })}>{t('Capture a task')}</Button>
        <Button variant="secondary" onClick={() => openCapture({ kind: 'goal' })}>{t('New goal')}</Button>
        <Button variant="secondary" onClick={() => openCapture({ kind: 'habit' })}>{t('New habit')}</Button>
      </div>
      <QueryFeedback query={query} />
      <ul className={styles.destinations}>{['tasks', 'goals', 'habits'].map(kind => <li key={kind}>
        <Link to={`${base}/${kind}`}><span><strong>{t(kind)}</strong><span>{t(`areaSummary_${kind}`)}</span></span>
          <span className={styles.count}>{counts?.[kind] ?? '—'}</span><Icon name="arrow" />
        </Link>
      </li>)}</ul>
    </section>
    {area.key === 'finance' && <section className={styles.finance}>
      <h2>{t('subscriptionTitle')}</h2><p>{t('areaFinanceHint')}</p>
      <Link to={`${base}/subscriptions`}>{t('areaOpenSubscriptions')} <Icon name="arrow" /></Link>
    </section>}
  </div>
}
