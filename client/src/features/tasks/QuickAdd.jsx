import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useProductivityAction } from '../../shared/api/productivity.js'
import { Button } from '../../shared/ui/Button.jsx'
import { Input } from '../../shared/ui/Input.jsx'
import { Select } from '../../shared/ui/Select.jsx'
import { ActionFeedback } from '../../shared/ui/ProductivityFeedback.jsx'
import styles from '../../shared/ui/Productivity.module.css'

const schema = z.object({ title: z.string().trim().min(1, 'Enter a task title.').max(200, 'Use at most 200 characters.'),
  details: z.string().max(10000).optional(), priority: z.string().optional(), tier: z.string().optional() })

function taskValues({ title, details, priority, tier }) {
  return { title, ...(details && { details }), ...(priority && priority !== 'Normal' && { priority }), ...(tier && tier !== 'Small' && { tier }) }
}

export function QuickAdd({ date, autoFocus = false }) {
  const form = useForm({ resolver: zodResolver(schema), defaultValues: { title: '' } })
  const action = useProductivityAction(() => { form.reset(); form.setFocus('title') })
  return <section aria-label="Quick Add">
    <form className={styles.form} onSubmit={form.handleSubmit(values => action.mutate({ path: '/tasks', body: taskValues(values) }))} noValidate>
      <fieldset disabled={action.isPending} className={styles.formFields}>
      <Input label="Task title" placeholder="What needs doing?" autoFocus={autoFocus} required error={form.formState.errors.title?.message} {...form.register('title')} />
      <details><summary>More details</summary><div className={styles.form}>
        <Input label="Details" multiline rows={3} error={form.formState.errors.details?.message} {...form.register('details')} />
        <div className={styles.fields}><Select label="Task size" {...form.register('tier')} defaultValue="Small">{['Tiny', 'Small', 'Medium', 'Large', 'Epic'].map(size => <option key={size}>{size}</option>)}</Select>
          <Select label="Priority" {...form.register('priority')} defaultValue="Normal">{['Low', 'Normal', 'High'].map(priority => <option key={priority}>{priority}</option>)}</Select></div>
      </div></details>
      <div className={styles.actions}>
        <Button type="submit" loading={action.isPending}>Add to Inbox</Button>
        {date && <Button variant="secondary" loading={action.isPending}
          onClick={form.handleSubmit(values => action.mutate({ path: '/tasks', body: { ...taskValues(values), plannedDate: date } }))}>Add to this day</Button>}
      </div>
      <ActionFeedback action={action} success="Task captured." />
      </fieldset>
    </form>
  </section>
}
