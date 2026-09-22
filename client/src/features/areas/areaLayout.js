import { artwork } from './areaPresentation.js'

// The current collection has one full-row card. Its slot counts ordinary cards,
// so moving an ordinary card never changes which row the wide card occupies.
export function rowSlots(count) {
  return Array.from({ length: Math.floor(count / 3) + 1 }, (_, index) => index * 3)
}

export function createLayout(areas) {
  const wideIndex = areas.findIndex(area => artwork[area.key]?.layout === 'wide')
  const wide = wideIndex < 0 ? null : areas[wideIndex].id
  const regular = areas.filter(area => area.id !== wide).map(area => area.id)
  const slots = rowSlots(regular.length)
  const slot = slots.reduce((nearest, value) => Math.abs(value - wideIndex) < Math.abs(nearest - wideIndex) ? value : nearest, 0)
  return { regular, wide, slot }
}

export function layoutIds(layout) {
  const ids = [...layout.regular]
  if (layout.wide) ids.splice(layout.slot, 0, layout.wide)
  return ids
}

export function moveArea(layout, id, direction) {
  if (id === layout.wide) {
    const slots = rowSlots(layout.regular.length)
    const next = slots[slots.indexOf(layout.slot) + direction]
    return next === undefined ? layout : { ...layout, slot: next }
  }
  const index = layout.regular.indexOf(id)
  const next = index + direction
  if (index < 0 || next < 0 || next >= layout.regular.length) return layout
  const regular = [...layout.regular]
  regular.splice(index, 1)
  regular.splice(next, 0, id)
  return { ...layout, regular }
}

export function dropArea(layout, id, target) {
  if (id === target) return layout
  if (id === layout.wide) {
    const index = layout.regular.indexOf(target)
    if (index < 0) return layout
    const slots = rowSlots(layout.regular.length)
    const slot = slots.reduce((nearest, value) => Math.abs(value - index) < Math.abs(nearest - index) ? value : nearest, 0)
    return { ...layout, slot }
  }
  const from = layout.regular.indexOf(id)
  const to = target === layout.wide ? Math.min(layout.slot, layout.regular.length - 1) : layout.regular.indexOf(target)
  if (from < 0 || to < 0) return layout
  const regular = [...layout.regular]
  regular.splice(from, 1)
  regular.splice(to, 0, id)
  return { ...layout, regular }
}
