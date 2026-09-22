import { useEffect, useRef, useState } from 'react'
import { Dialog } from '../../shared/ui/Dialog.jsx'
import { useLanguage } from '../settings/language.js'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm, useWatch } from 'react-hook-form'
import { useOutletContext, useSearchParams } from 'react-router'
import { z } from 'zod'
import { Button } from '../../shared/ui/Button.jsx'
import { Input } from '../../shared/ui/Input.jsx'
import { Icon } from '../../shared/ui/Icon.jsx'
import { PageHeader } from '../../shared/ui/PageHeader.jsx'
import { ActionFeedback, QueryFeedback } from '../../shared/ui/ProductivityFeedback.jsx'
import { createArea, deleteArea, getAreaDeleteImpact, getAreas, removeAreaImage, updateArea, uploadAreaImage } from './areasApi.js'
import styles from './AreaPage.module.css'
import shared from '../../shared/ui/Productivity.module.css'
import { useProductivity } from '../../shared/api/productivity.js'
import { AreaCard } from './AreaCard.jsx'
import { AreaArtwork } from './AreaArtwork.jsx'
import { AreaLayoutEditor } from './AreaLayoutEditor.jsx'
import { AreaFilters } from './AreaFilters.jsx'
import { filterAreas, hasAreaCounts, needsAreaCounts, readAreaFilters } from './areaFilters.js'

const areaSchema = z.object({
  displayName: z.string().trim().min(1, 'Enter a display name.').max(100, 'Use 100 characters or fewer.'),
  isActive: z.boolean(),
  imageFocalX: z.coerce.number().min(0).max(100),
  imageFocalY: z.coerce.number().min(0).max(100),
})

function ImageEditor({ area, setFile, remove, setRemove, focalX = 50, focalY = 50 }) {
  const { t } = useLanguage()
  const [preview, setPreview] = useState(null)
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview) }, [preview])
  const src = preview || (!remove && area?.customImageUrl)
  return <div className={styles.imageEditor}>
    {src ? <img src={src} style={{ objectPosition: `${focalX}% ${focalY}%` }} alt={t('Custom image')} /> : <AreaArtwork areaKey={area?.key} />}
    <Input label={t(area?.customImageUrl ? 'Change image' : 'Custom image')} type="file" accept="image/png,image/jpeg,image/webp"
      onChange={event => { const next = event.target.files[0] || null; setFile(next); setPreview(next ? URL.createObjectURL(next) : null); setRemove(false) }} />
    {area?.customImageUrl && !remove && <Button variant="quiet" onClick={() => { setFile(null); setPreview(null); setRemove(true) }}>{t('Remove image')}</Button>}
  </div>
}

function AreaEditor({ area, queryKey, counts, compact }) {
  const { t, areaName, errorMessage } = useLanguage()
  const [editing, setEditing] = useState(false)
  const queryClient = useQueryClient()
  const [file, setFile] = useState(null)
  const [remove, setRemove] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const form = useForm({ resolver: zodResolver(areaSchema), defaultValues: { displayName: area.displayName, isActive: area.isActive, imageFocalX: area.imageFocalX ?? 50, imageFocalY: area.imageFocalY ?? 50 } })
  const focalX = useWatch({ control: form.control, name: 'imageFocalX' })
  const focalY = useWatch({ control: form.control, name: 'imageFocalY' })
  const mutation = useMutation({
    mutationFn: async values => {
      let saved = await updateArea({ id: area.id, ...values })
      if (remove) { await removeAreaImage(area.id); saved = { ...saved, customImageUrl: null } }
      if (file) saved = await uploadAreaImage(area.id, file)
      return saved
    },
    onSuccess: saved => {
      queryClient.setQueryData(queryKey, current => current.map(value => value.id === saved.id ? saved : value)
        .sort((left, right) => left.sortOrder - right.sortOrder || left.key.localeCompare(right.key)))
      queryClient.invalidateQueries({ queryKey: ['productivity'] })
      form.reset({ displayName: saved.displayName, isActive: saved.isActive, imageFocalX: saved.imageFocalX, imageFocalY: saved.imageFocalY })
      setFile(null); setRemove(false); setEditing(false)
    },
  })
  const impact = useQuery({ queryKey: ['area-delete-impact', area.id], queryFn: ({ signal }) => getAreaDeleteImpact(area.id, signal), enabled: deleting })
  const removeArea = useMutation({ mutationFn: () => deleteArea(area.id), onSuccess: async () => {
    setDeleting(false)
    queryClient.setQueryData(queryKey, current => current?.filter(value => value.id !== area.id))
    await queryClient.invalidateQueries({ queryKey: ['productivity'] })
  } })
  return <AreaCard area={area} counts={counts} compact={compact} editing={editing} action={<Button variant="ghost" size="small" aria-label={`${t("Edit Life Area")}: ${areaName(area)}`} onClick={() => setEditing(true)}><Icon name="more" /></Button>}>
    <Dialog open={editing} onClose={() => setEditing(false)} title={t("Edit Life Area")}>
      <form className={styles.editor} onSubmit={form.handleSubmit(values => mutation.mutate(values))} noValidate>
        <fieldset disabled={mutation.isPending} className={shared.formFields}>
          <Input label={t("Display name")} required error={form.formState.errors.displayName} {...form.register('displayName')} />
          <label className={styles.toggle}><input type="checkbox" {...form.register('isActive')} />{t("Active")}</label>
          <ImageEditor area={area} setFile={setFile} remove={remove} setRemove={setRemove} focalX={focalX} focalY={focalY} />
          <div className={styles.focal}><Input label={t('Horizontal focus')} type="range" min="0" max="100" {...form.register('imageFocalX')} /><Input label={t('Vertical focus')} type="range" min="0" max="100" {...form.register('imageFocalY')} /></div>
          {mutation.isError && <p role="alert" className={shared.error}>{errorMessage(mutation.error)}</p>}
          {mutation.isSuccess && <p role="status" className={shared.feedback}>{t("Changes saved.")}</p>}
          <Button type="submit" variant="secondary" loading={mutation.isPending} disabled={!form.formState.isDirty && !file && !remove}>{t("Save changes")}</Button>
          <Button variant="dangerQuiet" onClick={() => { setEditing(false); setDeleting(true) }}>{t('Delete Life Area')}</Button>
        </fieldset>
      </form>
    </Dialog>
    <Dialog open={deleting} onClose={() => setDeleting(false)} title={t('deleteAreaTitle', { name: areaName(area) })}>
      <div className={styles.deleteArea}><QueryFeedback query={impact} />{impact.data && <><p>{t('deleteAreaImpact', impact.data)}</p><p>{t('deleteAreaRelationships')}</p><p>{t('deleteSoftHint')}</p>
        <div className={styles.dialogActions}><Button variant="secondary" onClick={() => setDeleting(false)}>{t('Cancel')}</Button><Button variant="danger" loading={removeArea.isPending} onClick={() => removeArea.mutate()}>{t('Delete Life Area')}</Button></div></>}
        <ActionFeedback action={removeArea} /></div>
    </Dialog>
  </AreaCard>
}

function NewAreaDialog({ open, onClose, queryKey }) {
  const { t } = useLanguage()
  const queryClient = useQueryClient()
  const [file, setFile] = useState(null)
  const created = useRef(null)
  const form = useForm({ resolver: zodResolver(areaSchema), defaultValues: { displayName: '', isActive: true, imageFocalX: 50, imageFocalY: 50 } })
  const focalX = useWatch({ control: form.control, name: 'imageFocalX' })
  const focalY = useWatch({ control: form.control, name: 'imageFocalY' })
  const mutation = useMutation({ mutationFn: async values => {
    let area = created.current ? await updateArea({ ...values, id: created.current.id }) : await createArea(values)
    created.current = area
    queryClient.setQueryData(queryKey, current => [...(current || []).filter(value => value.id !== area.id), area])
    queryClient.invalidateQueries({ queryKey: ['productivity'] })
    if (file) area = await uploadAreaImage(area.id, file)
    return area
  }, onSuccess: area => {
    queryClient.setQueryData(queryKey, current => [...(current || []).filter(value => value.id !== area.id), area])
    queryClient.invalidateQueries({ queryKey: ['productivity'] })
    created.current = null; form.reset(); setFile(null); onClose()
  } })
  const close = () => { if (mutation.isPending) return; created.current = null; form.reset(); setFile(null); mutation.reset(); onClose() }
  return <Dialog open={open} onClose={close} title={t('New Life Area')}><form className={styles.editor} onSubmit={form.handleSubmit(values => mutation.mutate(values))}>
    <fieldset disabled={mutation.isPending} className={shared.formFields}><Input label={t('Display name')} required error={form.formState.errors.displayName} {...form.register('displayName')} />
      <ImageEditor setFile={setFile} remove={false} setRemove={() => {}} focalX={focalX} focalY={focalY} />
      <div className={styles.focal}><Input label={t('Horizontal focus')} type="range" min="0" max="100" {...form.register('imageFocalX')} /><Input label={t('Vertical focus')} type="range" min="0" max="100" {...form.register('imageFocalY')} /></div>
      <ActionFeedback action={mutation} /><Button type="submit" loading={mutation.isPending}>{t('Create Life Area')}</Button></fieldset>
  </form></Dialog>
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
  const [creating, setCreating] = useState(false)
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
    <PageHeader action={!layoutEditing && <div className={styles.layoutActions}><Button onClick={() => setCreating(true)}><Icon name="plus" />{t('New Life Area')}</Button><Button variant="secondary" aria-expanded={filtersOpen} aria-controls="area-filters" onClick={() => setFiltersOpen(open => !open)}><Icon name="settings" />{t("areaFilters")}{selectedFilters > 0 && ` (${selectedFilters})`}</Button><Button ref={customizeButton} variant="secondary" disabled={!areas.data?.length} onClick={() => { resetFilters(); setFiltersOpen(false); setLayoutEditing(true) }}><Icon name="settings" />{t("customizeLayout")}</Button></div>} editorial title={t("Life Areas")} description={t("Find the tasks, goals and routines that belong to each part of your life.")} />
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
    <NewAreaDialog open={creating} onClose={() => setCreating(false)} queryKey={queryKey} />
  </div>
}
