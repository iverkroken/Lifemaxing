import { useForm, useWatch } from 'react-hook-form'
import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate, useParams } from 'react-router'
import { useProductivity, useProductivityAction } from '../../shared/api/productivity.js'
import { Button } from '../../shared/ui/Button.jsx'
import { Card } from '../../shared/ui/Card.jsx'
import { Input } from '../../shared/ui/Input.jsx'
import { Select } from '../../shared/ui/Select.jsx'
import { PageHeader } from '../../shared/ui/PageHeader.jsx'
import { ActionFeedback, Pagination, QueryFeedback } from '../../shared/ui/ProductivityFeedback.jsx'
import styles from '../../shared/ui/Productivity.module.css'

const schema = z.object({ title: z.string().trim().min(1, 'Enter a title.').max(200), details: z.string().max(10000),
  lifeAreaId: z.string(), goalId: z.string(), tier: z.string(), priority: z.string(), plannedDate: z.string(), dueDate: z.string(), estimateMinutes: z.string() })

function TaskForm({ task }) {
  const navigate = useNavigate()
  const areas = useProductivity('/areas')
  const [goalPage, setGoalPage] = useState(1)
  const goals = useProductivity(`/goals?page=${goalPage}`)
  const form = useForm({ resolver: zodResolver(schema), defaultValues: {
    title: task?.title || '', details: task?.details || '', lifeAreaId: task?.lifeAreaId || '', goalId: task?.goalId || '',
    tier: task?.tier || 'Small', priority: task?.priority || 'Normal', plannedDate: task?.plannedDate || '', dueDate: task?.dueDate || '', estimateMinutes: task?.estimateMinutes?.toString() || '',
  } })
  const selectedGoal = useWatch({ control: form.control, name: 'goalId' })
  const save = useProductivityAction(saved => navigate(`/tasks/${saved.id}`, { replace: true }))
  const action = useProductivityAction()
  return <Card><form className={styles.form} noValidate onSubmit={form.handleSubmit(values => save.mutate({
    path: task ? `/tasks/${task.id}` : '/tasks', method: task ? 'PATCH' : 'POST', body: { ...values,
      details: values.details || null, lifeAreaId: values.lifeAreaId || null, goalId: values.goalId || null,
      plannedDate: values.plannedDate || null, dueDate: values.dueDate || null, estimateMinutes: values.estimateMinutes ? Number(values.estimateMinutes) : null },
  }))}>
    <fieldset disabled={save.isPending || action.isPending || Boolean(task?.deletedAtUtc)} className={styles.formFields}>
    <Input label="Title" required error={form.formState.errors.title?.message} {...form.register('title')} />
    <Input label="Details" error={form.formState.errors.details?.message} {...form.register('details')} />
    <div className={styles.fields}>
      <Select label="Life Area" {...form.register('lifeAreaId')}><option value="">No area</option>{areas.data?.map(x => <option key={x.id} value={x.id}>{x.displayName}</option>)}</Select>
      <div className={styles.form}>
        <Select label="Goal" {...form.register('goalId')}><option value="">No goal</option>
          {selectedGoal && !goals.data?.items.some(x => x.id === selectedGoal) && <option value={selectedGoal}>Linked goal (outside this page)</option>}
          {goals.data?.items.map(x => <option key={x.id} value={x.id}>{x.title}</option>)}
        </Select>
        <Pagination data={goals.data} setPage={setGoalPage} />
      </div>
      <Input label="Planned date" type="date" hint="Creates a daily commitment. Leave empty for Inbox." {...form.register('plannedDate')} />
      <Input label="Due date" type="date" {...form.register('dueDate')} />
      <Select label="Priority" {...form.register('priority')}>{['Low', 'Normal', 'High'].map(x => <option key={x}>{x}</option>)}</Select>
      <Select label="Task size" {...form.register('tier')}>{['Tiny', 'Small', 'Medium', 'Large', 'Epic'].map(x => <option key={x}>{x}</option>)}</Select>
      <Input label="Estimate (minutes)" type="number" min="1" max="10080" {...form.register('estimateMinutes')} />
    </div>
    <QueryFeedback query={areas} /><QueryFeedback query={goals} />
    {task?.deletedAtUtc ? <p>This task is archived. Its plans and completions are retained.</p> : <div className={styles.actions}>
      <Button type="submit" loading={save.isPending} disabled={action.isPending}>{task ? 'Save task' : 'Create task'}</Button>
      {task && <>
        <Button variant="secondary" loading={action.isPending} onClick={() => action.mutate({ path: `/tasks/${task.id}/${task.isCompleted ? 'reopen' : 'complete'}` })}>{task.isCompleted ? 'Reopen task' : 'Complete task'}</Button>
        <Button variant="danger" loading={action.isPending} onClick={() => action.mutate({ path: `/tasks/${task.id}`, method: 'DELETE' })}>Archive task</Button>
      </>}
    </div>}
    <ActionFeedback action={save} success="Task saved." /><ActionFeedback action={action} />
    </fieldset>
  </form></Card>
}

export function NewTaskPage() {
  return <div className={styles.stack}><PageHeader title="New task" description="Define the next useful action." /><TaskForm /></div>
}
export function TaskDetailPage() {
  const { id } = useParams()
  const task = useProductivity(`/tasks/${id}`)
  return <div className={styles.stack}><PageHeader title="Task details" action={<Link to="/tasks">All tasks</Link>} />
    <QueryFeedback query={task} />{task.data && <TaskForm key={task.data.id} task={task.data} />}
  </div>
}
