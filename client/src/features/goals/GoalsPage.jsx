import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { useProductivity, useProductivityAction } from '../../shared/api/productivity.js'
import { Button } from '../../shared/ui/Button.jsx'
import { Card } from '../../shared/ui/Card.jsx'
import { Input } from '../../shared/ui/Input.jsx'
import { Select } from '../../shared/ui/Select.jsx'
import { PageHeader } from '../../shared/ui/PageHeader.jsx'
import { ActionFeedback, Pagination, QueryFeedback } from '../../shared/ui/ProductivityFeedback.jsx'
import { GoalForm } from './GoalForm.jsx'
import styles from '../../shared/ui/Productivity.module.css'

export function GoalsPage() {
  const [page, setPage] = useState(1)
  const [archived, setArchived] = useState('false')
  const goals = useProductivity(`/goals?page=${page}&archived=${archived}`)
  const navigate = useNavigate()
  return <div className={styles.stack}>
    <PageHeader title="Goals" description="Define the outcome. Keep an honest record of progress." />
    <Card><h2 className={styles.sectionTitle}>Set a goal</h2><GoalForm onSaved={goal => navigate(`/goals/${goal.id}`)} /></Card>
    <Card><h2 className={styles.sectionTitle}>Your goals</h2>
      <Select label="Goal list" value={archived} onChange={e => { setArchived(e.target.value); setPage(1) }}><option value="false">Current goals</option><option value="true">Archived goals</option></Select>
      <QueryFeedback query={goals} />{goals.data?.total === 0 && <p>No goals here yet. Start with one meaningful outcome.</p>}
      <ul className={styles.list}>{goals.data?.items.map(goal => <li className={styles.row} key={goal.id}><div>
        <Link className={styles.title} to={`/goals/${goal.id}`}>{goal.title}</Link>
        <p className={styles.meta}>{goal.archivedAtUtc ? 'Archived' : goal.state}{goal.targetValue != null ? ` · Target ${goal.targetValue} ${goal.unit}` : ' · Qualitative'}{goal.targetDate && ` · By ${goal.targetDate}`}</p>
      </div></li>)}</ul><Pagination data={goals.data} setPage={setPage} />
    </Card>
  </div>
}

export function GoalDetailPage() {
  const { id } = useParams()
  const [page, setPage] = useState(1)
  const [value, setValue] = useState('')
  const [note, setNote] = useState('')
  const goal = useProductivity(`/goals/${id}`)
  const progress = useProductivity(`/goals/${id}/progress?page=${page}`)
  const action = useProductivityAction(() => { setValue(''); setNote(''); setPage(1) })
  const archive = useProductivityAction()
  const data = goal.data
  return <div className={styles.stack}>
    <PageHeader title={data?.title || 'Goal'} action={<Link to="/goals">All goals</Link>} />
    <QueryFeedback query={goal} />
    {data && <>
      <Card><h2 className={styles.sectionTitle}>Goal details</h2>
        {data.archivedAtUtc ? <p>This goal is archived. Its progress history is preserved.</p> : <>
          <GoalForm key={id} goal={data} />
          <Button variant="danger" loading={archive.isPending} onClick={() => archive.mutate({ path: `/goals/${id}`, method: 'DELETE' })}>Archive goal</Button>
          <ActionFeedback action={archive} />
        </>}
      </Card>
      <Card><h2 className={styles.sectionTitle}>Progress history</h2>
        <p className={styles.intro}>{data.targetValue != null ? `Baseline ${data.baselineValue} → target ${data.targetValue} ${data.unit}. Record your current value.` : 'Describe what changed or what you achieved.'} Updates are preserved; add a new entry to correct an earlier one.</p>
        {!data.archivedAtUtc && <form className={styles.form} onSubmit={e => { e.preventDefault(); action.mutate({ path: `/goals/${id}/progress`, body: { value: data.targetValue != null && value !== '' ? Number(value) : null, note: note || null } }) }}>
          <fieldset disabled={action.isPending} className={styles.formFields}>
          {data.targetValue != null && <Input label={`Current value (${data.unit})`} type="number" step="0.0001" required value={value} onChange={e => setValue(e.target.value)} />}
          <Input label="Progress note" required={data.targetValue == null} maxLength={5000} value={note} onChange={e => setNote(e.target.value)} />
          <Button type="submit" loading={action.isPending}>Record progress</Button><ActionFeedback action={action} success="Progress recorded." />
          </fieldset>
        </form>}
        <QueryFeedback query={progress} />
        {progress.data?.total === 0 && <p>No progress recorded yet.</p>}
        <ol className={styles.history}>{progress.data?.items.map(entry => <li key={entry.id}>
          <p>{entry.value != null && <strong>{entry.value} {data.unit} · </strong>}<time dateTime={entry.recordedAtUtc}>{new Date(entry.recordedAtUtc).toLocaleString()}</time></p>
          {entry.note && <p className={styles.note}>{entry.note}</p>}
        </li>)}</ol><Pagination data={progress.data} setPage={setPage} />
      </Card>
    </>}
  </div>
}
