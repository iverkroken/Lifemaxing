import { expect, it } from 'vitest'
import { filterAreas, hasAreaCounts, needsAreaCounts, readAreaFilters } from './areaFilters.js'

const areas = [{ id: 'a', displayName: 'Zulu', isActive: true }, { id: 'b', displayName: 'Alpha', isActive: false }, { id: 'c', displayName: 'Beta', isActive: true }]
const counts = [{ id: 'a', tasks: 2, goals: 0, habits: 1 }, { id: 'b', tasks: 2, goals: 3, habits: 0 }, { id: 'c', tasks: 0, goals: 0, habits: 0 }]
const view = (values = {}) => filterAreas(areas, counts, { sort: 'custom', status: 'all', content: 'all', ...values }, area => area.displayName, 'en').map(area => area.id)

it('sorts all counts both ways and preserves saved order on ties', () => {
  expect(view()).toEqual(['a', 'b', 'c'])
  expect(view({ sort: 'name' })).toEqual(['b', 'c', 'a'])
  expect(view({ sort: 'tasks-desc' })).toEqual(['a', 'b', 'c'])
  expect(view({ sort: 'tasks-asc' })).toEqual(['c', 'a', 'b'])
  expect(view({ sort: 'goals-desc' })).toEqual(['b', 'a', 'c'])
  expect(view({ sort: 'goals-asc' })).toEqual(['a', 'c', 'b'])
  expect(view({ sort: 'habits-desc' })).toEqual(['a', 'b', 'c'])
  expect(view({ sort: 'habits-asc' })).toEqual(['b', 'c', 'a'])
  expect(areas[0].id).toBe('a')
})

it('combines status and content and distinguishes missing counts from zero', () => {
  expect(view({ status: 'active', content: 'filled' })).toEqual(['a'])
  expect(view({ status: 'inactive', content: 'empty' })).toEqual([])
  expect(view({ content: 'empty' })).toEqual(['c'])
  expect(hasAreaCounts(areas, counts)).toBe(true)
  expect(hasAreaCounts(areas, counts.slice(1))).toBe(false)
  expect(hasAreaCounts(areas, undefined)).toBe(false)
  expect(needsAreaCounts({ content: 'all', sort: 'name' })).toBe(false)
  expect(needsAreaCounts({ content: 'empty', sort: 'custom' })).toBe(true)
  expect(readAreaFilters(new URLSearchParams('sort=bad&status=bad&content=bad'))).toEqual({ sort: 'custom', status: 'all', content: 'all' })
})
