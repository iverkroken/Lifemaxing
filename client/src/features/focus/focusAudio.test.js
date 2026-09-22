import { afterEach, expect, test, vi } from 'vitest'
import { createFocusAudio, normalizeSound, sounds } from './focusAudio.js'
import { defaultPreferences } from './timeTools.js'

afterEach(() => vi.unstubAllGlobals())
test('saved legacy sound selections retain a corresponding completion profile', () => {
  expect(['Soft Chime', 'Bell', 'Digital', 'Ambient', 'Minimal'].map(normalizeSound)).toEqual(['Rising Chime', 'Focus Bell', 'Gentle Digital', 'Ambient Alert', 'Minimal Alarm'])
  expect(normalizeSound('unknown')).toBe('Soft Alarm')
})
test('sound flags suppress playback and preview uses the saved volume', async () => {
  const levels = [], notes = []
  class Audio {
    state = 'running'; currentTime = 0; destination = {}
    createGain() { return { connect() {}, disconnect() {}, gain: { setValueAtTime() {}, linearRampToValueAtTime: level => levels.push(level), exponentialRampToValueAtTime() {} } } }
    createOscillator() { const oscillator = { type: '', frequency: {}, connect() {}, disconnect() {}, start() { notes.push(this.frequency.value) }, stop() {} }; return oscillator }
    close() { return Promise.resolve() }
  }
  vi.stubGlobal('AudioContext', Audio)
  const audio = createFocusAudio()
  expect(await audio.play({ ...defaultPreferences, soundEnabled: false }, 'Focus')).toBe(false)
  expect(await audio.play({ ...defaultPreferences, focusSound: false }, 'Focus')).toBe(false)
  expect(await audio.play({ ...defaultPreferences, breakSound: false }, 'Break')).toBe(false)
  expect(notes).toEqual([])
  expect(await audio.play({ ...defaultPreferences, volume: 0 }, 'Timer', true)).toBe(false)
  expect(notes).toEqual([])
  expect(await audio.play({ ...defaultPreferences, volume: 50 }, 'Timer', true)).toBe(true)
  expect(levels.length).toBeGreaterThanOrEqual(3)
  expect(levels.every(level => level > 0 && level <= 0.15)).toBe(true)
  for (const sound of sounds) expect(await audio.play({ ...defaultPreferences, sound }, 'Timer')).toBe(true)
  expect(new Set(notes).size).toBeGreaterThan(5)
  audio.close()
})
test('all seven completion profiles have spaced motifs, gentle envelopes and node cleanup', async () => {
  const played = [], levels = []
  vi.stubGlobal('AudioContext', class {
    state = 'running'; currentTime = 10; destination = {}
    createGain() { return { connect() {}, disconnect: vi.fn(), gain: { setValueAtTime() {}, linearRampToValueAtTime: (level, at) => levels.push({ level, at }), exponentialRampToValueAtTime() {} } } }
    createOscillator() { const node = { frequency: {}, connect() {}, disconnect: vi.fn(), start(at) { this.startAt = at; played.push(this) }, stop(at) { this.stopAt = at } }; return node }
    close() { return Promise.resolve() }
  })
  expect(sounds).toEqual(['Soft Alarm', 'Focus Bell', 'Gentle Digital', 'Rising Chime', 'Ambient Alert', 'Warm Gong', 'Minimal Alarm'])
  const audio = createFocusAudio(), motifs = []
  for (const sound of sounds) {
    played.length = 0; levels.length = 0
    expect(await audio.play({ ...defaultPreferences, sound, focusSound: false, breakSound: false }, 'Timer')).toBe(true)
    expect(new Set(played.map(node => node.startAt)).size).toBeGreaterThanOrEqual(3)
    expect(played.every(node => node.stopAt > node.startAt + 0.15)).toBe(true)
    expect(levels.every(({ level, at }) => level > 0 && level < 0.15 && at > 10)).toBe(true)
    motifs.push(played.map(node => [node.frequency.value, node.startAt]))
    for (const node of played) { node.onended(); expect(node.disconnect).toHaveBeenCalled() }
  }
  expect(new Set(motifs.map(value => JSON.stringify(value))).size).toBe(7)
  played.length = 0; levels.length = 0
  await audio.play({ ...defaultPreferences, volume: 25 }, 'Timer')
  const quiet = levels.map(x => x.level)
  levels.length = 0
  await audio.play({ ...defaultPreferences, volume: 50 }, 'Timer')
  expect(levels.map(x => x.level)).toEqual(quiet.map(x => x * 2))
  audio.close()
})
test('unsupported or blocked audio does not break a timer', async () => {
  vi.stubGlobal('AudioContext', undefined)
  expect(await createFocusAudio().play(defaultPreferences)).toBe(false)
  vi.stubGlobal('AudioContext', class { constructor() { throw new Error('blocked') } })
  expect(await createFocusAudio().initialize()).toBe(false)
})
