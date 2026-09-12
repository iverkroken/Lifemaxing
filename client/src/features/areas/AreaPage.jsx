import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { useOutletContext } from 'react-router'
import { z } from 'zod'
import { Button } from '../../shared/ui/Button.jsx'
import { Card } from '../../shared/ui/Card.jsx'
import { Input } from '../../shared/ui/Input.jsx'
import { PageHeader } from '../../shared/ui/PageHeader.jsx'
import { getAreas, updateArea } from './areasApi.js'
import styles from './AreaPage.module.css'

const areaSchema = z.object({
  displayName: z.string().trim().min(1, 'Enter a display name.').max(100, 'Use 100 characters or fewer.'),
  sortOrder: z.coerce.number().int().min(0).max(999),
  isActive: z.boolean(),
})

function AreaEditor({ area, queryKey }) {
  const queryClient = useQueryClient()
  const form = useForm({
    resolver: zodResolver(areaSchema),
    defaultValues: { displayName: area.displayName, sortOrder: area.sortOrder, isActive: area.isActive },
  })
  const mutation = useMutation({
    mutationFn: values => updateArea({ id: area.id, ...values }),
    onSuccess: saved => {
      queryClient.setQueryData(queryKey, current => current.map(value => value.id === saved.id ? saved : value)
        .sort((left, right) => left.sortOrder - right.sortOrder || left.key.localeCompare(right.key)))
      form.reset({ displayName: saved.displayName, sortOrder: saved.sortOrder, isActive: saved.isActive })
    },
  })

  return <Card>
    <form className={styles.editor} onSubmit={form.handleSubmit(values => mutation.mutate(values))} noValidate>
      <div className={styles.areaTitle}>
        <div><h2>{area.displayName}</h2><p>{area.key}</p></div>
        <label className={styles.toggle}><input type="checkbox" {...form.register('isActive')} /> Active</label>
      </div>
      <Input label="Display name" required error={form.formState.errors.displayName?.message}
        {...form.register('displayName')} />
      <Input label="Sort order" type="number" inputMode="numeric" min="0" max="999" required
        error={form.formState.errors.sortOrder?.message} {...form.register('sortOrder')} />
      {mutation.isError && <p role="alert" className={styles.error}>{mutation.error.message}</p>}
      {mutation.isSuccess && <p role="status" className={styles.saved}>Changes saved.</p>}
      <Button type="submit" variant="secondary" loading={mutation.isPending} disabled={!form.formState.isDirty}>Save changes</Button>
    </form>
  </Card>
}

export function AreaPage() {
  const { user } = useOutletContext()
  const queryKey = ['areas', user.id]
  const areas = useQuery({ queryKey, queryFn: ({ signal }) => getAreas(signal) })

  return <>
    <PageHeader eyebrow="Foundation" title="Life Areas"
      description="Keep the names and order useful to you. Stable internal keys preserve future history." />
    {areas.isPending && <p aria-live="polite">Loading Life Areas…</p>}
    {areas.isError && <Card><p role="alert" className={styles.error}>Life Areas could not be loaded.</p>
      <Button variant="secondary" onClick={() => areas.refetch()}>Try again</Button></Card>}
    {areas.isSuccess && areas.data.length === 0 && <Card><p>No Life Areas are available for this account.</p></Card>}
    {areas.isSuccess && <div className={styles.grid}>
      {areas.data.map(area => <AreaEditor key={area.id} area={area} queryKey={queryKey} />)}
    </div>}
  </>
}
