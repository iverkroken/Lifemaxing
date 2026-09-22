import { Link } from 'react-router'
import { useLanguage } from '../settings/language.js'
import { AreaArtwork } from './AreaArtwork.jsx'
import { artwork, descriptions } from './areaPresentation.js'
import styles from './AreaPage.module.css'

export function AreaCard({ area, counts, editing = false, layoutEditing = false, compact = false, action, controls, children, ...props }) {
  const { t, areaName } = useLanguage()
  const image = area.customImageUrl ? { src: area.customImageUrl, position: `${area.imageFocalX}% ${area.imageFocalY}%` } : artwork[area.key]
  return <section className={styles.area} data-area={area.key} data-layout={compact ? undefined : image?.layout} data-active={area.isActive} data-editing={editing || layoutEditing} aria-label={areaName(area)} {...props}>
    <div className={styles.artwork}>{image ? <img src={image.src} style={{ objectPosition: image.position }} alt="" loading="lazy" draggable={layoutEditing ? false : undefined} /> : <AreaArtwork areaKey={area.key} />}</div>
    <div className={styles.areaTop}>{!area.isActive && <span>{t('Inactive')}</span>}{action}</div>
    <div className={styles.content}>
      <h2>{layoutEditing ? areaName(area) : <Link className={styles.overviewLink} to={`/areas/${encodeURIComponent(area.key)}`}>{areaName(area)}</Link>}</h2>
      <p className={styles.description}>{t(descriptions[area.key] || 'A meaningful part of your life.')}</p>
      {!layoutEditing && area.key === 'finance' && <p><Link to="/areas/finance/subscriptions">{t('subscriptionTitle')}</Link></p>}
      {layoutEditing ? controls : <div className={styles.links}>{['tasks', 'goals', 'habits'].map(kind =>
        <Link key={kind} to={`/areas/${encodeURIComponent(area.key)}/${kind}`}><span>{t(kind)}</span><span className={styles.count}>{counts?.[kind] ?? '—'}</span></Link>)}</div>}
    </div>
    {children}
  </section>
}
