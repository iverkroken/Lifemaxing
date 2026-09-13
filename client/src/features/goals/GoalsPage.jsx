import { useState } from 'react'
import { Link, useOutletContext, useParams, useSearchParams } from 'react-router'
import { useProductivity, useProductivityAction } from '../../shared/api/productivity.js'
import { Button } from '../../shared/ui/Button.jsx'
import { Dialog } from '../../shared/ui/Dialog.jsx'
import { EmptyState } from '../../shared/ui/EmptyState.jsx'
import { Input } from '../../shared/ui/Input.jsx'
import { Select } from '../../shared/ui/Select.jsx'
import { PageHeader } from '../../shared/ui/PageHeader.jsx'
import { ActionFeedback, Pagination, QueryFeedback } from '../../shared/ui/ProductivityFeedback.jsx'
import { GoalForm } from './GoalForm.jsx'
import { GoalProgress } from './GoalProgress.jsx'
import styles from '../../shared/ui/Productivity.module.css'

export function GoalsPage() {
  const [page, setPage] = useState(1)
  const [archived, setArchived] = useState('false')
  const { openCapture } = useOutletContext()
  const [params, setParams] = useSearchParams()
  const areaId = params.get('areaId') || ''
  const goals = useProductivity(`/goals?page=${page}&pageSize=12&archived=${archived}&${areaId ? `areaId=${areaId}` : ''}`)
  const areas = useProductivity('/areas')

  return <div className={styles.stack}>
    <PageHeader eyebrow="A direction worth moving in" title="Goals" description="Keep the bigger picture close. Make your next step meaningful."
      action={<Button onClick={() => openCapture({ kind: 'goal' })}>New goal</Button>} />
    <div className={styles.toolbar}>
      <Select label="Goal list" value={archived} onChange={e => { setArchived(e.target.value); setPage(1) }}><option value="false">Current goals</option><option value="true">Archived goals</option></Select>
      <Select label="Life Area filter" value={areaId} onChange={e => { setParams(e.target.value ? { areaId: e.target.value } : {}); setPage(1) }}><option value="">All areas</option>{areas.data?.map(area => <option key={area.id} value={area.id}>{area.displayName}</option>)}</Select>
    </div>
    <QueryFeedback query={goals} /><QueryFeedback query={areas} />
    {goals.data?.total === 0 && <EmptyState title="What would you like to move toward?" icon="goals" action={<Button variant="secondary" onClick={() => openCapture({ kind: 'goal' })}>Set your first goal</Button>}>Choose a meaningful outcome. Track it with numbers or simply record what changed.</EmptyState>}
    <div className={styles.tileGrid}>{goals.data?.items.map(goal => <article className={styles.tile} key={goal.id}>
      <div className={styles.sectionHeading}><span className={styles.eyebrow}>{areas.data?.find(area => area.id === goal.lifeAreaId)?.displayName || 'Your direction'}</span><span className={styles.badge}>{goal.archivedAtUtc ? 'Archived' : goal.state}</span></div>
      <h2><Link to={`/goals/${goal.id}`}>{goal.title}</Link></h2>
      <GoalProgress goal={goal} />
      <div className={styles.sectionHeading}><span className={styles.meta}>{goal.targetDate ? `Target date ${goal.targetDate}` : 'At your own pace'}</span><Link to={`/goals/${goal.id}`}>View progress →</Link></div>
    </article>)}</div><Pagination data={goals.data} setPage={setPage} />
  </div>
}

export function GoalDetailPage() {
  const { id } = useParams()
  const [page, setPage] = useState(1)
  const [value, setValue] = useState('')
  const [note, setNote] = useState('')
  const [editing, setEditing] = useState(false)
  const goal = useProductivity(`/goals/${id}`)
  const progress = useProductivity(`/goals/${id}/progress?page=${page}`)
  const action = useProductivityAction(() => { setValue(''); setNote(''); setPage(1) })
  const archive = useProductivityAction(() => setEditing(false))
  const data = goal.data
  return <div className={styles.stack}>
    <Link to="/goals">← All goals</Link>
    <PageHeader eyebrow={data ? `${data.archivedAtUtc ? 'Archived' : data.state} goal` : 'Your direction'} title={data?.title || 'Goal'} description={data?.description}
      action={data && !data.archivedAtUtc && <Button variant="secondary" onClick={() => setEditing(true)}>Edit goal</Button>} />
    <QueryFeedback query={goal} />
    {data && <div className={styles.split}>
      <div>
        <GoalProgress goal={data} />
        <p className={styles.meta}>{data.targetDate && `Target date ${data.targetDate} · `}{data.targetValue != null ? `Baseline ${data.baselineValue} ${data.unit}` : 'Qualitative progress'}</p>
        <section className={styles.section} aria-label="Progress history"><h2 className={styles.sectionTitle}>Progress history</h2>
          <QueryFeedback query={progress} />
          {progress.data?.total === 0 && <EmptyState title="Every step has a place">Your updates will build an honest record of the journey.</EmptyState>}
          <ol className={styles.history}>{progress.data?.items.map(entry => <li key={entry.id}>
            <p>{entry.value != null && <strong>{entry.value} {data.unit} · </strong>}<time dateTime={entry.recordedAtUtc}>{new Date(entry.recordedAtUtc).toLocaleString()}</time></p>
            {entry.note && <p className={styles.note}>{entry.note}</p>}
          </li>)}</ol><Pagination data={progress.data} setPage={setPage} />
        </section>
      </div>
      <section className={styles.surface} aria-label="Record progress"><h2 className={styles.sectionTitle}>A step forward</h2>
        <p className={styles.intro}>Record where you are now. To correct an earlier update, add a new entry.</p>
        {data.archivedAtUtc ? <p>This goal is archived. Its progress history is preserved.</p> : <form className={styles.form} onSubmit={e => { e.preventDefault(); action.mutate({ path: `/goals/${id}/progress`, body: { value: data.targetValue != null && value !== '' ? Number(value) : null, note: note || null } }) }}>
          <fieldset disabled={action.isPending} className={styles.formFields}>
            {data.targetValue != null && <Input label={`Current value (${data.unit})`} type="number" step="0.0001" required value={value} onChange={e => setValue(e.target.value)} />}
            <Input label="Progress note" multiline rows={4} required={data.targetValue == null} maxLength={5000} value={note} onChange={e => setNote(e.target.value)} />
            <Button type="submit" loading={action.isPending}>Record progress</Button><ActionFeedback action={action} success="Progress recorded." />
          </fieldset>
        </form>}
      </section>
    </div>}
    <Dialog open={editing} onClose={() => setEditing(false)} title="Edit goal">{data && <><GoalForm key={id} goal={data} />
      <details className={styles.section}><summary>Archive this goal</summary><p>Your progress history will be preserved.</p><Button variant="danger" loading={archive.isPending} onClick={() => archive.mutate({ path: `/goals/${id}`, method: 'DELETE' })}>Archive goal</Button><ActionFeedback action={archive} /></details></>}</Dialog>
  </div>
}
