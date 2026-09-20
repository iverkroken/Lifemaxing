import { useRef, useState } from 'react'
import { Dialog } from '../../shared/ui/Dialog.jsx'
import { useLanguage } from '../settings/language.js'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { useOutletContext, useSearchParams } from 'react-router'
import { z } from 'zod'
import { Button } from '../../shared/ui/Button.jsx'
import { Input } from '../../shared/ui/Input.jsx'
import { Icon } from '../../shared/ui/Icon.jsx'
import { PageHeader } from '../../shared/ui/PageHeader.jsx'
import { QueryFeedback } from '../../shared/ui/ProductivityFeedback.jsx'
import { getAreas, updateArea } from './areasApi.js'
import styles from './AreaPage.module.css'
import shared from '../../shared/ui/Productivity.module.css'
import { useProductivity } from '../../shared/api/productivity.js'
import { AreaCard } from './AreaCard.jsx'
import { AreaLayoutEditor } from './AreaLayoutEditor.jsx'
import { AreaFilters } from './AreaFilters.jsx'
import { filterAreas, hasAreaCounts, needsAreaCounts, readAreaFilters } from './areaFilters.js'

const areaSchema = z.object({
  displayName: z.string().trim().min(1, 'Enter a display name.').max(100, 'Use 100 characters or fewer.'),
  isActive: z.boolean(),
})

function AreaEditor({ area, queryKey, counts, compact }) {
  const { t, areaName, errorMessage } = useLanguage()
  const [editing, setEditing] = useState(false)
  const queryClient = useQueryClient()
  const form = useForm({ resolver: zodResolver(areaSchema), defaultValues: { displayName: area.displayName, isActive: area.isActive } })
  const mutation = useMutation({
    mutationFn: values => updateArea({ id: area.id, ...values }),
    onSuccess: saved => {
      queryClient.setQueryData(queryKey, current => current.map(value => value.id === saved.id ? saved : value)
        .sort((left, right) => left.sortOrder - right.sortOrder || left.key.localeCompare(right.key)))
      queryClient.invalidateQueries({ queryKey: ['productivity'] })
      form.reset({ displayName: saved.displayName, isActive: saved.isActive })
    },
  })
  return <AreaCard area={area} counts={counts} compact={compact} editing={editing} action={<Button variant="ghost" size="small" aria-label={`${t("Edit Life Area")}: ${areaName(area)}`} onClick={() => setEditing(true)}><Icon name="more" /></Button>}>
    <Dialog open={editing} onClose={() => setEditing(false)} title={t("Edit Life Area")}>
      <form className={styles.editor} onSubmit={form.handleSubmit(values => mutation.mutate(values))} noValidate>
        <fieldset disabled={mutation.isPending} className={shared.formFields}>
          <Input label={t("Display name")} required error={form.formState.errors.displayName} {...form.register('displayName')} />
          <label className={styles.toggle}><input type="checkbox" {...form.register('isActive')} />{t("Active")}</label>
          {mutation.isError && <p role="alert" className={shared.error}>{errorMessage(mutation.error)}</p>}
          {mutation.isSuccess && <p role="status" className={shared.feedback}>{t("Changes saved.")}</p>}
          <Button type="submit" variant="secondary" loading={mutation.isPending} disabled={!form.formState.isDirty}>{t("Save changes")}</Button>
        </fieldset>
      </form>
    </Dialog>
  </AreaCard>
}

export function AreaPage() {
  const { t, areaName, language } = useLanguage()
  const [params, setParams] = useSearchParams()
  const [filtersOpen, setFiltersOpen] = useState(false)
  const filters = readAreaFilters(params)
  const selectedFilters = Number(filters.sort !== "custom") + Number(filters.status !== "all") + Number(filters.content !== "all")
  const changeFilter = (key, value) => setParams(current => {
    const next = new URLSearchParams(current)
    if (value === "custom" || value === "all") next.delete(key); else next.set(key, value)
    return next
  }, { replace: true })
  const resetFilters = () => setParams(current => {
    const next = new URLSearchParams(current)
    for (const key of ["sort", "status", "content"]) next.delete(key)
    return next
  }, { replace: true })
  const { user } = useOutletContext()
  const [layoutEditing, setLayoutEditing] = useState(false)
  const customizeButton = useRef(null)
  const closeLayout = () => {
    setLayoutEditing(false)
    requestAnimationFrame(() => customizeButton.current?.focus())
  }
  const queryKey = ['areas', user.id]
  const areas = useQuery({ queryKey, queryFn: ({ signal }) => getAreas(signal) })
  const counts = useProductivity('/areas/counts')
  const countsReady = counts.isSuccess && hasAreaCounts(areas.data || [], counts.data)
  const viewReady = !needsAreaCounts(filters) || countsReady
  const visibleAreas = viewReady ? filterAreas(areas.data || [], counts.data, filters, areaName, language) : []
  return <div className={styles.page}>
    <PageHeader action={!layoutEditing && <div className={styles.layoutActions}><Button variant="secondary" aria-expanded={filtersOpen} aria-controls="area-filters" onClick={() => setFiltersOpen(open => !open)}><Icon name="settings" />{t("areaFilters")}{selectedFilters > 0 && ` (${selectedFilters})`}</Button><Button ref={customizeButton} variant="secondary" disabled={!areas.data?.length} onClick={() => { resetFilters(); setFiltersOpen(false); setLayoutEditing(true) }}><Icon name="settings" />{t("customizeLayout")}</Button></div>} editorial title={t("Life Areas")} description={t("Find the tasks, goals and routines that belong to each part of your life.")} />
    {areas.isSuccess && <div className={styles.overview}>
      <span><strong>{areas.data.filter(area => area.isActive).length}</strong>{t("active areas")}</span>
      {!layoutEditing && <p className={styles.layoutStatus} role="status">{viewReady ? t("areaResults", { count: visibleAreas.length, total: areas.data.length }) : t("areaCountsUnavailable")} {selectedFilters > 0 && <Button variant="ghost" size="small" onClick={resetFilters}>{t("areaReset")}</Button>}</p>}
    </div>}
    {!layoutEditing && filtersOpen && <AreaFilters filters={filters} change={changeFilter} reset={resetFilters} countsReady={countsReady} />}
    <QueryFeedback query={areas} />
    <QueryFeedback query={counts} />
    {areas.isSuccess && areas.data.length === 0 && <p>{t("No Life Areas are available for this account.")}</p>}
    {!layoutEditing && areas.data?.length > 0 && viewReady && visibleAreas.length === 0 && <p>{t("areaNoResults")}</p>}
    {areas.isSuccess && (layoutEditing ? <AreaLayoutEditor areas={areas.data} queryKey={queryKey} onClose={closeLayout} /> : <div className={styles.grid}>{visibleAreas.map(area => <AreaEditor compact={filters.sort !== "custom"} key={area.id} area={area} queryKey={queryKey} counts={counts.isSuccess ? counts.data.find(value => value.id === area.id) : undefined} />)}</div>)}
  </div>
}
