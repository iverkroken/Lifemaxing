import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/inter/latin-400.css'
import '@fontsource/inter/latin-500.css'
import '@fontsource/inter/latin-600.css'
import { Icon } from './LegacyIcon.jsx'
import { Emblem } from './Emblem.jsx'
import { areas, tasks, busyTasks, habits, goals, mission, ranks } from './fixtures.js'
import compass from './assets/compass-espresso.png'
import stone from './assets/compass-stone.png'
import atlas from './assets/life-objects-atlas.png'
import styles from './reference.module.css'

const params = new URLSearchParams(location.search)
const pages = [['today', 'I dag', 'today'], ['tasks', 'Oppgaver', 'tasks'], ['areas', 'Livsområder', 'areas'], ['ranks', 'Rangoversikt', 'progress'], ['settings', 'Innstillinger', 'settings']]
const areaFor = key => areas.find(area => area.key === key)
const link = (direction, theme, page = 'today') => `?direction=${direction}&theme=${theme}&page=${page}`

function Button({ children, primary, danger, onClick, ...props }) {
  return <button className={`${styles.button} ${primary ? styles.primary : ''} ${danger ? styles.danger : ''}`} onClick={onClick} {...props}>{children}</button>
}
function AreaLabel({ area }) {
  return <span className={styles.areaLabel} data-area={area}><Icon name={area} size={16} />{areaFor(area).name}</span>
}
function Artwork({ index }) {
  return <div className={styles.artwork} role="img" aria-label={`Materialstudie: ${areas[index].name}`} style={{ backgroundImage: `url(${atlas})`, backgroundPosition: `${(index % 5) * 25}% ${index < 5 ? 0 : 95}%` }} />
}
function TaskRow({ task, checked, toggle, open }) {
  return <li className={styles.taskRow} data-completed={checked}>
    <button className={styles.check} aria-label={`${checked ? 'Gjenåpne' : 'Fullfør'}: ${task.title}`} aria-pressed={checked} onClick={toggle}>{checked && <Icon name="check" />}</button>
    <button className={styles.taskTitle} onClick={open}><span>{task.title}</span><span className={styles.metadata}><AreaLabel area={task.area} />{task.overdue && <span className={styles.overdue}>Frist i går</span>}{!task.planned && <span>Uten dato · Inbox</span>}</span></button>
    <span className={styles.duration}>{task.minutes} min</span>
  </li>
}

export function Comparison() {
  return <main className={styles.comparison}>
    <p className={styles.eyebrow}>LIFEMAXING / DESIGNSTUDIE 01</p>
    <h1>To rom. Samme hverdag.</h1>
    <p>Draft · fiktivt innhold. Åpne en retning i full størrelse før du vurderer tekst og berøringsmål.</p>
    <div className={styles.compareGrid}>{[['A', 'dark', 'Espresso / personlig kompass', 'Anbefalt: konsentrert arbeidsflate, rubin i objektet og børstet bronse.'], ['B', 'light', 'Stein / skulpturell sti', 'Lettere atelier, åpen dagliste og grønn emalje i et landskap av stein.']].map(([direction, theme, title, description]) => <section key={direction}>
      <h2>{direction} — {title}</h2><p>{description}</p><a className={styles.button} href={link(direction, theme)}>Åpne {direction} i full størrelse <Icon name="arrow" /></a>
      <iframe title={`Retning ${direction}: faktisk Today-prototype`} src={`${link(direction, theme)}&embedded=1`} loading="lazy" />
    </section>)}</div>
    <p>Begge retninger kan prøves med samme data, i lyst og mørkt tema. Visuell godkjenning er ikke gitt.</p>
  </main>
}

export function Reference() {
  const [direction, setDirection] = useState(params.get('direction') === 'B' ? 'B' : 'A')
  const [theme, setTheme] = useState(params.get('theme') === 'light' ? 'light' : 'dark')
  const [page, setPage] = useState(pages.some(([key]) => key === params.get('page')) ? params.get('page') : 'today')
  const [day, setDay] = useState(['empty', 'busy'].includes(params.get('day')) ? params.get('day') : 'normal')
  const [done, setDone] = useState(['plant'])
  const [logged, setLogged] = useState(['reading'])
  const [selected, setSelected] = useState(null)
  const [focus, setFocus] = useState(false)
  const [filter, setFilter] = useState('all')
  const [notice, setNotice] = useState('')
  const [language, setLanguage] = useState('nb')
  const [capture, setCapture] = useState(false)
  const [title, setTitle] = useState('')
  const [added, setAdded] = useState([])
  const dayTasks = day === 'empty' ? added : [...(day === 'busy' ? busyTasks : tasks.filter(task => task.planned)), ...added]
  const completed = dayTasks.filter(task => done.includes(task.id)).length
  const toggle = id => { setDone(value => value.includes(id) ? value.filter(item => item !== id) : [...value, id]); setNotice('Demonstrasjon: kun lokal avkrysning. XP og rang er uendret.') }
  const selectPage = next => { setPage(next); setSelected(null); setFocus(false); setNotice('') }
  const allTasks = [...(day === 'busy' ? busyTasks : tasks), ...added]
  const shownTasks = allTasks.filter(task => filter === 'all' || task.area === filter)
  const nav = <>{pages.map(([key, label, icon]) => <button key={key} aria-current={page === key ? 'page' : undefined} onClick={() => selectPage(key)}><Icon name={icon} /><span>{label}</span></button>)}</>
  return <div className={styles.reference} data-theme={theme} data-direction={direction}>
    {!params.has('embedded') && <header className={styles.reviewBar}>
      <strong>P1 · DEMONSTRASJON</strong><span>Kun fiktive data · draft</span>
      <label>Retning<select value={direction} onChange={e => setDirection(e.target.value)}><option value="A">A · Espresso</option><option value="B">B · Stein</option></select></label>
      <label>Tema<select value={theme} onChange={e => setTheme(e.target.value)}><option value="dark">Mørkt</option><option value="light">Lyst</option></select></label>
      <label>Arbeidsdag<select value={day} onChange={e => { setDay(e.target.value); setDone(['plant']); setAdded([]) }}><option value="normal">Vanlig dag</option><option value="empty">Uten oppgaver</option><option value="busy">Travel dag</option></select></label>
      <a href="?compare=1">Sammenlign A / B</a>
    </header>}
    <div className={styles.workspace}>
      <aside className={styles.sidebar}>
        <div className={styles.wordmark}><span className={styles.brandMark}>◇</span> LIFEMAXING</div>
        <button className={styles.quick} onClick={() => setCapture(true)}><Icon name="plus" />Ny oppgave</button>
        <p className={styles.navLabel}>ARBEIDSROM</p><nav aria-label="Hovednavigasjon">{nav}</nav>
        <div className={styles.sidebarFoot}><span className={styles.avatar}>E</span><div>Eksempelbruker<small>Personlig arbeidsrom · demo</small></div></div>
      </aside>
      <div className={styles.mobileBrand}><span>◇ LIFEMAXING</span><Button onClick={() => setCapture(true)}><Icon name="plus" />Ny</Button></div>
      <main className={styles.main} id="reference-main">
        <div className={styles.breadcrumb}>Arbeidsrom <span>/</span> {pages.find(([key]) => key === page)[1]}<span className={styles.demoTag}>Fiktiv demonstrasjon</span></div>
        <header className={styles.pageHeader}><div><p className={styles.eyebrow}>{page === 'today' ? 'MANDAG 14. SEPTEMBER 2026' : 'DITT PERSONLIGE ARBEIDSROM'}</p><h1>{pages.find(([key]) => key === page)[1]}</h1></div>{page === 'today' && <Button onClick={() => setCapture(true)}><Icon name="plus" />Legg til oppgave</Button>}</header>
        {page === 'today' && <>
          <div className={styles.daySummary}><span><strong>{completed} av {dayTasks.length}</strong> oppgaver fullført</span><span>{logged.length} av {habits.length} vaner</span><div className={styles.meter} aria-label={`${completed} av ${dayTasks.length} oppgaver fullført`}><span style={{ width: `${dayTasks.length ? completed / dayTasks.length * 100 : 0}%` }} /></div></div>
          <div className={styles.todayLayout}>
            <div className={styles.execution}>
              {day !== 'empty' && <section className={styles.mission} aria-label="Dagens hovedoppgave">
                <div className={styles.missionCopy}><p className={styles.eyebrow}>DAGENS HOVEDOPPGAVE <span className={styles.rubyDot} /></p><h2>{mission.title}</h2><p>{mission.detail}</p><div className={styles.metadata}><AreaLabel area={mission.area} /><span>{mission.minutes} min</span></div><div className={styles.actions}><Button primary onClick={() => setFocus(!focus)}><Icon name="focus" />{focus ? 'Tilbake til planen' : 'Start fokus'}</Button><Button onClick={() => toggle('mission')}><Icon name="check" />{done.includes('mission') ? 'Gjenåpne' : 'Fullfør'}</Button></div>{focus && <p role="status">Fokusvisning · demonstrasjon. Ingen økt eller tid registreres.</p>}</div>
                <figure className={styles.signature}><img src={direction === 'A' ? compass : stone} alt={direction === 'A' ? 'Personlig kompass i grafitt, rubin og børstet bronse' : 'Skulpturell sti i elfenbenstein med grønn kompassnål'} /><figcaption>{direction === 'A' ? '01 / DITT PERSONLIGE KOMPASS' : '02 / ETT STEG AV GANGEN'} · BILDEKONSEPT</figcaption></figure>
              </section>}
              {day === 'empty' && <section className={styles.emptyDay}><img src={direction === 'A' ? compass : stone} alt="Kompasset ligger i ro" /><div><p className={styles.eyebrow}>PLASS I DAGEN</p><h2>Hva vil du gi tid til?</h2><p>Ingen oppgaver er planlagt. Velg én fra listen din, eller legg til noe nytt.</p><div className={styles.actions}><Button primary onClick={() => selectPage('tasks')}>Velg fra oppgaver</Button><Button onClick={() => setCapture(true)}>Ny oppgave</Button></div></div></section>}
              {dayTasks.filter(task => task.id !== 'mission').length > 0 && <section className={styles.taskSection}><div className={styles.sectionHeading}><h2>Resten av dagen</h2><span>{dayTasks.filter(task => task.id !== 'mission').length} oppgaver</span></div>{day === 'busy' && <p className={styles.busyNote}>18 oppgaver er en tett plan. Hele listen er tilgjengelig; velg hva som faktisk trenger plass i dag.</p>}<ul className={styles.taskList}>{dayTasks.filter(task => task.id !== 'mission').map(task => <TaskRow key={task.id} task={task} checked={done.includes(task.id)} toggle={() => toggle(task.id)} open={() => setSelected(task)} />)}</ul></section>}
            </div>
            <aside className={styles.support}>
              <section><div className={styles.sectionHeading}><h2>Små, faste steg</h2><Icon name="habits" /></div><p className={styles.supportIntro}>Dagens vaner</p><ul className={styles.habits}>{habits.map(habit => <li key={habit.id}><button className={styles.check} aria-label={`Loggfør vane: ${habit.title}`} aria-pressed={logged.includes(habit.id)} onClick={() => setLogged(value => value.includes(habit.id) ? value.filter(id => id !== habit.id) : [...value, habit.id])}>{logged.includes(habit.id) && <Icon name="check" />}</button><div>{habit.title}<small>{habit.cadence} · eksempel</small></div></li>)}</ul></section>
              <section className={styles.progressNote}><p className={styles.eyebrow}>LANGSIKTIG PROGRESJON</p><div className={styles.sectionHeading}><h2>Level 8</h2><span>600 / 1 200 XP</span></div><div className={styles.meter}><span style={{ width: '50%' }} /></div><p>5 600 XP totalt · fiktivt eksempel</p><button className={styles.textButton} onClick={() => selectPage('ranks')}>Se foreslått rangstige <Icon name="arrow" /></button></section>
              <p className={styles.quietNote}>En plan viser hva du har valgt å gjøre. Den vurderer ikke deg.</p>
            </aside>
          </div>
        </>}
        {page === 'tasks' && <><p className={styles.intro}>Daterte og udaterte oppgaver, med samme områdeidentitet som i dag.</p><label className={styles.filter}>Livsområde<select value={filter} onChange={e => setFilter(e.target.value)}><option value="all">Alle livsområder</option>{areas.map(area => <option key={area.key} value={area.key}>{area.name}</option>)}</select></label><ul className={styles.taskList}>{shownTasks.map(task => <TaskRow key={task.id} task={task} checked={done.includes(task.id)} toggle={() => toggle(task.id)} open={() => setSelected(task)} />)}</ul>{shownTasks.length === 0 && <p>Ingen oppgaver i dette området.</p>}</>}
        {page === 'areas' && <><p className={styles.intro}>Ti deler av livet. Ulikt innhold, ett samlet arbeidsrom.</p><div className={styles.areaGrid}>{areas.map(area => {
          const active = allTasks.filter(task => task.area === area.key && !done.includes(task.id))
          const areaHabits = habits.filter(habit => habit.area === area.key)
          const areaGoals = goals.filter(goal => goal.area === area.key)
          return <article className={styles.areaCard} key={area.key} data-area={area.key}><Artwork index={area.artwork} /><div><h2>{area.name}</h2><p>{area.description}</p><div className={styles.areaCounts}><span>{active.length} oppgaver</span><span>{areaHabits.length} vaner</span><span>{areaGoals.length} mål</span></div><p className={styles.nextTask}>{active[0]?.title || areaHabits[0]?.title || 'Rom for en ny plan når du trenger det.'}</p><button className={styles.textButton} onClick={() => { setFilter(area.key); selectPage('tasks') }}>Åpne oppgaver <Icon name="arrow" /></button></div></article>
        })}</div><details className={styles.details}><summary>Vis mål og vaner bak eksempeltallene</summary><ul>{goals.map(goal => <li key={goal.title}>{areaFor(goal.area).name}: {goal.title}</li>)}{habits.map(habit => <li key={habit.id}>{areaFor(habit.area).name}: {habit.title}</li>)}</ul></details></>}
        {page === 'ranks' && <><div className={styles.rankIntro}><div><p className={styles.eyebrow}>FORESLÅTT STIGE · DEMONSTRASJON</p><h2>Retning over tid</h2><p>Rang skal vise nyere planoppfølging. Level beholder den langsiktige XP-historikken.</p><p>Ingen personlig plassering ennå. Nye terskler og poeng er ikke bestemt. P9 simulerer; P10 implementerer etter godkjenning.</p></div><div className={styles.featureEmblem}><Emblem index={5} size={128} /><small>Emerald · kun emblemstudie</small></div></div><ol className={styles.rankGrid}>{ranks.map((rank, index) => <li key={rank} data-rank={rank}><Emblem index={index} /><div><h2>{rank}</h2><p>{index < 7 ? 'IV → III → II → I' : 'Uten divisjoner'}</p><small>Demonstrasjon · ingen terskel</small></div><span className={styles.smallEmblem}><Emblem index={index} size={24} /></span></li>)}</ol></>}
        {page === 'settings' && <div className={styles.settingsLayout}><nav aria-label="Innstillingsseksjoner"><a href="#appearance">Utseende</a><a href="#language">Språk og format</a><a href="#security">Sikkerhet</a></nav><div>
          <section className={styles.settingsSection} id="appearance"><h2>Et arbeidsrom som passer deg</h2><p>Fargene understøtter innholdet. Hovedhandlinger bruker samme uttrykk overalt.</p><fieldset><legend>Tema</legend><div className={styles.themeOptions}>{[['light', 'Lyst', stone], ['dark', 'Mørkt', compass]].map(([key, label, src]) => <label key={key} data-preview={key}><img src={src} alt="" /><span><input type="radio" name="theme" value={key} checked={theme === key} onChange={() => setTheme(key)} />{label}</span></label>)}</div></fieldset><div className={styles.settingRow}><div><h3>Fargepalett</h3><p>Espresso / elfenben · rubin · skog · bronse</p></div><div className={styles.swatches} aria-label="Fire atskilte roller: grunnfarge, rubindekor, grønn handling og bronsemateriale"><i /><i /><i /><i /></div></div><p className={styles.quietNote}>Valgene gjelder bare denne demonstrasjonen. Systemtema følger eksisterende produkt i P2.</p></section>
          <section className={styles.settingsSection} id="language"><h2>Språk og format</h2><div className={styles.settingRow}><label htmlFor="language-choice">Grensesnittspråk<small>Visuell valgkontroll · tekstene i P1 er på bokmål.</small></label><select id="language-choice" value={language} onChange={e => { setLanguage(e.target.value); setNotice('Språkvalg demonstrert. Full oversettelse hører til implementeringen i P2/P4.') }}><option value="nb">Norsk bokmål</option><option value="en">English</option><option value="sv">Svenska</option><option value="da">Dansk</option></select></div><div className={styles.settingRow}><span>Regionalt format</span><span>Norge · 14.09.2026 · 1 234,50</span></div><div className={styles.settingRow}><span>Tidssone</span><span>Europe/Oslo · eksempel</span></div></section>
          <section className={styles.settingsSection} id="security"><h2><Icon name="shield" /> Sikkerhet og økter</h2><p>Vanlig utlogging gjelder denne enheten. «Logg ut overalt» avslutter også andre økter ved neste kontroll.</p><div className={styles.actions}><Button danger onClick={() => setNotice('Demonstrasjon: utlogging er ikke tilkoblet. Ingen økt ble endret.')}><Icon name="signOut" />Logg ut</Button><Button onClick={() => setNotice('Demonstrasjon: ingen økter ble avsluttet.')}>Logg ut overalt</Button></div><p className={styles.quietNote}>Rubin tilhører kompasset. Sikkerhetshandlinger har eget faresignal, ikon og handlingsnavn.</p></section>
        </div></div>}
        {notice && <p className={styles.notice} role="status">{notice}</p>}
        <footer className={styles.footer}>LIFEMAXING · P1 / {direction} · designkontrakt i draft · ingen databasekobling</footer>
      </main>
      <nav className={styles.mobileNav} aria-label="Mobilnavigasjon">{pages.map(([key, , icon], index) => <button key={key} aria-current={page === key ? 'page' : undefined} onClick={() => selectPage(key)}><Icon name={icon} /><span>{['I dag', 'Oppgaver', 'Områder', 'Rang', 'Valg'][index]}</span></button>)}</nav>
    </div>
    {selected && <div className={styles.detailPanel}><Button onClick={() => setSelected(null)}><Icon name="close" />Lukk detaljer</Button><p className={styles.eyebrow}>OPPGAVE · DEMONSTRASJON</p><h2>{selected.title}</h2><AreaLabel area={selected.area} /><p>{selected.minutes} minutter · {selected.planned ? 'Planlagt 14. september' : 'Uten planlagt dato'}</p><p>{selected.detail || 'Detaljer vises ved behov. Oppgavelisten beholder ro og oversikt.'}</p><Button primary onClick={() => toggle(selected.id)}>{done.includes(selected.id) ? 'Gjenåpne' : 'Fullfør'}</Button></div>}
    {capture && <dialog className={styles.capturePanel} aria-labelledby="capture-title" ref={node => { if (node && !node.open) node.showModal() }} onCancel={() => setCapture(false)}><form onSubmit={e => { e.preventDefault(); if (!title.trim()) return; setAdded(value => [...value, { id: `local-${value.length}`, title: title.trim(), area: 'personal', minutes: 15, planned: true }]); setTitle(''); setCapture(false); selectPage('today'); setNotice('Fiktiv oppgave lagt til i minnet. Last siden på nytt for å nullstille.') }}><h2 id="capture-title">Ny demonstrasjonsoppgave</h2><label>Tittel<input autoFocus required maxLength={200} value={title} onChange={e => setTitle(e.target.value)} /></label><p>Kun lokal prototype. Ingen lagring eller XP.</p><div className={styles.actions}><Button primary type="submit">Legg til</Button><Button type="button" onClick={() => setCapture(false)}>Avbryt</Button></div></form></dialog>}
  </div>
}

createRoot(document.getElementById('root')).render(<StrictMode>{params.has('compare') ? <Comparison /> : <Reference />}</StrictMode>)
