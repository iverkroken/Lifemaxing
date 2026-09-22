import { useLanguage } from '../settings/language.js'
import { useForm, useWatch } from 'react-hook-form'
import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useProductivity, useProductivityAction } from '../../shared/api/productivity.js'
import { Button } from '../../shared/ui/Button.jsx'
import { Input } from '../../shared/ui/Input.jsx'
import { Select } from '../../shared/ui/Select.jsx'
import { ActionFeedback, Pagination, QueryFeedback } from '../../shared/ui/ProductivityFeedback.jsx'
import { taskDefaults, taskPayload, taskSchema } from './taskForm.js'
import styles from '../../shared/ui/Productivity.module.css'

export function QuickAdd({ date, currentDate = date, lifeAreaId = '', autoFocus = false }) {
  const { t, areaName, date: formatDate } = useLanguage()
  const areas = useProductivity('/areas')
  const [page, setPage] = useState(1)
  const goals = useProductivity(`/goals?page=${page}&state=Active`)
  const form = useForm({ resolver: zodResolver(taskSchema), defaultValues: taskDefaults(null, lifeAreaId, date || '') })
  const plannedDate = useWatch({ control: form.control, name: 'plannedDate' })
  const selectedGoal = useWatch({ control: form.control, name: 'goalId' })
  const action = useProductivityAction(() => { form.reset({ ...form.getValues(), title: '', details: '' }); form.setFocus('title') })
  const submit = (values, inbox = false) => action.mutate({ path: '/tasks', body: taskPayload(values, inbox ? '' : values.plannedDate) })
  const label = !plannedDate ? t('Add to Inbox') : plannedDate === currentDate ? t('Add to today') : t('addToDate', { date: formatDate(plannedDate) })
  return <section aria-label={t('Quick Add')}>
    <form className={styles.form} onSubmit={form.handleSubmit(values => submit(values))} noValidate>
      <fieldset disabled={action.isPending} className={styles.formFields}>
        <Input label={t('Task title')} placeholder={t('What needs doing?')} autoFocus={autoFocus} required error={form.formState.errors.title} {...form.register('title')} />
        <Select label={t('Life Area')} {...form.register('lifeAreaId')}><option value="">{t('Unassigned')}</option>{areas.data?.map(area => <option key={area.id} value={area.id}>{areaName(area)}</option>)}</Select>
        <QueryFeedback query={areas} />
        <div className={styles.fields}>
          <Select label={t('Priority')} {...form.register('priority')}>{['Low', 'Normal', 'High'].map(value => <option key={value} value={value}>{t(value)}</option>)}</Select>
          <Select label={t('Task size')} {...form.register('tier')}>{['Tiny', 'Small', 'Medium', 'Large', 'Epic'].map(value => <option key={value} value={value}>{t(value)}</option>)}</Select>
        </div>
        <Input label={t('Planned date')} type="date" {...form.register('plannedDate')} hint={t('taskDateMeaning')} />
        <details><summary>{t('More details')}</summary><div className={styles.form}>
          <Select label={t('Goal')} {...form.register('goalId')}><option value="">{t('No goal')}</option>
            {selectedGoal && !goals.data?.items.some(goal => goal.id === selectedGoal) && <option value={selectedGoal}>{t('Linked goal (outside this page)')}</option>}
            {goals.data?.items.map(goal => <option key={goal.id} value={goal.id}>{goal.title}</option>)}
          </Select><QueryFeedback query={goals} /><Pagination data={goals.data} setPage={setPage} />
          <Input label={t('Details')} multiline rows={3} error={form.formState.errors.details} {...form.register('details')} />
          <Input label={t('Due date')} type="date" {...form.register('dueDate')} />
          <Input label={t('Estimate (minutes)')} type="number" min="1" max="10080" {...form.register('estimateMinutes')} />
        </div></details>
        <div className={styles.actions}><Button type="submit" loading={action.isPending}>{label}</Button>
          {plannedDate && <Button variant="secondary" loading={action.isPending} onClick={form.handleSubmit(values => submit(values, true))}>{t('Add to Inbox')}</Button>}
        </div>
        <ActionFeedback action={action} success={t('Task captured.')} />
      </fieldset>
    </form>
  </section>
}
