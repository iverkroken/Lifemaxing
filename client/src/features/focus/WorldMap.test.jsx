import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, expect, test } from 'vitest'
import { WorldMap } from './WorldMap.jsx'
import { cityLocation } from './worldLocations.js'
import { worldTime } from './timeTools.js'

afterEach(cleanup)
test('map pins follow selected cities and use named alias coordinates', () => {
  const tokyo = { id: 'tokyo', name: 'Tokyo', timeZoneId: 'Asia/Tokyo' }
  const oslo = { id: 'oslo', name: 'Oslo', timeZoneId: 'Europe/Oslo' }
  const { rerender } = render(<WorldMap cities={[tokyo]} />)
  const map = screen.getByRole('img', { name: 'World map' })
  expect(map.querySelectorAll('[data-city-pin]')).toHaveLength(1)
  rerender(<WorldMap cities={[tokyo, oslo]} />)
  expect(map.querySelectorAll('[data-city-pin]')).toHaveLength(2)
  rerender(<WorldMap cities={[oslo]} />)
  expect(map.querySelector('[data-city-pin="tokyo"]')).toBeNull()
  const washington = cityLocation({ name: 'Washington, DC', timeZoneId: 'America/New_York' })
  const newYork = cityLocation({ name: 'New York', timeZoneId: 'America/New_York' })
  expect(washington.x).toBeCloseTo(102.9631, 3)
  expect(washington.x).not.toBe(newYork.x)
  expect(cityLocation({ name: 'UTC', timeZoneId: 'Etc/UTC' })).toBeNull()
  expect(cityLocation({ name: 'Local time', timeZoneId: 'Europe/Oslo' }).representative).toBe(true)
})
test('geographic aliases cover browser city zones without supplying hardcoded time offsets', () => {
  for (const timeZoneId of Intl.supportedValuesOf('timeZone')) {
    if (timeZoneId.startsWith('Etc/')) continue
    const point = cityLocation({ timeZoneId, name: '' })
    expect(point, timeZoneId).not.toBeNull()
    expect(point.x).toBeGreaterThanOrEqual(0); expect(point.x).toBeLessThanOrEqual(360)
    expect(point.y).toBeGreaterThanOrEqual(0); expect(point.y).toBeLessThanOrEqual(180)
  }
  const winter = worldTime('America/New_York', Date.parse('2026-01-20T12:00:00Z'), 'en-GB', 'Europe/London')
  const mismatchWeek = worldTime('America/New_York', Date.parse('2026-03-20T12:00:00Z'), 'en-GB', 'Europe/London')
  expect(winter.difference).toBe('−5h')
  expect(mismatchWeek.difference).toBe('−4h')
})
