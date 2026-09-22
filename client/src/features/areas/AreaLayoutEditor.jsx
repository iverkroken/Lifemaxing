import { useEffect, useRef, useState } from 'react'
import { DragDropProvider, DragOverlay, useDraggable, useDroppable } from '@dnd-kit/react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '../../shared/ui/Button.jsx'
import { Icon } from '../../shared/ui/Icon.jsx'
import { useLanguage } from '../settings/language.js'
import { AreaCard } from './AreaCard.jsx'
import { createLayout, dropArea, layoutIds, moveArea } from './areaLayout.js'
import { updateAreaOrder } from './areasApi.js'
import styles from './AreaPage.module.css'
import shared from '../../shared/ui/Productivity.module.css'

function MovableArea({ area, draft, move, disabled, marker }) {
  const { t, areaName } = useLanguage()
  const { ref: dragRef, isDragSource } = useDraggable({ id: area.id, disabled })
  const { ref: dropRef } = useDroppable({ id: area.id, disabled })
  return <AreaCard area={area} layoutEditing ref={element => { dragRef(element); dropRef(element) }}
    data-dragging={isDragSource} data-drop-marker={marker} data-movable={!disabled} role="group" tabIndex={disabled ? -1 : 0} aria-describedby="layout-hint"
    action={<span className={styles.dragHint} title={`${t('dragArea')}: ${areaName(area)}`}><Icon name="areas" /></span>}
    controls={<div className={styles.moveControls}>
      {[-1, 1].map(direction => <Button key={direction} variant="secondary" disabled={disabled || moveArea(draft, area.id, direction) === draft} onClick={() => move(area.id, direction)}>{t(direction < 0 ? 'moveEarlier' : 'moveLater')}</Button>)}
    </div>} />
}

export function AreaLayoutEditor({ areas, queryKey, onClose }) {
  const { t, areaName, errorMessage } = useLanguage()
  const queryClient = useQueryClient()
  const [draft, setDraft] = useState(() => createLayout(areas))
  const [announcement, setAnnouncement] = useState('')
  const [target, setTarget] = useState(null)
  const [source, setSource] = useState(null)
  const hint = useRef(null)
  useEffect(() => { hint.current?.focus() }, [])
  const mutation = useMutation({
    mutationFn: () => updateAreaOrder(layoutIds(draft)),
    onSuccess: saved => {
      queryClient.setQueryData(queryKey, saved)
      queryClient.invalidateQueries({ queryKey: ['productivity'] })
      onClose()
    },
  })
  const byId = new Map(areas.map(area => [area.id, area]))
  const apply = (next, id) => {
    setDraft(next)
    setAnnouncement(t('areaMoved', { name: areaName(byId.get(id)), position: layoutIds(next).indexOf(id) + 1 }))
  }
  const preview = source && target ? dropArea(draft, source, target) : draft
  const wideMarker = source === draft.wide && target
    ? (draft.regular[preview.slot] ?? draft.regular.at(-1)) : null
  return <div className={shared.stack}>
    <div className={styles.layoutToolbar}>
      <p id="layout-hint" ref={hint} tabIndex={-1}>{t('layoutHint')}</p>
      <div className={styles.layoutActions}>
        <Button variant="secondary" disabled={mutation.isPending || !!source} onClick={onClose}>{t('layoutCancel')}</Button>
        <Button loading={mutation.isPending} disabled={mutation.isPending || !!source} onClick={() => mutation.mutate()}>{t('saveLayout')}</Button>
      </div>
    </div>
    {mutation.isError && <p role="alert" className={shared.error}>{t('layoutSaveFailed')} {mutation.error.status === 404 ? t('layoutApiUnavailable') : errorMessage(mutation.error)}</p>}
    <p role="status" className={styles.layoutStatus}>{announcement || t('layoutDraft')}</p>
    <DragDropProvider
      onDragStart={event => setSource(event.operation.source.id)}
      onDragOver={event => setTarget(event.operation.target?.id ?? null)}
      onDragEnd={event => {
        if (!event.canceled && event.operation.source && event.operation.target) apply(dropArea(draft, event.operation.source.id, event.operation.target.id), event.operation.source.id)
        setSource(null)
        setTarget(null)
      }}>
      <div className={styles.grid}>
        {layoutIds(draft).map(id => <MovableArea key={id} area={byId.get(id)} draft={draft} disabled={mutation.isPending}
          marker={wideMarker === id ? (preview.slot === draft.regular.length ? 'after' : 'before') : source !== draft.wide && target === id ? 'target' : undefined}
          move={(id, direction) => apply(moveArea(draft, id, direction), id)} />)}
      </div>
      <DragOverlay dropAnimation={null}>{item => <div className={styles.dragPreview}>{areaName(byId.get(item.id))}</div>}</DragOverlay>
    </DragDropProvider>
  </div>
}
