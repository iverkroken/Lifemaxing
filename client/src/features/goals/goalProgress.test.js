import { expect, test } from 'vitest'
import { goalProgress } from './goalProgress.js'

test('progress reflects both directions and keeps regression and overshoot honest', () => {
  expect(goalProgress({ baselineValue: 0, targetValue: 10 }, { value: 3 })).toBe(30)
  expect(goalProgress({ baselineValue: 10, targetValue: 0 }, { value: 7 })).toBe(30)
  expect(goalProgress({ baselineValue: 10, targetValue: 0 }, { value: 12 })).toBe(-20)
  expect(goalProgress({ baselineValue: 0, targetValue: 10 }, { value: 12 })).toBe(120)
})

test('a baseline or a qualitative note is not fabricated recorded progress', () => {
  expect(goalProgress({ baselineValue: 0, targetValue: 10 }, undefined)).toBeNull()
  expect(goalProgress({ targetValue: null }, { note: 'Draft written' })).toBeNull()
})
