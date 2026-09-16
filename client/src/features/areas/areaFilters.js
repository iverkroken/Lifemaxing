export const areaSorts = ['custom', 'name', 'tasks-desc', 'tasks-asc', 'goals-desc', 'goals-asc', 'habits-desc', 'habits-asc']

export function readAreaFilters(params) {
  return {
    sort: areaSorts.includes(params.get('sort')) ? params.get('sort') : 'custom',
    status: ['active', 'inactive'].includes(params.get('status')) ? params.get('status') : 'all',
    content: ['filled', 'empty'].includes(params.get('content')) ? params.get('content') : 'all',
  }
}

export function needsAreaCounts(filters) {
  return filters.content !== 'all' || filters.sort.includes('-')
}

export function hasAreaCounts(areas, counts) {
  const byId = new Map(counts?.map(row => [row.id, row]))
  return areas.every(area => ['tasks', 'goals', 'habits'].every(key => Number.isFinite(byId.get(area.id)?.[key])))
}

export function filterAreas(areas, counts, filters, areaName, locale) {
  const byId = new Map(counts?.map(row => [row.id, row]))
  const result = areas.filter(area => {
    if (filters.status !== 'all' && area.isActive !== (filters.status === 'active')) return false
    if (filters.content === 'all') return true
    const row = byId.get(area.id)
    if (!row || !['tasks', 'goals', 'habits'].every(key => Number.isFinite(row[key]))) return false
    const filled = row.tasks + row.goals + row.habits > 0
    return filters.content === 'filled' ? filled : !filled
  })
  // Stable sort preserves the saved order for equal counts or equal names.
  if (filters.sort === 'name') result.sort((a, b) => areaName(a).localeCompare(areaName(b), locale))
  else if (filters.sort.includes('-')) {
    const [key, direction] = filters.sort.split('-')
    result.sort((a, b) => (byId.get(a.id)[key] - byId.get(b.id)[key]) * (direction === 'asc' ? 1 : -1))
  }
  return result
}
