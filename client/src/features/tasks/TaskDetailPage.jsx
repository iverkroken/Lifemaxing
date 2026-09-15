import { useLanguage } from '../settings/language.js'
import { useForm, useWatch } from 'react-hook-form'
import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate, useParams } from 'react-router'
import { useProductivity, useProductivityAction } from '../../shared/api/productivity.js'
import { Button } from '../../shared/ui/Button.jsx'
import { Input } from '../../shared/ui/Input.jsx'
import { Select } from '../../shared/ui/Select.jsx'
import { PageHeader } from '../../shared/ui/PageHeader.jsx'
import { ActionFeedback, Pagination, QueryFeedback } from '../../shared/ui/ProductivityFeedback.jsx'
import styles from '../../shared/ui/Productivity.module.css'
import pageStyles from './TasksPage.module.css'

const schema = z.object({ title: z.string().trim().min(1, 'Enter a title.').max(200), details: z.string().max(10000),
  lifeAreaId: z.string(), goalId: z.string(), tier: z.string(), priority: z.string(), plannedDate: z.string(), dueDate: z.string(), estimateMinutes: z.string() })

function TaskForm({ task }) {
  const { t, areaName } = useLanguage()
  const navigate = useNavigate()
  const areas = useProductivity('/areas')
  const [goalPage, setGoalPage] = useState(1)
  const goals = useProductivity(`/goals?page=${goalPage}`)
  const form = useForm({ resolver: zodResolver(schema), defaultValues: {
    title: task?.title || '', details: task?.details || '', lifeAreaId: task?.lifeAreaId || '', goalId: task?.goalId || '',
    tier: task?.tier || 'Small', priority: task?.priority || 'Normal', plannedDate: task?.plannedDate || '', dueDate: task?.dueDate || '', estimateMinutes: task?.estimateMinutes?.toString() || '',
  } })
  const selectedGoal = useWatch({ control: form.control, name: 'goalId' })
  const save = useProductivityAction(saved => {
    if (task) form.reset(form.getValues())
    else navigate(`/tasks/${saved.id}`, { replace: true })
  })
  const selectedArea = useWatch({ control: form.control, name: 'lifeAreaId' })
  const action = useProductivityAction()
  return <form className={`${styles.form} ${pageStyles.taskForm}`} noValidate onSubmit={form.handleSubmit(values => save.mutate({
    path: task ? `/tasks/${task.id}` : '/tasks', method: task ? 'PATCH' : 'POST', body: { ...values,
      details: values.details || null, lifeAreaId: values.lifeAreaId || null, goalId: values.goalId || null,
      plannedDate: values.plannedDate || null, dueDate: values.dueDate || null, estimateMinutes: values.estimateMinutes ? Number(values.estimateMinutes) : null },
  }))}>
    <fieldset disabled={save.isPending || action.isPending || Boolean(task?.deletedAtUtc)} className={styles.formFields}>
    <div className={pageStyles.formLayout}>
    <div>
    <h2 className={styles.sectionTitle}>{task?.deletedAtUtc ? t("Archived") : task?.isCompleted ? t("Completed") : t("Define the action")}</h2>
    <fieldset className={styles.formSection}>
    <Input label={t("Title")} required error={form.formState.errors.title} {...form.register('title')} />
    <Input label={t("Details")} multiline rows={6} placeholder={t("A little context, a clear next step…")} error={form.formState.errors.details} {...form.register('details')} />
    </fieldset>
    <fieldset className={styles.formSection}><legend>{t("Connect it to your life")}</legend>
      <Select label={t("Life Area")} {...form.register('lifeAreaId')} value={selectedArea}><option value="">{t("No area")}</option>{areas.data?.map(x => <option key={x.id} value={x.id}>{areaName(x)}</option>)}</Select>
      <div className={styles.form}>
        <Select label={t("Goal")} {...form.register('goalId')} value={selectedGoal}><option value="">{t("No goal")}</option>
          {selectedGoal && !goals.data?.items.some(x => x.id === selectedGoal) && <option value={selectedGoal}>{t("Linked goal (outside this page)")}</option>}
          {goals.data?.items.map(x => <option key={x.id} value={x.id}>{x.title}</option>)}
        </Select>
        <Pagination data={goals.data} setPage={setGoalPage} />
      </div>
    </fieldset>
    </div>
    <fieldset className={`${styles.formSection} ${pageStyles.planning}`}><legend>{t("Make a plan")}</legend>
      <Input label={t("Planned date")} type="date" hint={t("Creates a daily commitment. Leave empty for Inbox.")} {...form.register('plannedDate')} />
      <Input label={t("Due date")} type="date" {...form.register('dueDate')} />
      <Select label={t("Priority")} {...form.register('priority')}>{['Low', 'Normal', 'High'].map(x => <option key={x} value={x}>{t(x)}</option>)}</Select>
      <Select label={t("Task size")} {...form.register('tier')}>{['Tiny', 'Small', 'Medium', 'Large', 'Epic'].map(x => <option key={x} value={x}>{t(x)}</option>)}</Select>
      <Input label={t("Estimate (minutes)")} type="number" min="1" max="10080" {...form.register('estimateMinutes')} />
    </fieldset>
    </div>
    <QueryFeedback query={areas} /><QueryFeedback query={goals} />
    {task?.deletedAtUtc ? <p>{t("This task is archived. Its plans and completions are retained.")}</p> : <div className={styles.formFooter}>
      <div className={styles.actions}>
      <Button type="submit" loading={save.isPending} disabled={action.isPending}>{task ? t("Save task") : t("Create task")}</Button>
      {task && <>
        {!task.isCompleted && <Link to={`/focus?taskId=${task.id}`}>{t("Focus on this task")}</Link>}
        <Button variant="secondary" loading={action.isPending} onClick={() => action.mutate({ path: `/tasks/${task.id}/${task.isCompleted ? 'reopen' : 'complete'}` })}>{task.isCompleted ? t("Reopen task") : t("Complete task")}</Button>
      </>}
      </div>
      {task && <details><summary>{t("Archive task")}</summary><p>{t("Plans and completion history are preserved.")}</p><Button variant="danger" loading={action.isPending} onClick={() => action.mutate({ path: `/tasks/${task.id}`, method: 'DELETE' })}>{t("Archive task")}</Button></details>}
    </div>}
    <ActionFeedback action={save} success={t("Task saved.")} /><ActionFeedback action={action} />
    </fieldset>
  </form>
}

export function NewTaskPage() {
  const { t } = useLanguage()
  return <div className={styles.stack}><Link to="/tasks">{t("← All tasks")}</Link><PageHeader title={t("New task")} description={t("Define the next useful action.")} /><TaskForm /></div>
}
export function TaskDetailPage({ taskId, panel = false }) {
  const { t } = useLanguage()
  const params = useParams()
  const id = taskId || params.id
  const task = useProductivity(`/tasks/${id}`)
  return <div className={styles.stack}>{!panel && <Link to="/tasks">{t("← All tasks")}</Link>}<PageHeader title={t("Task details")} description={t("Give this action a place in your day.")} />
    <QueryFeedback query={task} />{task.data && <TaskForm key={task.data.id} task={task.data} />}
  </div>
}
