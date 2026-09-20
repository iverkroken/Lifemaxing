import { useLanguage } from '../settings/language.js'
import { useForm } from 'react-hook-form'
import { useState } from 'react'
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

function taskValues({ title, details, priority, tier }, lifeAreaId) {
  return { title, ...(lifeAreaId && { lifeAreaId }), ...(details && { details }), ...(priority && priority !== 'Normal' && { priority }), ...(tier && tier !== 'Small' && { tier }) }
}

export function QuickAdd({ date, lifeAreaId, autoFocus = false }) {
  const { t } = useLanguage()
  const [plannedDate, setPlannedDate] = useState(date || '')
  const form = useForm({ resolver: zodResolver(schema), defaultValues: { title: '' } })
  const action = useProductivityAction(() => { form.reset(); form.setFocus('title') })
  return <section aria-label={t("Quick Add")}>
    <form className={styles.form} onSubmit={form.handleSubmit(values => action.mutate({ path: '/tasks', body: taskValues(values, lifeAreaId) }))} noValidate>
      <fieldset disabled={action.isPending} className={styles.formFields}>
      <Input label={t("Task title")} placeholder={t("What needs doing?")} autoFocus={autoFocus} required error={form.formState.errors.title} {...form.register('title')} />
      <details><summary>{t("More details")}</summary><div className={styles.form}>
        <Input label={t("Details")} multiline rows={3} error={form.formState.errors.details} {...form.register('details')} />
        <div className={styles.fields}><Select label={t("Task size")} {...form.register('tier')} defaultValue="Small">{['Tiny', 'Small', 'Medium', 'Large', 'Epic'].map(size => <option key={size} value={size}>{t(size)}</option>)}</Select>
          <Select label={t("Priority")} {...form.register('priority')} defaultValue="Normal">{['Low', 'Normal', 'High'].map(priority => <option key={priority} value={priority}>{t(priority)}</option>)}</Select></div>
      </div></details>
      <Input label={t('Planned date')} type="date" value={plannedDate} onChange={event => setPlannedDate(event.target.value)} hint={t('captureDateHint')} />
      <div className={styles.actions}>
        <Button type="submit" loading={action.isPending}>{t("Add to Inbox")}</Button>
        {plannedDate && <Button variant="secondary" loading={action.isPending}
          onClick={form.handleSubmit(values => action.mutate({ path: '/tasks', body: { ...taskValues(values, lifeAreaId), plannedDate } }))}>{t("Add to this day")}</Button>}
      </div>
      <ActionFeedback action={action} success={t("Task captured.")} />
      </fieldset>
    </form>
  </section>
}
