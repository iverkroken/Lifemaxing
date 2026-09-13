import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link } from 'react-router'
import { useProductivity, useProductivityAction } from '../../shared/api/productivity.js'
import { PageHeader } from '../../shared/ui/PageHeader.jsx'
import { Input } from '../../shared/ui/Input.jsx'
import { Select } from '../../shared/ui/Select.jsx'
import { Button } from '../../shared/ui/Button.jsx'
import { Dialog } from '../../shared/ui/Dialog.jsx'
import { EmptyState } from '../../shared/ui/EmptyState.jsx'
import { ActionFeedback, QueryFeedback, Pagination } from '../../shared/ui/ProductivityFeedback.jsx'
import styles from '../../shared/ui/Productivity.module.css'

const schema = z.object({ title: z.string().trim().min(1).max(200), requiredLevel: z.coerce.number().int().min(1).max(100000) })
function RewardForm({ reward, onSaved }) {
  const form = useForm({ resolver: zodResolver(schema), defaultValues: { title: reward?.title || '', requiredLevel: reward?.requiredLevel || 1 } })
  const action = useProductivityAction(onSaved)
  return <form className={styles.form} onSubmit={form.handleSubmit(body => action.mutate({ path: reward ? `/rewards/${reward.id}` : '/rewards', method: reward ? 'PATCH' : 'POST', body }))}>
    <Input label="Reward title" required {...form.register('title')} error={form.formState.errors.title?.message} />
    <Input label="Unlock at level" type="number" min="1" max="100000" required {...form.register('requiredLevel')} error={form.formState.errors.requiredLevel?.message} />
    <p className={styles.meta}>Choose something meaningful to you. Claim it once you reach this level; no XP is spent.</p>
    <ActionFeedback action={action} /><Button type="submit" loading={action.isPending}>{reward ? 'Save reward' : 'Create reward'}</Button>
  </form>
}
export function RewardsPage() {
  const [editing, setEditing] = useState(null)
  const [creating, setCreating] = useState(false)
  const [archived, setArchived] = useState('false')
  const [page, setPage] = useState(1)
  const query = useProductivity(`/rewards?page=${page}&archived=${archived}`)
  const settings = useProductivity('/settings')
  const action = useProductivityAction()
  return <div className={styles.stack}><PageHeader eyebrow="Something to look forward to" title="Rewards" description="Personal incentives, chosen by you." action={<Button onClick={() => setCreating(true)}>New reward</Button>} />
    <div className={styles.sectionHeading}><Link to="/progress">Your progress →</Link><Select label="Reward list" value={archived} onChange={e => { setArchived(e.target.value); setPage(1) }}><option value="false">Current rewards</option><option value="true">Archived rewards</option></Select></div>
    <QueryFeedback query={query} /><ActionFeedback action={action} />
    {query.data?.total === 0 && <EmptyState title="Make room for something good">Define a reward and the level that makes it available.</EmptyState>}
    <div className={styles.tileGrid}>{query.data?.items.map(reward => <section className={styles.tile} key={reward.id} aria-label={reward.title}>
      <span className={styles.badge}>{reward.claimedAtUtc ? 'Claimed' : reward.eligible ? 'Ready to claim' : `Level ${reward.requiredLevel}`}</span><h2>{reward.title}</h2>
      <p className={styles.meta}>{reward.claimedAtUtc ? `Claimed ${new Date(reward.claimedAtUtc).toLocaleDateString(settings.data?.locale, { timeZone: settings.data?.timeZoneId || 'UTC' })} · ${settings.data?.timeZoneId || 'UTC'}` : `Unlocks at level ${reward.requiredLevel}`}</p>
      {!reward.archivedAtUtc && <div className={styles.actions}>{!reward.claimedAtUtc && <><Button disabled={!reward.eligible} loading={action.isPending} onClick={() => action.mutate({ path: `/rewards/${reward.id}/claim` })}>Claim reward</Button><Button variant="quiet" onClick={() => setEditing(reward)}>Edit reward</Button></>}
        <Button variant="quiet" loading={action.isPending} onClick={() => action.mutate({ path: `/rewards/${reward.id}`, method: 'DELETE' })}>Archive reward</Button></div>}
    </section>)}</div><Pagination data={query.data} setPage={setPage} />
    <Dialog open={creating || !!editing} title={editing ? 'Edit reward' : 'Define a reward'} onClose={() => { setCreating(false); setEditing(null) }}><RewardForm reward={editing} onSaved={() => { setCreating(false); setEditing(null) }} /></Dialog>
  </div>
}
