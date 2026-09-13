import { useLanguage } from '../settings/language.js'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { Link, useOutletContext } from 'react-router'
import { z } from 'zod'
import { Button } from '../../shared/ui/Button.jsx'
import { Input } from '../../shared/ui/Input.jsx'
import { Icon } from '../../shared/ui/Icon.jsx'
import { PageHeader } from '../../shared/ui/PageHeader.jsx'
import { QueryFeedback } from '../../shared/ui/ProductivityFeedback.jsx'
import { getAreas, updateArea } from './areasApi.js'
import styles from './AreaPage.module.css'
import shared from '../../shared/ui/Productivity.module.css'
import { useProductivity } from '../../shared/api/productivity.js'
import { AreaArtwork } from './AreaArtwork.jsx'

const areaSchema = z.object({
  displayName: z.string().trim().min(1, 'Enter a display name.').max(100, 'Use 100 characters or fewer.'),
  sortOrder: z.coerce.number().int().min(0).max(999),
  isActive: z.boolean(),
})
const descriptions = {
  fitness: 'Energy, movement and feeling well.', university: 'Learning, curiosity and academic life.', career: 'Meaningful work and what comes next.',
  finance: 'Clarity and intention with money.', home: 'Care for the spaces you call home.', style: 'How you choose to express yourself.',
  food: 'Nourishment and the joy of cooking.', creative: 'Ideas, experiments and things you make.', travel: 'Places to discover and experiences to plan.', personal: 'The things that are simply yours.',
}

function AreaEditor({ area, queryKey, index, counts }) {
  const { t, areaName, errorMessage } = useLanguage()
  const queryClient = useQueryClient()
  const form = useForm({ resolver: zodResolver(areaSchema), defaultValues: { displayName: area.displayName, sortOrder: area.sortOrder, isActive: area.isActive } })
  const mutation = useMutation({
    mutationFn: values => updateArea({ id: area.id, ...values }),
    onSuccess: saved => {
      queryClient.setQueryData(queryKey, current => current.map(value => value.id === saved.id ? saved : value)
        .sort((left, right) => left.sortOrder - right.sortOrder || left.key.localeCompare(right.key)))
      queryClient.invalidateQueries({ queryKey: ['productivity'] })
      form.reset({ displayName: saved.displayName, sortOrder: saved.sortOrder, isActive: saved.isActive })
    },
  })
  return <section className={styles.area} data-area={area.key} data-active={area.isActive} aria-label={areaName(area)}>
    <div className={styles.artwork}><AreaArtwork areaKey={area.key} /></div>
    <div className={styles.areaTop}><span className={styles.areaIcon}><Icon name={area.key} size={26} /></span><span>{area.isActive ? t("Active") : t("Inactive")} · {String(index + 1).padStart(2, '0')}</span></div>
    <h2><Link to={`/tasks?areaId=${area.id}`}>{areaName(area)}</Link></h2><p className={styles.description}>{t(descriptions[area.key] || 'A meaningful part of your life.')}</p>
    <div className={styles.links}>{['tasks', 'goals', 'habits'].map(kind =>
      <Link key={kind} to={`/${kind}?areaId=${area.id}`}>{t('areaCount_' + kind, { count: counts?.[kind] ?? '—' })} <span aria-hidden="true">→</span></Link>)}</div>
    <details><summary>{t("Edit Life Area")}</summary>
      <form className={styles.editor} onSubmit={form.handleSubmit(values => mutation.mutate(values))} noValidate>
        <fieldset disabled={mutation.isPending} className={shared.formFields}>
          <Input label={t("Display name")} required error={form.formState.errors.displayName} {...form.register('displayName')} />
          <Input label={t("Sort order")} type="number" inputMode="numeric" min="0" max="999" required error={form.formState.errors.sortOrder} {...form.register('sortOrder')} />
          <label className={styles.toggle}><input type="checkbox" {...form.register('isActive')} />{t("Active")}</label>
          {mutation.isError && <p role="alert" className={shared.error}>{errorMessage(mutation.error)}</p>}
          {mutation.isSuccess && <p role="status" className={shared.feedback}>{t("Changes saved.")}</p>}
          <Button type="submit" variant="secondary" loading={mutation.isPending} disabled={!form.formState.isDirty}>{t("Save changes")}</Button>
        </fieldset>
      </form>
    </details>
  </section>
}

export function AreaPage() {
  const { t } = useLanguage()
  const { user } = useOutletContext()
  const queryKey = ['areas', user.id]
  const areas = useQuery({ queryKey, queryFn: ({ signal }) => getAreas(signal) })
  const counts = useProductivity('/areas/counts')
  return <div className={shared.stack}>
    <PageHeader eyebrow={t("Your life, organised")} title={t("Life Areas")} description={t("Find the tasks, goals and routines that belong to each part of your life.")} />
    {areas.isSuccess && <div className={styles.overview}><span><strong>{areas.data.filter(area => area.isActive).length}</strong>{t("active areas")}</span><p>{t("Choose an area to work in. Edit its name, order or active status as your priorities change.")}</p></div>}
    <QueryFeedback query={areas} />
    <QueryFeedback query={counts} />
    {areas.isSuccess && areas.data.length === 0 && <p>{t("No Life Areas are available for this account.")}</p>}
    {areas.isSuccess && <div className={styles.grid}>{areas.data.map((area, index) => <AreaEditor key={area.id} area={area} queryKey={queryKey} index={index} counts={counts.isSuccess ? counts.data.find(value => value.id === area.id) : undefined} />)}</div>}
  </div>
}
