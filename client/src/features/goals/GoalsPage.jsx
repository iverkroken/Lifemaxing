import { useLanguage } from '../settings/language.js'
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
  const { t, areaName, date } = useLanguage()
  const [page, setPage] = useState(1)
  const [archived, setArchived] = useState('false')
  const { openCapture } = useOutletContext()
  const [params, setParams] = useSearchParams()
  const areaId = params.get('areaId') || ''
  const goals = useProductivity(`/goals?page=${page}&pageSize=12&archived=${archived}&${areaId ? `areaId=${areaId}` : ''}`)
  const areas = useProductivity('/areas')

  return <div className={styles.stack}>
    <PageHeader eyebrow={t("Direction and progress")} title={t("Goals")} description={t("Track the outcomes you care about and record your next step.")}
      action={<Button onClick={() => openCapture({ kind: 'goal' })}>{t("New goal")}</Button>} />
    <div className={styles.toolbar}>
      <Select label={t("Goal list")} value={archived} onChange={e => { setArchived(e.target.value); setPage(1) }}><option value="false">{t("Current goals")}</option><option value="true">{t("Archived goals")}</option></Select>
      <Select label={t("Life Area filter")} value={areaId} onChange={e => { setParams(e.target.value ? { areaId: e.target.value } : {}); setPage(1) }}><option value="">{t("All areas")}</option>{areas.data?.map(area => <option key={area.id} value={area.id}>{areaName(area)}</option>)}</Select>
    </div>
    <QueryFeedback query={goals} /><QueryFeedback query={areas} />
    {goals.data?.total === 0 && <EmptyState title={t("What would you like to move toward?")} icon="goals" action={<Button variant="secondary" onClick={() => openCapture({ kind: 'goal' })}>{t("Set your first goal")}</Button>}>{t("Choose a meaningful outcome. Track it with numbers or simply record what changed.")}</EmptyState>}
    <div className={styles.tileGrid}>{goals.data?.items.map(goal => <article className={styles.tile} key={goal.id}>
      <div className={styles.sectionHeading}><span className={styles.eyebrow}>{areaName(areas.data?.find(area => area.id === goal.lifeAreaId)) || t("Your direction")}</span><span className={styles.badge}>{goal.archivedAtUtc ? t("Archived") : t(goal.state)}</span></div>
      <h2><Link to={`/goals/${goal.id}`}>{goal.title}</Link></h2>
      <GoalProgress goal={goal} />
      <div className={styles.sectionHeading}><span className={styles.meta}>{goal.targetDate ? t('targetDateValue', { date: date(goal.targetDate) }) : t("At your own pace")}</span><Link to={`/goals/${goal.id}`}>{t("View progress →")}</Link></div>
    </article>)}</div><Pagination data={goals.data} setPage={setPage} />
  </div>
}

export function GoalDetailPage() {
  const { t, date, dateTime, number } = useLanguage()
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
    <Link to="/goals">{t("← All goals")}</Link>
    <PageHeader eyebrow={data ? `${t('Goal')} · ${t(data.archivedAtUtc ? 'Archived' : data.state)}` : t("Your direction")} title={data?.title || t("Goal")} description={data?.description}
      action={data && !data.archivedAtUtc && <Button variant="secondary" onClick={() => setEditing(true)}>{t("Edit goal")}</Button>} />
    <QueryFeedback query={goal} />
    {data && <div className={styles.split}>
      <div>
        <GoalProgress goal={data} />
        <p className={styles.meta}>{data.targetDate && <>{t('targetDateValue', { date: date(data.targetDate) })} · </>}{data.targetValue != null ? t('baselineValue', { value: number(data.baselineValue), unit: data.unit }) : t("Qualitative progress")}</p>
        <section className={styles.section} aria-label={t("Progress history")}><h2 className={styles.sectionTitle}>{t("Progress history")}</h2>
          <QueryFeedback query={progress} />
          {progress.data?.total === 0 && <EmptyState title={t("Every step has a place")}>{t("Your updates will build an honest record of the journey.")}</EmptyState>}
          <ol className={styles.history}>{progress.data?.items.map(entry => <li key={entry.id}>
            <p>{entry.value != null && <strong>{number(entry.value)} {data.unit} · </strong>}<time dateTime={entry.recordedAtUtc}>{dateTime(entry.recordedAtUtc)}</time></p>
            {entry.note && <p className={styles.note}>{entry.note}</p>}
          </li>)}</ol><Pagination data={progress.data} setPage={setPage} />
        </section>
      </div>
      <section className={styles.surface} aria-label={t("Record progress")}><h2 className={styles.sectionTitle}>{t("Record an update")}</h2>
        <p className={styles.intro}>{t("Record where you are now. To correct an earlier update, add a new entry.")}</p>
        {data.archivedAtUtc ? <p>{t("This goal is archived. Its progress history is preserved.")}</p> : <form className={styles.form} onSubmit={e => { e.preventDefault(); action.mutate({ path: `/goals/${id}/progress`, body: { value: data.targetValue != null && value !== '' ? Number(value) : null, note: note || null } }) }}>
          <fieldset disabled={action.isPending} className={styles.formFields}>
            {data.targetValue != null && <Input label={t('currentValue', { unit: data.unit })} type="number" step="0.0001" required value={value} onChange={e => setValue(e.target.value)} />}
            <Input label={t("Progress note")} multiline rows={4} required={data.targetValue == null} maxLength={5000} value={note} onChange={e => setNote(e.target.value)} />
            <Button type="submit" loading={action.isPending}>{t("Record progress")}</Button><ActionFeedback action={action} success={t("Progress recorded.")} />
          </fieldset>
        </form>}
      </section>
    </div>}
    <Dialog open={editing} onClose={() => setEditing(false)} title={t("Edit goal")}>{data && <><GoalForm key={id} goal={data} />
      <details className={styles.section}><summary>{t("Archive this goal")}</summary><p>{t("Your progress history will be preserved.")}</p><Button variant="danger" loading={archive.isPending} onClick={() => archive.mutate({ path: `/goals/${id}`, method: 'DELETE' })}>{t("Archive goal")}</Button><ActionFeedback action={archive} /></details></>}</Dialog>
  </div>
}
