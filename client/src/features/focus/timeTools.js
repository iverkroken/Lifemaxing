export const suspensionGap = 180000
export const methods = ['Pomodoro', 'Balanced', 'Deep Work', 'Quick Focus', 'Smart Focus', 'Custom']
export const presetMinutes = { Pomodoro: [25, 5], Balanced: [50, 10], 'Deep Work': [90, 20], 'Quick Focus': [15, 3] }
export const defaultPreferences = { custom: { method: 'Custom', focusMinutes: 25, breakMinutes: 5, longBreakMinutes: 20, sessionsBeforeLongBreak: 4, totalSessions: null, smartMinutes: 120 }, soundEnabled: true, sound: 'Soft Alarm', volume: 25, focusSound: true, breakSound: true, notifications: false, autoBreak: false, autoFocus: false, keepAwake: false, dailyGoalMinutes: 120, worldClockInitialized: false }
export function initialTools() { return { timer: { status: 'Idle', duration: 300000, remaining: 300000, endsAt: null }, stopwatch: { status: 'Idle', accumulated: 0, startedAt: null, laps: [] } } }
export function countdownRemaining(timer, now) { return Math.max(0, timer.status === 'Running' ? timer.endsAt - now : timer.remaining) }
export function stopwatchElapsed(watch, now) { return Math.max(0, watch.accumulated + (watch.status === 'Running' ? now - watch.startedAt : 0)) }
export function probableInterruption(last, now, frozen = false) { return frozen || now - last > suspensionGap || now < last - 2000 }
export function updateStopwatch(watch, action, now) {
  if (action === 'reset') return initialTools().stopwatch
  if (action === 'start') return { ...watch, status: 'Running', startedAt: now }
  if (action === 'pause') return { ...watch, status: 'Paused', accumulated: stopwatchElapsed(watch, now), startedAt: null }
  if (action === 'lap' && watch.status === 'Running') return { ...watch, laps: [...watch.laps, stopwatchElapsed(watch, now)] }
  return watch
}
export function formatTime(milliseconds, hours = false) {
  const seconds = Math.max(0, Math.ceil(milliseconds / 1000))
  const parts = [String(Math.floor(seconds / 60) % 60).padStart(2, '0'), String(seconds % 60).padStart(2, '0')]
  if (hours || seconds >= 3600) parts.unshift(String(Math.floor(seconds / 3600)).padStart(2, '0'))
  return parts.join(':')
}
export function readClockStorage(key, fallback, storage = localStorage) {
  try { const value = JSON.parse(storage.getItem(key)); return value && typeof value === 'object' ? value : fallback } catch { return fallback }
}
export function saveClockStorage(key, value, storage = localStorage) {
  try { storage.setItem(key, JSON.stringify(value)) } catch { /* Server focus history remains authoritative. */ }
}
function offset(zone, now) {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).formatToParts(now)
  const values = Object.fromEntries(parts.filter(x => x.type !== 'literal').map(x => [x.type, Number(x.value)]))
  return (Date.UTC(values.year, values.month - 1, values.day, values.hour, values.minute, values.second) - Math.floor(now / 1000) * 1000) / 60000
}
export function worldTime(zone, now, locale, localZone = Intl.DateTimeFormat().resolvedOptions().timeZone) {
  const difference = offset(zone, now) - offset(localZone, now)
  const hours = Math.floor(Math.abs(difference) / 60), minutes = Math.abs(difference) % 60
  return { time: new Intl.DateTimeFormat(locale, { timeZone: zone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(now),
    date: new Intl.DateTimeFormat(locale, { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now),
    difference: `${difference > 0 ? '+' : difference < 0 ? '−' : ''}${hours}h${minutes ? ` ${minutes}m` : ''}` }
}
