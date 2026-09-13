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

function AreaEditor({ area, queryKey, index }) {
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
  return <section className={styles.area} aria-label={area.displayName}>
    <div className={styles.areaTop}><Icon name="areas" /><span>{String(index + 1).padStart(2, '0')}</span></div>
    <h2>{area.displayName}</h2><p className={styles.description}>{descriptions[area.key] || 'A meaningful part of your life.'}</p>
    {!area.isActive && <p className={shared.badge}>Inactive</p>}
    <div className={styles.links}><Link to={`/tasks?areaId=${area.id}`}>Tasks →</Link><Link to={`/goals?areaId=${area.id}`}>Goals →</Link><Link to={`/habits?areaId=${area.id}`}>Habits →</Link></div>
    <details><summary>Edit Life Area</summary>
      <form className={styles.editor} onSubmit={form.handleSubmit(values => mutation.mutate(values))} noValidate>
        <fieldset disabled={mutation.isPending} className={shared.formFields}>
          <Input label="Display name" required error={form.formState.errors.displayName?.message} {...form.register('displayName')} />
          <Input label="Sort order" type="number" inputMode="numeric" min="0" max="999" required error={form.formState.errors.sortOrder?.message} {...form.register('sortOrder')} />
          <label className={styles.toggle}><input type="checkbox" {...form.register('isActive')} /> Active</label>
          {mutation.isError && <p role="alert" className={shared.error}>{mutation.error.message}</p>}
          {mutation.isSuccess && <p role="status" className={shared.feedback}>Changes saved.</p>}
          <Button type="submit" variant="secondary" loading={mutation.isPending} disabled={!form.formState.isDirty}>Save changes</Button>
        </fieldset>
      </form>
    </details>
  </section>
}

export function AreaPage() {
  const { user } = useOutletContext()
  const queryKey = ['areas', user.id]
  const areas = useQuery({ queryKey, queryFn: ({ signal }) => getAreas(signal) })
  return <div className={shared.stack}>
    <PageHeader eyebrow="The many parts of one life" title="Life Areas" description="Give your actions and ambitions a place to belong." />
    <QueryFeedback query={areas} />
    {areas.isSuccess && areas.data.length === 0 && <p>No Life Areas are available for this account.</p>}
    {areas.isSuccess && <div className={styles.grid}>{areas.data.map((area, index) => <AreaEditor key={area.id} area={area} queryKey={queryKey} index={index} />)}</div>}
  </div>
}
