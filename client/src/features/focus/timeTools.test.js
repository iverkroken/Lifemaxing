import { describe, expect, test } from 'vitest'
import { countdownRemaining, stopwatchElapsed, probableInterruption, worldTime, initialTools, updateStopwatch } from './timeTools.js'

describe('timestamp based tools', () => {
  test('regular timer expires over sleep while paused time remains unchanged', () => {
    expect(countdownRemaining({ status: 'Running', endsAt: 1800000 }, 3600000)).toBe(0)
    expect(countdownRemaining({ status: 'Paused', remaining: 123000 }, 3600000)).toBe(123000)
  })
  test('ordinary background throttling is not suspension; long gaps and freeze are', () => {
    expect(probableInterruption(0, 65000)).toBe(false)
    expect(probableInterruption(0, 2400000)).toBe(true)
    expect(probableInterruption(0, 10000, true)).toBe(true)
  })
  test('stopwatch pauses, resumes, laps and resets without counting pause time', () => {
    let watch = updateStopwatch(initialTools().stopwatch, 'start', 1000)
    watch = updateStopwatch(watch, 'lap', 51000)
    expect(watch.laps).toEqual([50000])
    watch = updateStopwatch(watch, 'pause', 61000)
    expect(stopwatchElapsed(watch, 100000)).toBe(60000)
    watch = updateStopwatch(watch, 'start', 121000)
    expect(stopwatchElapsed(watch, 131000)).toBe(70000)
    expect(updateStopwatch(watch, 'reset', 131000)).toEqual(initialTools().stopwatch)
  })
  test('world time respects date rollover, DST and fractional offsets', () => {
    const instant = Date.parse('2026-09-22T17:21:00Z')
    expect(worldTime('Asia/Tokyo', instant, 'en-GB', 'Europe/Budapest')).toMatchObject({ time: '02:21', date: '23/09/2026', difference: '+7h' })
    expect(worldTime('Asia/Kolkata', instant, 'en-GB', 'UTC').difference).toBe('+5h 30m')
    expect(worldTime('Europe/London', Date.parse('2026-01-22T12:00:00Z'), 'en-GB', 'UTC').difference).toBe('0h')
    expect(worldTime('Europe/London', instant, 'en-GB', 'UTC').difference).toBe('+1h')
  })
})
