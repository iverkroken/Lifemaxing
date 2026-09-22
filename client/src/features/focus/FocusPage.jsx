import { useState } from 'react'
import { useSearchParams, Link } from 'react-router'
import { useLanguage } from '../settings/language.js'
import { useProductivity, useProductivityAction } from '../../shared/api/productivity.js'
import { Button } from '../../shared/ui/Button.jsx'
import { Icon } from '../../shared/ui/Icon.jsx'
import { Dialog } from '../../shared/ui/Dialog.jsx'
import { HeroArtwork } from '../../shared/ui/HeroArtwork.jsx'
import { AreaLabel } from '../../shared/ui/AreaLabel.jsx'
import { QueryFeedback, Pagination, ActionFeedback } from '../../shared/ui/ProductivityFeedback.jsx'
import { TodayHabits } from '../habits/TodayHabits.jsx'
import { FocusPicker, FocusEntityContext } from './FocusPicker.jsx'
import { FocusMethods } from './FocusMethods.jsx'
import { FocusSettings } from './FocusSettings.jsx'
import { FocusProgress } from './FocusProgress.jsx'
import { TimerFace, CountdownMode, StopwatchMode } from './ClockModes.jsx'
import { WorldClock } from './WorldClock.jsx'
import { LegacyFocusPage } from './LegacyFocusPage.jsx'
import { useTimeHub } from './TimeHubContext.js'
import { presetMinutes, formatTime } from './timeTools.js'
import styles from './FocusPage.module.css'

const modes = [['Focus', 'focus'], ['Timer', 'timer'], ['Stopwatch', 'stopwatch'], ['World Clock', 'languageTime']]
function referenceDetails(reference = {}) { return reference.taskId ? ['tasks', reference.taskId] : reference.goalId ? ['goals', reference.goalId] : reference.habitId ? ['habits', reference.habitId] : [null, null] }

export function FocusPage() {
  const { t } = useLanguage(), hub = useTimeHub(), [params, setParams] = useSearchParams()
  const [mode, setMode] = useState('Focus'), [method, setMethod] = useState('Pomodoro')
  const [panel, setPanel] = useState(null), [smartMinutes, setSmartMinutes] = useState(120), [reviewed, setReviewed] = useState(false)
  const [selection, setSelection] = useState(() => Object.fromEntries(['taskId', 'goalId', 'habitId'].filter(key => params.has(key)).map(key => [key, params.get(key)])))
  const legacy = useProductivity('/focus-sessions/active'), summary = useProductivity('/focus-summary', { refetchInterval: 30000 })
  const run = hub.run, reference = run?.reference || selection
  const [kind, id] = referenceDetails(reference)
  const entity = useProductivity(`/${kind}/${id}`, { enabled: Boolean(id) }), areas = useProductivity('/areas', { enabled: Boolean(id) })
  const legacySession = !run && legacy.data?.session && !legacy.data.session.focusRunId ? legacy.data.session : null
  const select = async value => {
    if (run && !(await hub.perform('reference', { reference: value }))) return
    setSelection(value); setPanel(null); setParams({}, { replace: true })
  }
  const defaultMinutes = method === 'Custom' ? hub.preferences.custom.focusMinutes : method === 'Smart Focus' ? smartMinutes : presetMinutes[method][0]
  const remaining = run?.state === 'Running' ? Math.max(0, Math.min(run.remainingSeconds * 1000, Date.parse(run.endsAtUtc) - hub.focusNow)) : (run?.remainingSeconds ?? defaultMinutes * 60) * 1000
  const runAction = action => { void hub.initializeAudio(); void hub.perform(action) }
  const start = () => { void hub.initializeAudio(); void hub.perform('start', { configuration: method === 'Custom' ? hub.preferences.custom : { method, smartMinutes }, reference: selection }) }
  const owned = !run || run.controllerId === hub.controllerId
  const tabsKey = event => {
    const index = modes.findIndex(([name]) => name === mode)
    const next = event.key === 'ArrowRight' ? (index + 1) % modes.length : event.key === 'ArrowLeft' ? (index + modes.length - 1) % modes.length : event.key === 'Home' ? 0 : event.key === 'End' ? modes.length - 1 : null
    if (next == null) return
    event.preventDefault(); setMode(modes[next][0]); event.currentTarget.querySelectorAll('[role="tab"]')[next].focus()
  }
  return <div className={styles.page} data-app-hero data-hero-theme="dark" data-focus-active={Boolean(run || legacySession)} data-focus-method={method}>
    <HeroArtwork src="/images/Odessey%20upgrade.png" width={1672} height={941} viewport />
    <div className={styles.content}><div className={styles.workspace}>
      <header className={styles.header}><span data-hero-boundary aria-hidden="true" /><div><h1>{t('Focus')}</h1><p>{t('Create space for uninterrupted work.')}</p></div><div className={styles.headerActions}>{mode !== 'Focus' && run && <button className={styles.runningLink} onClick={() => setMode('Focus')}>{t('Return to focus →')} · {formatTime(remaining)}</button>}<Button variant="ghost" aria-label={t('Focus settings')} onClick={() => setPanel('settings')}><Icon name="settings" /></Button></div></header>
      <div role="tablist" aria-label={t('Clock mode')} className={styles.tabs} onKeyDown={tabsKey}>{modes.map(([name, icon], index) => <button key={name} type="button" role="tab" id={`clock-tab-${index}`} aria-controls="clock-panel" aria-selected={mode === name} tabIndex={mode === name ? 0 : -1} onClick={() => setMode(name)}><Icon name={icon} /><span>{t(name)}</span></button>)}</div>
      <div id="clock-panel" role="tabpanel" aria-labelledby={`clock-tab-${modes.findIndex(([name]) => name === mode)}`} className={styles.panel}>
        {mode === 'Focus' && <>
          <QueryFeedback query={hub.active} />
          <QueryFeedback query={legacy} />
          <QueryFeedback query={hub.preferencesQuery} />
          {legacySession ? <div className={styles.legacy}><LegacyFocusPage /></div> : legacy.isSuccess && hub.active.isSuccess && <>
            {!run && <FocusMethods method={method} setMethod={setMethod} preferences={hub.preferences} smartMinutes={smartMinutes} setSmartMinutes={setSmartMinutes} onSettings={() => setPanel('settings')} onReviewed={setReviewed} />}
            <div className={styles.timerStage}>
            {run?.state === 'Interrupted' ? <section className={styles.recovery} aria-label={t('Focus was interrupted')}><h2>{t('Focus was interrupted')}</h2><p>{t('Your device was inactive for approximately {minutes} minutes.', { minutes: Math.max(0, Math.floor((hub.now - Date.parse(run.interruptedAtUtc)) / 60000)) })}</p><p className={styles.recoveryTime}>{formatTime(remaining)} <span>{t('remaining')}</span></p><p className={styles.hint}>{t('Uncertain time is excluded unless you confirm you were working. The interruption point is an estimate.')}</p>
              {owned && <div className={styles.recoveryControls}><Button loading={hub.pending} onClick={() => runAction('recover-resume')}>{t('Resume with remaining time')}</Button><Button variant="secondary" loading={hub.pending} onClick={() => setPanel('count-inactive')}>{t('Count inactive time as focus')}</Button><Button variant="quiet" loading={hub.pending} onClick={() => runAction('recover-end')}>{t('End session at interruption')}</Button></div>}</section>
              : <TimerFace remaining={remaining} duration={(run?.periodSeconds ?? defaultMinutes * 60) * 1000} phase={run?.state === 'Ready' ? run.phase + ' complete' : run?.phase || 'Focus'} caption={run ? `${t(run.configuration.method)} · ${t('Session')} ${run.sessionNumber}${run.configuration.method === 'Pomodoro' ? ` · ${t('Cycle')} ${Math.ceil(run.sessionNumber / 4)}` : ''}${run.state === 'Paused' ? ' · ' + t('Paused') : ''}` : t('Ready when you are')} />}
            {!owned ? <div className={styles.controls}><Button loading={hub.pending} onClick={() => runAction('takeover')}>{t('Continue on this device')}</Button></div> : run?.state !== 'Interrupted' && <div className={styles.controls}>
              {!run ? <Button loading={hub.pending} disabled={!hub.active.isSuccess || !legacy.isSuccess || !hub.preferencesQuery.isSuccess || (method === 'Smart Focus' && !reviewed)} onClick={start}>{t('Start focus')}</Button>
                : <>{run.state === 'Ready' ? <Button loading={hub.pending} onClick={() => runAction('next')}>{t(!run.nextPeriod ? 'Finish focus' : run.nextPeriod.phase === 'Break' ? 'Start break' : 'Start next focus')}</Button> : <Button loading={hub.pending} onClick={() => runAction(run.state === 'Paused' ? 'resume' : 'pause')}>{t(run.state === 'Paused' ? 'Resume' : 'Pause')}</Button>}
                  <Button variant="secondary" loading={hub.pending} onClick={() => runAction('stop')}>{t('Stop')}</Button>{run.phase === 'Break' && run.state !== 'Ready' && <Button variant="quiet" loading={hub.pending} onClick={() => runAction('skip')}>{t('Skip break')}</Button>}</>}
            </div>}
            {run?.state === 'Ready' && <p className={styles.transition}>{t(!run.nextPeriod ? 'Your focus rhythm is complete.' : run.nextPeriod.phase === 'Break' ? 'Time for a {minutes} minute break.' : 'Ready for your next focus session.', { minutes: run.nextPeriod?.seconds / 60 })}</p>}
            </div>
            <section className={styles.selection} aria-label={t('Focusing on')}><div><span className={styles.hint}>{t('Focusing on')}</span>{id ? <><strong>{entity.data?.title || t('Loading…')}</strong><span className={styles.hint}><AreaLabel area={areas.data?.find(area => area.id === entity.data?.lifeAreaId)} />{entity.data?.priority && ` · ${t(entity.data.priority)}`}</span></> : <strong>{t('Focus without an item')}</strong>}</div>
              <div><Button variant="quiet" size="small" disabled={!owned || hub.pending || run?.state === 'Interrupted'} onClick={() => setPanel('picker')}>{t(id ? 'Change item' : '+ Choose task, goal or habit')}</Button>{id && <Button variant="quiet" size="small" disabled={!owned || hub.pending || run?.state === 'Interrupted'} onClick={() => void select({})}>{t('Remove')}</Button>}{run && <Button variant="quiet" size="small" onClick={() => setPanel('item-actions')}>{t('Session actions')}</Button>}</div>
            </section>
            {run && <p className={styles.hint}>{t('Item changes apply to the next focus interval.')}</p>}
          </>}
        </>}
        {mode === 'Timer' && <CountdownMode />}{mode === 'Stopwatch' && <StopwatchMode />}{mode === 'World Clock' && <WorldClock />}
      </div>
      {hub.error && <div role="alert" className={styles.error}>{t(hub.error.message || 'Focus could not be saved.')} <Button variant="quiet" size="small" onClick={() => void hub.retry()}>{t('Retry')}</Button></div>}
      <FocusProgress summary={summary} />
      <footer className={styles.footer}><Button variant="quiet" size="small" onClick={() => setPanel('history')}>{t('Focus history')}</Button>{hub.feedback && <ActionFeedback action={{ isSuccess: true, data: hub.feedback }} success={t('Session recorded.')} />}<Link to="/today">{t('← Return to Today')}</Link></footer>
    </div></div>
    <Dialog open={panel !== null} onClose={() => setPanel(null)} placement="sheet" title={t(({ settings: 'Focus settings', picker: 'Choose your focus', history: 'Focus history', 'count-inactive': 'Count inactive time as focus', 'item-actions': 'Session actions' })[panel] || 'Focus')}>
      {panel === 'settings' && <FocusSettings onClose={() => setPanel(null)} />}
      {panel === 'picker' && <FocusPicker onChoose={select} initialReference={reference} />}
      {panel === 'history' && <FocusHistory summary={summary.data} />}
      {panel === 'count-inactive' && <><p>{t('Confirm you were working away from this device. Only time up to the original focus boundary will count. No later intervals will start automatically.')}</p><Button loading={hub.pending} onClick={async () => { if (await hub.perform('recover-count')) setPanel(null) }}>{t('Confirm focused time')}</Button></>}
      {panel === 'item-actions' && <FocusItemActions kind={referenceDetails(run?.currentReference || reference)[0]} id={referenceDetails(run?.currentReference || reference)[1]} close={() => setPanel(null)} />}
    </Dialog>
  </div>
}

function FocusHistory({ summary }) {
  const { t, dateTime } = useLanguage(), [page, setPage] = useState(1)
  const query = useProductivity('/focus-sessions?page=' + page)
  return <><p>{t('Focused this week')} · {Math.floor((summary?.weekSeconds || 0) / 60)} {t('min')}</p><QueryFeedback query={query} /><ul className={styles.history}>{query.data?.items.map(item => <li key={item.id}><time>{dateTime(item.startedAtUtc)}</time><span>{Math.floor(item.elapsedSeconds / 60)} {t('min')} · {t(item.status)}</span></li>)}</ul>{query.isSuccess && !query.data?.items.length && <p>{t('Your recorded focus sessions will appear here.')}</p>}<Pagination data={query.data} setPage={setPage} /></>
}

function FocusItemActions({ kind, id, close }) {
  const { t } = useLanguage(), hub = useTimeHub(), action = useProductivityAction()
  const today = useProductivity('/today', { enabled: kind === 'habits' })
  return <>{id && <FocusEntityContext kind={kind} id={id} />}{kind === 'habits' && today.data && <TodayHabits data={{ ...today.data, habits: today.data.habits.filter(habit => habit.id === id) }} action={action} />}
    {kind === 'tasks' && <Button variant="success" loading={hub.pending} onClick={async () => { if (await hub.perform('stop', { completeTask: true })) close() }}>{t('Complete task & finish')}</Button>}
    <p className={styles.hint}>{t('Focus time does not earn XP. Only actual completion does.')}</p><Button variant="quiet" loading={hub.pending} onClick={async () => { if (await hub.perform('cancel')) close() }}>{t('Cancel session')}</Button></>
}
