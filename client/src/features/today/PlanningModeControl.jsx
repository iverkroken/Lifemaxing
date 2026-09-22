import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useLanguage } from '../settings/language.js'
import { updateSettings } from '../settings/settingsApi.js'
import { Select } from '../../shared/ui/Select.jsx'
import { Button } from '../../shared/ui/Button.jsx'
import styles from './TodayPage.module.css'

export function PlanningModeControl({ mode, query, userId }) {
  const { t } = useLanguage()
  const client = useQueryClient()
  const save = useMutation({ mutationFn: updateSettings, onSuccess: settings => client.setQueryData(['settings', userId], settings) })
  return <div className={styles.planningControl}>
    <Select label={t('Planning mode')} value={mode} disabled={!query.isSuccess || save.isPending}
      onChange={event => save.mutate({ planningMode: event.target.value })}>
      <option value="Simple">{t('Simple')}</option>
      <option value="ThreeThreeThree">3:3:3</option>
      <option value="FocusedDay">{t('Focused Day')}</option>
      <option value="Custom">{t('Custom')}</option>
    </Select>
    {query.isPending && <p role="status">{t('Loading settings…')}</p>}
    {save.isPending && <p role="status">{t('saving')}</p>}
    {save.isSuccess && <p role="status">{t('Planning mode saved.')}</p>}
    {(query.isError || save.isError) && <div role="alert"><p>{t('Planning mode could not be saved or loaded. Your work is unchanged.')}</p>
      <Button variant="quiet" onClick={() => query.isError ? query.refetch() : save.mutate(save.variables)}>{t('retry')}</Button></div>}
  </div>
}

export function PlanningGuide({ mode }) {
  const { t } = useLanguage()
  if (mode === 'FocusedDay') return <p className={styles.modeHint}>{t('focusedDayGuide')}</p>
  if (mode === 'Simple') return <p className={styles.modeHint}>{t('One daily list. Choose your next useful action.')}</p>
  if (mode === 'Custom') return <p className={styles.modeHint}>{t('customDayGuide')}</p>
  return <section className={styles.planningGuide} aria-label="3:3:3">
    <h2>{t('A balanced day with 3:3:3')}</h2>
    <dl><div><dt>{t('Three meaningful work items')}</dt><dd>{t('meaningfulWorkGuide')}</dd></div>
      <div><dt>{t('Three shorter tasks')}</dt><dd>{t('Choose a few supporting tasks from your daily plan.')}</dd></div>
      <div><dt>{t('Three maintenance activities')}</dt><dd>{t('Make room for habits and everyday upkeep.')}</dd></div></dl>
    <p>{t('A guide, not a quota. Your tasks stay together; choose what fits this day.')}</p>
  </section>
}
