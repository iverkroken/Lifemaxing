import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useProductivityAction } from '../../shared/api/productivity.js'
import { Button } from '../../shared/ui/Button.jsx'
import { Input } from '../../shared/ui/Input.jsx'
import { ActionFeedback } from '../../shared/ui/ProductivityFeedback.jsx'
import styles from '../../shared/ui/Productivity.module.css'

const schema = z.object({ title: z.string().trim().min(1, 'Enter a task title.').max(200, 'Use at most 200 characters.') })

export function QuickAdd({ date, autoFocus = false }) {
  const form = useForm({ resolver: zodResolver(schema), defaultValues: { title: '' } })
  const action = useProductivityAction(() => { form.reset(); form.setFocus('title') })
  return <section aria-label="Quick Add">
    <p className={styles.eyebrow}>Make room in your mind</p>
    <h2 className={styles.sectionTitle}>Quick Add</h2>
    <form className={styles.form} onSubmit={form.handleSubmit(values => action.mutate({ path: '/tasks', body: values }))} noValidate>
      <fieldset disabled={action.isPending} className={styles.formFields}>
      <Input label="Task title" placeholder="What’s on your mind?" autoFocus={autoFocus} required error={form.formState.errors.title?.message} {...form.register('title')} />
      <div className={styles.actions}>
        <Button type="submit" loading={action.isPending}>Add to Inbox</Button>
        {date && <Button variant="secondary" loading={action.isPending}
          onClick={form.handleSubmit(values => action.mutate({ path: '/tasks', body: { ...values, plannedDate: date } }))}>Add to this day</Button>}
      </div>
      <ActionFeedback action={action} success="Task captured." />
      </fieldset>
    </form>
  </section>
}
