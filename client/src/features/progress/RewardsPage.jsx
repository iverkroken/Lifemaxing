import { useLanguage } from '../settings/language.js'
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
import { StatusBadge } from '../../shared/ui/StatusBadge.jsx'
import { Icon } from '../../shared/ui/Icon.jsx'
import rewardStyles from './RewardsPage.module.css'
import { ActionFeedback, QueryFeedback, Pagination } from '../../shared/ui/ProductivityFeedback.jsx'
import styles from '../../shared/ui/Productivity.module.css'

const schema = z.object({ title: z.string().trim().min(1).max(200), requiredLevel: z.coerce.number().int().min(1).max(100000) })
function RewardForm({ reward, onSaved }) {
  const { t } = useLanguage()
  const form = useForm({ resolver: zodResolver(schema), defaultValues: { title: reward?.title || '', requiredLevel: reward?.requiredLevel || 1 } })
  const action = useProductivityAction(onSaved)
  return <form className={styles.form} onSubmit={form.handleSubmit(body => action.mutate({ path: reward ? `/rewards/${reward.id}` : '/rewards', method: reward ? 'PATCH' : 'POST', body }))}>
    <Input label={t("Reward title")} required {...form.register('title')} error={form.formState.errors.title} />
    <Input label={t("Unlock at level")} type="number" min="1" max="100000" required {...form.register('requiredLevel')} error={form.formState.errors.requiredLevel} />
    <p className={styles.meta}>{t("Choose something meaningful to you. Claim it once you reach this level; no XP is spent.")}</p>
    <ActionFeedback action={action} /><Button type="submit" loading={action.isPending}>{reward ? t("Save reward") : t("Create reward")}</Button>
  </form>
}
export function RewardsPage() {
  const { t, dateTime, number } = useLanguage()
  const [editing, setEditing] = useState(null)
  const [creating, setCreating] = useState(false)
  const [archived, setArchived] = useState('false')
  const [page, setPage] = useState(1)
  const query = useProductivity(`/rewards?page=${page}&archived=${archived}`)
  const progress = useProductivity('/progress')
  const action = useProductivityAction()
  const groups = archived === 'true' ? [{ key: 'archived', title: 'Archived rewards', items: query.data?.items || [] }] : [
    { key: 'ready', title: 'Ready to claim', items: query.data?.items.filter(reward => !reward.claimedAtUtc && reward.eligible) || [] },
    { key: 'locked', title: 'Locked', items: query.data?.items.filter(reward => !reward.claimedAtUtc && !reward.eligible) || [] },
    { key: 'claimed', title: 'Claimed', items: query.data?.items.filter(reward => reward.claimedAtUtc) || [] },
  ]
  return <div className={`${styles.stack} ${rewardStyles.page}`}><PageHeader editorial title={t("Rewards")} description={t("Personal incentives, chosen by you.")} action={<Button onClick={() => setCreating(true)}>{t("New reward")}</Button>} />
    <div className={rewardStyles.feature}><div className={rewardStyles.featureCopy}><Icon name="rewards" size={32} /><h2>{t("Make room for something good")}</h2><p>{t("Choose something meaningful to you. Claim it once you reach this level; no XP is spent.")}</p></div><div className={rewardStyles.artwork}><img src="/images/Tiger.png" alt="" decoding="async" /></div></div>
    <div className={styles.sectionHeading}><Link to="/progress">{t("Your progress →")}</Link><Select label={t("Reward list")} value={archived} onChange={e => { setArchived(e.target.value); setPage(1) }}><option value="false">{t("Current rewards")}</option><option value="true">{t("Archived rewards")}</option></Select></div>
    <QueryFeedback query={query} /><QueryFeedback query={progress} /><ActionFeedback action={action} />
    {query.data?.total === 0 && <EmptyState title={t("Define a reward")}>{t("Define a reward and the level that makes it available.")}</EmptyState>}
    {query.data?.items.length > 0 && <p className={rewardStyles.pageNote}>{t("Rewards on this page")}</p>}
    {groups.filter(group => group.items.length).map(group => <section key={group.key} className={rewardStyles.group} aria-labelledby={`rewards-${group.key}`}><div className={rewardStyles.groupHeading}><h2 id={`rewards-${group.key}`}>{t(group.title)}</h2><span>{number(group.items.length)}</span></div><div className={rewardStyles.rewardList}>{group.items.map(reward => <section className={rewardStyles.reward} key={reward.id} aria-label={reward.title} data-state={reward.claimedAtUtc ? 'claimed' : reward.eligible ? 'ready' : 'locked'}>
      <div className={rewardStyles.identity}><Icon name={reward.claimedAtUtc ? 'check' : 'rewards'} size={40} /><StatusBadge tone={reward.claimedAtUtc ? "success" : reward.eligible ? "earned" : "neutral"}>{reward.claimedAtUtc ? t("Claimed") : reward.eligible ? t("Ready to claim") : t('levelNumber', { level: number(reward.requiredLevel) })}</StatusBadge></div><h2>{reward.title}</h2>
      <p className={styles.meta}>{reward.claimedAtUtc ? t('claimedOn', { date: dateTime(reward.claimedAtUtc) }) : t('unlocksAt', { level: number(reward.requiredLevel) })}</p>
      {!reward.claimedAtUtc && !reward.eligible && progress.data && <p className={styles.meta}>{t('levelsRemaining', { count: Math.max(0, reward.requiredLevel - progress.data.progress.level) })}</p>}
      {!reward.archivedAtUtc && <div className={styles.actions}>{!reward.claimedAtUtc && <>{reward.eligible && <Button loading={action.isPending} onClick={() => action.mutate({ path: `/rewards/${reward.id}/claim` })}>{t("Claim reward")}</Button>}<Button variant="quiet" onClick={() => setEditing(reward)}>{t("Edit reward")}</Button></>}
        <Button variant="quiet" loading={action.isPending} onClick={() => action.mutate({ path: `/rewards/${reward.id}`, method: 'DELETE' })}>{t("Archive reward")}</Button></div>}
    </section>)}</div></section>)}<Pagination data={query.data} setPage={setPage} />
    <Dialog open={creating || !!editing} title={editing ? t("Edit reward") : t("Define a reward")} onClose={() => { setCreating(false); setEditing(null) }}><RewardForm reward={editing} onSaved={() => { setCreating(false); setEditing(null) }} /></Dialog>
  </div>
}
