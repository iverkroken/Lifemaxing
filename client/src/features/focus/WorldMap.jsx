import { useLanguage } from '../settings/language.js'
import { cityLocation } from './worldLocations.js'
import data from './worldMapData.json'
import styles from './FocusPage.module.css'

export function WorldMap({ cities }) {
  const { t } = useLanguage()
  return <svg className={styles.worldMap} viewBox="0 0 360 180" role="img" aria-label={t('World map')}>
    <desc>{t('Pins show saved cities. Local time uses a representative location for your time zone.')}</desc>
    <path d={data.land} className={styles.worldLand} />
    {cities.map(city => {
      const point = cityLocation(city)
      if (!point) return null
      return <g key={city.id} data-city-pin={city.id} transform={`translate(${point.x} ${point.y})`}>
        <title>{city.name}{point.representative ? ` · ${t('Time zone location')}` : ''}</title>
        <circle r="3.6" className={styles.pinOutline} /><circle r="1.8" className={styles.pin} />
      </g>
    })}
  </svg>
}
