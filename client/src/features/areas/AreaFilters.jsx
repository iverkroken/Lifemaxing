import { Select } from '../../shared/ui/Select.jsx'
import { Button } from '../../shared/ui/Button.jsx'
import { useLanguage } from '../settings/language.js'
import { areaSorts } from './areaFilters.js'
import styles from './AreaPage.module.css'

export function AreaFilters({ filters, change, reset, countsReady }) {
  const { t } = useLanguage()
  return <section id="area-filters" className={styles.filterPanel} aria-label={t('areaFilters')}>
    <Select label={t('areaSort')} value={filters.sort} onChange={event => change('sort', event.target.value)}>
      {areaSorts.map(value => <option key={value} value={value} disabled={!countsReady && value.includes('-')}>{t(`areaSort_${value}`)}</option>)}
    </Select>
    <Select label={t('areaStatus')} value={filters.status} onChange={event => change('status', event.target.value)}>
      <option value="all">{t('areaAll')}</option><option value="active">{t('Active')}</option><option value="inactive">{t('Inactive')}</option>
    </Select>
    <Select label={t('areaContent')} value={filters.content} onChange={event => change('content', event.target.value)}>
      <option value="all">{t('areaAll')}</option><option value="filled" disabled={!countsReady}>{t('areaFilled')}</option><option value="empty" disabled={!countsReady}>{t('areaEmpty')}</option>
    </Select>
    <Button variant="ghost" onClick={reset}>{t('areaReset')}</Button>
    <p className={styles.filterHint}>{t(countsReady ? 'areaCountHint' : 'areaCountsUnavailable')}</p>
  </section>
}
