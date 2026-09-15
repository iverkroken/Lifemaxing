import { useLanguage } from '../settings/language.js'
import { useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useProductivity, useProductivityAction } from '../../shared/api/productivity.js'
import { Button } from '../../shared/ui/Button.jsx'
import { Input } from '../../shared/ui/Input.jsx'
import { Select } from '../../shared/ui/Select.jsx'
import { ActionFeedback, QueryFeedback } from '../../shared/ui/ProductivityFeedback.jsx'
import styles from '../../shared/ui/Productivity.module.css'
import pageStyles from './GoalsPage.module.css'

const schema = z.object({ title: z.string().trim().min(1, 'Enter a goal title.').max(200), description: z.string().max(10000),
  lifeAreaId: z.string(), state: z.string(), targetDate: z.string(), targetValue: z.string(), baselineValue: z.string(), unit: z.string(), direction: z.string() })

export function GoalForm({ goal, onSaved }) {
  const { t, areaName } = useLanguage()
  const [measured, setMeasured] = useState(goal?.targetValue != null)
  const areas = useProductivity('/areas')
  const form = useForm({ resolver: zodResolver(schema), defaultValues: { title: goal?.title || '', description: goal?.description || '',
    lifeAreaId: goal?.lifeAreaId || '', state: goal?.state || 'Active', targetDate: goal?.targetDate || '',
    targetValue: goal?.targetValue?.toString() || '', baselineValue: goal?.baselineValue?.toString() || '', unit: goal?.unit || '', direction: goal?.direction || 'Increase' } })
  const selectedArea = useWatch({ control: form.control, name: 'lifeAreaId' })
  const action = useProductivityAction(onSaved)
  return <form className={`${styles.form} ${pageStyles.form}`} noValidate onSubmit={form.handleSubmit(values => action.mutate({
    path: goal ? `/goals/${goal.id}` : '/goals', method: goal ? 'PATCH' : 'POST', body: { ...values,
      description: values.description || null, lifeAreaId: values.lifeAreaId || null, targetDate: values.targetDate || null,
      targetValue: measured && values.targetValue !== '' ? Number(values.targetValue) : null,
      baselineValue: measured && values.baselineValue !== '' ? Number(values.baselineValue) : null,
      unit: measured ? values.unit : null, direction: measured ? values.direction : null,
    },
  }))}>
    <fieldset disabled={action.isPending} className={styles.formFields}>
    <Input label={t("Goal title")} required error={form.formState.errors.title} {...form.register('title')} />
    <Input label={t("Description")} multiline rows={3} error={form.formState.errors.description} {...form.register('description')} />
    <div className={styles.fields}>
      <Select label={t("Life Area")} {...form.register('lifeAreaId')} value={selectedArea}><option value="">{t("No area")}</option>{areas.data?.map(x => <option key={x.id} value={x.id}>{areaName(x)}</option>)}</Select>
      <Select label={t("Goal state")} {...form.register('state')}>{['Active', 'Paused', 'Completed'].map(x => <option key={x} value={x}>{t(x)}</option>)}</Select>
      <Input label={t("Target date")} type="date" {...form.register('targetDate')} />
      <Select label={t("Goal type")} value={measured ? 'measured' : 'qualitative'} onChange={e => setMeasured(e.target.value === 'measured')}>
        <option value="qualitative">{t("Qualitative · progress notes")}</option><option value="measured">{t("Measured · numeric progress")}</option>
      </Select>
      {measured && <>
        <Input label={t("Baseline value")} type="number" step="0.0001" required {...form.register('baselineValue')} />
        <Input label={t("Target value")} type="number" step="0.0001" required {...form.register('targetValue')} />
        <Input label={t("Unit")} required {...form.register('unit')} />
        <Select label={t("Direction")} {...form.register('direction')}><option value="Increase">{t("Increase")}</option><option value="Decrease">{t("Decrease")}</option></Select>
      </>}
    </div>
    <QueryFeedback query={areas} /><ActionFeedback action={action} success={t("Goal saved.")} />
    <Button type="submit" loading={action.isPending}>{goal ? t("Save goal") : t("Create goal")}</Button>
    </fieldset>
  </form>
}
