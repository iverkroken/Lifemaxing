import { useEffect, useRef, useState } from 'react'
import '@fontsource/inter/latin-400.css'
import '@fontsource/inter/latin-500.css'
import '@fontsource/inter/latin-600.css'
import {
  areas,
  tasks,
  busyTasks,
  habits,
  goals,
  progression
} from './fixtures.js'
import {
  Icon,
  Mark,
  ObjectImage,
  Button,
  Eyebrow,
  ThemePreview
} from './Visuals.jsx'
import s from './atelier.module.css'

const params = new URLSearchParams(location.search)
const nav = [
  ['today', 'I dag', 'sun'],
  ['tasks', 'Oppgaver', 'check-square'],
  ['habits', 'Vaner', 'arrows-clockwise'],
  ['goals', 'Mål', 'target'],
  ['areas', 'Livsområder', 'squares-four'],
  ['focus', 'Fokus', 'crosshair']
]
const progressNav = [
  ['progress', 'Fremgang', 'chart-bar'],
  ['activity', 'Aktivitet', 'clock-counter-clockwise'],
  ['rewards', 'Belønninger', 'gift']
]
const views = [
  'today',
  'areas',
  'progress',
  'settings',
  'brand',
  'sidebar',
  'surfaces',
  'tasks',
  'habits',
  'goals',
  'focus',
  'activity',
  'rewards',
  'inbox'
]
const href = (view, theme = 'light', mark = 'fold', extra = '') =>
  `?view=${view}&theme=${theme}&mark=${mark}${extra}`

export default function App() {
  const [themeChoice, setThemeChoice] = useState(
    params.get('theme') === 'dark' ? 'dark' : 'light'
  )
  const [systemDark, setSystemDark] = useState(
    matchMedia('(prefers-color-scheme: dark)').matches
  )
  const theme =
    themeChoice === 'system' ? (systemDark ? 'dark' : 'light') : themeChoice
  const [mark, setMark] = useState(
    params.get('mark') === 'meridian' ? 'meridian' : 'fold'
  )
  const [view, setView] = useState(
    views.includes(params.get('view')) ? params.get('view') : 'gallery'
  )
  const [day, setDay] = useState(
    ['empty', 'busy', 'complete', 'long'].includes(params.get('day'))
      ? params.get('day')
      : 'normal'
  )
  const [density, setDensity] = useState(
    params.get('density') === 'compact' ? 'compact' : 'normal'
  )
  const [notice, setNotice] = useState('')
  const [dialog, setDialog] = useState(null)
  const [done, setDone] = useState(['review'])
  const [logged, setLogged] = useState(['walk'])
  const [added, setAdded] = useState([])
  const [focused, setFocused] = useState(false)
  const [filter, setFilter] = useState(null)
  const main = useRef(null)
  const preview = params.has('preview')
  useEffect(() => {
    const media = matchMedia('(prefers-color-scheme: dark)')
    const listen = () => setSystemDark(media.matches)
    media.addEventListener('change', listen)
    return () => media.removeEventListener('change', listen)
  }, [])
  useEffect(() => {
    document.documentElement.dataset.atelierTheme = theme
    document.title = `${view === 'gallery' ? 'Designstudie' : view} · Nordic Atelier`
  }, [theme, view])
  const navigate = (value, area = null) => {
    setView(value)
    setFilter(area)
    setNotice('')
    window.scrollTo(0, 0)
    requestAnimationFrame(() => main.current?.focus({ preventScroll: true }))
  }
  const demoTasks = day === 'busy' ? busyTasks : tasks.filter((t) => t.planned)
  const dayTasks =
    day === 'empty'
      ? added
      : [...demoTasks, ...added].map((t) =>
          t.id === 'mission' && day === 'long'
            ? {
                ...t,
                title:
                  'Samle tilbakemeldingene fra prosjektgruppen og skriv et gjennomtenkt forslag til videre retning, prioriteringer og neste arbeidsøkt'
              }
            : t
        )
  const completed = day === 'complete' ? dayTasks.map((t) => t.id) : done
  const toggleTask = (id) => {
    if (day === 'complete') {
      setDay('normal')
      setLogged(habits.map((h) => h.id))
      setDone(dayTasks.filter((t) => t.id !== id).map((t) => t.id))
    } else
      setDone((value) =>
        value.includes(id) ? value.filter((x) => x !== id) : [...value, id]
      )
  }
  const context = {
    theme,
    mark,
    navigate,
    setDialog,
    notice,
    setNotice,
    focused,
    setFocused,
    done: completed,
    setDone,
    toggleTask,
    allTasks: [...tasks, ...added],
    logged,
    setLogged,
    setDay,
    day,
    dayTasks,
    filter
  }
  const reset = () => {
    setDone(['review'])
    setLogged(['walk'])
    setAdded([])
    setFocused(false)
    setNotice('')
  }
  return (
    <div className={s.root} data-theme={theme} data-density={density}>
      {!preview && view !== 'gallery' && (
        <div className={s.studyBar}>
          <a href="?">← Designstudien</a>
          <span>Nordic Atelier · fiktivt innhold</span>
          <label>
            Merke
            <select value={mark} onChange={(e) => setMark(e.target.value)}>
              <option value="fold">Fold</option>
              <option value="meridian">Meridian</option>
            </select>
          </label>
          <label>
            Tema
            <select
              value={themeChoice}
              onChange={(e) => setThemeChoice(e.target.value)}
            >
              <option value="light">Lyst</option>
              <option value="dark">Mørkt</option>
              <option value="system">System</option>
            </select>
          </label>
          <label>
            Dag
            <select
              value={day}
              onChange={(e) => {
                setDay(e.target.value)
                reset()
              }}
            >
              <option value="normal">Vanlig</option>
              <option value="empty">Tom</option>
              <option value="busy">Travel</option>
              <option value="complete">Fullført</option>
              <option value="long">Lang tittel</option>
            </select>
          </label>
          <Button variant="quiet" onClick={reset}>
            Nullstill
          </Button>
        </div>
      )}
      {view === 'gallery' ? (
        <Gallery mark={mark} setMark={setMark} />
      ) : ['brand', 'surfaces'].includes(view) ? (
        <main className={s.presentation} ref={main} tabIndex={-1}>
          {view === 'brand' ? (
            <BrandStudy {...context} />
          ) : (
            <Surfaces {...context} />
          )}
        </main>
      ) : (
        <div className={s.shell}>
          <Sidebar {...context} view={view} />
          <header className={s.mobileHeader}>
            <button
              className={s.brand}
              onClick={() => navigate('today')}
              aria-label="LIFEMAXING, gå til I dag"
            >
              <Mark kind={mark} size={28} />
              <span>LIFEMAXING</span>
            </button>
            <Button
              variant="ghost"
              aria-label="Åpne navigasjon"
              onClick={() => setDialog('navigation')}
            >
              <Icon name="squares-four" />
            </Button>
          </header>
          <main className={s.main} ref={main} tabIndex={-1}>
            {view === 'today' ? (
              <Today {...context} />
            ) : view === 'areas' ? (
              <Areas {...context} />
            ) : view === 'progress' ? (
              <Progress {...context} />
            ) : view === 'settings' ? (
              <Settings
                {...context}
                themeChoice={themeChoice}
                setThemeChoice={setThemeChoice}
                density={density}
                setDensity={setDensity}
              />
            ) : view === 'sidebar' ? (
              <SidebarStudy {...context} />
            ) : (
              <SupportingView {...context} view={view} />
            )}
            {notice && (
              <p className={s.notice} role="status">
                {notice}
              </p>
            )}
            <footer className={s.demoFoot}>
              Designstudie · eksempeldata · ingen endringer lagres i appen
            </footer>
          </main>
          <nav className={s.dock} aria-label="Mobilnavigasjon">
            {[
              ['today', 'I dag', 'sun'],
              ['tasks', 'Oppgaver', 'check-square'],
              ['capture', 'Legg til', 'plus'],
              ['habits', 'Vaner', 'arrows-clockwise'],
              ['more', 'Mer', 'dots-three']
            ].map(([key, label, icon]) => (
              <button
                key={key}
                aria-current={view === key ? 'page' : undefined}
                onClick={() =>
                  key === 'capture'
                    ? setDialog('capture')
                    : key === 'more'
                      ? setDialog('navigation')
                      : navigate(key)
                }
              >
                <Icon name={icon} size={24} />
                <span>{label}</span>
              </button>
            ))}
          </nav>
        </div>
      )}
      {dialog && (
        <DemoDialog
          title={
            dialog === 'capture'
              ? 'Gi tanken en plass'
              : dialog === 'navigation'
                ? 'Ditt arbeidsrom'
                : dialog === 'date'
                  ? 'Velg en eksempeldag'
                  : 'Oppgavedetaljer'
          }
          close={() => setDialog(null)}
        >
          {dialog === 'capture' ? (
            <form
              onSubmit={(e) => {
                e.preventDefault()
                const title = new FormData(e.currentTarget).get('title').trim()
                if (!title) return
                setAdded((v) => [
                  ...v,
                  {
                    id: `added-${v.length}`,
                    title,
                    area: 'career',
                    minutes: null,
                    planned: true
                  }
                ])
                setDialog(null)
                setNotice(
                  'Oppgaven er lagt til i denne lokale demonstrasjonen.'
                )
              }}
            >
              <label className={s.field}>
                Hva vil du gjøre?
                <input
                  name="title"
                  data-initial-focus
                  required
                  maxLength={200}
                  placeholder="Skriv en oppgave …"
                />
              </label>
              <p className={s.muted}>
                Mandag 14. september · kun i denne studien
              </p>
              <Button type="submit" variant="primary">
                Legg til oppgave
                <Icon name="arrow-right" />
              </Button>
            </form>
          ) : dialog === 'navigation' ? (
            <nav className={s.dialogNav}>
              {[
                ...nav,
                ...progressNav,
                ['inbox', 'Inbox', 'tray'],
                ['settings', 'Innstillinger', 'sliders-horizontal']
              ].map(([key, label, icon]) => (
                <Button
                  key={key}
                  variant="ghost"
                  onClick={() => {
                    navigate(key)
                    setDialog(null)
                  }}
                >
                  <Icon name={icon} />
                  {label}
                </Button>
              ))}
            </nav>
          ) : dialog === 'date' ? (
            <div className={s.dialogNav}>
              {[
                ['normal', 'Vanlig arbeidsdag'],
                ['empty', 'En åpen dag'],
                ['busy', 'Travel dag'],
                ['complete', 'Dagen er fullført']
              ].map(([key, label]) => (
                <Button
                  key={key}
                  onClick={() => {
                    setDay(key)
                    reset()
                    setDialog(null)
                  }}
                >
                  {label}
                </Button>
              ))}
            </div>
          ) : (
            <>
              <h3>{dialog.title}</h3>
              <p>
                {dialog.detail ||
                  'En avgrenset oppgave med rom for egne notater.'}
              </p>
              <AreaTag areaKey={dialog.area} />
              <p className={s.muted}>
                Detaljprøve · ingen backend eller automatisk XP i studien.
              </p>
              <Button
                onClick={() => {
                  toggleTask(dialog.id)
                  setDialog(null)
                }}
              >
                {completed.includes(dialog.id)
                  ? 'Gjenåpne'
                  : 'Marker som fullført'}
              </Button>
            </>
          )}
        </DemoDialog>
      )}
    </div>
  )
}

function DemoDialog({ title, close, children }) {
  const ref = useRef(null)
  useEffect(() => {
    const el = ref.current
    const before = document.activeElement
    el.showModal()
    el.querySelector('[data-initial-focus]')?.focus()
    return () => {
      el.close()
      before?.focus()
    }
  }, [])
  return (
    <dialog
      ref={ref}
      className={s.dialog}
      onCancel={(e) => {
        e.preventDefault()
        close()
      }}
      aria-labelledby="dialog-title"
    >
      <header>
        <h2 id="dialog-title">{title}</h2>
        <Button variant="ghost" aria-label="Lukk dialog" onClick={close}>
          <Icon name="x" />
        </Button>
      </header>
      {children}
    </dialog>
  )
}

function Sidebar({
  mark,
  view,
  navigate,
  setDialog,
  focused,
  specimen = false
}) {
  const link = ([key, label, icon]) => (
    <button
      key={key}
      className={s.navItem}
      aria-current={view === key ? 'page' : undefined}
      onClick={() => navigate(key)}
    >
      <Icon name={icon} />
      <span>{key === 'focus' && focused ? 'Tilbake til fokus' : label}</span>
      {key === 'focus' && focused && <i className={s.liveDot} />}
    </button>
  )
  return (
    <aside
      className={`${s.sidebar} ${specimen ? s.sidebarSpecimen : ''}`}
      aria-label={
        specimen ? 'Navigasjonsprøve med scrollbar' : 'Hovednavigasjon'
      }
    >
      <button className={s.brand} onClick={() => navigate('today')}>
        <Mark kind={mark} size={32} />
        <span>
          LIFEMAXING<small>PERSONLIG ARBEIDSROM</small>
        </span>
      </button>
      <Button className={s.capture} onClick={() => setDialog('capture')}>
        <Icon name="plus" />
        Legg til noe<kbd>＋</kbd>
      </Button>
      <nav className={s.nav}>
        <Eyebrow>Arbeidsrom</Eyebrow>
        {nav.map(link)}
        <button className={s.navItem} onClick={() => navigate('inbox')}>
          <Icon name="tray" />
          <span>Inbox</span>
          <small>3</small>
        </button>
        <details className={s.navGroup} open>
          <summary>
            Din utvikling
            <Icon name="caret-down" size={16} />
          </summary>
          {progressNav.map(link)}
        </details>
      </nav>
      <div className={s.account}>
        {link(['settings', 'Innstillinger', 'sliders-horizontal'])}
        <div className={s.person}>
          <span className={s.avatar}>AL</span>
          <span>
            Alex Lind<small>Et rom for fremgang</small>
          </span>
        </div>
      </div>
    </aside>
  )
}

function AreaTag({ areaKey }) {
  const area = areas.find((a) => a.key === areaKey)
  return (
    area && (
      <span className={s.areaTag} data-color={area.color}>
        <i />
        {area.short}
      </span>
    )
  )
}

function Today(c) {
  const {
    day,
    dayTasks,
    done,
    toggleTask,
    mark,
    theme,
    setDialog,
    navigate,
    focused,
    setFocused,
    logged,
    setLogged
  } = c
  const mission = dayTasks.find((t) => t.id === 'mission')
  const remaining = dayTasks.filter((t) => !done.includes(t.id)).length
  const allDone =
    dayTasks.length > 0 &&
    remaining === 0 &&
    (day === 'complete' || logged.length === habits.length)
  return (
    <>
      <header className={s.pageHeader}>
        <div className={s.titleLine}>
          <h1>
            I dag<span className={s.titleDot}>.</span>
          </h1>
          <button className={s.dateControl} onClick={() => setDialog('date')}>
            Mandag 14. september
            <Icon name="caret-down" size={16} />
          </button>
        </div>
        <Button
          className={s.desktopAdd}
          variant="quiet"
          onClick={() => setDialog('capture')}
        >
          <Icon name="plus" />
          Ny oppgave
        </Button>
      </header>
      <div className={s.dailyStatus}>
        <span>
          {dayTasks.length
            ? `${dayTasks.length - remaining} av ${dayTasks.length} oppgaver fullført`
            : 'En åpen dag'}
        </span>
        <span>Ta én ting om gangen.</span>
      </div>
      <section
        className={s.mission}
        aria-label="Dagens hovedoppgave"
        data-empty={!mission}
      >
        <div className={s.missionCopy}>
          <Eyebrow>
            {allDone
              ? 'Godt arbeid'
              : mission && done.includes(mission.id)
                ? 'Hovedoppgaven er fullført'
                : 'Dagens viktigste'}
            <span className={s.eyebrowLine} />
          </Eyebrow>
          <h2>
            {allDone
              ? 'Du har gjort plass til resten av dagen.'
              : mission
                ? mission.title
                : 'Hva vil du gi plass til i dag?'}
          </h2>
          <p className={s.missionDetail}>
            {allDone
              ? 'Det du planla er gjennomført. La innsatsen få lande.'
              : mission
                ? mission.detail
                : 'Begynn med én meningsfull oppgave. Resten kan komme etterpå.'}
          </p>
          {mission && !allDone && (
            <div className={s.missionMeta}>
              <AreaTag areaKey={mission.area} />
              <span>{mission.minutes} min</span>
              <span>Prosjektarbeid</span>
            </div>
          )}
          <div className={s.missionActions}>
            {!mission ? (
              <Button variant="primary" onClick={() => setDialog('capture')}>
                <Icon name="plus" />
                Legg til en oppgave
              </Button>
            ) : allDone ? (
              <Button onClick={() => navigate('progress')}>
                Se fremgangen din
                <Icon name="arrow-right" />
              </Button>
            ) : (
              <>
                <Button
                  variant="primary"
                  data-testid="start-focus"
                  onClick={() => {
                    setFocused(true)
                    navigate('focus')
                  }}
                >
                  <Icon name="play" size={20} />
                  {focused ? 'Fortsett fokus' : 'Start Focus'}
                  <span className={s.buttonArrow}>↗</span>
                </Button>
                <Button variant="quiet" onClick={() => toggleTask(mission.id)}>
                  <Icon name="check" />
                  {done.includes(mission.id) ? 'Gjenåpne' : 'Fullfør'}
                </Button>
              </>
            )}
          </div>
        </div>
        <div className={s.heroObject}>
          <ObjectImage name={mark} theme={theme} eager />
          <span className={s.objectCaption}>
            {mark === 'fold' ? 'FOLD' : 'MERIDIAN'}
            <span>En retning. Ditt tempo.</span>
          </span>
        </div>
      </section>
      <div className={s.dayWork}>
        <section className={s.taskSection} aria-label="Resten av dagen">
          <div className={s.sectionHeading}>
            <h2>
              Resten av dagen
              <span>
                {
                  dayTasks.filter(
                    (t) => t.id !== 'mission' && !done.includes(t.id)
                  ).length
                }
              </span>
            </h2>
            <Button
              variant="quiet"
              aria-label="Legg til oppgave"
              onClick={() => setDialog('capture')}
            >
              <Icon name="plus" />
            </Button>
          </div>
          <TaskList {...c} items={dayTasks.filter((t) => t.id !== 'mission')} />
          {dayTasks.length === 0 && (
            <p className={s.emptyNote}>
              Ingen oppgaver ennå. Det er rom for å begynne.
            </p>
          )}
        </section>
        <section className={s.habitSection} aria-label="Dine daglige vaner">
          <div className={s.sectionHeading}>
            <h2>Små vaner</h2>
            <Icon name="arrows-clockwise" size={20} />
          </div>
          <p className={s.sectionIntro}>Det du vender tilbake til.</p>
          {habits.map((h) => (
            <div className={s.habitRow} key={h.id}>
              <div>
                <strong>{h.title}</strong>
                <span
                  className={s.weekDots}
                  aria-label={`${h.week.filter(Boolean).length} av de siste sju dagene logget`}
                >
                  {h.week.map((v, i) => (
                    <i key={i} data-done={v} />
                  ))}
                </span>
              </div>
              <button
                className={s.checkTarget}
                aria-pressed={day === 'complete' || logged.includes(h.id)}
                aria-label={`Logg vane: ${h.title}`}
                onClick={() => {
                  if (day === 'complete') {
                    c.setDay('normal')
                    c.setDone(dayTasks.map((t) => t.id))
                    setLogged(
                      habits
                        .filter((item) => item.id !== h.id)
                        .map((item) => item.id)
                    )
                  } else
                    setLogged((v) =>
                      v.includes(h.id)
                        ? v.filter((x) => x !== h.id)
                        : [...v, h.id]
                    )
                }}
              >
                <span>
                  {(day === 'complete' || logged.includes(h.id)) && (
                    <Icon name="check" size={16} />
                  )}
                </span>
              </button>
            </div>
          ))}
          <Button
            variant="quiet"
            className={s.habitLink}
            onClick={() => navigate('habits')}
          >
            Alle vaner
            <Icon name="arrow-right" size={16} />
          </Button>
        </section>
      </div>
      <ProgressStrip navigate={navigate} />
    </>
  )
}

function TaskList({ items, done, toggleTask, setDialog }) {
  return (
    <ul className={s.taskList}>
      {items.map((task) => (
        <li key={task.id} data-done={done.includes(task.id)}>
          <button
            className={s.checkTarget}
            aria-pressed={done.includes(task.id)}
            aria-label={`${done.includes(task.id) ? 'Gjenåpne' : 'Fullfør'}: ${task.title}`}
            onClick={() => toggleTask(task.id)}
          >
            <span>
              {done.includes(task.id) && <Icon name="check" size={16} />}
            </span>
          </button>
          <button className={s.taskText} onClick={() => setDialog(task)}>
            <strong>{task.title}</strong>
            <AreaTag areaKey={task.area} />
          </button>
          <span className={s.minutes}>
            {task.minutes ? `${task.minutes} min` : '—'}
          </span>
        </li>
      ))}
    </ul>
  )
}

function ProgressStrip({ navigate }) {
  return (
    <button className={s.progressStrip} onClick={() => navigate('progress')}>
      <span className={s.earnedSeal}>
        <Icon name="chart-bar" />
      </span>
      <span>
        <strong>Steg for steg.</strong>
        <small>Level 8 · Bronze</small>
      </span>
      <span className={s.stripMeter}>
        <span>
          <i />
        </span>
        <small>600 / 1 200 XP til level 9</small>
      </span>
      <Icon name="arrow-right" />
    </button>
  )
}

function Areas(c) {
  return (
    <>
      <header className={s.editorialHeader}>
        <Eyebrow>Delene som blir en helhet</Eyebrow>
        <h1>
          Livet har flere sider<span className={s.titleDot}>.</span>
        </h1>
        <p>Gi hver av dem litt oppmerksomhet.</p>
        <span className={s.sampleLabel}>Fire livsområder · visuell prøve</span>
      </header>
      <div className={s.areaGrid}>
        {areas.map((area, i) => (
          <article className={s.areaCard} key={area.key}>
            <div className={s.areaImage}>
              <span className={s.areaIndex}>0{i + 1}</span>
              <ObjectImage name={area.key} theme={c.theme} />
              <Button
                variant="ghost"
                className={s.areaOpen}
                aria-label={`Åpne ${area.name}`}
                onClick={() => c.navigate('tasks', area.key)}
              >
                <Icon name="arrow-right" />
              </Button>
            </div>
            <div className={s.areaCopy}>
              <h2>
                <button onClick={() => c.navigate('tasks', area.key)}>
                  {area.name}
                </button>
              </h2>
              <p>{area.note}</p>
              <div className={s.areaCounts}>
                {[
                  [
                    'tasks',
                    'oppgaver',
                    c.allTasks.filter(
                      (t) => t.area === area.key && !c.done.includes(t.id)
                    ).length
                  ],
                  [
                    'goals',
                    'mål',
                    goals.filter((g) => g.area === area.key).length
                  ],
                  [
                    'habits',
                    'vaner',
                    habits.filter((h) => h.area === area.key).length
                  ]
                ].map(([view, label, count]) => (
                  <button key={view} onClick={() => c.navigate(view, area.key)}>
                    <strong>{count}</strong> {label}
                  </button>
                ))}
              </div>
            </div>
          </article>
        ))}
      </div>
    </>
  )
}

function Progress({ navigate }) {
  return (
    <>
      <header className={s.editorialHeader}>
        <Eyebrow>Innsatsen blir med videre</Eyebrow>
        <h1>
          Din fremgang<span className={s.titleDot}>.</span>
        </h1>
        <p>Små handlinger. Noe som varer.</p>
      </header>
      <section className={s.progressHero}>
        <div className={s.levelSeal} aria-label="Bronze-emblem, materialstudie">
          <svg viewBox="0 0 120 120" fill="none" aria-hidden="true">
            <path
              d="m60 9 44 25v52l-44 25-44-25V34Z"
              stroke="currentColor"
              strokeWidth="2"
            />
            <path
              d="m60 18 36 21v42l-36 21-36-21V39Z"
              stroke="currentColor"
              opacity=".45"
            />
            <path
              d="M44 71V50m16 21V39m16 32V50"
              stroke="currentColor"
              strokeWidth="6"
            />
          </svg>
        </div>
        <div className={s.progressValue}>
          <Eyebrow>Bronze · jevn innsats</Eyebrow>
          <h2>
            Level <span>{progression.level}</span>
          </h2>
          <p>6 200 XP opptjent gjennom fullførte handlinger.</p>
          <div className={s.progressTrack}>
            <span />
          </div>
          <div className={s.progressLabels}>
            <span>600 / 1 200 XP</span>
            <span>Neste: level 9</span>
          </div>
        </div>
      </section>
      <div className={s.progressBottom}>
        <section>
          <div className={s.sectionHeading}>
            <h2>Det siste du gjorde</h2>
            <Button variant="quiet" onClick={() => navigate('activity')}>
              Aktivitet
              <Icon name="arrow-right" size={16} />
            </Button>
          </div>
          <ul className={s.activityList}>
            <li>
              <Icon name="check" />
              <div>
                <strong>Sendte tilbakemelding på prosjektutkastet</strong>
                <small>I dag, 09:20 · oppgave fullført</small>
              </div>
              <span>+25 XP</span>
            </li>
            <li>
              <Icon name="arrows-clockwise" />
              <div>
                <strong>Gikk en tur</strong>
                <small>I dag, 08:10 · vane logget</small>
              </div>
              <span>+10 XP</span>
            </li>
            <li>
              <Icon name="arrow-left" />
              <div>
                <strong>Korrigerte en tidligere avkrysning</strong>
                <small>I går, 18:40 · historikken er bevart</small>
              </div>
              <span>−25 XP</span>
            </li>
          </ul>
        </section>
        <aside className={s.rewardNote}>
          <Icon name="gift" size={24} />
          <Eyebrow>Noe å glede seg til</Eyebrow>
          <h3>En lang formiddag på museum.</h3>
          <p>Din belønning ved level 9.</p>
          <Button variant="quiet" onClick={() => navigate('rewards')}>
            Se belønninger
            <Icon name="arrow-right" size={16} />
          </Button>
        </aside>
      </div>
      <p className={s.exampleNote}>
        Fast progresjonseksempel · lokale avkrysninger i studien endrer ikke XP.
      </p>
    </>
  )
}

function Settings({
  mark,
  setNotice,
  themeChoice,
  setThemeChoice,
  density,
  setDensity
}) {
  const [section, setSection] = useState('appearance')
  const [save, setSave] = useState('saved')
  const [locale, setLocale] = useState('nb-NO')
  return (
    <>
      <header className={s.editorialHeader}>
        <Eyebrow>Tilpass arbeidsrommet</Eyebrow>
        <h1>
          På din måte<span className={s.titleDot}>.</span>
        </h1>
      </header>
      <div className={s.settingsLayout}>
        <nav className={s.settingsNav} aria-label="Innstillingsseksjoner">
          {[
            ['appearance', 'Utseende', 'palette'],
            ['region', 'Språk og tid', 'globe'],
            ['security', 'Tilgang', 'shield-check']
          ].map(([key, label, icon]) => (
            <button
              key={key}
              aria-current={section === key ? 'page' : undefined}
              onClick={() => setSection(key)}
            >
              <Icon name={icon} />
              {label}
            </button>
          ))}
        </nav>
        <section className={s.settingsContent}>
          {section === 'appearance' ? (
            <>
              <h2>Et rom som passer deg</h2>
              <p className={s.muted}>Velg lyset og rytmen du trives med.</p>
              <fieldset className={s.themeChoices}>
                <legend>Fargetema</legend>
                {[
                  ['light', 'Lyst', 'Lett og åpent'],
                  ['dark', 'Mørkt', 'Dempet og konsentrert'],
                  ['system', 'System', 'Følger enheten din']
                ].map(([key, label, desc]) => (
                  <label key={key}>
                    <ThemePreview theme={key} mark={mark} />
                    <span>
                      <input
                        type="radio"
                        name="theme"
                        value={key}
                        checked={themeChoice === key}
                        onChange={() => {
                          setThemeChoice(key)
                          setSave('saved')
                        }}
                      />
                      <strong>{label}</strong>
                    </span>
                    <small>{desc}</small>
                  </label>
                ))}
              </fieldset>
              <fieldset className={s.densityChoices}>
                <legend>Plass mellom innhold</legend>
                {[
                  ['normal', 'Behagelig', 'Litt mer rom mellom handlingene.'],
                  ['compact', 'Kompakt', 'Mer av dagen innenfor blikket.']
                ].map(([key, label, desc]) => (
                  <label key={key}>
                    <input
                      type="radio"
                      name="density"
                      checked={density === key}
                      onChange={() => {
                        setDensity(key)
                        setSave('saved')
                      }}
                    />
                    <span>
                      <strong>{label}</strong>
                      <small>{desc}</small>
                    </span>
                    <span
                      className={s.densityGlyph}
                      data-compact={key === 'compact'}
                      aria-hidden="true"
                    >
                      <i />
                      <i />
                      <i />
                    </span>
                  </label>
                ))}
              </fieldset>
              <div className={s.saveStatus} data-state={save} role="status">
                <Icon
                  name={
                    save === 'saved'
                      ? 'check'
                      : save === 'saving'
                        ? 'arrows-clockwise'
                        : 'x'
                  }
                />
                {save === 'saved'
                  ? 'Valgene dine er lagret.'
                  : save === 'saving'
                    ? 'Lagrer endringene …'
                    : 'Kunne ikke lagre. Valget ditt er beholdt.'}
                {save === 'error' && (
                  <Button variant="quiet" onClick={() => setSave('saved')}>
                    Prøv igjen
                  </Button>
                )}
              </div>
              <details className={s.stateControls}>
                <summary>Prøv lagringstilstander · demonstrasjon</summary>
                <div>
                  {[
                    ['saved', 'Lagret'],
                    ['saving', 'Lagrer'],
                    ['error', 'Feil']
                  ].map(([key, label]) => (
                    <Button key={key} onClick={() => setSave(key)}>
                      {label}
                    </Button>
                  ))}
                </div>
                <p>
                  Kun en visuell tilstandsprøve. Ingen kontoinnstillinger
                  lagres.
                </p>
              </details>
            </>
          ) : section === 'region' ? (
            <>
              <h2>Språk og tid</h2>
              <p className={s.muted}>
                Presentasjonen følger preferansene dine.
              </p>
              <label className={s.field}>
                Grensesnittspråk
                <select defaultValue="nb">
                  <option value="nb">Norsk bokmål</option>
                </select>
                <small>Denne avgrensede studien vises på bokmål.</small>
              </label>
              <label className={s.field}>
                Regionalt format
                <select
                  value={locale}
                  onChange={(e) => setLocale(e.target.value)}
                >
                  <option value="nb-NO">Norge</option>
                  <option value="en-GB">Storbritannia</option>
                  <option value="sv-SE">Sverige</option>
                  <option value="da-DK">Danmark</option>
                </select>
              </label>
              <p>
                {new Intl.DateTimeFormat(locale, {
                  dateStyle: 'long',
                  timeZone: 'UTC'
                }).format(new Date('2026-09-14T12:00:00Z'))}{' '}
                · {new Intl.NumberFormat(locale).format(6200)}
              </p>
              <label className={s.field}>
                Tidssone
                <select defaultValue="Europe/Oslo">
                  <option>Europe/Oslo</option>
                  <option>Europe/Copenhagen</option>
                </select>
              </label>
              <Button
                variant="primary"
                onClick={() => {
                  setSave('saved')
                  setNotice(
                    'Eksempelvalgene er lagret i denne lokale demonstrasjonen.'
                  )
                }}
              >
                Lagre eksempelvalg
              </Button>
              <p className={s.exampleNote}>
                Lokalt utkast · nullstilles ved ny lasting.
              </p>
            </>
          ) : (
            <>
              <Icon name="shield-check" size={32} />
              <h2>Ditt private arbeidsrom</h2>
              <p className={s.muted}>
                Innlogging og sikkerhet videreføres fra dagens app.
              </p>
              <p>Utlogging er ikke aktiv i denne isolerte studien.</p>
            </>
          )}
        </section>
      </div>
    </>
  )
}

function BrandStudy({ theme, mark, navigate, setDialog, focused }) {
  return (
    <>
      <header className={s.editorialHeader}>
        <Eyebrow>01 / To mulige signaturer</Eyebrow>
        <h1>Retning, i sin enkleste form.</h1>
        <p>
          Samme betingelser. To ulike identiteter. Ingen av merkene er endelig
          godkjent.
        </p>
      </header>
      <div className={s.brandGrid}>
        {['fold', 'meridian'].map((kind) => (
          <section className={s.brandCandidate} key={kind}>
            <div className={s.sectionHeading}>
              <h2>{kind === 'fold' ? 'Fold' : 'Meridian'}</h2>
              <span className={s.sampleLabel}>
                {kind === 'fold' ? '01 · hovedkandidat' : '02 · alternativ'}
              </span>
            </div>
            <p>
              {kind === 'fold'
                ? 'Et brettet bånd. En åpen bevegelse videre.'
                : 'En åpen krets. Ett tydelig orienteringspunkt.'}
            </p>
            <div className={s.monoPair}>
              {['light', 'dark'].map((t) => (
                <div key={t} data-swatch-theme={t}>
                  <Mark kind={kind} size={128} />
                  <small>Ensfarget / {t === 'light' ? 'lyst' : 'mørkt'}</small>
                </div>
              ))}
            </div>
            <div className={s.sizeStrip}>
              {[16, 24, 32].map((size) => (
                <div key={size}>
                  <Mark kind={kind} size={size} />
                  <small>{size} px</small>
                </div>
              ))}
              <div className={s.appIcon}>
                <Mark kind={kind} size={44} />
              </div>
              <div>
                <img
                  alt={`${kind} favicon 16 px`}
                  src={
                    kind === 'fold'
                      ? new URL('./assets/fold.svg', import.meta.url).href
                      : new URL('./assets/meridian.svg', import.meta.url).href
                  }
                  width="16"
                  height="16"
                />
                <small>Favicon</small>
              </div>
            </div>
            <div className={s.brandLockup}>
              <Mark kind={kind} size={32} />
              <strong>LIFEMAXING</strong>
              <span>Sidebar · 32 px</span>
            </div>
            <div className={s.brandRender}>
              <ObjectImage name={kind} theme={theme} eager />
            </div>
            <p className={s.exampleNote}>
              Faktisk studiorender fra redigerbar Blender-geometri. Samme kamera
              og materialfamilie.
            </p>
            <a className={s.textLink} href={href('today', theme, kind)}>
              Se {kind === 'fold' ? 'Fold' : 'Meridian'} på Today{' '}
              <Icon name="arrow-right" size={16} />
            </a>
          </section>
        ))}
      </div>
      <details className={s.brandDetails}>
        <summary>Se faktisk navigasjonsstørrelse med begge merker</summary>
        <div className={s.sidebarPair}>
          {['fold', 'meridian'].map((kind) => (
            <Sidebar
              key={kind}
              mark={kind}
              view="today"
              navigate={navigate}
              setDialog={setDialog}
              focused={focused}
              specimen
            />
          ))}
        </div>
      </details>
      <p className={s.exampleNote}>
        Aktivt merke i øvrige prøver: {mark === 'fold' ? 'Fold' : 'Meridian'}.
        Sammenlign også begge temaene fra studievelgeren.
      </p>
    </>
  )
}

function SidebarStudy(c) {
  return (
    <>
      <header className={s.editorialHeader}>
        <Eyebrow>05 / Navigasjon og mikrodetaljer</Eyebrow>
        <h1>Et stille holdepunkt.</h1>
        <p>Phosphor Regular, valgt med hensyn til funksjon og optisk vekt.</p>
      </header>
      <div className={s.sidebarStudy}>
        <Sidebar {...c} view="today" specimen />
        <section>
          <h2>Tilstandene i bruk</h2>
          <div className={s.navStates}>
            {[
              ['default', 'Oppgaver', 'check-square'],
              ['hover', 'Oppgaver', 'check-square'],
              ['selected', 'I dag', 'sun'],
              ['focus', 'Fokus', 'crosshair']
            ].map(([state, label, icon]) => (
              <div key={state}>
                <small>{state}</small>
                <button className={s.navItem} data-specimen-state={state}>
                  <Icon name={icon} />
                  {label}
                </button>
              </div>
            ))}
          </div>
          <p className={s.muted}>
            Navigasjonsprøven har begrenset høyde. Scroll, prøv tastaturet og
            åpne/lukk «Din utvikling».
          </p>
          <p className={s.muted}>
            Fokus tilhører arbeidsrommet. Innstillinger er fysisk adskilt.
            Scrolling beholder nettleserens naturlige oppførsel.
          </p>
          <div className={s.iconInventory}>
            {[
              ...nav,
              ...progressNav,
              ['settings', 'Innstillinger', 'sliders-horizontal'],
              ['appearance', 'Utseende', 'palette']
            ].map(([key, label, icon]) => (
              <div key={key}>
                <Icon name={icon} size={24} />
                <span>{label}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  )
}

function Surfaces({ mark, theme, setNotice, notice }) {
  const roles = [
    ['canvas', 'Canvas'],
    ['sidebar', 'Sidebar'],
    ['surface', 'Standardflate'],
    ['raised', 'Hevet flate'],
    ['selected', 'Valgt'],
    ['interactive', 'Interaktiv']
  ]
  return (
    <>
      <header className={s.editorialHeader}>
        <Eyebrow>06 / Farge, flater og skrift</Eyebrow>
        <h1>Lys mellom lagene.</h1>
        <p>
          Porselen og mineralgrått. Rubin som handling. Bronse som opptjent
          verdi.
        </p>
      </header>
      <div className={s.surfaceGrid}>
        {roles.map(([key, label]) => (
          <div
            className={s.surfaceSample}
            key={key}
            style={{ background: 'var(--' + key + ')' }}
          >
            <span>{label}</span>
            <Mark kind={mark} size={32} />
            <code>--{key}</code>
          </div>
        ))}
      </div>
      <div className={s.surfaceDetails}>
        <section>
          <Eyebrow>Typografisk rytme / Inter</Eyebrow>
          <h1 className={s.typeSample}>En tydeligere hverdag.</h1>
          <h2>Plass til det som betyr noe</h2>
          <p>
            Arbeidstekst er 16 px. Overskrifter får karakter gjennom rytme,
            linjelengde og komposisjon.
          </p>
          <p className={s.muted}>Sekundærtekst og kontroller · 14 px</p>
          <p className={s.exampleNote}>Korte etiketter · 12 px</p>
          <hr />
          <p>Skillelinjen organiserer. Den rammer ikke inn alt.</p>
        </section>
        <section className={s.elevatedSample}>
          <h2>Kontroller med tydelige roller</h2>
          <div className={s.controlSamples}>
            <Button
              variant="primary"
              onClick={() => setNotice('Primærhandling prøvd.')}
            >
              <Icon name="play" />
              Start Focus
            </Button>
            <Button onClick={() => setNotice('Sekundærhandling prøvd.')}>
              Velg oppgave
            </Button>
            <Button variant="quiet">
              Se detaljer
              <Icon name="arrow-right" />
            </Button>
            <Button disabled>Venter på valg</Button>
          </div>
          <label className={s.field}>
            Oppgavetittel
            <input placeholder="Gi tanken en plass" />
          </label>
          <p className={s.success}>
            <Icon name="check" /> Oppgaven er fullført
          </p>
          <p className={s.error}>
            <Icon name="x" /> Kunne ikke lagre. Prøv igjen.
          </p>
          <p className={s.info}>
            <Icon name="clock-counter-clockwise" /> 25 minutter registrert
          </p>
          <p className={s.earned}>+25 XP opptjent</p>
          <p role="status">{notice}</p>
        </section>
      </div>
      <p className={s.exampleNote}>
        {theme === 'dark' ? 'Mørkt' : 'Lyst'} tema · fokusring vises ved
        tastaturnavigasjon. Ingen heldekkende dekorgradienter.
      </p>
    </>
  )
}

function SupportingView(c) {
  const { view, filter, focused, setFocused } = c
  const label = [...nav, ...progressNav, ['inbox', 'Inbox']].find(
    ([key]) => key === view
  )?.[1]
  const items = (
    view === 'inbox' ? c.allTasks.filter((t) => !t.planned) : c.allTasks
  ).filter((t) => (!filter || t.area === filter) && !c.done.includes(t.id))
  return (
    <>
      <header className={s.editorialHeader}>
        <Eyebrow>Lokal interaksjonsprøve</Eyebrow>
        <h1>
          {label}
          <span className={s.titleDot}>.</span>
        </h1>
        {filter && <p>{areas.find((a) => a.key === filter).name}</p>}
      </header>
      {view === 'focus' ? (
        <section className={s.focusView}>
          <Icon name="crosshair" size={32} />
          <p>Dagens viktigste</p>
          <h2>Gi prosjektet en tydelig retning</h2>
          <span className={s.timer}>00:00</span>
          <p>
            {focused
              ? 'Fokusvisning åpnet · demonstrasjon uten tidsregistrering'
              : 'Pauset demonstrasjon'}
          </p>
          <Button variant="primary" onClick={() => setFocused(!focused)}>
            <Icon name={focused ? 'pause' : 'play'} />
            {focused ? 'Pause' : 'Fortsett'}
          </Button>
          <Button variant="quiet" onClick={() => c.navigate('today')}>
            Tilbake til dagen
          </Button>
        </section>
      ) : ['tasks', 'inbox'].includes(view) ? (
        <TaskList {...c} items={items} />
      ) : view === 'habits' ? (
        <div>
          {habits
            .filter((h) => !filter || h.area === filter)
            .map((h) => (
              <div className={s.habitRow} key={h.id}>
                <strong>{h.title}</strong>
                <Button
                  onClick={() =>
                    c.setLogged((v) =>
                      v.includes(h.id)
                        ? v.filter((x) => x !== h.id)
                        : [...v, h.id]
                    )
                  }
                >
                  {c.logged.includes(h.id) ? 'Angre' : 'Logg'}
                </Button>
              </div>
            ))}
        </div>
      ) : view === 'goals' ? (
        <div>
          {goals
            .filter((g) => !filter || g.area === filter)
            .map((g) => (
              <div className={s.habitRow} key={g.title}>
                <strong>{g.title}</strong>
                <AreaTag areaKey={g.area} />
              </div>
            ))}
          {!goals.some((g) => !filter || g.area === filter) && (
            <p>Ingen mål i dette eksempelet.</p>
          )}
        </div>
      ) : (
        <>
          <p>
            Dette er en navigasjonsprøve. Den detaljerte visuelle studien finnes
            under Fremgang.
          </p>
          <Button onClick={() => c.navigate('progress')}>
            Se fremgangsprøven
            <Icon name="arrow-right" />
          </Button>
        </>
      )}
    </>
  )
}

const galleryGroups = [
  {
    key: 'today-desktop',
    label: 'Today · desktop',
    view: 'today',
    width: 1440,
    height: 1240,
    note: 'Hovedoppgaven først. Egen rytme for oppgaver og vaner.'
  },
  {
    key: 'today-mobile',
    label: 'Today · mobil',
    view: 'today',
    width: 390,
    height: 844,
    note: 'Start Focus og neste arbeidsseksjon i første skjerm.'
  },
  {
    key: 'brand',
    label: 'Fold / Meridian',
    view: 'brand',
    width: 1440,
    height: 1300,
    note: 'To originale merker, i faktisk størrelse og som skulpturelle objekter.'
  },
  {
    key: 'areas',
    label: 'Life Areas',
    view: 'areas',
    width: 1440,
    height: 1250,
    note: 'Fire objekter. Én materialfamilie. Åpne mobilprøven for kompakte innganger.'
  },
  {
    key: 'sidebar',
    label: 'Sidebar / ikoner',
    view: 'sidebar',
    width: 1440,
    height: 1000,
    note: 'Prøv hover, valgt tilstand, tastatur og scrollbar i full størrelse.'
  },
  {
    key: 'surfaces',
    label: 'Flater / typografi',
    view: 'surfaces',
    width: 1440,
    height: 1050,
    note: 'Forskjellen mellom bakgrunn, arbeid, valg og hevede flater.'
  },
  {
    key: 'progress',
    label: 'Progress',
    view: 'progress',
    width: 1440,
    height: 1000,
    note: 'Opptjent verdi, med dempet materialitet og lesbar historikk.'
  },
  {
    key: 'settings',
    label: 'Settings',
    view: 'settings',
    width: 1440,
    height: 1000,
    note: 'Realistiske temavalg, optisk riktige ikoner og synlige lagringstilstander.'
  }
]

function PreviewFrame({ group, theme, mark, mobile }) {
  const ref = useRef(null)
  const [width, setWidth] = useState(600)
  const w = mobile ? 390 : group.width
  const h = mobile ? 844 : group.height
  useEffect(() => {
    const observer = new ResizeObserver((entries) =>
      setWidth(entries[0].contentRect.width)
    )
    observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])
  const scale = Math.min(width / w, 1)
  return (
    <div className={s.previewFrame} ref={ref} style={{ height: h * scale }}>
      <iframe
        title={`${group.label} ${theme}`}
        src={href(group.view, theme, mark, '&preview=1')}
        width={w}
        height={h}
        loading="lazy"
        tabIndex={-1}
        style={{
          transform: `scale(${scale})`,
          left: Math.max(0, (width - w * scale) / 2)
        }}
      />
    </div>
  )
}

function Gallery({ mark, setMark }) {
  const [selected, setSelected] = useState('today-desktop')
  const [mobile, setMobile] = useState(false)
  const group = galleryGroups.find((g) => g.key === selected)
  return (
    <main className={s.gallery}>
      <header className={s.galleryHeader}>
        <div className={s.brand}>
          <Mark kind={mark} />
          <strong>LIFEMAXING</strong>
        </div>
        <span className={s.sampleLabel}>Designstudie 02 · september 2026</span>
      </header>
      <div className={s.galleryIntro}>
        <div>
          <Eyebrow>Nordic Atelier</Eyebrow>
          <h1>
            Et roligere rom.
            <br />
            En tydeligere retning.
          </h1>
          <p>
            En konkret studie av identitet, materialer og en bedre hverdag i
            LIFEMAXING.
          </p>
        </div>
        <div className={s.galleryDecision}>
          <span className={s.sampleLabel}>Åpent merkevalg</span>
          <div className={s.markChoice}>
            {['fold', 'meridian'].map((kind) => (
              <button
                key={kind}
                aria-pressed={mark === kind}
                onClick={() => setMark(kind)}
              >
                <Mark kind={kind} />
                <span>{kind === 'fold' ? 'Fold' : 'Meridian'}</span>
              </button>
            ))}
          </div>
          <p>
            Bytt merke i de samme skjermene.
            <br />
            Begge er kandidater, ikke ferdig godkjent logo.
          </p>
        </div>
      </div>
      <nav className={s.galleryNav} aria-label="Studievisninger">
        {galleryGroups.map((g, i) => (
          <button
            key={g.key}
            aria-current={selected === g.key ? 'page' : undefined}
            onClick={() => {
              setSelected(g.key)
              setMobile(false)
            }}
          >
            <span>0{i + 1}</span>
            {g.label}
          </button>
        ))}
      </nav>
      <section>
        <div className={s.galleryCaption}>
          <div>
            <h2>{group.label}</h2>
            <p>{group.note}</p>
          </div>
          {['areas', 'settings', 'progress'].includes(group.key) && (
            <Button onClick={() => setMobile((v) => !v)}>
              {mobile ? 'Desktopprøve' : 'Mobilprøve'}
              <Icon name="arrow-right" />
            </Button>
          )}
        </div>
        <div
          className={s.previewPair}
          data-mobile={mobile || group.key === 'today-mobile'}
        >
          {['light', 'dark'].map((theme) => (
            <article key={`${selected}-${theme}-${mobile}`}>
              <div className={s.previewLabel}>
                <span>
                  {theme === 'light' ? 'Lyst' : 'Mørkt'} ·{' '}
                  {mark === 'fold' ? 'Fold' : 'Meridian'}
                </span>
                <a
                  href={href(group.view, theme, mark)}
                  target="_blank"
                  rel="noreferrer"
                >
                  Åpne og prøv ↗
                </a>
              </div>
              <PreviewFrame
                group={group}
                theme={theme}
                mark={mark}
                mobile={mobile}
              />
            </article>
          ))}
        </div>
      </section>
      <div className={s.galleryNotes}>
        <section>
          <Eyebrow>Det som er ekte</Eyebrow>
          <p>
            SVG-merker, Phosphor-ikoner og seks originale, modellerte objekter.
            Alle stilleben er rendret fra den samme redigerbare
            Blender-studioscenen.
          </p>
        </section>
        <section>
          <Eyebrow>Det som er en studie</Eyebrow>
          <p>
            Fiktive data og lokale interaksjoner. Ingen produksjonsendringer,
            API-kall eller WebGL. Prøv tom, vanlig, travel og fullført dag i
            fullvisningen.
          </p>
        </section>
        <section>
          <Eyebrow>Neste beslutning</Eyebrow>
          <p>
            Vurder merke, flater og komposisjon sammen. Fold anbefales for
            videre optisk ferdigstilling; ingen produksjonsoverføring før
            visuell godkjenning.
          </p>
        </section>
      </div>
    </main>
  )
}
