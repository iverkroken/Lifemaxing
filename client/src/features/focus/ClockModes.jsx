import { useState } from 'react'
import { useLanguage } from '../settings/language.js'
import { Button } from '../../shared/ui/Button.jsx'
import { Input } from '../../shared/ui/Input.jsx'
import { useTimeHub } from './TimeHubContext.js'
import { countdownRemaining, formatTime, stopwatchElapsed } from './timeTools.js'
import styles from './FocusPage.module.css'

export function TimerFace({ remaining, duration, phase, caption }) {
  const { t } = useLanguage()
  const progress = Math.min(1, Math.max(0, remaining / Math.max(1, duration)))
  const display = formatTime(remaining)
  return <div className={styles.face} data-phase={phase}>
    <svg viewBox="0 0 240 240" aria-hidden="true"><circle className={styles.track} cx="120" cy="120" r="112" /><circle className={styles.arc} cx="120" cy="120" r="112" pathLength="1" strokeDasharray={`${progress} 1`} /></svg>
    <div><span className={styles.phase}>{t(phase)}</span><p className={styles.digits} data-hours={display.length > 5} role="timer" aria-live="off" aria-label={t('Remaining time')}>{display}</p><span className={styles.caption}>{caption}</span></div>
  </div>
}

export function CountdownMode() {
  const { t } = useLanguage(), { tools, timerAction, now } = useTimeHub()
  const timer = tools.timer, [custom, setCustom] = useState(false), [minutes, setMinutes] = useState(20)
  return <section className={styles.modePanel} aria-label={t('Countdown timer')}>
    {timer.status === 'Idle' && <div className={styles.quick} role="group" aria-label={t('Timer duration')}>{[5, 10, 15, 30, 45, 60].map(value => <Button key={value} size="small" variant="quiet" aria-pressed={timer.duration === value * 60000} onClick={() => timerAction('duration', value * 60000)}>{value} {t('min')}</Button>)}<Button size="small" variant="quiet" onClick={() => setCustom(!custom)}>{t('Custom')}</Button></div>}
    {custom && timer.status === 'Idle' && <form className={styles.inlineForm} onSubmit={event => { event.preventDefault(); timerAction('duration', minutes * 60000); setCustom(false) }}><Input label={t('Minutes')} type="number" min="1" max="1440" required value={minutes} onChange={e => setMinutes(Number(e.target.value))} /><Button type="submit" variant="secondary">{t('Set duration')}</Button></form>}
    <TimerFace remaining={countdownRemaining(timer, now)} duration={timer.duration} phase={timer.status === 'Complete' ? 'Timer complete' : 'Timer'} caption={t(timer.status === 'Paused' ? 'Paused' : 'Your time, your pace')} />
    <div className={styles.controls}><Button onClick={() => timerAction(timer.status === 'Running' ? 'pause' : 'start')}>{t(timer.status === 'Running' ? 'Pause' : timer.status === 'Paused' ? 'Resume' : 'Start timer')}</Button><Button variant="secondary" onClick={() => timerAction('reset')}>{t('Reset')}</Button></div>
    <p className={styles.hint}>{t('A simple countdown. No focus minutes or XP.')}</p>
  </section>
}

export function StopwatchMode() {
  const { t } = useLanguage(), { tools, stopwatchAction, now } = useTimeHub(), watch = tools.stopwatch
  return <section className={styles.modePanel} aria-label={t('Stopwatch')}>
    <div className={styles.stopwatch}><p className={styles.digits} role="timer" aria-live="off" aria-label={t('Elapsed time')}>{formatTime(stopwatchElapsed(watch, now), true)}</p><p className={styles.hint}>{t(watch.status === 'Running' ? 'In progress' : watch.status === 'Paused' ? 'Paused' : 'Ready when you are')}</p></div>
    <div className={styles.controls}><Button onClick={() => stopwatchAction(watch.status === 'Running' ? 'pause' : 'start')}>{t(watch.status === 'Running' ? 'Pause' : watch.status === 'Paused' ? 'Resume' : 'Start stopwatch')}</Button>
      {watch.status === 'Running' && <Button variant="secondary" onClick={() => stopwatchAction('lap')}>{t('Lap')}</Button>}<Button variant="quiet" onClick={() => stopwatchAction('reset')}>{t('Reset')}</Button></div>
    {watch.laps.length > 0 && <ol className={styles.laps} tabIndex={0} aria-label={t('Laps')}>{watch.laps.map((lap, index) => <li key={index}><span>{t('Lap')} {index + 1}</span><span>{formatTime(lap - (watch.laps[index - 1] || 0), true)}</span><span>{formatTime(lap, true)}</span></li>)}</ol>}
  </section>
}
