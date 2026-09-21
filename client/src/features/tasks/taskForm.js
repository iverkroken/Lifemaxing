import { z } from 'zod'

export const taskSchema = z.object({
  title: z.string().trim().min(1, 'Enter a task title.').max(200), details: z.string().max(10000),
  lifeAreaId: z.string(), goalId: z.string(), tier: z.enum(['Tiny', 'Small', 'Medium', 'Large', 'Epic']),
  priority: z.enum(['Low', 'Normal', 'High']), plannedDate: z.string(), dueDate: z.string(), estimateMinutes: z.string(),
})
export function taskDefaults(task, lifeAreaId = '', date = '') {
  return { title: task?.title || '', details: task?.details || '', lifeAreaId: task?.lifeAreaId || lifeAreaId,
    goalId: task?.goalId || '', tier: task?.tier || 'Small', priority: task?.priority || 'Normal',
    plannedDate: task?.plannedDate || date, dueDate: task?.dueDate || '', estimateMinutes: task?.estimateMinutes?.toString() || '' }
}
export function taskPayload(values, plannedDate = values.plannedDate) {
  return { ...values, details: values.details || null, lifeAreaId: values.lifeAreaId || null, goalId: values.goalId || null,
    plannedDate: plannedDate || null, dueDate: values.dueDate || null, estimateMinutes: values.estimateMinutes ? Number(values.estimateMinutes) : null }
}
