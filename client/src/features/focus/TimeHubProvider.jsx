import { useCallback, useEffect, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { apiRequest } from '../../shared/api/client.js'
import { useLanguage } from '../settings/language.js'
import { TimeHubContext } from './TimeHubContext.js'
import { createFocusAudio } from './focusAudio.js'
import { countdownRemaining, defaultPreferences, initialTools, probableInterruption, readClockStorage, saveClockStorage, updateStopwatch } from './timeTools.js'
import styles from './TimeHubProvider.module.css'

export function TimeHubProvider({ user, children }) {
  const client = useQueryClient(), { t } = useLanguage()
  const key = ['productivity', user.id, '/focus-runs/active']
  const active = useQuery({ queryKey: key, queryFn: async ({ signal }) => ({ ...await apiRequest('/focus-runs/active', { signal }), receivedAt: Date.now() }), refetchInterval: 15000 })
  const preferencesQuery = useQuery({ queryKey: ['productivity', user.id, '/focus-preferences'], queryFn: ({ signal }) => apiRequest('/focus-preferences', { signal }) })
  const preferences = preferencesQuery.data || defaultPreferences
  const storageKey = `lifemaxing.time.${user.id}`
  const [controllerId] = useState(() => {
    const saved = readClockStorage(storageKey + '.controller', null, sessionStorage)
    const value = saved?.id || crypto.randomUUID()
    saveClockStorage(storageKey + '.controller', { id: value }, sessionStorage); return value
  })
  const [tools, setTools] = useState(() => {
    const saved = readClockStorage(storageKey, initialTools(), sessionStorage)
    return saved.timer && saved.stopwatch ? saved : initialTools()
  })
  const [now, setNow] = useState(Date.now), [pending, setPending] = useState(false), [error, setError] = useState(() => readClockStorage(storageKey + '.pending', null, sessionStorage) ? new Error('Retry the unsaved focus change first.') : null)
  const [feedback, setFeedback] = useState(null)
  const [announcement, setAnnouncement] = useState('')
  const audio = useRef(null), current = useRef(null), busy = useRef(false), receipt = useRef(readClockStorage(storageKey + '.pending', null, sessionStorage))
  const continuity = useRef(readClockStorage(storageKey + '.focus', null))
  const notified = useRef(readClockStorage(storageKey + '.notice', {}))
  const mounted = useRef(true)
  const run = active.data?.run || null
  const serverOffset = run?.serverNow && active.data?.receivedAt ? Date.parse(run.serverNow) - active.data.receivedAt : 0
  useEffect(() => { current.current = { run, preferences, t, serverOffset } }, [run, preferences, t, serverOffset])
  useEffect(() => { saveClockStorage(storageKey, tools, sessionStorage) }, [storageKey, tools])
  useEffect(() => { mounted.current = true; audio.current = createFocusAudio(); return () => { mounted.current = false; audio.current?.close() } }, [])

  const perform = useCallback(async (action, extra = {}) => {
    if (busy.current) return null
    const value = current.current?.run
    const replay = action === 'retry' ? receipt.current : null
    const path = replay?.path || (action === 'start' ? '/focus-runs' : value ? `/focus-runs/${value.id}/action` : null)
    if (!path) return null
    const body = replay?.body || (action === 'start' ? { controllerId, ...extra } : { action, controllerId, revision: value.revision, ...extra })
    const signature = replay?.signature || JSON.stringify([path, body])
    if (receipt.current && receipt.current.signature !== signature) {
      setError(new Error('Retry the unsaved focus change first.')); return null
    }
    const command = receipt.current || { path, body, signature, id: crypto.randomUUID() }
    receipt.current = command; busy.current = true; setPending(true); setError(null)
    saveClockStorage(storageKey + '.pending', command, sessionStorage)
    try {
      const result = await apiRequest(command.path, { method: 'POST', body: command.body, headers: { ClientActionId: command.id } })
      receipt.current = null
      saveClockStorage(storageKey + '.pending', null, sessionStorage)
      if (!mounted.current) return null
      const receivedAt = Date.now()
      client.setQueryData(['productivity', user.id, '/focus-runs/active'], { run: result.endedAtUtc ? null : result, receivedAt })
      current.current = { ...current.current, run: result.endedAtUtc ? null : result, serverOffset: Date.parse(result.serverNow) - receivedAt || 0 }
      continuity.current = { id: result.id, period: result.periodIndex, last: Date.now(), interrupted: result.state === 'Interrupted' }
      saveClockStorage(storageKey + '.focus', continuity.current)
      if (action !== 'checkpoint' || result.state !== 'Running') {
        if (result.progression?.xpChange) setFeedback(result)
        setAnnouncement(t(result.state === 'Interrupted' ? 'Focus was interrupted' : result.state === 'Ready' ? result.phase + ' complete' : result.state === 'Ended' ? 'Session recorded.' : result.phase + ' ' + result.state.toLowerCase()))
        await client.invalidateQueries({ predicate: query => query.queryKey[0] === 'productivity' && query.queryKey[1] === user.id && (command.body.completeTask || ['/focus-sessions', '/focus-summary', '/progress', '/activity'].some(path => String(query.queryKey[2]).split('?')[0].startsWith(path))) })
      }
      return result
    } catch (failure) {
      if (!mounted.current) return null
      if (failure.status >= 400 && failure.status < 500) { receipt.current = null; saveClockStorage(storageKey + '.pending', null, sessionStorage); await client.invalidateQueries({ queryKey: ['productivity', user.id, '/focus-runs/active'] }) }
      setError(failure); return null
    } finally { busy.current = false; if (mounted.current) setPending(false) }
  }, [client, controllerId, storageKey, user.id, t])
  const performRef = useRef(perform)
  useEffect(() => { performRef.current = perform }, [perform])

  useEffect(() => {
    const tick = (forced = false) => {
      const time = Date.now(); setNow(time)
      const value = current.current?.run
      if (!value || value.state !== 'Running' || value.controllerId !== controllerId) return
      const last = continuity.current
      const same = last?.id === value.id && last.period === value.periodIndex
      const interrupted = same && (last.interrupted || probableInterruption(last.last, time, forced))
      continuity.current = { id: value.id, period: value.periodIndex, last: interrupted ? last.last : time, interrupted }
      saveClockStorage(storageKey + '.focus', continuity.current)
      const serverTime = time + (current.current.serverOffset || 0)
      const elapsed = serverTime - Date.parse(value.lastObservedAtUtc)
      if (!busy.current && (interrupted || elapsed >= 15000 || (value.endsAtUtc && serverTime >= Date.parse(value.endsAtUtc))))
        void performRef.current('checkpoint', { interrupted: Boolean(interrupted) })
    }
    const timer = setInterval(() => tick(), 1000)
    const visible = () => tick()
    const freeze = () => tick(true)
    document.addEventListener('visibilitychange', visible); document.addEventListener('freeze', freeze)
    document.addEventListener('resume', visible); window.addEventListener('pageshow', visible); window.addEventListener('pagehide', visible)
    window.addEventListener('focus', visible)
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', visible); document.removeEventListener('freeze', freeze); document.removeEventListener('resume', visible); window.removeEventListener('pageshow', visible); window.removeEventListener('pagehide', visible); window.removeEventListener('focus', visible) }
  }, [controllerId, storageKey])

  const notify = useCallback((phase, prefs) => {
    void audio.current?.play(prefs, phase)
    if (prefs.notifications && 'Notification' in globalThis && Notification.permission === 'granted') {
      try { new Notification(t(phase + ' complete'), { body: t(phase === 'Focus' ? 'Your focus interval is finished.' : phase === 'Break' ? 'Your next focus session is ready.' : 'Your timer is finished.'), tag: 'lifemaxing-' + phase }) } catch { /* Unsupported browser notification delivery does not affect timing. */ }
    }
  }, [t])
  useEffect(() => {
    if (!run || run.state !== 'Ready' || run.controllerId !== controllerId || !preferencesQuery.isSuccess) return
    const notice = `${run.id}:${run.periodIndex}`
    if (!notified.current[notice]) { notified.current = { [notice]: true }; saveClockStorage(storageKey + '.notice', notified.current); notify(run.phase, preferences) }
    if (!run.blockAutoStart && !pending && !error && ((run.phase === 'Focus' && preferences.autoBreak) || (run.phase === 'Break' && preferences.autoFocus)))
      void perform('next')
  }, [run, controllerId, preferences, preferencesQuery.isSuccess, pending, error, perform, notify, storageKey])
  useEffect(() => {
    if (tools.timer.status !== 'Running') return
    const check = () => {
      if (countdownRemaining(tools.timer, Date.now()) > 0) return
      setTools(value => ({ ...value, timer: { ...value.timer, status: 'Complete', remaining: 0, endsAt: null } }))
      setAnnouncement(t('Timer complete')); notify('Timer', preferences)
      clearInterval(interval)
    }
    const interval = setInterval(check, 250)
    return () => clearInterval(interval)
  }, [tools.timer, notify, preferences, t])
  useEffect(() => {
    if (!preferences.keepAwake || run?.state !== 'Running' || run.controllerId !== controllerId || !navigator.wakeLock) return
    let sentinel, disposed = false
    const acquire = async () => { if (document.visibilityState !== 'visible') return; try { const lock = await navigator.wakeLock.request('screen'); if (disposed) await lock.release(); else sentinel = lock } catch { /* Progressive enhancement. */ } }
    void acquire(); document.addEventListener('visibilitychange', acquire)
    return () => { disposed = true; sentinel?.release().catch(() => {}); document.removeEventListener('visibilitychange', acquire) }
  }, [preferences.keepAwake, run?.state, run?.controllerId, controllerId])
  const timerAction = (action, duration) => {
    void audio.current?.initialize()
    setTools(value => {
      const timer = value.timer, time = Date.now()
      if (action === 'duration' || action === 'reset') return { ...value, timer: { status: 'Idle', duration: duration || timer.duration, remaining: duration || timer.duration, endsAt: null } }
      if (action === 'pause') return { ...value, timer: { ...timer, status: 'Paused', remaining: countdownRemaining(timer, time), endsAt: null } }
      return { ...value, timer: { ...timer, status: 'Running', endsAt: time + (timer.status === 'Complete' ? timer.duration : timer.remaining) } }
    })
  }
  return <TimeHubContext.Provider value={{ run, active, preferences, preferencesQuery, pending, error, now, focusNow: now + serverOffset, tools, controllerId, announcement, feedback,
    perform, retry: () => receipt.current ? perform('retry') : active.refetch(),
    initializeAudio: () => audio.current?.initialize(), previewSound: prefs => audio.current?.play(prefs, 'Timer', true),
    timerAction, stopwatchAction: action => setTools(value => ({ ...value, stopwatch: updateStopwatch(value.stopwatch, action, Date.now()) })) }}>
    {children}<span className={styles.announcement} role="status" aria-live="polite">{announcement}</span>
  </TimeHubContext.Provider>
}
