import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useProductivity, useProductivityAction } from '../../shared/api/productivity.js'
import { Button } from '../../shared/ui/Button.jsx'
import { Input } from '../../shared/ui/Input.jsx'
import { Select } from '../../shared/ui/Select.jsx'
import { ActionFeedback, QueryFeedback } from '../../shared/ui/ProductivityFeedback.jsx'
import styles from '../../shared/ui/Productivity.module.css'

const schema = z.object({ title: z.string().trim().min(1, 'Enter a goal title.').max(200), description: z.string().max(10000),
  lifeAreaId: z.string(), state: z.string(), targetDate: z.string(), targetValue: z.string(), baselineValue: z.string(), unit: z.string(), direction: z.string() })

export function GoalForm({ goal, onSaved }) {
  const [measured, setMeasured] = useState(goal?.targetValue != null)
  const areas = useProductivity('/areas')
  const form = useForm({ resolver: zodResolver(schema), defaultValues: { title: goal?.title || '', description: goal?.description || '',
    lifeAreaId: goal?.lifeAreaId || '', state: goal?.state || 'Active', targetDate: goal?.targetDate || '',
    targetValue: goal?.targetValue?.toString() || '', baselineValue: goal?.baselineValue?.toString() || '', unit: goal?.unit || '', direction: goal?.direction || 'Increase' } })
  const action = useProductivityAction(onSaved)
  return <form className={styles.form} noValidate onSubmit={form.handleSubmit(values => action.mutate({
    path: goal ? `/goals/${goal.id}` : '/goals', method: goal ? 'PATCH' : 'POST', body: { ...values,
      description: values.description || null, lifeAreaId: values.lifeAreaId || null, targetDate: values.targetDate || null,
      targetValue: measured && values.targetValue !== '' ? Number(values.targetValue) : null,
      baselineValue: measured && values.baselineValue !== '' ? Number(values.baselineValue) : null,
      unit: measured ? values.unit : null, direction: measured ? values.direction : null,
    },
  }))}>
    <fieldset disabled={action.isPending} className={styles.formFields}>
    <Input label="Goal title" required error={form.formState.errors.title?.message} {...form.register('title')} />
    <Input label="Description" multiline rows={3} error={form.formState.errors.description?.message} {...form.register('description')} />
    <div className={styles.fields}>
      <Select label="Life Area" {...form.register('lifeAreaId')}><option value="">No area</option>{areas.data?.map(x => <option key={x.id} value={x.id}>{x.displayName}</option>)}</Select>
      <Select label="Goal state" {...form.register('state')}>{['Active', 'Paused', 'Completed'].map(x => <option key={x}>{x}</option>)}</Select>
      <Input label="Target date" type="date" {...form.register('targetDate')} />
      <Select label="Goal type" value={measured ? 'measured' : 'qualitative'} onChange={e => setMeasured(e.target.value === 'measured')}>
        <option value="qualitative">Qualitative · progress notes</option><option value="measured">Measured · numeric progress</option>
      </Select>
      {measured && <>
        <Input label="Baseline value" type="number" step="0.0001" required {...form.register('baselineValue')} />
        <Input label="Target value" type="number" step="0.0001" required {...form.register('targetValue')} />
        <Input label="Unit" required {...form.register('unit')} />
        <Select label="Direction" {...form.register('direction')}><option>Increase</option><option>Decrease</option></Select>
      </>}
    </div>
    <QueryFeedback query={areas} /><ActionFeedback action={action} success="Goal saved." />
    <Button type="submit" loading={action.isPending}>{goal ? 'Save goal' : 'Create goal'}</Button>
    </fieldset>
  </form>
}
