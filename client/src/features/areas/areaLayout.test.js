import { describe, expect, it } from 'vitest'
import { createLayout, dropArea, layoutIds, moveArea } from './areaLayout.js'

const areas = [...Array.from({ length: 9 }, (_, id) => ({ id: `${id}`, key: `area-${id}` })), { id: 'wide', key: 'personal' }]

describe('Life Area layout drafts', () => {
  it('preserves the default order and supports every full-row wide position', () => {
    let draft = createLayout(areas)
    expect(layoutIds(draft)).toEqual(areas.map(area => area.id))
    for (const slot of [6, 3, 0]) {
      draft = moveArea(draft, 'wide', -1)
      expect(layoutIds(draft).indexOf('wide')).toBe(slot)
    }
    expect(moveArea(draft, 'wide', -1)).toBe(draft)
    expect(dropArea(draft, 'wide', '8').slot).toBe(9)
  })
  it('reorders regular cards without moving the wide row or mutating the snapshot', () => {
    const original = createLayout(areas)
    const draft = moveArea(moveArea(original, 'wide', -1), '0', 1)
    expect(draft.slot).toBe(6)
    expect(draft.regular.slice(0, 2)).toEqual(['1', '0'])
    expect(dropArea(draft, '0', '8').regular.at(-1)).toBe('0')
    expect(original.regular[0]).toBe('0')
    expect(original.slot).toBe(9)
  })
  it('normalizes legacy positions only in the draft and supports collections without a wide card', () => {
    const legacy = [...areas.slice(0, 2), areas[9], ...areas.slice(2, 9)]
    expect(createLayout(legacy).slot).toBe(3)
    expect(legacy[2].id).toBe('wide')
    const regular = createLayout(areas.slice(0, 4))
    expect(layoutIds(regular)).toEqual(['0', '1', '2', '3'])
    expect(dropArea(regular, '0', '3').regular).toEqual(['1', '2', '3', '0'])
    expect(dropArea(regular, 'missing', '1')).toBe(regular)
  })
})
